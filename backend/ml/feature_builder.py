"""
Feature Extraction and Normalization Service for ML Inference (V2.1.0).
Constructs the standardized 14-feature vector required by trained Random Forest & XGBoost models.
Enforces canonical build_ml_feature_vector function ensuring dynamic responsiveness to what-if inputs.
"""

import os
import sqlite3
import pandas as pd
from typing import Dict, Any, Tuple, Optional, List

FEATURE_NAMES = [
    "elevation_m",
    "slope_deg",
    "aspect_deg",
    "rainfall_24h_mm",
    "rainfall_72h_mm",
    "rainfall_surround_max_mm",
    "soil_clay_pct",
    "soil_sand_pct",
    "soil_silt_pct",
    "soil_bulk_density",
    "soil_ph",
    "soil_organic_carbon",
    "lc_tree_cover",
    "lc_builtup",
    "saturation_pct",
    "cohesion_kpa"
]

DEFAULT_VALUES = {
    "elevation_m": 1840.0,
    "slope_deg": 32.0,
    "aspect_deg": 180.0,
    "rainfall_24h_mm": 25.0,
    "rainfall_72h_mm": 50.0,
    "rainfall_surround_max_mm": 32.5,
    "soil_clay_pct": 28.5,
    "soil_sand_pct": 44.2,
    "soil_silt_pct": 27.3,
    "soil_bulk_density": 1.34,
    "soil_ph": 5.4,
    "soil_organic_carbon": 24.2,
    "lc_tree_cover": 1.0,
    "lc_builtup": 0.0,
    "saturation_pct": 70.0,
    "cohesion_kpa": 12.0
}

ALIASES = {
    "slope_angle_deg": "slope_deg",
    "slope": "slope_deg",
    "elevation": "elevation_m",
    "aspect": "aspect_deg",
    "rain_24h": "rainfall_24h_mm",
    "rain_72h": "rainfall_72h_mm",
    "rainfall_24h": "rainfall_24h_mm",
    "rainfall_72h": "rainfall_72h_mm",
    "surround_rain_max": "rainfall_surround_max_mm",
    "rainfall_surround_max": "rainfall_surround_max_mm",
    "clay": "soil_clay_pct",
    "sand": "soil_sand_pct",
    "silt": "soil_silt_pct",
    "bulk_density": "soil_bulk_density",
    "ph": "soil_ph",
    "organic_carbon": "soil_organic_carbon",
    "tree_cover": "lc_tree_cover",
    "builtup": "lc_builtup",
    "saturation": "saturation_pct",
    "cohesion": "cohesion_kpa"
}

def get_canonical_feature_names() -> List[str]:
    """Retrieves exact feature order from model_metadata.json or fallback list."""
    try:
        from .model_loader import load_metadata
        meta = load_metadata()
        if meta and "feature_list" in meta:
            return meta["feature_list"]
    except Exception:
        pass
    return FEATURE_NAMES

