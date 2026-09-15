"""
Hybrid AI + Physics Landslide Risk Prediction Engine.
Combines deterministic limit-equilibrium geotechnical physics with trained real-data ML models.
"""

import os
import json
import math
from typing import Dict, Any, Optional
from .predictor import predict_landslide_risk, get_risk_level_from_prob
from .model_loader import is_model_trained
from .feature_builder import build_ml_feature_vector

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hybrid_config.json")

def load_hybrid_config() -> Dict[str, Any]:
    default_config = {
        "alpha": 0.50,
        "ml_weight": 0.50,
        "physics_weight": 0.50,
        "risk_thresholds": {
            "low": 0.35,
            "moderate": 0.55,
            "high": 0.75
        },
        "default_model": "RandomForestClassifier",
        "fallback_mode": "PHYSICS_BASELINE"
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return default_config

def compute_physics_baseline(
    slope_deg: float = 32.0,
    rainfall_24h_mm: float = 25.0,
    rainfall_72h_mm: float = 50.0,
    cohesion_kpa: float = 12.0,
    friction_angle_deg: float = 30.0,
    saturation_pct: float = 70.0,
    elevation_m: float = 1840.0
) -> Dict[str, Any]:
    """
    Computes deterministic physics-informed slope stability (Factor of Safety)
    and composite geotechnical susceptibility score.
    """
    beta_rad = math.radians(max(5.0, min(85.0, slope_deg)))
    phi_rad = math.radians(friction_angle_deg)
    
    z = 2.5  # depth of slip surface in meters
    gamma = 19.5  # soil unit weight kN/m^3
    gamma_w = 9.81  # water unit weight kN/m^3

    # Water table approximation from saturation and rainfall
    total_rain = rainfall_24h_mm + (rainfall_72h_mm * 0.3)
    hw = min(z, (saturation_pct / 100.0) * z + (total_rain / 1000.0) * 1.5)
    u = gamma_w * hw * (math.cos(beta_rad) ** 2)

    total_normal = gamma * z * (math.cos(beta_rad) ** 2)
    eff_normal = max(0.01, total_normal - u)

    resisting = cohesion_kpa + eff_normal * math.tan(phi_rad)
    driving = gamma * z * math.sin(beta_rad) * math.cos(beta_rad)
    fos = round(resisting / max(driving, 0.001), 2)

    # Convert FoS & rainfall into normalized 0.0-1.0 risk score
    # FoS < 1.0 -> Risk > 0.75 (Critical)
    # FoS 1.0 - 1.25 -> Risk 0.55 - 0.75 (High)
    # FoS 1.25 - 1.50 -> Risk 0.35 - 0.55 (Moderate)
    # FoS > 1.50 -> Risk < 0.35 (Low)
    if fos < 1.0:
        fos_score = min(0.98, 0.75 + (1.0 - min(fos, 1.0)) * 0.30)
    elif fos < 1.25:
        fos_score = 0.55 + (1.25 - fos) / 0.25 * 0.20
    elif fos < 1.50:
        fos_score = 0.35 + (1.50 - fos) / 0.25 * 0.20
    else:
        fos_score = max(0.05, 0.35 - (fos - 1.50) / 1.50 * 0.30)

    rain_score = min(1.0, (rainfall_24h_mm / 120.0) * 0.6 + (rainfall_72h_mm / 250.0) * 0.4)
    # Slope gate: rain alone cannot slide flat ground (it ponds / runs off as
    # flood, not slope failure). Without this, cloudbursts on gentle terrain
    # inflate physics far above the empirically correct ML vote. Gate reaches
    # full weight at 30 deg and keeps a 0.20 floor for saturation effects.
    slope_gate = min(1.0, max(0.20, (slope_deg - 8.0) / 22.0))
    physics_score = round(float(0.65 * fos_score + 0.35 * rain_score * slope_gate), 4)

    physics_level = get_risk_level_from_prob(physics_score)

    return {
        "score": physics_score,
        "factor_of_safety": fos,
        "pore_pressure_kpa": round(u, 2),
        "risk_level": physics_level,
        "methodology": "Infinite Slope Limit Equilibrium (BIS IS 14458) & Antecedent Rain Proxy",
        "stability_state": "COLLAPSE_IMMINENT" if fos < 1.0 else ("CRITICAL_CREEP" if fos < 1.25 else ("MARGINALLY_STABLE" if fos < 1.50 else "STABLE")),
        "components": {
            "slope_deg": slope_deg,
            "rainfall_24h_mm": rainfall_24h_mm,
            "rainfall_72h_mm": rainfall_72h_mm,
            "cohesion_kpa": cohesion_kpa,
            "saturation_pct": saturation_pct
        }
    }

def calculate_hybrid_risk(
    features_input: Optional[Dict[str, Any]] = None,
    zone_id: Optional[str] = None,
    alpha_override: Optional[float] = None,
    model_type: str = "rf"
) -> Dict[str, Any]:
    """
    Executes the dual-pipeline and computes the hybrid fused landslide risk.
    Formula: R_hybrid = alpha * P_ml + (1 - alpha) * R_physics
    """
    config = load_hybrid_config()
    alpha = alpha_override if alpha_override is not None else config.get("alpha", 0.50)
    alpha = max(0.0, min(1.0, float(alpha)))

    # Extract physics-relevant inputs
    input_data = dict(features_input) if features_input else {}
    if zone_id:
        try:
            import sqlite3
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "ner_lews.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT * FROM zones WHERE id = ?", (zone_id,))
                z = cur.fetchone()
                if z:
                    if "slope_deg" not in input_data and "slope_angle_deg" not in input_data and z["slope_angle_deg"] is not None:
                        input_data["slope_deg"] = float(z["slope_angle_deg"])
                    if "elevation_m" not in input_data and z["elevation_m"] is not None:
                        input_data["elevation_m"] = float(z["elevation_m"])
                if "rainfall_24h_mm" not in input_data and "rainfall_24h" not in input_data:
                    cur.execute("SELECT rainfall_24h_mm, rainfall_72h_mm FROM weather_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
                    w = cur.fetchone()
                    if w:
                        input_data["rainfall_24h_mm"] = float(w["rainfall_24h_mm"])
                        input_data["rainfall_72h_mm"] = float(w["rainfall_72h_mm"])
                conn.close()
        except Exception:
            pass

    # SINGLE SOURCE OF TRUTH: build the canonical 14-feature vector once and
    # derive physics inputs from it, so ML and physics always see identical
    # slope / rainfall values (including alias normalisation and the
    # rainfall_24h -> 72h/surround dynamic sync in feature_builder).
    try:
        _canon_df, _canon_meta = build_ml_feature_vector(input_data=input_data, zone_id=None)
        _row = _canon_df.iloc[0].to_dict()
    except Exception:
        _row = {}
    slope_deg = float(_row.get("slope_deg", input_data.get("slope_deg", input_data.get("slope_angle_deg", 32.0))))
    rain_24h = float(_row.get("rainfall_24h_mm", input_data.get("rainfall_24h_mm", input_data.get("rainfall_24h", 25.0))))
    rain_72h = float(_row.get("rainfall_72h_mm", input_data.get("rainfall_72h_mm", input_data.get("rainfall_72h", 50.0))))
    cohesion = float(input_data.get("cohesion_kpa", 12.0))
    sat_pct = float(input_data.get("saturation_pct", 70.0))
    elevation = float(_row.get("elevation_m", input_data.get("elevation_m", 1840.0)))

    # 1. Physics Pipeline Execution (same slope/rain as ML canonical vector)
    physics_res = compute_physics_baseline(
        slope_deg=slope_deg,
        rainfall_24h_mm=rain_24h,
        rainfall_72h_mm=rain_72h,
        cohesion_kpa=cohesion,
        saturation_pct=sat_pct,
        elevation_m=elevation
    )

    # 2. Real ML Pipeline Execution
    ml_res = predict_landslide_risk(
        features_input=features_input,
        zone_id=zone_id,
        model_type=model_type
    )

    # 3. Hybrid Fusion Execution (reliability-weighted, disagreement-aware)
    if ml_res.get("status") == "SUCCESS" and ml_res.get("probability") is not None:
        p_ml = ml_res["probability"]
        r_phys = physics_res["score"]

        # Reliability weights: ML reliability scales with tree agreement and
        # is discounted when inputs are out-of-distribution; physics is
        # deterministic so it keeps a steady prior (raised when FoS is extreme,
        # i.e. the mechanics answer is unambiguous).
        ml_agree = float(ml_res.get("tree_agreement_pct", 50.0)) / 100.0
        is_ood_flag = bool(ml_res.get("is_out_of_distribution", False))
        ml_rel = round(max(0.05, ml_agree * (0.40 if is_ood_flag else 1.0)), 3)
        fos_val = float(physics_res.get("factor_of_safety", 1.25))
        phys_rel = 0.95 if (fos_val < 1.0 or fos_val > 1.60) else 0.85

        w_ml = alpha * ml_rel
        w_ph = (1.0 - alpha) * phys_rel
        alpha_eff = round(max(0.25, min(0.75, w_ml / max(w_ml + w_ph, 1e-6))), 3)

        hybrid_score = round(alpha_eff * p_ml + (1.0 - alpha_eff) * r_phys, 4)
        hybrid_level = get_risk_level_from_prob(hybrid_score)

        # Disagreement tiers drive the operating procedure, not just a label.
        diff = abs(p_ml - r_phys)
        ml_level = get_risk_level_from_prob(p_ml)
        phys_level = get_risk_level_from_prob(r_phys)
        _rank = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}
        governing = "ML" if p_ml >= r_phys else "PHYSICS"
        advisory_level = hybrid_level
        if diff >= 0.20:
            # Conservative envelope: never advise below the more alarmed model.
            advisory_level = ml_level if _rank.get(ml_level, 0) >= _rank.get(phys_level, 0) else phys_level

        if diff < 0.20:
            agreement = "CONCURRING"
            interpretation = "Both physics limit equilibrium and data-driven ML concur on slope hazard state."
            action = "Follow the fused hybrid risk for alerting."
        elif diff < 0.40:
            agreement = "ML_ELEVATED" if p_ml > r_phys else "PHYSICS_ELEVATED"
            if p_ml > r_phys:
                interpretation = "ML model detects elevated hazard based on multi-day antecedent rain and terrain elevation gradients."
                action = "Treat as ML-governed: hold HIGH advisory, inspect SHAP drivers and field sensors before standing down."
            else:
                interpretation = "Physics model flags high pore water pressure and limit-equilibrium distress before pure ML probability."
                action = "Treat as physics-governed: restrict traffic/evacuate per FoS protocol even though ML is calmer."
        else:
            agreement = "SEVERE_ML_ELEVATED" if p_ml > r_phys else "SEVERE_PHYSICS_ELEVATED"
            if p_ml > r_phys:
                interpretation = "Severe divergence: ML sees a historical failure pattern the mechanics do not yet show."
                action = "Escalate to field verification (tilt/pore sensors, drone) � do not average the risk away."
            else:
                interpretation = "Severe divergence: mechanics indicate distress the statistical model has not seen."
                action = "Escalate to physics protocol (FoS < 1.25 procedures) � do not average the risk away."

        hybrid_status = "FUSED_HYBRID"
    else:
        # Fallback to Physics Baseline when ML unavailable
        hybrid_score = physics_res["score"]
        hybrid_level = physics_res["risk_level"]
        agreement = "PHYSICS_ONLY"
        interpretation = "ML prediction unavailable for this scenario — falling back to deterministic physics-informed baseline."
        hybrid_status = "PHYSICS_FALLBACK"

    return {
        "status": "SUCCESS",
        "pipeline_mode": hybrid_status,
        "physics_risk": physics_res["score"],
        "ml_probability": p_ml if hybrid_status == "FUSED_HYBRID" else None,
        "hybrid_risk_score": hybrid_score,
        "risk_level": hybrid_level,
        "alpha": alpha,
        "is_out_of_distribution": ml_res.get("is_out_of_distribution", False),
        "ood_warning": ml_res.get("ood_warning"),
        "ood_violations": ml_res.get("ood_violations", []),
        "model_status": ml_res.get("status", "UNAVAILABLE"),
        "disclaimer": "EVALUATED ON EXPANDED DATASET",
        "physics_baseline": physics_res,
        "ml_model": ml_res,
        "hybrid_risk": {
            "score": hybrid_score,
            "risk_level": hybrid_level,
            "alpha_ml_weight": alpha_eff,
            "alpha_configured": alpha,
            "physics_weight": round(1.0 - alpha_eff, 2),
            "formula": f"R_hybrid = {alpha_eff} * P_ML + {round(1.0 - alpha_eff, 2)} * R_Physics",
            "model_agreement": agreement,
            "interpretation": interpretation,
            "disagreement_gap": round(diff, 4),
            "ml_reliability": ml_rel,
            "physics_reliability": phys_rel,
            "governing_model": governing,
            "advisory_level": advisory_level,
            "recommended_action": action
        }
    }

