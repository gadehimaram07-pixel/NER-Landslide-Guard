"""
scripts/pipeline_real/10_train_shadow_models.py

Phase 2C: Training Isolated Real-Data Shadow Models for Northeast India.
Enforces strict rules:
- Uses ONLY the 5 genuinely extracted physical features:
  ['elevation_m', 'slope_deg', 'aspect_deg', 'rainfall_24h_mm', 'rainfall_72h_mm']
- ZERO imputation of the 11 missing features.
- ZERO use of coordinates, dates, states, or provenance fields as features.
- Modest complexity (prevent overfitting on 630-sample observational catalog).
- Compares:
  1. Logistic Regression (Standardized)
  2. Random Forest Classifier
  3. HistGradientBoosting Classifier
  4. XGBoost Classifier
- Evaluates on:
  * Spatial Holdout Test Set (Manipur: 112 samples, >10 km buffer-isolated)
  * Spatial Group 5-Fold Cross-Validation (Grouped by state across NER)
- Saves all artifacts strictly under data/models/real_shadow/
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, brier_score_loss, confusion_matrix
)
import xgboost as xgb

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FEATURES_DIR = os.path.join(BASE_DIR, "data", "features")
MODELS_DIR = os.path.join(BASE_DIR, "data", "models", "real_shadow")
os.makedirs(MODELS_DIR, exist_ok=True)

TRAIN_PATH = os.path.join(FEATURES_DIR, "real_train_features.csv")
VAL_PATH = os.path.join(FEATURES_DIR, "real_val_features.csv")
TEST_PATH = os.path.join(FEATURES_DIR, "real_test_features.csv")
FULL_PATH = os.path.join(FEATURES_DIR, "real_landslide_features.csv")

CORE_5_FEATURES = [
    "elevation_m",
    "slope_deg",
    "aspect_deg",
    "rainfall_24h_mm",
    "rainfall_72h_mm"
]

def train_and_evaluate_shadow_models():
    print("=" * 80)
    print("PHASE 2C: TRAINING ISOLATED REAL-DATA SHADOW MODELS (5 PHYSICAL FEATURES)")
    print("=" * 80)

    # Load splits
    df_train = pd.read_csv(TRAIN_PATH)
    df_val = pd.read_csv(VAL_PATH)
    df_test = pd.read_csv(TEST_PATH)
    df_full = pd.read_csv(FULL_PATH)

    print(f"Features: {CORE_5_FEATURES}")
    print(f"Train Set: {len(df_train)} samples (Pos: {(df_train['label']==1).sum()}, Bg: {(df_train['label']==0).sum()})")
    print(f"Val Set:   {len(df_val)} samples (Pos: {(df_val['label']==1).sum()}, Bg: {(df_val['label']==0).sum()})")
    print(f"Test Set:  {len(df_test)} samples (Pos: {(df_test['label']==1).sum()}, Bg: {(df_test['label']==0).sum()})")

    X_train = df_train[CORE_5_FEATURES].to_numpy()
    y_train = df_train["label"].to_numpy()

    X_test = df_test[CORE_5_FEATURES].to_numpy()
    y_test = df_test["label"].to_numpy()

    # Define modest models
    models = {
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
        ]),
        "RandomForest": RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42
        ),
        "HistGradientBoosting": HistGradientBoostingClassifier(
            max_depth=4,
            min_samples_leaf=10,
            learning_rate=0.08,
            random_state=42
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=80,
            max_depth=3,
            learning_rate=0.08,
            subsample=0.8,
            eval_metric="logloss",
            random_state=42
        )
    }

    # 1. Spatial Group 5-Fold Cross-Validation on Full Dataset
    print("\n--- [Spatial Group Cross-Validation (Grouped by State)] ---")
    X_full = df_full[CORE_5_FEATURES].to_numpy()
    y_full = df_full["label"].to_numpy()
    groups_full = df_full["state"].to_numpy()

    gkf = GroupKFold(n_splits=5)
    cv_results = {}

    for name, model in models.items():
        fold_aucs, fold_f1s, fold_accs = [], [], []
        for fold, (tr_idx, val_idx) in enumerate(gkf.split(X_full, y_full, groups=groups_full)):
            X_tr_f, y_tr_f = X_full[tr_idx], y_full[tr_idx]
            X_val_f, y_val_f = X_full[val_idx], y_full[val_idx]

            model.fit(X_tr_f, y_tr_f)
            y_pred = model.predict(X_val_f)
            y_prob = model.predict_proba(X_val_f)[:, 1]

            fold_accs.append(accuracy_score(y_val_f, y_pred))
            fold_f1s.append(f1_score(y_val_f, y_pred, zero_division=0))
            fold_aucs.append(roc_auc_score(y_val_f, y_prob))

        cv_results[name] = {
            "cv_accuracy_mean": round(float(np.mean(fold_accs)), 4),
            "cv_accuracy_std": round(float(np.std(fold_accs)), 4),
            "cv_roc_auc_mean": round(float(np.mean(fold_aucs)), 4),
            "cv_roc_auc_std": round(float(np.std(fold_aucs)), 4),
            "cv_f1_mean": round(float(np.mean(fold_f1s)), 4),
            "cv_f1_std": round(float(np.std(fold_f1s)), 4)
        }
        print(f"  {name:<22}: Spatial CV ROC-AUC = {np.mean(fold_aucs):.3f} (±{np.std(fold_aucs):.3f}), F1 = {np.mean(fold_f1s):.3f}")

    # 2. Fit on Sanitized Training Set & Evaluate on Held-Out Test Set (Manipur)
    print("\n--- [Spatial Holdout Test Set Evaluation (Manipur: 112 samples)] ---")
    test_metrics = {}
    feature_importances = {}
    test_predictions_df = df_test[["sample_id", "label", "state", "latitude", "longitude"]].copy()

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        roc_auc = roc_auc_score(y_test, y_prob)
        pr_auc = average_precision_score(y_test, y_prob)
        brier = brier_score_loss(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred).tolist()

        test_metrics[name] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "brier_score": round(float(brier), 4),
            "confusion_matrix": {
                "true_negative": cm[0][0],
                "false_positive": cm[0][1],
                "false_negative": cm[1][0],
                "true_positive": cm[1][1]
            },
            "spatial_cv": cv_results[name]
        }

        test_predictions_df[f"{name}_prob"] = np.round(y_prob, 4)
        test_predictions_df[f"{name}_pred"] = y_pred

        # Extract feature importances
        if name == "LogisticRegression":
            coefs = np.abs(model.named_steps["clf"].coef_[0])
            norm_coefs = coefs / np.sum(coefs)
            feature_importances[name] = {feat: round(float(val), 4) for feat, val in zip(CORE_5_FEATURES, norm_coefs)}
        elif name == "RandomForest":
            importances = model.feature_importances_
            feature_importances[name] = {feat: round(float(val), 4) for feat, val in zip(CORE_5_FEATURES, importances)}
        elif name == "XGBoost":
            importances = model.feature_importances_
            feature_importances[name] = {feat: round(float(val), 4) for feat, val in zip(CORE_5_FEATURES, importances)}
        elif name == "HistGradientBoosting":
            feature_importances[name] = "Not directly available as tree impurity"

        # Save model binary
        model_filename = f"{name.lower()}.joblib"
        model_filepath = os.path.join(MODELS_DIR, model_filename)
        joblib.dump(model, model_filepath)
        print(f"  Saved {name} model -> {model_filepath}")

        print(f"  {name:<22}: Acc={acc:.3f}, Prec={prec:.3f}, Rec={rec:.3f}, F1={f1:.3f}, ROC-AUC={roc_auc:.3f}, PR-AUC={pr_auc:.3f}")
        print(f"     Confusion Matrix: TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")

    # 3. Save Predictions CSV & Metrics JSON
    preds_path = os.path.join(MODELS_DIR, "test_predictions.csv")
    test_predictions_df.to_csv(preds_path, index=False)
    print(f"\n[OUTPUT] Saved test predictions to {preds_path}")

    metrics_output = {
        "evaluation_timestamp": pd.Timestamp.now().isoformat(),
        "dataset": "real_landslide_features.csv (NASA GLC + SRTM 30m + NASA POWER)",
        "feature_count": len(CORE_5_FEATURES),
        "features_used": CORE_5_FEATURES,
        "sample_size": {
            "total": len(df_full),
            "train": len(df_train),
            "validation": len(df_val),
            "test": len(df_test)
        },
        "spatial_isolation_minimum_distance_km": 10.35,
        "models_evaluated": list(models.keys()),
        "test_metrics": test_metrics,
        "feature_importances": feature_importances
    }

    metrics_path = os.path.join(MODELS_DIR, "shadow_model_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"[OUTPUT] Saved metrics to {metrics_path}")

    return metrics_output

if __name__ == "__main__":
    train_and_evaluate_shadow_models()