def build_ml_feature_vector(
    input_data: Optional[Dict[str, Any]] = None,
    zone_id: Optional[str] = None,
    db_path: Optional[str] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    CANONICAL feature vector constructor for NER-LandslideGuard ML inference.
    
    1. Loads zone ground-truth baseline if zone_id is supplied.
    2. Overrides baseline with user what-if inputs from input_data.
    3. Dynamically recomputes rainfall_surround_max_mm and rainfall_72h_mm when rainfall_24h_mm is overridden.
    4. Never uses frozen/stale database readings when user modifies scenario parameters.
    5. Formats exact 16 features in the canonical training order.
    """
    raw_inputs = input_data or {}
    canonical_features = get_canonical_feature_names()

    # Normalize aliases in user input
    normalized_overrides = {}
    for k, v in raw_inputs.items():
        norm_k = ALIASES.get(k, k)
        if v is not None:
            try:
                normalized_overrides[norm_k] = float(v)
            except (ValueError, TypeError):
                normalized_overrides[norm_k] = v

    # Baseline dictionary
    base_data: Dict[str, Any] = dict(DEFAULT_VALUES)

    # If zone_id provided, populate zone physical properties from SQLite
    if zone_id:
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "ner_lews.db")

        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                cursor.execute("SELECT * FROM zones WHERE id = ?", (zone_id,))
                zone = cursor.fetchone()
                if zone:
                    if "elevation_m" in zone.keys() and zone["elevation_m"] is not None:
                        base_data["elevation_m"] = float(zone["elevation_m"])
                    if "slope_angle_deg" in zone.keys() and zone["slope_angle_deg"] is not None:
                        base_data["slope_deg"] = float(zone["slope_angle_deg"])

                    soil_str = str(zone["soil_type"]).lower() if "soil_type" in zone.keys() else ""
                    if "clay" in soil_str:
                        base_data["soil_clay_pct"] = 38.0
                        base_data["soil_sand_pct"] = 32.0
                        base_data["soil_silt_pct"] = 30.0
                    elif "sand" in soil_str:
                        base_data["soil_clay_pct"] = 18.0
                        base_data["soil_sand_pct"] = 62.0
                        base_data["soil_silt_pct"] = 20.0
                    elif "silt" in soil_str or "loam" in soil_str:
                        base_data["soil_clay_pct"] = 24.0
                        base_data["soil_sand_pct"] = 36.0
                        base_data["soil_silt_pct"] = 40.0

                    veg_str = str(zone["vegetation_cover"]).lower() if "vegetation_cover" in zone.keys() else ""
                    if "urban" in veg_str or "built" in veg_str:
                        base_data["lc_tree_cover"] = 0.0
                        base_data["lc_builtup"] = 1.0
                    else:
                        base_data["lc_tree_cover"] = 1.0
                        base_data["lc_builtup"] = 0.0

                # Only use historical weather_logs if the user DID NOT supply any rainfall inputs
                user_supplied_rain = any(
                    k in normalized_overrides for k in ["rainfall_24h_mm", "rainfall_72h_mm", "rainfall_surround_max_mm"]
                )
                if not user_supplied_rain:
                    cursor.execute("SELECT * FROM weather_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
                    weather = cursor.fetchone()
                    if weather:
                        base_data["rainfall_24h_mm"] = float(weather["rainfall_24h_mm"])
                        base_data["rainfall_72h_mm"] = float(weather["rainfall_72h_mm"])
                        base_data["rainfall_surround_max_mm"] = round(float(weather["rainfall_24h_mm"]) * 1.30, 2)

                conn.close()
            except Exception as e:
                print(f"[WARN] Failed to load zone baseline for {zone_id}: {e}")

    # Now apply user overrides on top of baseline
    active_data = dict(base_data)
    for k, v in normalized_overrides.items():
        active_data[k] = v

    # Dynamic Rainfall Synchronization:
    # If the user modified rainfall_24h_mm, ensure dependent features update accordingly unless explicitly overridden
    if "rainfall_24h_mm" in normalized_overrides:
        r24 = float(normalized_overrides["rainfall_24h_mm"])
        if "rainfall_surround_max_mm" not in normalized_overrides:
            active_data["rainfall_surround_max_mm"] = round(r24 * 1.30, 2)
        if "rainfall_72h_mm" not in normalized_overrides:
            active_data["rainfall_72h_mm"] = round(r24 * 1.60, 2)

    # Construct the final feature row in canonical order
    feature_row = {}
    provided_fields = []
    imputed_fields = []

    for feat in canonical_features:
        if feat in active_data and active_data[feat] is not None:
            try:
                feature_row[feat] = float(active_data[feat])
                if feat in normalized_overrides:
                    provided_fields.append(feat)
                else:
                    imputed_fields.append(feat)
            except (ValueError, TypeError):
                feature_row[feat] = DEFAULT_VALUES.get(feat, 0.0)
                imputed_fields.append(feat)
        else:
            feature_row[feat] = DEFAULT_VALUES.get(feat, 0.0)
            imputed_fields.append(feat)

    df = pd.DataFrame([feature_row], columns=canonical_features)
    meta = {
        "features_provided": len(provided_fields),
        "features_imputed": len(imputed_fields),
        "provided_list": provided_fields,
        "imputed_list": imputed_fields,
        "feature_order": canonical_features,
        "zone_context": zone_id
    }
    return df, meta

def build_features_from_dict(raw_data: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Backwards-compatible wrapper delegating to canonical builder."""
    return build_ml_feature_vector(input_data=raw_data)

def build_features_for_zone(
    zone_id: str,
    db_path: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Backwards-compatible wrapper delegating to canonical builder."""
    return build_ml_feature_vector(input_data=overrides, zone_id=zone_id, db_path=db_path)
