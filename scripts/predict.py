"""
Command-Line Prediction Interface for NER-LandslideGuard.
Executes both the Physics-Informed Baseline and Trained ML Models on input parameters.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "data", "models")

def predict_single(
    elevation_m=1650.0,
    slope_deg=42.5,
    aspect_deg=180.0,
    rainfall_24h_mm=110.0,
    rainfall_72h_mm=220.0,
    soil_clay_pct=28.5,
    soil_sand_pct=44.2,
    soil_silt_pct=27.3,
    soil_bulk_density=1.34,
    soil_ph=5.4,
    soil_organic_carbon=24.2,
    lc_tree_cover=1,
    lc_builtup=0,
    saturation_pct=70.0,
    cohesion_kpa=12.0,
    alpha=0.50
):
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
    if not os.path.exists(rf_path):
        print("[ERROR] Trained ML model not found. Run 'python scripts/train_models.py' first.")
        return None

    rf = joblib.load(rf_path)

    # Canonical 14-feature vector (matches training schema in model_metadata.json).
    # NOTE: rainfall_surround_max_mm follows the feature_builder convention (r24 * 1.3).
    features = pd.DataFrame([{
        "elevation_m": elevation_m,
        "slope_deg": slope_deg,
        "aspect_deg": aspect_deg,
        "rainfall_24h_mm": rainfall_24h_mm,
        "rainfall_72h_mm": rainfall_72h_mm,
        "rainfall_surround_max_mm": rainfall_24h_mm * 1.3,
        "soil_clay_pct": soil_clay_pct,
        "soil_sand_pct": soil_sand_pct,
        "soil_silt_pct": soil_silt_pct,
        "soil_bulk_density": soil_bulk_density,
        "soil_ph": soil_ph,
        "soil_organic_carbon": soil_organic_carbon,
        "lc_tree_cover": lc_tree_cover,
        "lc_builtup": lc_builtup,
        "saturation_pct": saturation_pct,
        "cohesion_kpa": cohesion_kpa
    }])

    # 1. ML Prediction
    ml_prob = round(float(rf.predict_proba(features)[0, 1]), 3)
    ml_level = "CRITICAL" if ml_prob >= 0.75 else ("HIGH" if ml_prob >= 0.55 else ("MODERATE" if ml_prob >= 0.35 else "LOW"))

    # 2. Physics Baseline — canonical FoS engine shared with live API
    # (previously a simplified proxy that disagreed with backend/ml/hybrid_risk.py).
    sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
    from ml.hybrid_risk import compute_physics_baseline
    _phys = compute_physics_baseline(
        slope_deg=slope_deg,
        rainfall_24h_mm=rainfall_24h_mm,
        rainfall_72h_mm=rainfall_72h_mm,
        elevation_m=elevation_m,
    )
    physics_score = _phys["score"]
    physics_level = _phys["risk_level"]

    # 3. Hybrid Fusion
    hybrid_score = round(alpha * ml_prob + (1.0 - alpha) * physics_score, 3)
    hybrid_level = "CRITICAL" if hybrid_score >= 0.75 else ("HIGH" if hybrid_score >= 0.55 else ("MODERATE" if hybrid_score >= 0.35 else "LOW"))

    res = {
        "physics_baseline": {
            "score": physics_score,
            "risk_level": physics_level,
            "interpretation": "Deterministic multi-criteria limit-equilibrium proxy"
        },
        "ml_model": {
            "probability": ml_prob,
            "risk_level": ml_level,
            "model": "Balanced Random Forest (Trained on ISRO + IMERG + SRTM)"
        },
        "hybrid_risk": {
            "score": hybrid_score,
            "risk_level": hybrid_level,
            "alpha_ml_weight": alpha,
            "fusion_type": "Linear Ensemble Fusion (Prototype)"
        }
    }
    return res

if __name__ == "__main__":
    print("=" * 80)
    print("NER-LandslideGuard - Dual Pipeline Live Prediction Test")
    print("=" * 80)
    r = predict_single(rainfall_24h_mm=95.0, rainfall_72h_mm=185.0, slope_deg=44.0)
    if r:
        print(json.dumps(r, indent=2))
    print("=" * 80)
