"""
scripts/pipeline_real/06_extract_rainfall.py

Phase 2B: Extraction of authentic satellite-derived precipitation from NASA POWER API.
Enforces strict provenance:
- Uses verified event coordinates and verified event dates only.
- Queries [D-2, D-1, D] precipitation from NASA POWER daily point endpoint.
- rainfall_24h_mm = PRECTOTCORR on day D
- rainfall_72h_mm = sum(PRECTOTCORR on [D-2, D-1, D])
- Caches raw JSON responses locally in data/raw/imerg/real_rainfall_cache.json.
- No invented dates or artificial coordinate perturbations.
"""

import os
import sys
import json
import time
import urllib.request
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAIN_RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "imerg")
os.makedirs(RAIN_RAW_DIR, exist_ok=True)
CACHE_FILE = os.path.join(RAIN_RAW_DIR, "real_rainfall_cache.json")

FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
POS_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")
BG_PATH = os.path.join(FEATURES_DIR, "real_background.csv")
OUTPUT_RAIN_PATH = os.path.join(FEATURES_DIR, "real_rainfall_features.csv")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to save rainfall cache: {e}")

def fetch_single_point(lat, lon, date_str):
    """Queries NASA POWER for [D-2, D-1, D]."""
    try:
        t_dt = datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return None, "INVALID_DATE"

    d0 = date_str
    d1 = (t_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    d2 = (t_dt - timedelta(days=2)).strftime("%Y-%m-%d")

    s_fmt = d2.replace("-", "")
    e_fmt = d0.replace("-", "")

    url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point?"
        f"parameters=PRECTOTCORR&community=RE&longitude={lon:.4f}&latitude={lat:.4f}&"
        f"start={s_fmt}&end={e_fmt}&format=JSON"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "NER-LandslideGuard-Audit/2.0"})

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                precip = data.get("properties", {}).get("parameter", {}).get("PRECTOTCORR", {})
                res = {}
                for k, v in precip.items():
                    if len(k) == 8:
                        iso = f"{k[:4]}-{k[4:6]}-{k[6:]}"
                        res[iso] = round(float(v), 2) if (v is not None and v >= 0) else 0.0
                return res, "OK"
        except Exception as e:
            time.sleep(1.0 * (attempt + 1))
    return None, "TIMEOUT_OR_FAILED"

def extract_all_rainfall():
    df_pos = pd.read_csv(POS_PATH)
    df_bg = pd.read_csv(BG_PATH)
    df_all = pd.concat([df_pos, df_bg], ignore_index=True)
    print(f"Total points for genuine satellite precipitation extraction: {len(df_all)}")

    cache = load_cache()
    print(f"Existing cached rainfall records: {len(cache)}")

    # Collect items that need fetching
    tasks = []
    for _, r in df_all.iterrows():
        p_id = r["event_id"]
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        d_str = str(r["event_date"])
        cache_key = f"{lat:.4f}_{lon:.4f}_{d_str}"
        if cache_key not in cache:
            tasks.append((p_id, lat, lon, d_str, cache_key))

    print(f"Points remaining to query from NASA POWER API: {len(tasks)}")

    if tasks:
        completed = 0
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_key = {
                executor.submit(fetch_single_point, lat, lon, d_str): (p_id, cache_key, d_str)
                for (p_id, lat, lon, d_str, cache_key) in tasks
            }

            for future in as_completed(future_to_key):
                p_id, cache_key, d_str = future_to_key[future]
                res, status = future.result()
                if res is not None:
                    cache[cache_key] = res
                completed += 1
                if completed % 25 == 0 or completed == len(tasks):
                    print(f"  Fetched {completed}/{len(tasks)} records from NASA POWER...")
                    save_cache(cache)

        save_cache(cache)

    # Assemble dataset
    r24_list = []
    r72_list = []
    sources = []

    for _, r in df_all.iterrows():
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        d_str = str(r["event_date"])
        cache_key = f"{lat:.4f}_{lon:.4f}_{d_str}"

        p_data = cache.get(cache_key)
        if p_data:
            # Day D
            r24 = p_data.get(d_str, np.nan)
            # Days D-2, D-1, D
            t_dt = datetime.strptime(d_str, "%Y-%m-%d")
            d1 = (t_dt - timedelta(days=1)).strftime("%Y-%m-%d")
            d2 = (t_dt - timedelta(days=2)).strftime("%Y-%m-%d")
            v0 = p_data.get(d_str, 0.0)
            v1 = p_data.get(d1, 0.0)
            v2 = p_data.get(d2, 0.0)
            r72 = round(v0 + v1 + v2, 2)

            r24_list.append(r24)
            r72_list.append(r72)
            sources.append("NASA_POWER_PRECTOTCORR_Daily")
        else:
            r24_list.append(np.nan)
            r72_list.append(np.nan)
            sources.append("NASA_POWER_Unavailable")

    df_all["rainfall_24h_mm"] = r24_list
    df_all["rainfall_72h_mm"] = r72_list
    df_all["rainfall_source"] = sources

    df_out = df_all[["event_id", "sample_type", "event_date", "latitude", "longitude", "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_source"]]
    df_out.to_csv(OUTPUT_RAIN_PATH, index=False)

    print(f"\n[OUTPUT] Saved genuine precipitation table to {OUTPUT_RAIN_PATH}")
    valid_count = df_out["rainfall_24h_mm"].notna().sum()
    print(f"  Valid satellite precipitation records: {valid_count} / {len(df_out)} ({valid_count / len(df_out)*100:.1f}%)")
    print(f"  Mean 24h rainfall (observed landslides): {df_out[df_out['sample_type'] == 'observed_landslide']['rainfall_24h_mm'].mean():.2f} mm")
    print(f"  Mean 72h rainfall (observed landslides): {df_out[df_out['sample_type'] == 'observed_landslide']['rainfall_72h_mm'].mean():.2f} mm")
    print(f"  Mean 24h rainfall (background samples):   {df_out[df_out['sample_type'] == 'background']['rainfall_24h_mm'].mean():.2f} mm")
    print(f"  Mean 72h rainfall (background samples):   {df_out[df_out['sample_type'] == 'background']['rainfall_72h_mm'].mean():.2f} mm")

if __name__ == "__main__":
    extract_all_rainfall()
