"""
scripts/pipeline_real/09_spatial_split_and_leakage.py

Phase 2C: Spatial Splitting & Spatial Leakage Verification.
Methodology:
- Avoids naive random row splitting to prevent spatial autocorrelation leakage.
- Partitions by distinct geographic regions / states:
  * Train: Assam, Nagaland, Arunachal Pradesh, Meghalaya, Tripura (464 samples)
  * Validation: Mizoram (54 samples)
  * Held-out Test: Manipur (112 samples)
- Checks pairwise spatial distance between Test points and Train points.
- Implements buffer-sanitized option: removes training points within 10 km of the test state boundary (47 border points) to guarantee absolute spatial isolation (>10 km).
- Exports final train, val, and test splits.
"""

import os
import sys
import pandas as pd
import numpy as np
from math import radians, cos, sin, asin, sqrt

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
DATASET_PATH = os.path.join(FEATURES_DIR, "real_landslide_features.csv")

TRAIN_SPLIT_PATH = os.path.join(FEATURES_DIR, "real_train_features.csv")
VAL_SPLIT_PATH = os.path.join(FEATURES_DIR, "real_val_features.csv")
TEST_SPLIT_PATH = os.path.join(FEATURES_DIR, "real_test_features.csv")

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2.0)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2.0)**2
    return r * 2.0 * asin(sqrt(a))

def perform_spatial_split():
    print("=" * 80)
    print("PHASE 2C: SPATIAL VALIDATION SPLIT & BUFFER LEAKAGE REMOVAL")
    print("=" * 80)

    df = pd.read_csv(DATASET_PATH)

    train_states = ["Assam", "Nagaland", "Arunachal Pradesh", "Meghalaya", "Tripura"]
    val_states = ["Mizoram"]
    test_states = ["Manipur"]

    df_train_raw = df[df["state"].isin(train_states)].copy()
    df_val = df[df["state"].isin(val_states)].copy()
    df_test = df[df["state"].isin(test_states)].copy()

    # Spatial buffer audit: identify train points within 10 km of test set
    test_coords = df_test[["latitude", "longitude"]].to_numpy()
    train_coords = df_train_raw[["latitude", "longitude"]].to_numpy()

    border_buffer_ids = set()
    for idx, r in df_train_raw.iterrows():
        lat, lon = r["latitude"], r["longitude"]
        min_d = min([haversine_km(lat, lon, t[0], t[1]) for t in test_coords])
        if min_d < 10.0:
            border_buffer_ids.add(r["sample_id"])

    print(f"Raw Train samples: {len(df_train_raw)}")
    print(f"Border buffer points (< 10 km from test set): {len(border_buffer_ids)}")

    # Create buffer-sanitized train set
    df_train_sanitized = df_train_raw[~df_train_raw["sample_id"].isin(border_buffer_ids)].copy()
    print(f"Sanitized Train samples (> 10 km from test set): {len(df_train_sanitized)} (Pos: {(df_train_sanitized['label']==1).sum()}, Bg: {(df_train_sanitized['label']==0).sum()})")

    # Verify min distance with sanitized train set
    sanitized_coords = df_train_sanitized[["latitude", "longitude"]].to_numpy()
    min_dist_sanitized = min([haversine_km(t[0], t[1], s[0], s[1]) for t in test_coords for s in sanitized_coords])
    print(f"Guaranteed Minimum Distance between Train and Test: {min_dist_sanitized:.2f} km")

    # Mark split targets
    df_train_sanitized["split_target"] = "TRAIN"
    df_val["split_target"] = "VAL"
    df_test["split_target"] = "TEST"

    # Save to disk
    df_train_sanitized.to_csv(TRAIN_SPLIT_PATH, index=False)
    df_val.to_csv(VAL_SPLIT_PATH, index=False)
    df_test.to_csv(TEST_SPLIT_PATH, index=False)

    print(f"\n[OUTPUT] Saved buffer-sanitized spatial splits:")
    print(f"  Train: {TRAIN_SPLIT_PATH} ({len(df_train_sanitized)} rows)")
    print(f"  Val:   {VAL_SPLIT_PATH} ({len(df_val)} rows)")
    print(f"  Test:  {TEST_SPLIT_PATH} ({len(df_test)} rows)")

    return df_train_sanitized, df_val, df_test

if __name__ == "__main__":
    perform_spatial_split()
