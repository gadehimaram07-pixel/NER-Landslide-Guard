"""
Dataset Inspection & Provenance Verification Utility for NER-LandslideGuard.
Performs an exhaustive audit on raw, feature, and split datasets.
Outputs summary statistics and saves data/processed/training_dataset_summary.json.
"""

import os
import sys
import json
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FEATURES_DIR = os.path.join(DATA_DIR, "features")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

EXPECTED_FEATURES = [
    "elevation_m", "slope_deg", "aspect_deg",
    "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_surround_max_mm",
    "soil_clay_pct", "soil_sand_pct", "soil_silt_pct",
    "soil_bulk_density", "soil_ph", "soil_organic_carbon",
    "lc_tree_cover", "lc_shrubland", "lc_grassland",
    "lc_cropland", "lc_builtup", "lc_sparse_vegetation"
]

def inspect_datasets():
    train_path = os.path.join(FEATURES_DIR, "training_dataset.csv")
    val_path = os.path.join(FEATURES_DIR, "validation_dataset.csv")
    test_path = os.path.join(FEATURES_DIR, "test_dataset.csv")

    if not os.path.exists(train_path) or not os.path.exists(val_path) or not os.path.exists(test_path):
        print(f"[ERROR] Split datasets not found in {FEATURES_DIR}. Run prepare_dataset.py first.")
        sys.exit(1)

    df_train = pd.read_csv(train_path)
    df_val = pd.read_csv(val_path)
    df_test = pd.read_csv(test_path)

    # Combine into total dataset
    df_all = pd.concat([df_train, df_val, df_test], ignore_index=True)

    total_samples = len(df_all)
    positives = int(df_all["landslide_label"].sum())
    negatives = int((df_all["landslide_label"] == 0).sum())
    pos_pct = round((positives / total_samples) * 100, 2)
    neg_pct = round((negatives / total_samples) * 100, 2)

    # Features check
    feature_cols = [c for c in df_all.columns if c in EXPECTED_FEATURES]
    missing_per_feature = {c: int(df_all[c].isnull().sum()) for c in feature_cols}

    # Duplicates check
    dup_rows = int(df_all.duplicated().sum())
    dup_coords = int(df_all.duplicated(subset=["latitude", "longitude"]).sum())

    # Coordinate range
    min_lat = float(df_all["latitude"].min())
    max_lat = float(df_all["latitude"].max())
    min_lon = float(df_all["longitude"].min())
    max_lon = float(df_all["longitude"].max())

    # Label distribution
    label_dist = {
        "1 (Positive / Landslide)": positives,
        "0 (Negative / Stable Terrain)": negatives
    }

    # Splits distribution
    splits_summary = {
        "train": {
            "total": len(df_train),
            "positives": int(df_train["landslide_label"].sum()),
            "negatives": int((df_train["landslide_label"] == 0).sum())
        },
        "validation": {
            "total": len(df_val),
            "positives": int(df_val["landslide_label"].sum()),
            "negatives": int((df_val["landslide_label"] == 0).sum())
        },
        "test": {
            "total": len(df_test),
            "positives": int(df_test["landslide_label"].sum()),
            "negatives": int((df_test["landslide_label"] == 0).sum())
        }
    }

    print("=" * 80)
    print("NER-LANDSLIDEGUARD: TRAINING DATASET PROVENANCE & INTEGRITY AUDIT")
    print("=" * 80)
    print(f"Total samples:                 {total_samples}")
    print(f"Positive samples:              {positives}")
    print(f"Negative samples:              {negatives}")
    print(f"Positive percentage:           {pos_pct}%")
    print(f"Negative percentage:           {neg_pct}%")
    print(f"Number of features:            {len(feature_cols)}")
    print("\nFeature names:")
    for idx, f in enumerate(feature_cols, 1):
        print(f"  {idx:2d}. {f}")

    print("\nMissing values per feature:")
    for f, cnt in missing_per_feature.items():
        print(f"  {f:28s}: {cnt} missing")

    print(f"\nDuplicate rows:                {dup_rows}")
    print(f"Duplicate coordinates:         {dup_coords}")
    print(f"Coordinate range:              Lat [{min_lat:.5f}, {max_lat:.5f}], Lon [{min_lon:.5f}, {max_lon:.5f}]")
    print("\nLabel distribution:")
    for lbl, count in label_dist.items():
        print(f"  {lbl}: {count}")

    print("\nTrain/Validation/Test counts:")
    print(f"  Train samples:      {splits_summary['train']['total']} (Pos: {splits_summary['train']['positives']}, Neg: {splits_summary['train']['negatives']})")
    print(f"  Validation samples: {splits_summary['validation']['total']} (Pos: {splits_summary['validation']['positives']}, Neg: {splits_summary['validation']['negatives']})")
    print(f"  Test samples:       {splits_summary['test']['total']} (Pos: {splits_summary['test']['positives']}, Neg: {splits_summary['test']['negatives']})")

    # Export summary JSON
    summary_data = {
        "audit_timestamp": pd.Timestamp.utcnow().isoformat(),
        "total_samples": total_samples,
        "positive_samples": positives,
        "negative_samples": negatives,
        "positive_percentage": pos_pct,
        "negative_percentage": neg_pct,
        "num_features": len(feature_cols),
        "feature_names": feature_cols,
        "missing_values_per_feature": missing_per_feature,
        "duplicate_rows": dup_rows,
        "duplicate_coordinates": dup_coords,
        "coordinate_range": {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon
        },
        "label_distribution": label_dist,
        "splits_summary": splits_summary
    }

    out_json = os.path.join(PROCESSED_DIR, "training_dataset_summary.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    print("\n" + "=" * 80)
    print(f"[SAVED] Dataset inspection summary saved to: {out_json}")
    print("=" * 80)
    return summary_data

if __name__ == "__main__":
    inspect_datasets()
