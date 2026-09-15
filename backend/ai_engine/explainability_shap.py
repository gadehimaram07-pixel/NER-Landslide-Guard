"""
Feature Attribution & Sensitivity Breakdown Module (Heuristic Prototype).
Provides normalized percentage-attributed factor contributions and rule-based
rationale for District Magistrates, SDRF, and Disaster Management Officers.

NOTE: This module implements a lightweight domain-heuristic feature attribution
proxy for dashboard responsiveness. Production TreeSHAP integration via the
`shap` library is scheduled for Phase 2.
"""

def generate_shap_breakdown(
    zone_name: str,
    state: str,
    slope_angle_deg: float,
    rainfall_24h_mm: float,
    rainfall_72h_mm: float,
    api_value: float,
    moisture_vwc: float,
    pore_kpa: float,
    tilt_deg: float,
    insar_velocity: float,
    geology: str
) -> dict:
    """
    Computes normalized feature-attribution weights for environmental & geotechnical drivers
    using a domain-calibrated sensitivity heuristic.
    """
    # Raw contribution weights
    w_rain = (rainfall_72h_mm / 250.0) * 40.0 + (api_value / 200.0) * 20.0
    w_moisture = (moisture_vwc / 60.0) * 35.0 + (pore_kpa / 30.0) * 25.0
    w_slope = (slope_angle_deg / 50.0) * 30.0
    w_insar = (abs(insar_velocity) / 100.0) * 30.0 + (tilt_deg / 5.0) * 25.0
    w_lithology = 22.0 if "Shale" in geology or "Schist" in geology else 12.0

    total_weight = w_rain + w_moisture + w_slope + w_insar + w_lithology

    pct_rain = round((w_rain / total_weight) * 100, 1)
    pct_moisture = round((w_moisture / total_weight) * 100, 1)
    pct_slope = round((w_slope / total_weight) * 100, 1)
    pct_insar = round((w_insar / total_weight) * 100, 1)
    pct_lithology = round((w_lithology / total_weight) * 100, 1)

    factors = [
        {
            "feature": "72h Cumulative Downpour & API",
            "contribution_pct": pct_rain,
            "measured_value": f"{rainfall_72h_mm} mm (API: {api_value})",
            "benchmark_norm": "IMD Himalayan Cloudburst Threshold (>200mm)",
            "direction": "RISK_INCREASING" if pct_rain > 20 else "NEUTRAL"
        },
        {
            "feature": "Subsurface Soil Saturation & Pore Pressure",
            "contribution_pct": pct_moisture,
            "measured_value": f"{moisture_vwc}% VWC, {pore_kpa} kPa",
            "benchmark_norm": "Liquefaction limit: 55% VWC",
            "direction": "RISK_INCREASING" if pct_moisture > 20 else "NEUTRAL"
        },
        {
            "feature": "Kinematic InSAR Deformation & Borehole Tilt",
            "contribution_pct": pct_insar,
            "measured_value": f"{insar_velocity} mm/yr, Tilt: {tilt_deg}°",
            "benchmark_norm": "Critical creep limit: >50 mm/yr",
            "direction": "RISK_INCREASING" if pct_insar > 15 else "NEUTRAL"
        },
        {
            "feature": "Steep Hill Slope Angle",
            "contribution_pct": pct_slope,
            "measured_value": f"{slope_angle_deg}° inclination",
            "benchmark_norm": "Threshold: >35° steep gradient",
            "direction": "RISK_INCREASING" if pct_slope > 15 else "NEUTRAL"
        },
        {
            "feature": "Fragile Bedrock Lithology",
            "contribution_pct": pct_lithology,
            "measured_value": geology,
            "benchmark_norm": "Highly fissile thrust belt formation",
            "direction": "RISK_INCREASING" if pct_lithology > 10 else "NEUTRAL"
        }
    ]

    # Sort descending by contribution
    factors.sort(key=lambda x: x["contribution_pct"], reverse=True)

    # Human-readable summary for District Collector / Disaster Authority
    top_driver = factors[0]["feature"]
    second_driver = factors[1]["feature"]
    narrative = (
        f"In {zone_name} ({state}), the landslide risk is primarily driven by {top_driver} ({factors[0]['contribution_pct']}%), "
        f"compounded by {second_driver} ({factors[1]['contribution_pct']}%). "
        f"The combination of {rainfall_72h_mm}mm multi-day rainfall on a {slope_angle_deg}° {geology} slope "
        f"has critically elevated pore water pressure to {pore_kpa} kPa, reducing the geotechnical factor of safety."
    )

    return {
        "zone_name": zone_name,
        "state": state,
        "executive_summary": narrative,
        "factors": factors
    }
