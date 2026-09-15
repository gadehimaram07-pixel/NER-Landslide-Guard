"""
scripts/pipeline_real/03_extract_terrain.py

Phase 2B: Extraction of authentic 30m SRTM/Copernicus terrain features.
Methodology:
- Queries genuine 30m Digital Elevation Model via OpenTopoData SRTM 30m service.
- Extracts center elevation_m.
- Evaluates spatial gradient via 5-point stencil (Center, North, South, East, West) at 30m spacing.
- Derives physical slope_deg and aspect_deg via central difference derivatives.
- Caches raw responses locally in data/raw/dem/real_dem_cache.json.
- Strictly handles failures: records NaN if unavailable, NO synthetic fallback.
"""

import os
import sys
import json
import time
import math
import requests
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEM_CACHE_DIR = os.path.join(BASE_DIR, "data", "raw", "dem")
os.makedirs(DEM_CACHE_DIR, exist_ok=True)
CACHE_FILE = os.path.join(DEM_CACHE_DIR, "real_dem_cache.json")

FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
POS_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")
BG_PATH = os.path.join(FEATURES_DIR, "real_background.csv")
OUTPUT_TERRAIN_PATH = os.path.join(FEATURES_DIR, "real_terrain_features.csv")

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
        print(f"[WARN] Failed to save DEM cache: {e}")

def compute_terrain_for_batch(batch_pts, cache):
    """
    batch_pts: list of dicts with 'id', 'lat', 'lon'
    Queries OpenTopoData in chunks of max 15 points (15 * 5 = 75 locations)
    """
    results = {}
    points_to_fetch = []

    for pt in batch_pts:
        key = f"{pt['lat']:.5f}_{pt['lon']:.5f}"
        if key in cache:
            results[pt["id"]] = cache[key]
        else:
            points_to_fetch.append(pt)

    if not points_to_fetch:
        return results

    # Chunk into groups of 15 points
    chunk_size = 15
    for i in range(0, len(points_to_fetch), chunk_size):
        chunk = points_to_fetch[i:i + chunk_size]
        locs_list = []
        chunk_map = []  # track mapping

        for pt in chunk:
            lat = pt["lat"]
            lon = pt["lon"]
            d_lat = 30.0 / 111320.0
            d_lon = 30.0 / (111320.0 * math.cos(math.radians(lat)))
            # Stencil: C, N, S, E, W
            stencil = [
                (lat, lon),
                (lat + d_lat, lon),
                (lat - d_lat, lon),
                (lat, lon + d_lon),
                (lat, lon - d_lon)
            ]
            chunk_map.append((pt["id"], lat, lon))
            locs_list.extend(stencil)

        query_str = "|".join([f"{p[0]:.6f},{p[1]:.6f}" for p in locs_list])
        url = f"https://api.opentopodata.org/v1/srtm30m?locations={query_str}"

        success = False
        for attempt in range(3):
            try:
                time.sleep(1.1)  # Respect OpenTopoData 1 req/sec rate limit
                resp = requests.get(url, timeout=25)
                if resp.status_code == 200:
                    api_data = resp.json().get("results", [])
                    if len(api_data) == len(locs_list):
                        success = True
                        # Parse 5 points per sample
                        for idx, (p_id, lat, lon) in enumerate(chunk_map):
                            s_idx = idx * 5
                            pts_elev = [api_data[s_idx + k].get("elevation") for k in range(5)]
                            if None in pts_elev:
                                # Incomplete elevation
                                res_dict = {
                                    "elevation_m": pts_elev[0] if pts_elev[0] is not None else np.nan,
                                    "slope_deg": np.nan,
                                    "aspect_deg": np.nan,
                                    "dem_source": "SRTM_30m_Partial_Null"
                                }
                            else:
                                z_c, z_n, z_s, z_e, z_w = pts_elev
                                dx = 2.0 * 30.0
                                dy = 2.0 * 30.0
                                grad_x = (z_e - z_w) / dx
                                grad_y = (z_n - z_s) / dy
                                slope = math.degrees(math.atan(math.sqrt(grad_x**2 + grad_y**2)))
                                aspect = (math.degrees(math.atan2(-grad_y, grad_x)) + 360.0) % 360.0
                                res_dict = {
                                    "elevation_m": round(float(z_c), 1),
                                    "slope_deg": round(float(slope), 2),
                                    "aspect_deg": round(float(aspect), 2),
                                    "dem_source": "NASA_USGS_SRTM_30m"
                                }
                            key = f"{lat:.5f}_{lon:.5f}"
                            cache[key] = res_dict
                            results[p_id] = res_dict
                        break
                elif resp.status_code == 429:
                    print("  [WAIT] Rate limit reached. Sleeping 3s...")
                    time.sleep(3.0)
            except Exception as e:
                time.sleep(2.0)

        if not success:
            print(f"  [WARN] Failed to fetch DEM chunk {i // chunk_size + 1}")
            for p_id, lat, lon in chunk_map:
                res_dict = {
                    "elevation_m": np.nan,
                    "slope_deg": np.nan,
                    "aspect_deg": np.nan,
                    "dem_source": "DEM_API_Timeout_Failed"
                }
                results[p_id] = res_dict

        save_cache(cache)
        print(f"  Processed {min(i + chunk_size, len(points_to_fetch))}/{len(points_to_fetch)} points...")

    return results

