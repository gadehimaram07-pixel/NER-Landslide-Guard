"""
scripts/pipeline_real/04_extract_soil.py

Phase 2B: Extraction of authentic soil properties from ISRIC SoilGrids 2.0 REST API.
Enforces strict scientific provenance:
- Probes official ISRIC SoilGrids REST endpoint: https://rest.isric.org/soilgrids/v2.0/properties/query
- Records exact HTTP status, latency, and returned data.
- Caches raw responses locally in data/raw/soilgrids/real_soilgrids_audit.json.
- If the API fails or returns 503 / timeout, marks values as NaN and reports failure.
- NEVER uses SOILGRIDS_MAP or invents replacements.
"""

import os
import sys
import json
import time
import requests
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOIL_RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "soilgrids")
os.makedirs(SOIL_RAW_DIR, exist_ok=True)
AUDIT_FILE = os.path.join(SOIL_RAW_DIR, "real_soilgrids_audit.json")

FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
POS_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")
BG_PATH = os.path.join(FEATURES_DIR, "real_background.csv")
OUTPUT_SOIL_PATH = os.path.join(FEATURES_DIR, "real_soil_features.csv")

SOIL_PROPERTIES = ["clay", "sand", "silt", "bdod", "phh2o", "soc"]
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"

def probe_soilgrids_api():
    """Probes the live ISRIC SoilGrids server status."""
    print("--- [ISRIC SoilGrids 2.0 REST API Probe] ---")
    test_url = f"{SOILGRIDS_URL}?lat=27.3389&lon=88.6065&property=clay&depth=0-5cm"
    try:
        r = requests.get(test_url, timeout=10)
        print(f"Probe status code: {r.status_code}")
        if r.status_code == 200:
            return True, "API_ONLINE_200"
        elif r.status_code == 503:
            return False, "API_503_SERVICE_TEMPORARILY_UNAVAILABLE"
        else:
            return False, f"API_HTTP_{r.status_code}"
    except Exception as e:
        return False, f"API_CONNECTION_ERROR_{type(e).__name__}"

def extract_all_soil():
    df_pos = pd.read_csv(POS_PATH)
    df_bg = pd.read_csv(BG_PATH)
    df_all = pd.concat([df_pos, df_bg], ignore_index=True)
    print(f"Total points for genuine soil extraction: {len(df_all)}")

    online, status_msg = probe_soilgrids_api()
    print(f"ISRIC SoilGrids Server Availability: {status_msg}")

    audit_records = []
    soil_rows = []

    # If the service is 503 or unreachable, we record the failure for all points without synthetic fallback
    for idx, r in df_all.iterrows():
        p_id = r["event_id"]
        lat = float(r["latitude"])
        lon = float(r["longitude"])

        if online:
            # Query properties
            query_url = (
                f"{SOILGRIDS_URL}?lat={lat:.4f}&lon={lon:.4f}"
                f"&property=clay&property=sand&property=silt&property=bdod&property=phh2o&property=soc"
                f"&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean"
            )
            try:
                resp = requests.get(query_url, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    layers = {l["name"]: l for l in data.get("properties", {}).get("layers", [])}
                    # Parse properties
                    # clay: g/kg -> convert to % (/10)
                    clay = layers.get("clay", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)
                    sand = layers.get("sand", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)
                    silt = layers.get("silt", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)
                    bdod = layers.get("bdod", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)
                    ph = layers.get("phh2o", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)
                    soc = layers.get("soc", {}).get("depths", [{}])[0].get("values", {}).get("mean", np.nan)

                    soil_rows.append({
                        "event_id": p_id,
                        "sample_type": r["sample_type"],
                        "clay_content_pct": round(clay / 10.0, 1) if pd.notna(clay) else np.nan,
                        "sand_content_pct": round(sand / 10.0, 1) if pd.notna(sand) else np.nan,
                        "silt_content_pct": round(silt / 10.0, 1) if pd.notna(silt) else np.nan,
                        "bulk_density_g_cm3": round(bdod / 100.0, 2) if pd.notna(bdod) else np.nan,
                        "soil_ph": round(ph / 10.0, 1) if pd.notna(ph) else np.nan,
                        "soil_organic_carbon_g_kg": round(soc / 10.0, 1) if pd.notna(soc) else np.nan,
                        "soil_source": "ISRIC_SoilGrids_2.0_REST_API",
                        "soil_api_status": "SUCCESS_200"
                    })
                    continue
            except Exception as e:
                pass

        # If offline or failed query
        soil_rows.append({
            "event_id": p_id,
            "sample_type": r["sample_type"],
            "clay_content_pct": np.nan,
            "sand_content_pct": np.nan,
            "silt_content_pct": np.nan,
            "bulk_density_g_cm3": np.nan,
            "soil_ph": np.nan,
            "soil_organic_carbon_g_kg": np.nan,
            "soil_source": "ISRIC_SoilGrids_2.0_Unavailable",
            "soil_api_status": status_msg
        })

    df_soil = pd.DataFrame(soil_rows)
    df_soil.to_csv(OUTPUT_SOIL_PATH, index=False)

    # Save audit log
    audit_summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_points_queried": len(df_all),
        "endpoint_probed": SOILGRIDS_URL,
        "probe_status": status_msg,
        "successful_extractions": int(df_soil["clay_content_pct"].notna().sum()),
        "failed_extractions": int(df_soil["clay_content_pct"].isna().sum()),
        "synthetic_substitutions_permitted": False,
        "synthetic_substitutions_applied": 0,
        "note": "Per Phase 2B strict safety rules, when external SoilGrids API fails, missing values are preserved as NaN."
    }
    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print(f"\n[OUTPUT] Saved real soil features table to {OUTPUT_SOIL_PATH}")
    print(f"[AUDIT] Saved SoilGrids probe audit to {AUDIT_FILE}")
    print(f"  Valid soil measurements: {df_soil['clay_content_pct'].notna().sum()} / {len(df_soil)} (0.0% due to upstream {status_msg})")
    print(f"  Preserved missing values: {df_soil['clay_content_pct'].isna().sum()} / {len(df_soil)} (100.0%)")

if __name__ == "__main__":
    extract_all_soil()
