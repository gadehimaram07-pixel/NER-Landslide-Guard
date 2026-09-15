"""
scripts/pipeline_real/07_build_real_dataset.py

Phase 2B: Assembly of authentic real-data feature dataset for Northeast India.
Enforces strict scientific honesty:
- Combines 315 verified NASA GLC observed landslides + 315 stratified background references (630 total rows).
- Integrates authentic measurements from:
  * NASA/USGS SRTM 30m DEM (elevation, slope, aspect)
  * NASA POWER Daily Satellite Precipitation (rainfall_24h, rainfall_72h)
- Preserves missing values (NaN) for layers where authentic extraction failed or was unavailable:
  * SoilGrids (ISRIC 503 server outage) -> NaN
  * WorldCover (Tile unavailable outside Sikkim) -> NaN
  * Surrounding rainfall buffer -> NaN (no spatial grid formula applied)
  * Geotechnical saturation/cohesion -> NaN (no synthetic noise formula applied)
- Preserves full provenance columns: event_id, source, date, coords, pedigree.
- Leaves existing 620-row prototype completely untouched.
"""

import os
import sys
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")

POS_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")
BG_PATH = os.path.join(FEATURES_DIR, "real_background.csv")
TERRAIN_PATH = os.path.join(FEATURES_DIR, "real_terrain_features.csv")
RAIN_PATH = os.path.join(FEATURES_DIR, "real_rainfall_features.csv")
SOIL_PATH = os.path.join(FEATURES_DIR, "real_soil_features.csv")
LC_PATH = os.path.join(FEATURES_DIR, "real_landcover_features.csv")

OUTPUT_REAL_FEATURES = os.path.join(FEATURES_DIR, "real_landslide_features.csv")

def build_real_feature_dataset():
    print("=" * 80)
    print("PHASE 2B: BUILDING AUTHENTIC REAL-DATA FEATURE DATASET")
    print("=" * 80)

    # 1. Base Inventory
    df_pos = pd.read_csv(POS_PATH)
    df_bg = pd.read_csv(BG_PATH)
    df_base = pd.concat([df_pos, df_bg], ignore_index=True)
    print(f"Base records: {len(df_base)} (Positives: {len(df_pos)}, Backgrounds: {len(df_bg)})")

    # 2. Load layers
    df_terrain = pd.read_csv(TERRAIN_PATH)
    df_rain = pd.read_csv(RAIN_PATH)
    df_soil = pd.read_csv(SOIL_PATH)
    df_lc = pd.read_csv(LC_PATH)

    # 3. Merge
    df = df_base.copy()
    df = df.merge(df_terrain[["event_id", "elevation_m", "slope_deg", "aspect_deg", "dem_source"]], on="event_id", how="left")
    df = df.merge(df_rain[["event_id", "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_source"]], on="event_id", how="left")
    df = df.merge(df_soil[["event_id", "clay_content_pct", "sand_content_pct", "silt_content_pct", "bulk_density_g_cm3", "soil_ph", "soil_organic_carbon_g_kg", "soil_source"]], on="event_id", how="left")
    df = df.merge(df_lc[["event_id", "lc_tree_cover", "land_cover_builtup", "landcover_source"]], on="event_id", how="left")

    # Align column names to match the 16 core prototype feature names where applicable
    df = df.rename(columns={
        "clay_content_pct": "soil_clay_pct",
        "sand_content_pct": "soil_sand_pct",
        "silt_content_pct": "soil_silt_pct",
        "bulk_density_g_cm3": "soil_bulk_density",
        "soil_organic_carbon_g_kg": "soil_organic_carbon",
        "land_cover_builtup": "lc_builtup",
        "state_or_province": "state"
    })

    # Unmeasured features preserved honestly as NaN
    df["rainfall_surround_max_mm"] = np.nan
    df["saturation_pct"] = np.nan
    df["cohesion_kpa"] = np.nan
    df["label"] = df["is_landslide"].astype(int)
    df["sample_id"] = df["event_id"]

    # Provenance pedigree tag
    df["data_pedigree"] = df["sample_type"].map({
        "observed_landslide": "NASA_GLC_OBSERVATIONAL_GROUND_TRUTH",
        "background": "DISTRICT_STRATIFIED_BUFFERED_REFERENCE"
    })

    # Core 16 feature order matching the prototype schema
    core_16_features = [
        "elevation_m", "slope_deg", "aspect_deg",
        "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_surround_max_mm",
        "soil_clay_pct", "soil_sand_pct", "soil_silt_pct", "soil_bulk_density", "soil_ph", "soil_organic_carbon",
        "lc_tree_cover", "lc_builtup",
        "saturation_pct", "cohesion_kpa"
    ]

    provenance_cols = [
        "sample_id", "label", "sample_type", "data_pedigree", "source", "event_date",
        "state", "latitude", "longitude", "trigger", "fatalities",
        "dem_source", "rainfall_source", "soil_source", "landcover_source",
        "original_source_fields"
    ]

    final_cols = provenance_cols + core_16_features
    # Reorder
    df_final = df[[c for c in final_cols if c in df.columns]]
    df_final.to_csv(OUTPUT_REAL_FEATURES, index=False)

    print(f"\n[SUCCESS] Exported real feature dataset to {OUTPUT_REAL_FEATURES}")
    print(f"  Total Rows: {len(df_final)}")
    print(f"  Observed Landslides (Label=1): {(df_final['label'] == 1).sum()}")
    print(f"  Background References (Label=0): {(df_final['label'] == 0).sum()}")

    # Feature completeness audit
    print("\n--- [Feature Completeness Audit (630 samples)] ---")
    for feat in core_16_features:
        valid_cnt = df_final[feat].notna().sum()
        pct = (valid_cnt / len(df_final)) * 100.0
        status = "[AUTHENTIC]" if pct == 100.0 else ("[PARTIAL]" if pct > 0 else "[MISSING/UNAVAILABLE]")
        print(f"  {feat:<25}: {valid_cnt:>4} / {len(df_final)} ({pct:>5.1f}%) {status}")

    return df_final

if __name__ == "__main__":
    build_real_feature_dataset()
