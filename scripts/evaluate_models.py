"""
Model Evaluation & Physics vs ML Comparative Benchmark for NER-LandslideGuard (V2.1.0).

Computes:
- Precision, Recall, F1-Score, ROC-AUC, Average Precision (PR-AUC), Confusion Matrix on Test Set.
- Benchmarks Physics-Informed Baseline on the exact same test dataset samples.
- Produces: models/model_metrics.json and models/model_comparison.json.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, accuracy_score
)

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FEATURES_DIR = os.path.join(DATA_DIR, "features")
MODELS_DIR = os.path.join(DATA_DIR, "models")

FEATURE_COLS = [
    "elevation_m", "slope_deg", "aspect_deg",
    "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_surround_max_mm",
    "soil_clay_pct", "soil_sand_pct", "soil_silt_pct",
    "soil_bulk_density", "soil_ph", "soil_organic_carbon",
    "lc_tree_cover", "lc_builtup",
    "saturation_pct", "cohesion_kpa"
]
LABEL_COL = "label"

# Canonical physics baseline — single source of truth.
# Previously this file used a simplified 0.40/0.45/0.15 weighted proxy with
# slope_norm=(slope-2)/10 (saturating at 12 deg), which disagreed completely
# with the live FoS-based backend/ml/hybrid_risk.py::compute_physics_baseline.
# Now delegates to the canonical implementation so offline metrics match live API.
def evaluate_physics_baseline_sample(row):
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

def probability_to_level(prob):
    if prob >= 0.75:
        return "CRITICAL"
    elif prob >= 0.55:
        return "HIGH"
    elif prob >= 0.35:
        return "MODERATE"
    else:
        return "LOW"

def main():
    print("=" * 80)
    print("NER-LandslideGuard - Rigorous Model Evaluation & Physics Benchmark (V2.1.0)")
    print("=" * 80)

    test_path = os.path.join(FEATURES_DIR, "test_dataset.csv")
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")

    if not os.path.exists(test_path) or not os.path.exists(rf_path):
        print("[ERROR] Test dataset or trained models missing.")
        sys.exit(1)

    df_test = pd.read_csv(test_path)
    X_test = df_test[FEATURE_COLS]
    y_test = df_test[LABEL_COL]

    print(f"Test Set Size: {len(df_test)} samples (Positives: {y_test.sum()}, Negatives: {(y_test == 0).sum()})")

    # 1. Random Forest Evaluation
    rf = joblib.load(rf_path)
    rf_preds = rf.predict(X_test)
    rf_probs = rf.predict_proba(X_test)[:, 1]

    rf_acc = accuracy_score(y_test, rf_preds)
    rf_prec = precision_score(y_test, rf_preds, zero_division=0)
    rf_rec = recall_score(y_test, rf_preds, zero_division=0)
    rf_f1 = f1_score(y_test, rf_preds, zero_division=0)
    try:
        rf_roc = roc_auc_score(y_test, rf_probs)
        rf_prauc = average_precision_score(y_test, rf_probs)
    except Exception:
        rf_roc = None
        rf_prauc = None

    cm_rf = confusion_matrix(y_test, rf_preds).tolist()

    print("\n--- 1. Random Forest Test Performance ---")
    print(f"  Accuracy:         {rf_acc * 100:.1f}%")
    print(f"  Precision:        {rf_prec:.3f}")
    print(f"  Recall:           {rf_rec:.3f}")
    print(f"  F1-Score:         {rf_f1:.3f}")
    if rf_roc is not None:
        print(f"  ROC-AUC:          {rf_roc:.3f}")
        print(f"  PR-AUC (AvgPrec): {rf_prauc:.3f}")
    print(f"  Confusion Matrix: TN={cm_rf[0][0]}, FP={cm_rf[0][1]}, FN={cm_rf[1][0]}, TP={cm_rf[1][1]}")

    # 2. XGBoost Evaluation
    xgb_metrics = None
    xgb_path = os.path.join(MODELS_DIR, "xgboost_model.json")
    if XGBOOST_AVAILABLE and os.path.exists(xgb_path):
        xgb_clf = xgb.XGBClassifier()
        xgb_clf.load_model(xgb_path)
        xgb_preds = xgb_clf.predict(X_test)
        xgb_probs = xgb_clf.predict_proba(X_test)[:, 1]

        xgb_acc = accuracy_score(y_test, xgb_preds)
        xgb_prec = precision_score(y_test, xgb_preds, zero_division=0)
        xgb_rec = recall_score(y_test, xgb_preds, zero_division=0)
        xgb_f1 = f1_score(y_test, xgb_preds, zero_division=0)
        try:
            xgb_roc = roc_auc_score(y_test, xgb_probs)
            xgb_prauc = average_precision_score(y_test, xgb_probs)
        except Exception:
            xgb_roc = None
            xgb_prauc = None

        cm_xgb = confusion_matrix(y_test, xgb_preds).tolist()
        print("\n--- 2. XGBoost Classifier Test Performance ---")
        print(f"  Accuracy:         {xgb_acc * 100:.1f}%")
        print(f"  Precision:        {xgb_prec:.3f}")
        print(f"  Recall:           {xgb_rec:.3f}")
        print(f"  F1-Score:         {xgb_f1:.3f}")
        if xgb_roc is not None:
            print(f"  ROC-AUC:          {xgb_roc:.3f}")
            print(f"  PR-AUC (AvgPrec): {xgb_prauc:.3f}")
        print(f"  Confusion Matrix: TN={cm_xgb[0][0]}, FP={cm_xgb[0][1]}, FN={cm_xgb[1][0]}, TP={cm_xgb[1][1]}")

        xgb_metrics = {
            "model": "XGBClassifier",
            "accuracy": round(float(xgb_acc), 4),
            "precision": round(float(xgb_prec), 4),
            "recall": round(float(xgb_rec), 4),
            "f1_score": round(float(xgb_f1), 4),
            "roc_auc": round(float(xgb_roc), 4) if xgb_roc is not None else None,
            "pr_auc": round(float(xgb_prauc), 4) if xgb_prauc is not None else None,
            "confusion_matrix": cm_xgb
        }

    # Save Model Metrics
    metrics_export = {
        "evaluation_timestamp": datetime.utcnow().isoformat(),
        "test_samples_count": len(df_test),
        "random_forest": {
            "model": "RandomForestClassifier",
            "accuracy": round(float(rf_acc), 4),
            "precision": round(float(rf_prec), 4),
            "recall": round(float(rf_rec), 4),
            "f1_score": round(float(rf_f1), 4),
            "roc_auc": round(float(rf_roc), 4) if rf_roc is not None else None,
            "pr_auc": round(float(rf_prauc), 4) if rf_prauc is not None else None,
            "confusion_matrix": cm_rf
        },
        "xgboost": xgb_metrics
    }

    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_export, f, indent=2)
    print(f"\n[METRICS] Saved evaluation metrics: {metrics_path}")

    # 3. Side-by-Side Comparison: Physics Baseline vs ML vs Hybrid
    print("\n--- 3. Physics Baseline vs ML Model vs Hybrid Comparison on Test Samples ---")
    alpha = 0.50
    comparison_table = []

    for i, row in df_test.iterrows():
        sample_id = row["sample_id"]
        true_label = int(row["label"])
        
        phys_score, phys_level = evaluate_physics_baseline_sample(row)
        ml_prob = round(float(rf_probs[i]), 3)
        ml_level = probability_to_level(ml_prob)

        hybrid_score = round(alpha * ml_prob + (1.0 - alpha) * phys_score, 3)
        hybrid_level = probability_to_level(hybrid_score)

        comparison_table.append({
            "sample_id": sample_id,
            "district": row["district"],
            "ground_truth_label": true_label,
            "physics_baseline": {
                "score": phys_score,
                "risk_level": phys_level
            },
            "ml_model_prediction": {
                "probability": ml_prob,
                "risk_level": ml_level
            },
            "hybrid_fused_risk": {
                "score": hybrid_score,
                "risk_level": hybrid_level,
                "alpha_ml_weight": alpha
            }
        })

        print(f"Sample {sample_id} (Truth: {true_label}) | "
              f"Physics: {int(phys_score*100)}% [{phys_level}] | "
              f"ML: {int(ml_prob*100)}% [{ml_level}] | "
              f"Hybrid: {int(hybrid_score*100)}% [{hybrid_level}]")

    comp_path = os.path.join(MODELS_DIR, "model_comparison.json")
    with open(comp_path, "w") as f:
        json.dump(comparison_table, f, indent=2)
    print(f"\n[COMPARISON] Saved benchmark comparison: {comp_path}")
    print("=" * 80)

if __name__ == "__main__":
    main()
