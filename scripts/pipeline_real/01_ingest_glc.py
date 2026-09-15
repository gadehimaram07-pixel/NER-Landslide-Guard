"""
scripts/pipeline_real/01_ingest_glc.py

Phase 2B: Ingestion of authentic NASA Global Landslide Catalog records for Northeast India.
Enforces strict provenance:
- No coordinate perturbation
- No date fabrication
- No synthetic point creation
- Bounded strictly to Northeast India [21.5°N - 28.5°N, 89.5°E - 97.5°E]
"""

import os
import sys
import requests
import pandas as pd
import numpy as np
from datetime import datetime

# Target directories
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_GLC_DIR = os.path.join(BASE_DIR, "data", "raw", "glc_real")
FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
os.makedirs(RAW_GLC_DIR, exist_ok=True)
os.makedirs(FEATURES_DIR, exist_ok=True)

RAW_CSV_PATH = os.path.join(RAW_GLC_DIR, "Global_Landslide_Catalog_Export_rows.csv")
OUTPUT_INVENTORY_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")

NASA_GLC_URL = "https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv"

# Northeast India Bounding Box
# Covers Sikkim, Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura
NER_BBOX = {
    "min_lat": 21.5,
    "max_lat": 28.5,
    "min_lon": 89.5,
    "max_lon": 97.5
}

def download_glc():
    """Downloads the official NASA GLC CSV export if not already cached."""
    if os.path.exists(RAW_CSV_PATH) and os.path.getsize(RAW_CSV_PATH) > 10000:
        print(f"[OK] NASA GLC raw file already present: {RAW_CSV_PATH} ({os.path.getsize(RAW_CSV_PATH):,} bytes)")
        return True

    print(f"Downloading NASA Global Landslide Catalog from:\n  {NASA_GLC_URL}")
    headers = {"User-Agent": "NER-LandslideGuard-Audit/1.0"}
    try:
        with requests.get(NASA_GLC_URL, headers=headers, stream=True, timeout=120) as r:
            r.raise_for_status()
            total_bytes = 0
            with open(RAW_CSV_PATH, "wb") as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        total_bytes += len(chunk)
                        if total_bytes % (1024 * 1024 * 2) < 65536:
                            print(f"  Downloaded {total_bytes / (1024*1024):.1f} MB...")
            print(f"[OK] Download complete: {total_bytes:,} bytes saved to {RAW_CSV_PATH}")
            return True
    except Exception as e:
        print(f"[ERROR] Failed to download NASA GLC: {e}", file=sys.stderr)
        return False