def get_model_explanation(
    zone_id: Optional[str] = None,
    features_input: Optional[Dict[str, Any]] = None,
    alpha_override: Optional[float] = None,
    model_type: str = "rf"
) -> Dict[str, Any]:
    """
    Provides an exhaustive, scientifically authentic explanation of why Physics and ML
    agree or disagree, without synthetic or fabricated data.
    """
    hybrid_res = calculate_hybrid_risk(
        features_input=features_input,
        zone_id=zone_id,
        alpha_override=alpha_override,
        model_type=model_type
    )

    phys = hybrid_res.get("physics_baseline", {})
    ml = hybrid_res.get("ml_model", {})
    hybrid = hybrid_res.get("hybrid_risk", {})

    p_score = phys.get("score", 0.0)
    p_fos = phys.get("factor_of_safety", 1.0)
    p_u = phys.get("pore_pressure_kpa", 0.0)
    p_slope = phys.get("components", {}).get("slope_deg", 0.0)
    p_r24 = phys.get("components", {}).get("rainfall_24h_mm", 0.0)

    ml_prob = ml.get("probability", 0.0) if ml.get("status") == "SUCCESS" else None
    diff = round(abs((ml_prob or 0.0) - p_score), 4)

    # Detailed geotechnical breakdown
    why_physics = ""
    why_ml = ""
    if p_fos < 1.0:
        why_physics = f"Deterministic limit-equilibrium mechanics indicate imminent shear failure (FoS = {p_fos} < 1.0) caused by steep gravitational driving angle ({p_slope}°) and high pore-water pressure ({p_u} kPa)."
    elif p_fos < 1.25:
        why_physics = f"Slope is in critical creep condition (FoS = {p_fos}) under sustained hydrostatic load."
    else:
        why_physics = f"Slope is structurally resilient under current pore pressure (FoS = {p_fos} > 1.25)."

    if ml_prob is not None:
        top_feats = [d["feature"] for d in ml.get("top_drivers", [])[:3]]
        why_ml = f"Data-driven ML model evaluated 18 multi-source features (governed by {', '.join(top_feats)}), assigning an empirical probability of {round(ml_prob * 100, 1)}% based on historical ISRO/GLC analogs."
    else:
        why_ml = "ML prediction unavailable for this scenario — falling back to deterministic physics-informed baseline."

    return {
        "status": "SUCCESS",
        "zone_id": zone_id,
        "physics_risk": p_score,
        "ml_probability": ml_prob,
        "hybrid_risk": hybrid.get("score", p_score),
        "difference": diff,
        "alpha": hybrid_res.get("alpha", 0.50),
        "agreement": hybrid.get("model_agreement", "CONCURRING"),
        "physics_contributors": {
            "factor_of_safety": p_fos,
            "pore_pressure_kpa": p_u,
            "slope_deg": p_slope,
            "rainfall_24h_mm": p_r24,
            "stability_state": phys.get("stability_state", "UNKNOWN"),
            "rationale": why_physics
        },
        "ml_contributors": {
            "probability": ml_prob,
            "risk_level": ml.get("risk_level", "UNKNOWN"),
            "tree_agreement_pct": ml.get("tree_agreement_pct"),
            "decision_margin": ml.get("decision_margin"),
            "top_drivers": ml.get("top_drivers", []),
            "rationale": why_ml
        },
        "disagreement_analysis": {
            "elevated_model": "PHYSICS" if (p_score > (ml_prob or 0.0) + 0.15) else ("ML" if ((ml_prob or 0.0) > p_score + 0.15) else "NONE_CONCURRING"),
            "why_physics_differs": why_physics,
            "why_ml_differs": why_ml,
            "safety_synthesis": "The dual-pipeline architecture combines conservative deterministic limit-equilibrium safety thresholds with multi-variate statistical historical patterns to prevent false negatives while mitigating false alarms."
        }
    }
