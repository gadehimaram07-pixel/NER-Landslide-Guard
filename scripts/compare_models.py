"""
Comparative Model Evaluation Utility for NER-LandslideGuard.
Evaluates Physics Baseline vs Random Forest vs XGBoost vs Hybrid AI Risk
side-by-side across all test dataset samples.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FEATURES_DIR = os.path.join(DATA_DIR, "features")
MODELS_DIR = os.path.join(DATA_DIR, "models")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

FEATURE_COLS = [
    "elevation_m", "slope_deg", "aspect_deg",
    "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_surround_max_mm",
    "soil_clay_pct", "soil_sand_pct", "soil_silt_pct",
    "soil_bulk_density", "soil_ph", "soil_organic_carbon",
    "lc_tree_cover", "lc_builtup",
    "saturation_pct", "cohesion_kpa"
]

# Canonical physics baseline — single source of truth (FoS-based, BIS IS 14458).
# Previously a simplified proxy (slope-2)/10 formula + 18-feature schema with
# wrong label column; now matches backend/ml/hybrid_risk.py live API.
def eval_physics(row):
    try:
        from backend.ml.hybrid_risk import compute_physics_baseline
    except ImportError:
        import sys as _sys
        _sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
        from ml.hybrid_risk import compute_physics_baseline
    res = compute_physics_baseline(
        slope_deg=float(row["slope_deg"]),
        rainfall_24h_mm=float(row["rainfall_24h_mm"]),
        rainfall_72h_mm=float(row["rainfall_72h_mm"]),
        elevation_m=float(row["elevation_m"]),
    )
    return res["score"], res["risk_level"]

def get_level(prob):
    if prob >= 0.75:
        return "CRITICAL"
    elif prob >= 0.55:
        return "HIGH"
    elif prob >= 0.35:
        return "MODERATE"
    else:
        return "LOW"

def main():
    sep = "=" * 80
    sep_dash = "-" * 80
    print(sep)
    print("NER-LANDSLIDEGUARD: COMPREHENSIVE PIPELINE BENCHMARK (PHYSICS vs ML vs HYBRID)")
    print(sep)

    test_path = os.path.join(FEATURES_DIR, "test_dataset.csv")
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
    xgb_path = os.path.join(MODELS_DIR, "xgboost_model.json")

    if not os.path.exists(test_path) or not os.path.exists(rf_path):
        print("[ERROR] Test dataset or Random Forest model artifact missing.")
        sys.exit(1)

    df_test = pd.read_csv(test_path)
    X_test = df_test[FEATURE_COLS]
    y_test = df_test["label"]

    rf = joblib.load(rf_path)
    rf_probs = rf.predict_proba(X_test)[:, 1]

    xgb_clf = None
    xgb_probs = None
    if XGBOOST_AVAILABLE and os.path.exists(xgb_path):
        xgb_clf = xgb.XGBClassifier()
        xgb_clf.load_model(xgb_path)
        xgb_probs = xgb_clf.predict_proba(X_test)[:, 1]

    alpha = 0.50
    results = []

    print(f"Test Set: {len(df_test)} samples ({int(y_test.sum())} Positive Landslides, {int((y_test == 0).sum())} Negative Backgrounds)")
    print(f"Hybrid Fusion Weight: alpha={alpha} (50% ML + 50% Physics)\n")

    # Header
    header = f"| {'Sample ID':20s} | {'Truth':5s} | {'Physics':12s} | {'Random Forest':14s} | {'XGBoost':12s} | {'Hybrid (a=0.5)':16s} | {'Agreement':15s} |"
    delim  = f"|{'-'*22}|{'-'*7}|{'-'*14}|{'-'*16}|{'-'*14}|{'-'*18}|{'-'*17}|"
    print(delim)
    print(header)
    print(delim)

    for i, row in df_test.iterrows():
        sid = row["sample_id"]
        truth = int(row["label"])
        p_score, p_lvl = eval_physics(row)
        m_rf = float(rf_probs[i])
        m_xgb = float(xgb_probs[i]) if xgb_probs is not None else 0.0
        h_score = round(alpha * m_rf + (1.0 - alpha) * p_score, 3)
        h_lvl = get_level(h_score)

        if abs(m_rf - p_score) < 0.20:
            agr = "CONCURRING"
        elif m_rf > p_score:
            agr = "ML_ELEVATED"
        else:
            agr = "PHYS_ELEVATED"

        p_str = f"{int(p_score*100)}% ({p_lvl[:3]})"
        rf_str = f"{int(m_rf*100)}% ({get_level(m_rf)[:3]})"
        xgb_str = f"{int(m_xgb*100)}% ({get_level(m_xgb)[:3]})" if xgb_probs is not None else "N/A"
        h_str = f"{int(h_score*100)}% ({h_lvl[:3]})"

        print(f"| {sid:20s} | {truth:5d} | {p_str:12s} | {rf_str:14s} | {xgb_str:12s} | {h_str:16s} | {agr:15s} |")
        results.append({
            "sample_id": sid,
            "district": row["district"],
            "ground_truth": truth,
            "physics_baseline_score": p_score,
            "physics_baseline_level": p_lvl,
            "random_forest_prob": round(m_rf, 4),
            "random_forest_level": get_level(m_rf),
            "xgboost_prob": round(m_xgb, 4) if xgb_probs is not None else None,
            "xgboost_level": get_level(m_xgb) if xgb_probs is not None else None,
            "hybrid_risk_score": h_score,
            "hybrid_risk_level": h_lvl,
            "alpha": alpha,
            "model_agreement": agr
        })

    print(delim)
    print(f"\nPipeline Performance Summary on Test Set (N={len(df_test)}):")
    rf_preds = (rf_probs >= 0.50).astype(int)
    rf_acc = np.mean(rf_preds == y_test.values) * 100
    phys_preds = np.array([1 if eval_physics(r)[0] >= 0.50 else 0 for _, r in df_test.iterrows()])
    phys_acc = np.mean(phys_preds == y_test.values) * 100
    hybrid_preds = np.array([1 if r["hybrid_risk_score"] >= 0.50 else 0 for r in results])
    hybrid_acc = np.mean(hybrid_preds == y_test.values) * 100

    print(f"  Physics Baseline Accuracy: {phys_acc:.1f}% (Canonical FoS limit-equilibrium, BIS IS 14458)")
    print(f"  Random Forest Accuracy:    {rf_acc:.1f}% (Learned from 16 features, zero-leakage)")
    print(f"  Hybrid Fused Accuracy:     {hybrid_acc:.1f}% (Fusing empirical ML with geotechnical physics)")

    out_path = os.path.join(PROCESSED_DIR, "model_comparison_detailed.json")
    with open(out_path, "w") as f:
        json.dump({
            "comparison_timestamp": datetime.utcnow().isoformat(),
            "disclaimer": "PRELIMINARY RESULTS ON A PROTOTYPE DATASET",
            "alpha": alpha,
            "test_sample_count": len(df_test),
            "accuracy_summary": {
                "physics_baseline_pct": phys_acc,
                "random_forest_pct": rf_acc,
                "hybrid_fused_pct": hybrid_acc
            },
            "samples": results
        }, f, indent=2)

    print(sep_dash)
    print(f"[SAVED] Detailed comparison exported to: {out_path}")
    print(sep)
    print(">> NOTE:")
    print("   Evaluated on the expanded 520-sample master catalog (Test N=70).")
    print("   Physics baseline is the canonical FoS engine shared with the live API.")
    print(sep)

if __name__ == "__main__":
    main()
