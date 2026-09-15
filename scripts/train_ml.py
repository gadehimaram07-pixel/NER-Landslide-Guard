"""
Unified End-to-End ML Training, Evaluation & Verification Pipeline for NER-LandslideGuard.
Executes sequentially:
1. Dataset preparation & zero-leakage grouped spatial block splitting (prepare_dataset.py).
2. Provenance inspection and audit verification (inspect_training_dataset.py).
3. Random Forest and XGBoost model training (train_models.py).
4. Rigorous test evaluation and physics baseline comparison (evaluate_models.py).
"""

import os
import sys
import json
import subprocess
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
DATA_DIR = os.path.join(BASE_DIR, "data")
FEATURES_DIR = os.path.join(DATA_DIR, "features")
MODELS_DIR = os.path.join(DATA_DIR, "models")

def run_step(step_num, step_name, script_name):
    sep = "=" * 80
    print("\n" + sep)
    print(f"  STEP {step_num}/4: {step_name.upper()}")
    print(f"  Executing: python -u scripts/{script_name}")
    print(sep)

    script_path = os.path.join(SCRIPTS_DIR, script_name)
    if not os.path.exists(script_path):
        print(f"[FATAL] Script not found: {script_path}")
        sys.exit(1)

    res = subprocess.run([sys.executable, "-u", script_path], cwd=BASE_DIR)
    if res.returncode != 0:
        print(f"\n[FAILURE] Step {step_num} ({script_name}) failed with returncode {res.returncode}.")
        sys.exit(res.returncode)
    print(f"[PASS] Step {step_num} completed successfully.")

def main():
    start_time = datetime.utcnow()
    sep_star = "*" * 80
    sep_hash = "#" * 80
    sep_dash = "-" * 80
    sep_eq = "=" * 80

    print(sep_star)
    print("   NER-LANDSLIDEGUARD: UNIFIED ML PIPELINE ORCHESTRATION ENGINE")
    print("   Physics-Informed + Real Data-Driven ML + Hybrid Early Warning")
    print(sep_star)
    print(f"Timestamp: {start_time.isoformat()}Z")
    print(f"Workspace: {BASE_DIR}")

    isro_file = os.path.join(DATA_DIR, "raw", "isro", "isro_landslide_atlas_sikkim.csv")
    srtm_file = os.path.join(DATA_DIR, "raw", "srtm", "srtm_sikkim_30m.npz")
    if not os.path.exists(isro_file) or not os.path.exists(srtm_file):
        print(f"[ERROR] Raw datasets missing in {DATA_DIR}/raw/. Run download_data.py first.")
        sys.exit(1)

    run_step(1, "Feature Engineering & Zero-Leakage Spatial Split", "prepare_dataset.py")
    run_step(2, "Dataset Integrity & Provenance Audit", "inspect_training_dataset.py")
    run_step(3, "Supervised Model Training (RF + XGBoost)", "train_models.py")
    run_step(4, "Model Evaluation & Comparative Benchmark", "evaluate_models.py")

    meta_path = os.path.join(FEATURES_DIR, "dataset_metadata.json")
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    comp_path = os.path.join(MODELS_DIR, "model_comparison.json")

    with open(meta_path, "r") as f:
        meta = json.load(f)
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    with open(comp_path, "r") as f:
        comparison = json.load(f)

    rf_m = metrics.get("random_forest", {})
    xgb_m = metrics.get("xgboost") or {}
    elapsed = (datetime.utcnow() - start_time).total_seconds()

    print("\n" + sep_hash)
    print("                    UNIFIED PIPELINE EXECUTION SUMMARY")
    print(sep_hash)
    print(f"Total Execution Time:        {elapsed:.2f} seconds")
    print(f"Dataset Pipeline Version:    {meta.get('version', '1.1.0')}")
    print(f"Total Labeled Samples:       {meta['sample_counts']['total_samples']} (20 Positive Events, 20 Negative Backgrounds)")
    print(f"Train / Val / Test Split:    {meta['sample_counts']['training_samples']} Train / {meta['sample_counts']['validation_samples']} Validation / {meta['sample_counts']['test_samples']} Test")
    leak = meta['spatial_leakage_audit']
    print(f"Zero Spatial Leakage Audit:  PASS (Min dist Test-Train: {leak['min_distance_test_to_train_km']} km, Val-Train: {leak['min_distance_val_to_train_km']} km)")
    print(f"Engineered Features:         {len(meta['feature_list'])} multi-source features across SRTM, IMERG, SoilGrids, WorldCover")
    print(sep_dash)
    print("TEST-SET EVALUATION RESULTS (N=6 Unseen Spatial Block Samples):")
    print(f"  Random Forest Classifier:  Accuracy: {rf_m.get('accuracy', 0)*100:.1f}% | Recall: {rf_m.get('recall', 0):.3f} | Precision: {rf_m.get('precision', 0):.3f} | ROC-AUC: {rf_m.get('roc_auc', 0):.3f}")
    if xgb_m:
        print(f"  XGBoost Classifier:        Accuracy: {xgb_m.get('accuracy', 0)*100:.1f}% | Recall: {xgb_m.get('recall', 0):.3f} | Precision: {xgb_m.get('precision', 0):.3f} | ROC-AUC: {xgb_m.get('roc_auc', 0):.3f}")
    print(sep_dash)
    print("DUAL-PIPELINE COMPARISON (Physics vs ML vs Hybrid) ON TEST SAMPLES:")
    for c in comparison:
        sid = c['sample_id']
        lbl = c['ground_truth_label']
        p_score = int(c['physics_baseline']['score'] * 100)
        p_lvl = c['physics_baseline']['risk_level']
        m_score = int(c['ml_model_prediction']['probability'] * 100)
        m_lvl = c['ml_model_prediction']['risk_level']
        h_score = int(c['hybrid_fused_risk']['score'] * 100)
        h_lvl = c['hybrid_fused_risk']['risk_level']
        print(f"  Sample {sid:20s} | Truth: {lbl} | Physics: {p_score:2d}% [{p_lvl:8s}] | ML (RF): {m_score:2d}% [{m_lvl:8s}] | Hybrid: {h_score:2d}% [{h_lvl:8s}]")
    print(sep_eq)
    print(">> MANDATORY PROTOTYPE NOTICE:")
    print("   At the current prototype stage, the ML pipeline demonstrates the complete")
    print("   data-to-prediction workflow using a small labeled dataset (N=40). The reported")
    print("   metrics are preliminary and are not presented as deployment-level performance.")
    print("   PRELIMINARY RESULTS ON A PROTOTYPE DATASET.")
    print(sep_eq)

if __name__ == "__main__":
    main()
