"""
Digital Twin Slope Stability Physics Engine.
Implements the geotechnical Limit Equilibrium / Infinite Slope Factor of Safety (FoS) model
to simulate "What If X mm rainfall in Y hours" scenarios for disaster officials.
"""

import math

def simulate_slope_stability(
    slope_angle_deg: float = 38.0,
    rainfall_intensity_mm_h: float = 45.0,
    duration_hours: float = 6.0,
    soil_friction_angle_deg: float = 30.0,
    cohesion_kpa: float = 12.0,
    soil_unit_weight_kn_m3: float = 19.5,
    water_unit_weight_kn_m3: float = 9.81,
    failure_depth_m: float = 2.5,
    initial_saturation_pct: float = 65.0
) -> dict:
    """
    Computes Factor of Safety (FoS):
    FoS = [ c' + (gamma * z * cos^2(beta) - u) * tan(phi) ] / [ gamma * z * sin(beta) * cos(beta) ]
    where pore water pressure u depends on antecedent saturation + infiltrated rainfall.
    """
    beta_rad = math.radians(slope_angle_deg)
    phi_rad = math.radians(soil_friction_angle_deg)

    # Infiltrated rainfall accumulation
    total_rain_mm = rainfall_intensity_mm_h * duration_hours
    
    # Saturated water table height m (h_w) above slip surface
    # Water table rise factor proportional to total rainfall & duration
    water_table_rise_m = min(failure_depth_m, (initial_saturation_pct / 100.0) * failure_depth_m + (total_rain_mm / 1000.0) * 1.8)
    
    # Pore water pressure u = gamma_w * h_w * cos^2(beta)
    u_kpa = water_unit_weight_kn_m3 * water_table_rise_m * (math.cos(beta_rad) ** 2)

    # Total normal stress sigma = gamma * z * cos^2(beta)
    total_normal_stress = soil_unit_weight_kn_m3 * failure_depth_m * (math.cos(beta_rad) ** 2)
    
    # Effective normal stress sigma' = sigma - u
    effective_normal_stress = max(0.0, total_normal_stress - u_kpa)

    # Resisting shear strength tau_f = c' + sigma' * tan(phi')
    resisting_force = cohesion_kpa + (effective_normal_stress * math.tan(phi_rad))

    # Driving shear stress tau_d = gamma * z * sin(beta) * cos(beta)
    driving_force = soil_unit_weight_kn_m3 * failure_depth_m * math.sin(beta_rad) * math.cos(beta_rad)

    # Factor of Safety (FoS)
    fos = round(resisting_force / max(driving_force, 0.001), 2)

    # GSI Slope Morphometry Classification (GSI NLSM Standard)
    if slope_angle_deg <= 15.0:
        gsi_slope_class = "LOW_HAZARD (GENTLE <15°)"
        gsi_slope_status = "SAFE"
    elif slope_angle_deg <= 25.0:
        gsi_slope_class = "MODERATE_HAZARD (16°-25°)"
        gsi_slope_status = "SAFE"
    elif slope_angle_deg <= 35.0:
        gsi_slope_class = "HIGH_HAZARD (STEEP 26°-35°)"
        gsi_slope_status = "WARNING"
    elif slope_angle_deg <= 45.0:
        gsi_slope_class = "VERY_HIGH_HAZARD (VERY STEEP 36°-45°)"
        gsi_slope_status = "CRITICAL"
    else:
        gsi_slope_class = "CRITICAL_ESCARPMENT (>45°)"
        gsi_slope_status = "CRITICAL"

    # GSI & IMD Rainfall Threshold Level (Indian Himalayan LEWS Empirical Standard)
    if total_rain_mm < 40.0:
        gsi_rain_alert = "NORMAL (<40mm)"
        gsi_rain_status = "SAFE"
    elif total_rain_mm <= 75.0:
        gsi_rain_alert = "GSI_ADVISORY (40-75mm)"
        gsi_rain_status = "CAUTION"
    elif total_rain_mm <= 120.0:
        gsi_rain_alert = "GSI_WARNING (75-120mm)"
        gsi_rain_status = "WARNING"
    else:
        gsi_rain_alert = "GSI_DANGER_CLOUDBURST (>120mm)"
        gsi_rain_status = "CRITICAL"

    # BIS IS 14458 / IS 14496 Pore Water Pressure Ratio ru = u / (gamma * z)
    ru_ratio = round(u_kpa / max(total_normal_stress, 0.001), 3)
    if ru_ratio < 0.15:
        bis_pore_status = "BIS_SAFE_DAMP (ru < 0.15)"
        bis_pore_level = "SAFE"
    elif ru_ratio <= 0.35:
        bis_pore_status = "BIS_ELEVATED_SEEPAGE (0.15-0.35)"
        bis_pore_level = "WARNING"
    else:
        bis_pore_status = "BIS_CRITICAL_HYDROSTATIC (ru > 0.35)"
        bis_pore_level = "CRITICAL"

    # BIS IS 14458 Factor of Safety (FoS) Standard Evaluation
    # IS 14458 requires FoS >= 1.50 for static dry slopes and FoS >= 1.20-1.30 under extreme monsoon
    if fos >= 1.50:
        bis_fos_compliance = "BIS_COMPLIANT_SAFE (FoS >= 1.50)"
        bis_code_status = "PASSED"
    elif fos >= 1.30:
        bis_fos_compliance = "BIS_MARGINAL_PERMISSIBLE (1.30 <= FoS < 1.50)"
        bis_code_status = "CAUTION"
    elif fos >= 1.00:
        bis_fos_compliance = "BIS_CRITICAL_DISTRESS (1.00 <= FoS < 1.30)"
        bis_code_status = "WARNING"
    else:
        bis_fos_compliance = "BIS_FAILURE_VIOLATION (FoS < 1.00)"
        bis_code_status = "CRITICAL"

    # Composite GSI & BIS Hazard Index (0 to 100%)
    slope_weight = min(1.0, slope_angle_deg / 50.0) * 25.0
    rain_weight = min(1.0, total_rain_mm / 150.0) * 30.0
    pore_weight = min(1.0, ru_ratio / 0.50) * 25.0
    fos_deficit = max(0.0, (1.50 - min(fos, 1.50)) / 1.50) * 20.0
    composite_hazard_pct = round(min(100.0, slope_weight + rain_weight + pore_weight + fos_deficit), 1)

    # Failure mechanics evaluation
    if fos < 1.0:
        stability_state = "COLLAPSE_IMMINENT (FAILURE)"
        color = "#ef4444"
        failure_prob_pct = min(99.0, round(90.0 + (1.0 - fos) * 30.0, 1))
        displacement_rate_cm_day = round(15.0 + (1.0 - fos) * 45.0, 1)
    elif fos < 1.25:
        stability_state = "CRITICAL_MARGIN (CREEP)"
        color = "#f97316"
        failure_prob_pct = round(65.0 + (1.25 - fos) * 80.0, 1)
        displacement_rate_cm_day = round(3.5 + (1.25 - fos) * 20.0, 1)
    elif fos < 1.50:
        stability_state = "MARGINALLY_STABLE (OBSERVE)"
        color = "#eab308"
        failure_prob_pct = round(20.0 + (1.50 - fos) * 60.0, 1)
        displacement_rate_cm_day = round(0.5, 1)
    else:
        stability_state = "STABLE"
        color = "#22c55e"
        failure_prob_pct = round(5.0, 1)
        displacement_rate_cm_day = 0.0

    return {
        "factor_of_safety": fos,
        "stability_state": stability_state,
        "indicator_color": color,
        "failure_probability_pct": failure_prob_pct,
        "estimated_displacement_velocity_cm_day": displacement_rate_cm_day,
        "total_simulated_rainfall_mm": round(total_rain_mm, 1),
        "pore_water_pressure_kpa": round(u_kpa, 2),
        "water_table_height_m": round(water_table_rise_m, 2),
        "driving_shear_stress_kpa": round(driving_force, 2),
        "resisting_shear_strength_kpa": round(resisting_force, 2),
        # GSI & BIS Standard Compliance Factors
        "gsi_slope_class": gsi_slope_class,
        "gsi_slope_status": gsi_slope_status,
        "gsi_rain_alert": gsi_rain_alert,
        "gsi_rain_status": gsi_rain_status,
        "bis_pore_pressure_ratio_ru": ru_ratio,
        "bis_pore_status": bis_pore_status,
        "bis_pore_level": bis_pore_level,
        "bis_fos_compliance": bis_fos_compliance,
        "bis_code_status": bis_code_status,
        "composite_hazard_pct": composite_hazard_pct,
        "is_bis_compliant": fos >= 1.30,
        "geotechnical_recommendation": (
            "Deploy horizontal subsurface borehole drains and rock bolt stitching immediately; issue red alert (GSI & BIS Failure)."
            if fos < 1.0 else
            "Install live piezometers and reinforce toe retaining buttress (BIS IS 14458 Critical Distress)."
            if fos < 1.3 else
            "Standard vegetative bio-engineering (Vetiver grass netting) recommended; slope satisfies BIS IS 14458 code."
        )
    }
