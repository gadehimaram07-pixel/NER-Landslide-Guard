"""
ML Inference Service for NER-LandslideGuard.
Executes trained Random Forest and XGBoost classifiers with honest fallback and feature breakdown.
"""

import logging
from typing import Dict, Any, Optional
import pandas as pd
from .model_loader import (
    load_rf_model, load_xgb_model, is_model_trained, 
    load_metadata, get_feature_importances
)
from .feature_builder import build_ml_feature_vector, build_features_from_dict, build_features_for_zone

logger = logging.getLogger("ner_lews.ml.predictor")

def get_risk_level_from_prob(prob: float) -> str:
    if prob >= 0.75:
        return "CRITICAL"
    elif prob >= 0.55:
        return "HIGH"
    elif prob >= 0.35:
        return "MODERATE"
    else:
        return "LOW"

def predict_landslide_risk(
    features_input: Optional[Dict[str, Any]] = None,
    zone_id: Optional[str] = None,
    model_type: str = "rf"
) -> Dict[str, Any]:
    """
    Executes ML inference on either an explicit feature dictionary or a zone_id.
    Returns probability, predicted label, risk category, and feature attributions.
    """
    if not is_model_trained():
        return {
            "status": "UNAVAILABLE",
            "message": "ML prediction unavailable for this scenario — ML models are not yet trained. Run training pipeline first.",
            "probability": None,
            "risk_level": "UNAVAILABLE",
            "model_used": None,
            "features_used": None
        }

    # Load requested model
    model = None
    model_name = ""
    if model_type.lower() in ["xgb", "xgboost"]:
        model = load_xgb_model()
        model_name = "XGBClassifier (Gradient Boosted Decision Trees)"
        if model is None:
            # Graceful fallback to Random Forest
            model = load_rf_model()
            model_name = "RandomForestClassifier (Balanced Ensemble Fallback)"
    else:
        model = load_rf_model()
        model_name = "RandomForestClassifier (Balanced Ensemble)"

    if model is None:
        return {
            "status": "UNAVAILABLE",
            "message": "Failed to load model weights from data/models/. Verify artifact files.",
            "probability": None,
            "risk_level": "UNAVAILABLE",
            "model_used": None,
            "features_used": None
        }

    # Prepare feature DataFrame using canonical builder
    features_df, meta = build_ml_feature_vector(input_data=features_input, zone_id=zone_id)

    try:
        # Predict probability
        proba = model.predict_proba(features_df)[0]
        prob_positive = float(proba[1])
        prob_rounded = round(prob_positive, 4)
        binary_label = int(prob_positive >= 0.50)
        risk_level = get_risk_level_from_prob(prob_positive)

        # Calculate scientifically defined confidence metrics
        decision_margin = round(float(abs(prob_positive - 0.50) * 2.0), 3)
        if hasattr(model, "estimators_"):
            try:
                tree_preds = [int(tree.predict(features_df.values)[0]) for tree in model.estimators_]
                pos_votes = sum(tree_preds)
                neg_votes = len(tree_preds) - pos_votes
                maj_votes = max(pos_votes, neg_votes)
                tree_agreement_pct = round((maj_votes / len(tree_preds)) * 100.0, 1)
                vote_summary = f"{pos_votes} trees voted Landslide, {neg_votes} trees voted Stable"
            except Exception:
                tree_agreement_pct = round(max(prob_positive, 1.0 - prob_positive) * 100.0, 1)
                vote_summary = f"Estimated consensus: {tree_agreement_pct}%"
        else:
            tree_agreement_pct = round(max(prob_positive, 1.0 - prob_positive) * 100.0, 1)
            vote_summary = f"Estimated consensus: {tree_agreement_pct}%"

        # Scientific confidence representation: Ensemble Agreement fraction
        confidence = round(tree_agreement_pct / 100.0, 3)

        # Compute per-sample feature contributions using global importance * scaled value
        feature_dict = features_df.iloc[0].to_dict()
        importances = get_feature_importances()
        imp_map = {item["feature"]: item["importance"] for item in importances}

        contributions = []
        for feat, val in feature_dict.items():
            imp = imp_map.get(feat, 0.02)
            contributions.append({
                "feature": feat,
                "measured_value": round(val, 2),
                "global_importance": imp,
                "impact_score": round(val * imp, 3)
            })

        contributions.sort(key=lambda x: x["global_importance"], reverse=True)

        # Check Out-of-Distribution (OOD) against empirical training bounds
        meta_reg = load_metadata() or {}
        bounds = meta_reg.get("feature_bounds", {})
        ood_violations = []
        is_ood = False

        for feat, val in feature_dict.items():
            if feat in bounds:
                b = bounds[feat]
                p05 = b.get("p05")
                p95 = b.get("p95")
                if p05 is not None and val < p05:
                    is_ood = True
                    diff = round(p05 - val, 2)
                    ood_violations.append({
                        "feature": feat,
                        "measured_value": round(val, 2),
                        "training_bound": f"[{p05}, {p95}]",
                        "deviation": f"-{diff} below 5th percentile ({p05})"
                    })
                elif p95 is not None and val > p95:
                    is_ood = True
                    diff = round(val - p95, 2)
                    ood_violations.append({
                        "feature": feat,
                        "measured_value": round(val, 2),
                        "training_bound": f"[{p05}, {p95}]",
                        "deviation": f"+{diff} above 95th percentile ({p95})"
                    })

        ood_warning = (
            "Input features outside training distribution. Predictions may be unreliable."
            if is_ood else None
        )

        canonical_feature_names = meta.get("feature_order", list(feature_dict.keys()))
        ordered_feature_vector = [round(float(feature_dict[f]), 2) for f in canonical_feature_names]

        # Detailed Logging: ML INFERENCE TRACE
        trace_msg = (
            f"\n[ML INFERENCE TRACE]\n"
            f"Input: rainfall_24h={feature_dict.get('rainfall_24h_mm', 'N/A')}, "
            f"slope={feature_dict.get('slope_deg', 'N/A')}, "
            f"elevation={feature_dict.get('elevation_m', 'N/A')}\n"
            f"16-Feature Vector: {ordered_feature_vector}\n"
            f"Feature Names: {canonical_feature_names}\n"
            f"Model Used: {model_name}\n"
            f"Probability: {round(prob_positive * 100.0, 1)}%\n"
            f"Prediction: {binary_label} ({'Landslide' if binary_label == 1 else 'Stable'})\n"
            f"Tree Agreement / Confidence: {tree_agreement_pct}%\n"
            f"Out-of-Distribution Status: {is_ood}\n"
        )
        print(trace_msg)
        logger.info(trace_msg)

        return {
            "status": "SUCCESS",
            "model": model_name,
            "model_used": model_name,
            "probability": prob_rounded,
            "prediction": binary_label,
            "predicted_label": binary_label,
            "risk_level": risk_level,
            "confidence": confidence,
            "tree_agreement": tree_agreement_pct,
            "tree_agreement_pct": tree_agreement_pct,
            "tree_vote_summary": vote_summary,
            "decision_margin": decision_margin,
            "is_out_of_distribution": is_ood,
            "ood": is_ood,
            "ood_warning": ood_warning,
            "ood_violations": ood_violations,
            "features_used": ordered_feature_vector,
            "feature_order": canonical_feature_names,
            "data_pedigree": "ISRO Landslide Atlas 2023 + NASA IMERG + SRTM 30m + ISRIC SoilGrids 2.0",
            "feature_metadata": meta,
            "top_drivers": contributions[:5],
            "raw_features": feature_dict
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": f"Inference execution failed: {str(e)}",
            "probability": None,
            "risk_level": "ERROR",
            "model_used": model_name,
            "features_used": None
        }
