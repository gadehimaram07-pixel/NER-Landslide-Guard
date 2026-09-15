import os
import json
import math
import pandas as pd
import numpy as np

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def evaluate_splits():
    features_csv = os.path.join("data", "features", "landslide_features.csv")
    if not os.path.exists(features_csv):
        raise FileNotFoundError(f"Missing {features_csv}")
    
    df = pd.read_csv(features_csv)
    df['event_date_dt'] = pd.to_datetime(df['event_date'])
    
    print("="*80)
    print("PHASE 12: DATASET SPLIT & LEAKAGE PREVENTION VERIFICATION")
    print("="*80)
    
    # -------------------------------------------------------------
    # 1. SPATIAL BLOCKING STRATEGY
    # -------------------------------------------------------------
    # South Sikkim / East Sikkim lower valley vs North / Central Sikkim
    # Lat threshold: Train = Lat <= 27.32 (Southern Block), Test = Lat >= 27.38 (Northern Block), Val = 27.32 < Lat < 27.38 (Central Buffer Block)
    train_spatial = df[df['latitude'] <= 27.31]
    val_spatial = df[(df['latitude'] > 27.31) & (df['latitude'] < 27.37)]
    test_spatial = df[df['latitude'] >= 27.37]
    
    # Calculate min spatial distances
    min_dist_train_test = float('inf')
    closest_pair_spatial = None
    for _, tr in train_spatial.iterrows():
        for _, te in test_spatial.iterrows():
            d = haversine_km(tr['latitude'], tr['longitude'], te['latitude'], te['longitude'])
            if d < min_dist_train_test:
                min_dist_train_test = d
                closest_pair_spatial = (tr['sample_id'], te['sample_id'], d)
                
    min_dist_train_val = float('inf')
    for _, tr in train_spatial.iterrows():
        for _, va in val_spatial.iterrows():
            d = haversine_km(tr['latitude'], tr['longitude'], va['latitude'], va['longitude'])
            if d < min_dist_train_val:
                min_dist_train_val = d

    spatial_leakage_passed = (min_dist_train_test >= 3.0)
    
    print(f"--- Strategy A: Spatial Blocking (Geographic Partition) ---")
    print(f"Train samples (South Block <= 27.31):    {len(train_spatial)} (Pos: {(train_spatial['label']==1).sum()}, Neg: {(train_spatial['label']==0).sum()})")
    print(f"Val samples (Central Block 27.31-27.37):  {len(val_spatial)} (Pos: {(val_spatial['label']==1).sum()}, Neg: {(val_spatial['label']==0).sum()})")
    print(f"Test samples (North Block >= 27.37):     {len(test_spatial)} (Pos: {(test_spatial['label']==1).sum()}, Neg: {(test_spatial['label']==0).sum()})")
    print(f"Min Distance between Train & Test:       {min_dist_train_test:.2f} km (Threshold: >= 3.0 km) -> {'PASS' if spatial_leakage_passed else 'FAIL'}")
    print(f"Min Distance between Train & Val:        {min_dist_train_val:.2f} km")
    if closest_pair_spatial:
        print(f"Closest pair (Train vs Test):            {closest_pair_spatial[0]} and {closest_pair_spatial[1]} ({closest_pair_spatial[2]:.2f} km)")
    
    # -------------------------------------------------------------
    # 2. TEMPORAL SPLIT STRATEGY
    # -------------------------------------------------------------
    # Train: 2020-07-04 to 2022-12-31
    # Val:   2023-01-01 to 2024-05-01
    # Test:  2024-05-02 to 2025-07-02
    train_temporal = df[df['event_date_dt'] <= '2022-12-31']
    val_temporal = df[(df['event_date_dt'] > '2022-12-31') & (df['event_date_dt'] <= '2024-05-01')]
    test_temporal = df[df['event_date_dt'] > '2024-05-01']
    
    max_train_date = train_temporal['event_date_dt'].max()
    min_val_date = val_temporal['event_date_dt'].min()
    max_val_date = val_temporal['event_date_dt'].max()
    min_test_date = test_temporal['event_date_dt'].min()
    
    temporal_leakage_passed = (min_test_date > max_train_date) and (min_val_date > max_train_date) and (min_test_date > max_val_date)
    
    print(f"\n--- Strategy B: Temporal Split (Time-Horizon Partition) ---")
    print(f"Train samples (<= 2022-12-31):           {len(train_temporal)} (Dates: {train_temporal['event_date'].min()} to {train_temporal['event_date'].max()})")
    print(f"Val samples (2023-01-01 to 2024-05-01):  {len(val_temporal)} (Dates: {val_temporal['event_date'].min()} to {val_temporal['event_date'].max()})")
    print(f"Test samples (> 2024-05-01):             {len(test_temporal)} (Dates: {test_temporal['event_date'].min()} to {test_temporal['event_date'].max()})")
    print(f"Temporal Leakage Check:                  Train max ({max_train_date.strftime('%Y-%m-%d')}) < Val min ({min_val_date.strftime('%Y-%m-%d')}) < Test min ({min_test_date.strftime('%Y-%m-%d')}) -> {'PASS' if temporal_leakage_passed else 'FAIL'}")
    
    # Save verification JSON
    report = {
        "verification_timestamp": pd.Timestamp.now().isoformat(),
        "total_samples": len(df),
        "spatial_split_strategy": {
            "strategy_name": "Geographic Latitudinal Spatial Blocking",
            "train_samples": int(len(train_spatial)),
            "validation_samples": int(len(val_spatial)),
            "test_samples": int(len(test_spatial)),
            "min_distance_train_test_km": round(min_dist_train_test, 2),
            "spatial_buffer_threshold_km": 3.0,
            "zero_leakage_verified": bool(spatial_leakage_passed),
            "closest_train_test_pair": {
                "train_sample": closest_pair_spatial[0],
                "test_sample": closest_pair_spatial[1],
                "distance_km": round(closest_pair_spatial[2], 2)
            }
        },
        "temporal_split_strategy": {
            "strategy_name": "Chronological Cutoff (Walk-Forward)",
            "train_samples": int(len(train_temporal)),
            "validation_samples": int(len(val_temporal)),
            "test_samples": int(len(test_temporal)),
            "train_date_span": [train_temporal['event_date'].min(), train_temporal['event_date'].max()],
            "val_date_span": [val_temporal['event_date'].min(), val_temporal['event_date'].max()],
            "test_date_span": [test_temporal['event_date'].min(), test_temporal['event_date'].max()],
            "zero_temporal_leakage_verified": bool(temporal_leakage_passed)
        }
    }
    
    out_json = os.path.join("data", "processed", "split_leakage_verification.json")
    with open(out_json, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[SAVED] Leakage verification saved to: {out_json}")
    print("="*80)

if __name__ == "__main__":
    evaluate_splits()