def inspect_and_filter_glc():
    """Parses raw catalog, audits schema, filters to Northeast India, and writes real_inventory.csv."""
    if not os.path.exists(RAW_CSV_PATH):
        print(f"[ERROR] File not found: {RAW_CSV_PATH}", file=sys.stderr)
        return None

    print("\nReading NASA GLC CSV into pandas...")
    # Load raw catalog
    df = pd.read_csv(RAW_CSV_PATH, low_memory=False)
    total_downloaded = len(df)
    print(f"Total downloaded records across globe: {total_downloaded}")

    print("\nSchema & Columns in NASA GLC:")
    for col in df.columns:
        print(f"  - {col} ({df[col].dtype})")

    # Standardize column names (lowercase with underscores)
    col_map = {c: c.strip().lower().replace(" ", "_") for c in df.columns}
    df = df.rename(columns=col_map)

    # Required columns check
    lat_col = "latitude" if "latitude" in df.columns else "lat"
    lon_col = "longitude" if "longitude" in df.columns else "lon"
    date_col = "event_date" if "event_date" in df.columns else ("date" if "date" in df.columns else None)
    id_col = "event_id" if "event_id" in df.columns else "id"

    print(f"\nIdentified key columns: lat='{lat_col}', lon='{lon_col}', date='{date_col}', id='{id_col}'")

    # Step 1: Filter to Northeast India bounding box
    # Convert coords to numeric
    df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
    df[lon_col] = pd.to_numeric(df[lon_col], errors="coerce")

    ner_mask = (
        (df[lat_col] >= NER_BBOX["min_lat"]) & (df[lat_col] <= NER_BBOX["max_lat"]) &
        (df[lon_col] >= NER_BBOX["min_lon"]) & (df[lon_col] <= NER_BBOX["max_lon"])
    )
    df_ner = df[ner_mask].copy()
    ner_records = len(df_ner)
    print(f"\nRecords within Northeast India Bounding Box: {ner_records}")

    # Step 2: Filter by country/region
    if "country_name" in df_ner.columns:
        print("\nCountry breakdown in NER bounding box:")
        print(df_ner["country_name"].value_counts().to_string())

    # Step 3: Audit valid coordinates
    has_valid_coords = df_ner[lat_col].notna() & df_ner[lon_col].notna()
    print(f"NER records with valid numeric coords: {has_valid_coords.sum()}")

    # Step 4: Audit valid event dates
    def parse_event_date(val):
        if pd.isna(val):
            return None
        s = str(val).strip()
        for fmt in ("%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(s, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
        try:
            dt = pd.to_datetime(s)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            return None

    df_ner["parsed_date"] = df_ner[date_col].apply(parse_event_date)
    has_valid_date = df_ner["parsed_date"].notna()
    print(f"NER records with valid parseable event date: {has_valid_date.sum()}")

    # Step 5: Keep only records with valid coordinates AND valid event date
    usable_mask = has_valid_coords & has_valid_date
    df_usable = df_ner[usable_mask].copy()
    
    # Drop duplicates by (lat, lon, parsed_date)
    initial_usable = len(df_usable)
    df_usable = df_usable.drop_duplicates(subset=[lat_col, lon_col, "parsed_date"])
    dedup_usable = len(df_usable)
    if initial_usable != dedup_usable:
        print(f"Removed {initial_usable - dedup_usable} duplicate records.")

    # Construct the final real_inventory table
    inventory_rows = []
    for idx, row in df_usable.iterrows():
        orig_fields = {}
        for c in ["hazard_type", "hazard_title", "trigger", "storm_name", "location_description", "fatalities", "injuries", "source_name", "source_link"]:
            if c in row and pd.notna(row[c]):
                orig_fields[c] = str(row[c])

        inventory_rows.append({
            "event_id": f"GLC-REAL-{row[id_col]}",
            "original_event_id": str(row[id_col]),
            "source": "NASA_GLC",
            "country": row.get("country_name", "Unknown"),
            "state_or_province": row.get("admin_division_name", ""),
            "latitude": round(float(row[lat_col]), 5),
            "longitude": round(float(row[lon_col]), 5),
            "event_date": row["parsed_date"],
            "sample_type": "observed_landslide",
            "is_landslide": 1,
            "trigger": row.get("trigger", "Unknown"),
            "fatalities": row.get("fatalities", 0),
            "original_source_fields": str(orig_fields)
        })

    df_inventory = pd.DataFrame(inventory_rows)
    df_inventory.to_csv(OUTPUT_INVENTORY_PATH, index=False)
    print(f"\n[SUCCESS] Exported authentic inventory to {OUTPUT_INVENTORY_PATH} ({len(df_inventory)} records)")

    # Print summary report
    print("\n" + "="*50)
    print("STEP 1 REAL INVENTORY INGESTION AUDIT:")
    print(f"  Total downloaded records:            {total_downloaded}")
    print(f"  Northeast India bounding box records:{ner_records}")
    print(f"  Records removed (missing date/coord):{ner_records - len(df_inventory)}")
    print(f"  Records with valid coordinates:      {has_valid_coords.sum()}")
    print(f"  Records with valid event dates:      {has_valid_date.sum()}")
    print(f"  Final usable observed events:        {len(df_inventory)}")
    print("="*50)

    return df_inventory

if __name__ == "__main__":
    if download_glc():
        inspect_and_filter_glc()
    else:
        sys.exit(1)
