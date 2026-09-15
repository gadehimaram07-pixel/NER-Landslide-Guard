"""
Explainable Sensor-Based Landslide Sliding Rate Estimator & Simulation Engine.

Integrates 3 physical geotechnical sensors:
1. Soil Moisture Sensor (VWC %)
2. Ground Vibration Sensor (RMS / PGV mm/s)
3. Tilt / Inclination Sensor (Resultant degrees °)

Computes:
- Normalized component risk contributions
- Instability Score (0 - 100%)
- Estimated Ground Sliding Rate (mm/hour)
- Risk classification (LOW, MODERATE, HIGH, CRITICAL)
- Correlated sensor simulation for NORMAL, WARNING, CRITICAL, and AUTO modes.
"""

import math
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

# Configuration & Realistic Thresholds
THRESHOLDS = {
    "moisture": {"min": 20.0, "normal_max": 55.0, "warning_max": 70.0, "critical_max": 95.0},
    "vibration": {"min": 0.0, "normal_max": 3.0, "warning_max": 6.0, "critical_max": 12.0},
    "tilt": {"min": 0.0, "normal_max": 2.0, "warning_max": 4.0, "critical_max": 8.0},
}

def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))

def calculate_instability_and_sliding_rate(
    soil_moisture: float,
    vibration: float,
    tilt: float,
    prev_moisture: float = None,
    prev_vibration: float = None,
    prev_tilt: float = None,
    delta_time_hours: float = 1.0
) -> Dict[str, Any]:
    """
    Explainable Geotechnical Model:
    Calculates normalized component contributions, composite Instability Score,
    and Estimated Ground Sliding Rate (mm/hour).
    """
    # 1. Normalize individual sensor values to [0.0, 1.0] based on engineering ranges
    # Baseline normal baseline starts ~20% moisture, 0 mm/s vibration, 0 deg tilt
    norm_moist = clamp((soil_moisture - 20.0) / (75.0 - 20.0), 0.0, 1.0)
    norm_vib = clamp((vibration - 0.0) / (7.0 - 0.0), 0.0, 1.0)
    norm_tilt = clamp((tilt - 0.0) / (5.0 - 0.0), 0.0, 1.0)

    # 2. Rate of change (velocity of sensor parameter shift)
    delta_moist = 0.0
    delta_vib = 0.0
    delta_tilt = 0.0
    if prev_moisture is not None and prev_vibration is not None and prev_tilt is not None:
        delta_moist = (soil_moisture - prev_moisture) / max(0.01, delta_time_hours)
        delta_vib = (vibration - prev_vibration) / max(0.01, delta_time_hours)
        delta_tilt = (tilt - prev_tilt) / max(0.01, delta_time_hours)

    # Rate of change normalized factor (positive acceleration increases hazard)
    norm_roc = clamp(
        (max(0.0, delta_moist) / 10.0) * 0.4 +
        (max(0.0, delta_vib) / 2.0) * 0.3 +
        (max(0.0, delta_tilt) / 1.5) * 0.3,
        0.0, 1.0
    )

    # 3. Component Weights:
    # Moisture = 35%, Tilt = 30%, Vibration = 25%, Rate of Change = 10%
    weight_moist = 0.35
    weight_tilt = 0.30
    weight_vib = 0.25
    weight_roc = 0.10

    # Composite Instability Score (0 to 100)
    raw_instability = (
        norm_moist * weight_moist +
        norm_tilt * weight_tilt +
        norm_vib * weight_vib +
        norm_roc * weight_roc
    ) * 100.0

    instability_score = round(clamp(raw_instability, 5.0, 98.5), 1)

    # 4. Estimated Sliding Rate (mm/hour)
    # Geotechnical creep transitions nonlinearly:
    # Low instability (steady secondary creep): 0.2 - 2.0 mm/h
    # Moderate instability (accelerating creep): 2.0 - 5.0 mm/h
    # High instability (rapid shear): 5.0 - 10.0 mm/h
    # Critical instability (tertiary failure): >10.0 mm/h (up to 25+ mm/h)
    x = instability_score / 100.0
    # Base formula: quadratic-exponential curve
    sliding_rate = 0.4 + (x ** 1.9) * 16.5
    if x > 0.8:
        sliding_rate += (x - 0.8) * 35.0  # catastrophic tertiary creep boost

    sliding_rate = round(clamp(sliding_rate, 0.4, 28.5), 1)

    # 5. Risk classification according to user requirements
    if sliding_rate < 2.0:
        risk_level = "LOW"
        risk_color = "#10b981"  # emerald
        risk_label = "Low Risk (Stable Slope)"
    elif sliding_rate < 5.0:
        risk_level = "MODERATE"
        risk_color = "#f59e0b"  # amber
        risk_label = "Moderate Risk (Creep Detected)"
    elif sliding_rate < 10.0:
        risk_level = "HIGH"
        risk_color = "#f97316"  # orange
        risk_label = "High Risk (Active Shear Slip)"
    else:
        risk_level = "CRITICAL"
        risk_color = "#ef4444"  # rose/red
        risk_label = "Critical Risk (Imminent Failure)"

    # Determine trend direction
    trend = "STABLE"
    if prev_moisture is not None and prev_tilt is not None:
        prev_rate = calculate_instability_and_sliding_rate(
            soil_moisture=prev_moisture,
            vibration=prev_vibration,
            tilt=prev_tilt
        )["predicted_sliding_rate"]
        diff = sliding_rate - prev_rate
        if diff > 0.15:
            trend = "INCREASING"
        elif diff < -0.15:
            trend = "DECREASING"

    # Percentage breakdown for explainability visual
    total_effective = (norm_moist * weight_moist) + (norm_vib * weight_vib) + (norm_tilt * weight_tilt) + (norm_roc * weight_roc)
    if total_effective > 0.001:
        pct_moist = round((norm_moist * weight_moist / total_effective) * 100, 1)
        pct_vib = round((norm_vib * weight_vib / total_effective) * 100, 1)
        pct_tilt = round((norm_tilt * weight_tilt / total_effective) * 100, 1)
        pct_roc = round(100.0 - pct_moist - pct_vib - pct_tilt, 1)
    else:
        pct_moist, pct_vib, pct_tilt, pct_roc = 35.0, 25.0, 30.0, 10.0

    return {
        "instability_score": instability_score,
        "predicted_sliding_rate": sliding_rate,
        "sliding_rate_unit": "mm/hour",
        "risk_level": risk_level,
        "risk_label": risk_label,
        "risk_color": risk_color,
        "trend": trend,
        "explanation": "Prototype estimate based on simulated sensor readings.",
        "model_name": "Explainable Sensor-Based Sliding Rate Estimator",
        "contributions": {
            "soil_moisture": pct_moist,
            "vibration": pct_vib,
            "tilt": pct_tilt,
            "rate_of_change": pct_roc
        },
        "rates_of_change": {
            "moisture_delta": round(delta_moist, 2),
            "vibration_delta": round(delta_vib, 2),
            "tilt_delta": round(delta_tilt, 2)
        }
    }


