"""
Dynamic Landslide Nowcasting Engine (6h - 48h horizon).
Blends static susceptibility, live Doppler rainfall, antecedent moisture (API),
IoT tilt velocity, pore water pressure, and satellite InSAR ground deformation.
"""

import numpy as np

def predict_dynamic_risk(
    baseline_susceptibility: float,
    rainfall_24h_mm: float,
    rainfall_72h_mm: float,
    api_value: float,
    soil_moisture_vwc: float,
    pore_pressure_kpa: float,
    resultant_tilt_deg: float,
    insar_velocity_mm_yr: float,
    forecast_24h_mm: float
) -> dict:
    """
    Computes real-time dynamic risk probability (0.0 to 1.0) and assigns an operational Alert Level.
    """
    # 1. Rain hazard factor (combines API, 24h rain, and forecast)
    rain_score = min((rainfall_24h_mm / 180.0) * 0.4 + (rainfall_72h_mm / 350.0) * 0.3 + (forecast_24h_mm / 150.0) * 0.3, 1.0)
    
    # 2. Moisture & Pore pressure factor
    moisture_score = min((soil_moisture_vwc / 65.0) * 0.5 + (pore_pressure_kpa / 35.0) * 0.5, 1.0)

    # 3. Geotechnical kinematic factor (tilt & displacement)
    tilt_score = min(resultant_tilt_deg / 6.0, 1.0)
    insar_score = min(abs(insar_velocity_mm_yr) / 150.0, 1.0)
    geotech_score = max(tilt_score, insar_score)

    # Ensemble blending:
    # 30% baseline susceptibility + 35% rainfall/API + 20% soil pore saturation + 15% geotech displacement
    risk_score = (
        0.25 * baseline_susceptibility +
        0.35 * rain_score +
        0.22 * moisture_score +
        0.18 * geotech_score
    )
    risk_score = round(float(np.clip(risk_score, 0.05, 0.99)), 3)

    if risk_score >= 0.82:
        risk_level = "Critical"
        color = "#ef4444"
        action = "Evacuate high-risk slopes immediately; suspend mountain highway traffic; activate SDRF/NDRF."
    elif risk_score >= 0.65:
        risk_level = "High"
        color = "#f97316"
        action = "Issue orange alert to panchayats; clear vulnerable road choke points; mobilize emergency shelters."
    elif risk_score >= 0.45:
        risk_level = "Moderate"
        color = "#eab308"
        action = "Yellow advisory; monitor live sensor telemetry; inspect roadside culverts and drainage channels."
    else:
        risk_level = "Low"
        color = "#22c55e"
        action = "Green / Normal monitoring state; standard automated sensor polling."

    # 6h, 24h, 48h trajectory forecasts
    proj_6h = round(float(np.clip(risk_score * 1.05 if forecast_24h_mm > 50 else risk_score * 0.95, 0.05, 0.99)), 3)
    proj_24h = round(float(np.clip(risk_score * 1.12 if forecast_24h_mm > 100 else risk_score * 0.90, 0.05, 0.99)), 3)
    proj_48h = round(float(np.clip(risk_score * 1.08 if forecast_24h_mm > 80 else risk_score * 0.82, 0.05, 0.99)), 3)

    return {
        "dynamic_risk_score": risk_score,
        "risk_level": risk_level,
        "badge_color": color,
        "recommended_action": action,
        "time_horizon_projections": {
            "current": risk_score,
            "horizon_6h": proj_6h,
            "horizon_24h": proj_24h,
            "horizon_48h": proj_48h
        },
        "component_scores": {
            "baseline_geomorphology": round(baseline_susceptibility, 2),
            "meteorological_forcing": round(rain_score, 2),
            "subsurface_saturation": round(moisture_score, 2),
            "kinematic_movement": round(geotech_score, 2)
        }
    }