def extract_all_terrain():
    df_pos = pd.read_csv(POS_PATH)
    df_bg = pd.read_csv(BG_PATH)
    df_all = pd.concat([df_pos, df_bg], ignore_index=True)
    print(f"Total points for genuine terrain extraction: {len(df_all)}")

    cache = load_cache()
    print(f"Existing cached DEM locations: {len(cache)}")

    batch_pts = []
    for _, r in df_all.iterrows():
        batch_pts.append({
            "id": r["event_id"],
            "lat": float(r["latitude"]),
            "lon": float(r["longitude"])
        })

    terrain_results = compute_terrain_for_batch(batch_pts, cache)

    # Join results
    elevs, slopes, aspects, sources = [], [], [], []
    for _, r in df_all.iterrows():
        p_id = r["event_id"]
        t = terrain_results.get(p_id, {})
        elevs.append(t.get("elevation_m", np.nan))
        slopes.append(t.get("slope_deg", np.nan))
        aspects.append(t.get("aspect_deg", np.nan))
        sources.append(t.get("dem_source", "Unknown"))

    df_all["elevation_m"] = elevs
    df_all["slope_deg"] = slopes
    df_all["aspect_deg"] = aspects
    df_all["dem_source"] = sources

    df_terrain = df_all[["event_id", "sample_type", "latitude", "longitude", "elevation_m", "slope_deg", "aspect_deg", "dem_source"]]
    df_terrain.to_csv(OUTPUT_TERRAIN_PATH, index=False)
    print(f"\n[SUCCESS] Exported terrain features to {OUTPUT_TERRAIN_PATH}")

    # Print quality metrics
    valid_elev = df_terrain["elevation_m"].notna().sum()
    valid_slope = df_terrain["slope_deg"].notna().sum()
    print(f"  Valid genuine elevation values: {valid_elev} / {len(df_terrain)} ({valid_elev / len(df_terrain)*100:.1f}%)")
    print(f"  Valid genuine slope values:     {valid_slope} / {len(df_terrain)} ({valid_slope / len(df_terrain)*100:.1f}%)")
    print(f"  Elevation range: {df_terrain['elevation_m'].min():.1f}m to {df_terrain['elevation_m'].max():.1f}m")
    print(f"  Mean slope for observed landslides: {df_terrain[df_terrain['sample_type'] == 'observed_landslide']['slope_deg'].mean():.2f}°")
    print(f"  Mean slope for background samples:   {df_terrain[df_terrain['sample_type'] == 'background']['slope_deg'].mean():.2f}°")

if __name__ == "__main__":
    extract_all_terrain()