def get_sensor_states(soil_moisture: float, vibration: float, tilt: float) -> Dict[str, str]:
    """Determine Normal / Warning / Critical state for each sensor."""
    def state_for(val: float, normal_max: float, warning_max: float) -> str:
        if val <= normal_max:
            return "NORMAL"
        elif val <= warning_max:
            return "WARNING"
        return "CRITICAL"

    return {
        "moisture_state": state_for(soil_moisture, THRESHOLDS["moisture"]["normal_max"], THRESHOLDS["moisture"]["warning_max"]),
        "vibration_state": state_for(vibration, THRESHOLDS["vibration"]["normal_max"], THRESHOLDS["vibration"]["warning_max"]),
        "tilt_state": state_for(tilt, THRESHOLDS["tilt"]["normal_max"], THRESHOLDS["tilt"]["warning_max"]),
    }


class SensorSimulationEngine:
    """
    Maintains correlated state and step generator for the 3 sensors.
    """
    def __init__(self):
        self.mode = "AUTO"  # NORMAL, WARNING, CRITICAL, AUTO
        self.auto_step_counter = 0
        # Internal state targets
        self.current_moisture = 42.5
        self.current_vibration = 1.4
        self.current_tilt = 0.85

    def set_mode(self, mode: str):
        if mode in ["NORMAL", "WARNING", "CRITICAL", "AUTO"]:
            self.mode = mode

    def next_step(self, current_data: Dict[str, Any] = None) -> Tuple[float, float, float]:
        """
        Generates the next smooth correlated step based on current simulation mode.
        """
        if current_data:
            self.current_moisture = current_data.get("soil_moisture", self.current_moisture)
            self.current_vibration = current_data.get("vibration", self.current_vibration)
            self.current_tilt = current_data.get("tilt", self.current_tilt)

        mode_to_eval = self.mode
        if self.mode == "AUTO":
            self.auto_step_counter = (self.auto_step_counter + 1) % 60
            # Phase 0-25: Normal -> Phase 26-45: Warning -> Phase 46-59: Critical
            if self.auto_step_counter < 25:
                mode_to_eval = "NORMAL"
            elif self.auto_step_counter < 45:
                mode_to_eval = "WARNING"
            else:
                mode_to_eval = "CRITICAL"

        if mode_to_eval == "NORMAL":
            # Normal condition targets: Moisture ~35-48%, Vibration ~0.8-2.2 mm/s, Tilt ~0.4-1.5°
            target_m = random.uniform(36.0, 48.0)
            target_v = random.uniform(0.9, 2.2)
            target_t = random.uniform(0.5, 1.4)
            smoothing = 0.25
        elif mode_to_eval == "WARNING":
            # Warning condition targets: Moisture ~58-66%, Vibration ~3.5-5.2 mm/s, Tilt ~2.4-3.6°
            target_m = random.uniform(58.0, 67.0)
            target_v = random.uniform(3.5, 5.2)
            target_t = random.uniform(2.4, 3.6)
            smoothing = 0.20
        else: # CRITICAL
            # Critical condition targets: Moisture ~72-84%, Vibration ~6.2-8.5 mm/s, Tilt ~4.4-6.2°
            target_m = random.uniform(72.0, 83.0)
            target_v = random.uniform(6.2, 8.4)
            target_t = random.uniform(4.4, 6.0)
            smoothing = 0.20

        # Correlated transition: values move smoothly toward targets with subtle micro-jitter
        jitter_m = random.uniform(-0.4, 0.4)
        jitter_v = random.uniform(-0.08, 0.08)
        jitter_t = random.uniform(-0.04, 0.04)

        self.current_moisture = round(clamp(
            self.current_moisture + (target_m - self.current_moisture) * smoothing + jitter_m,
            20.0, 92.0
        ), 1)

        self.current_vibration = round(clamp(
            self.current_vibration + (target_v - self.current_vibration) * smoothing + jitter_v,
            0.1, 14.0
        ), 2)

        self.current_tilt = round(clamp(
            self.current_tilt + (target_t - self.current_tilt) * smoothing + jitter_t,
            0.1, 9.0
        ), 2)

        return self.current_moisture, self.current_vibration, self.current_tilt


