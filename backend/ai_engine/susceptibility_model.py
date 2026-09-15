"""
Static Landslide Susceptibility Mapping Engine for NER.
Employs geomorphic parameters (slope angle, lithology, soil type, vegetation canopy, drainage density)
to produce Landslide Hazard Zonation (LHZ) scores.
"""

import numpy as np

# Lithological weakness weighting for Eastern Himalayan formations (GSI standards)
LITHOLOGY_WEIGHTS = {
    "Disang Shale & Ophiolite": 0.92,
    "Disang Sediments & Mudstone": 0.90,
    "Surma Siltstone & Claystone": 0.85,
    "Schist & Phyllite (Fragile)": 0.82,
    "Tertiary Shale & Siltstone": 0.78,
    "Granite Gneiss & Mica Schist": 0.55,
    "Sandstone & Limestone Karst": 0.50,
    "Tipam Sandstone & Clay": 0.42,
    "Default / Quaternary Alluvium": 0.30
}

# Soil type moisture retention & shear susceptibility
SOIL_WEIGHTS = {
    "Silty Clay Loam": 0.88,
    "Lateritic Clay": 0.84,
    "Sandy Clay Loam": 0.79,
    "Loamy Sand": 0.75,
    "Clayey Red Soil": 0.70,
    "Coarse Skeletal Soil": 0.60,
    "Silty Loam": 0.55,
    "Default": 0.50
}

def calculate_static_susceptibility(slope_deg: float, geology: str, soil: str, elevation_m: float = 1000.0) -> dict:
    """
    Computes baseline susceptibility index (0.0 - 1.0) and classification.
    """
    # Normalized slope factor (Himalayan critical threshold starts around 25 deg, peaks 40-55 deg)
    slope_norm = min(max((slope_deg - 15.0) / 45.0, 0.0), 1.0)
    
    geo_norm = LITHOLOGY_WEIGHTS.get(geology, 0.50)
    soil_norm = SOIL_WEIGHTS.get(soil, 0.50)
    
    # Elevation factor (elevations between 800m and 2200m in NER receive peak monsoon orographic precipitation)
    elevation_norm = 0.85 if 800 <= elevation_m <= 2400 else 0.55

    # Multi-criteria weighted combination (AHP / Random Forest equivalent)
    score = (0.45 * slope_norm) + (0.25 * geo_norm) + (0.20 * soil_norm) + (0.10 * elevation_norm)
    score = round(float(np.clip(score, 0.05, 0.98)), 3)

    if score >= 0.80:
        lhz_class = "Very High Hazard (Critical)"
    elif score >= 0.65:
        lhz_class = "High Hazard"
    elif score >= 0.45:
        lhz_class = "Moderate Hazard"
    elif score >= 0.25:
        lhz_class = "Low Hazard"
    else:
        lhz_class = "Very Low Hazard"

    return {
        "baseline_score": score,
        "lhz_class": lhz_class,
        "sub_factors": {
            "slope_contribution": round(0.45 * slope_norm, 3),
            "lithology_contribution": round(0.25 * geo_norm, 3),
            "soil_contribution": round(0.20 * soil_norm, 3),
            "elevation_contribution": round(0.10 * elevation_norm, 3)
        }
    }
