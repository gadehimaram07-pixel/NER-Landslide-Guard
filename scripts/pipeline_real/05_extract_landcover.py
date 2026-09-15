"""
scripts/pipeline_real/05_extract_landcover.py

Phase 2B: Extraction of authentic 10m ESA WorldCover raster features.
Enforces strict provenance:
- Inspects available GeoTIFF tiles in data/raw/worldcover/
- Samples pixel values only where genuine raster coverage exists (e.g. N27E087 tile)
- Where raster tiles are unavailable for the rest of NER, records NaN and reports missing coverage explicitly.
- NEVER uses coordinate hashing or synthetic assignments.
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # Allow reading large satellite GeoTIFF

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WC_DIR = os.path.join(BASE_DIR, "data", "raw", "worldcover")
WC_TIFF_PATH = os.path.join(WC_DIR, "ESA_WorldCover_10m_2021_v200_N27E087_Map.tif")

FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
POS_PATH = os.path.join(FEATURES_DIR, "real_inventory.csv")
BG_PATH = os.path.join(FEATURES_DIR, "real_background.csv")
OUTPUT_LC_PATH = os.path.join(FEATURES_DIR, "real_landcover_features.csv")

def extract_all_landcover():
    df_pos = pd.read_csv(POS_PATH)
    df_bg = pd.read_csv(BG_PATH)
    df_all = pd.concat([df_pos, df_bg], ignore_index=True)
    print(f"Total points for genuine land cover extraction: {len(df_all)}")

    wc_im = None
    if os.path.exists(WC_TIFF_PATH):
        try:
            print(f"Opening ESA WorldCover GeoTIFF: {WC_TIFF_PATH}")
            wc_im = Image.open(WC_TIFF_PATH)
            print(f"  Tile format: {wc_im.format}, Dimensions: {wc_im.size} (10m resolution)")
        except Exception as e:
            print(f"[ERROR] Could not open GeoTIFF: {e}")

    # Available tile coverage: N27E087 -> Lat [27.0, 30.0], Lon [87.0, 90.0]
    TILE_BBOX = {"min_lat": 27.0, "max_lat": 30.0, "min_lon": 87.0, "max_lon": 90.0}

    lc_classes = []
    tree_covers = []
    builtups = []
    sources = []

    covered_count = 0
    uncovered_count = 0

    for idx, r in df_all.iterrows():
        lat = float(r["latitude"])
        lon = float(r["longitude"])

        if wc_im is not None and (TILE_BBOX["min_lat"] <= lat <= TILE_BBOX["max_lat"]) and (TILE_BBOX["min_lon"] <= lon <= TILE_BBOX["max_lon"]):
            try:
                # 3 degrees span = 36,000 pixels (10m resolution)
                x = int((lon - TILE_BBOX["min_lon"]) / 3.0 * 36000)
                y = int((TILE_BBOX["max_lat"] - lat) / 3.0 * 36000)
                crop = wc_im.crop((x, y, x + 1, y + 1))
                code = int(crop.getpixel((0, 0)))

                lc_classes.append(code)
                tree_covers.append(1.0 if code == 10 else 0.0)
                builtups.append(1.0 if code == 50 else 0.0)
                sources.append("ESA_WorldCover_10m_GeoTIFF_N27E087")
                covered_count += 1
                continue
            except Exception as e:
                pass

        # Outside tile coverage
        lc_classes.append(np.nan)
        tree_covers.append(np.nan)
        builtups.append(np.nan)
        sources.append("ESA_WorldCover_Tile_Unavailable")
        uncovered_count += 1

    df_all["landcover_class"] = lc_classes
    df_all["lc_tree_cover"] = tree_covers
    df_all["land_cover_builtup"] = builtups
    df_all["landcover_source"] = sources

    df_out = df_all[["event_id", "sample_type", "latitude", "longitude", "landcover_class", "lc_tree_cover", "land_cover_builtup", "landcover_source"]]
    df_out.to_csv(OUTPUT_LC_PATH, index=False)

    print(f"\n[OUTPUT] Exported real land cover features to {OUTPUT_LC_PATH}")
    print(f"  Points within genuine tile coverage (Sikkim/Darjeeling): {covered_count} ({covered_count / len(df_all)*100:.1f}%)")
    print(f"  Points outside available tiles (Assam, Nagaland, Manipur, etc.): {uncovered_count} ({uncovered_count / len(df_all)*100:.1f}%)")
    print(f"  Preserved missing values: {uncovered_count} (NO coordinate hashing applied)")

if __name__ == "__main__":
    extract_all_landcover()