# Singleton simulation instance
simulation_engine = SensorSimulationEngine()


def generate_seed_telemetry(num_records: int = 60) -> List[Dict[str, Any]]:
    """
    Generates realistic historical progression for demo initialization:
    Progression: Stable Normal (25 steps) -> Gradual Warning (20 steps) -> Severe Instability (15 steps)
    """
    records = []
    base_time = datetime.utcnow() - timedelta(minutes=num_records * 2)

    m = 38.5
    v = 1.2
    t = 0.7

    for i in range(num_records):
        rec_time = (base_time + timedelta(minutes=i * 2)).strftime("%Y-%m-%d %H:%M:%S")

        # Determine phase
        if i < 25:
            target_m = 40.0 + random.uniform(-3.0, 4.0)
            target_v = 1.3 + random.uniform(-0.3, 0.4)
            target_t = 0.8 + random.uniform(-0.15, 0.2)
            phase_mode = "NORMAL"
        elif i < 45:
            # Gradual increase
            progress = (i - 25) / 20.0
            target_m = 48.0 + progress * 16.0 + random.uniform(-1.5, 1.5)
            target_v = 2.0 + progress * 2.2 + random.uniform(-0.2, 0.3)
            target_t = 1.2 + progress * 1.8 + random.uniform(-0.1, 0.2)
            phase_mode = "WARNING"
        else:
            # Severe instability
            progress = (i - 45) / 15.0
            target_m = 68.0 + progress * 12.0 + random.uniform(-1.2, 1.5)
            target_v = 4.6 + progress * 2.4 + random.uniform(-0.3, 0.4)
            target_t = 3.2 + progress * 1.9 + random.uniform(-0.2, 0.3)
            phase_mode = "CRITICAL"

        # Smooth update
        m = round(m + (target_m - m) * 0.35 + random.uniform(-0.2, 0.2), 1)
        v = round(v + (target_v - v) * 0.35 + random.uniform(-0.05, 0.05), 2)
        t = round(t + (target_t - t) * 0.35 + random.uniform(-0.03, 0.03), 2)

        prev_m = records[-1]["soil_moisture"] if records else m
        prev_v = records[-1]["vibration"] if records else v
        prev_t = records[-1]["tilt"] if records else t

        pred = calculate_instability_and_sliding_rate(
            soil_moisture=m,
            vibration=v,
            tilt=t,
            prev_moisture=prev_m,
            prev_vibration=prev_v,
            prev_tilt=prev_t,
            delta_time_hours=0.033 # 2 minutes
        )

        records.append({
            "timestamp": rec_time,
            "soil_moisture": m,
            "vibration": v,
            "tilt": t,
            "moisture_rate": pred["rates_of_change"]["moisture_delta"],
            "vibration_rate": pred["rates_of_change"]["vibration_delta"],
            "tilt_rate": pred["rates_of_change"]["tilt_delta"],
            "sensor_status": "ONLINE",
            "location": "Gangtok-Ranipool Slope Node Alpha",
            "instability_score": pred["instability_score"],
            "predicted_sliding_rate": pred["predicted_sliding_rate"],
            "risk_level": pred["risk_level"],
            "scenario_mode": phase_mode
        })

    return records
