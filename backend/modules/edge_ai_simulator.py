"""
Edge AI Offline Inference & LoRa Mesh Gateway Simulator.
Emulates low-power field microcontrollers (ESP32-S3 / Raspberry Pi Zero 2W)
running quantized TinyML models directly on remote mountain slopes with zero cellular connectivity.
"""

from datetime import datetime

# TinyML Quantized Thresholds (INT8 scaled model)
TINYML_TILT_TRIGGER_DEG = 4.8
TINYML_PORE_TRIGGER_KPA = 26.0
TINYML_VIBRATION_TRIGGER_RMS = 0.75

def run_edge_inference(
    node_id: str,
    tilt_x: float,
    tilt_y: float,
    pore_kpa: float,
    vibration_rms: float,
    is_network_connected: bool = False
) -> dict:
    """
    Executes on-device TinyML inference without requiring any cloud connection.
    If conditions exceed failure limit, activates local hardware GPIO siren relay.
    """
    resultant_tilt = (tilt_x**2 + tilt_y**2) ** 0.5
    
    # TinyML Decision Boundary
    edge_risk_score = min(1.0, (resultant_tilt / 6.0) * 0.45 + (pore_kpa / 35.0) * 0.35 + (vibration_rms / 1.0) * 0.20)
    
    siren_relay_active = False
    action_taken = "MONITORING_SLEEP_CYCLE (Deep Sleep 60s)"

    if resultant_tilt >= TINYML_TILT_TRIGGER_DEG or pore_kpa >= TINYML_PORE_TRIGGER_KPA or vibration_rms >= TINYML_VIBRATION_TRIGGER_RMS:
        siren_relay_active = True
        action_taken = "LOCAL_SIREN_HARDWARE_PIN_HIGH: Village Audio Alarm Sounding Autonomously"
        status = "AUTONOMOUS_LOCAL_TRIGGER"
    elif resultant_tilt >= 2.5 or pore_kpa >= 18.0:
        action_taken = "WAKEUP_HIGH_SAMPLING_RATE: Polling at 10Hz, LoRa beacon queued"
        status = "EDGE_PRE_ALERT"
    else:
        status = "NORMAL"

    return {
        "node_id": node_id,
        "edge_model": "TensorFlow Lite Micro (INT8 14KB quantized)",
        "hardware_target": "ESP32-S3 Dual Xtensa LX7 @ 240MHz (16MB Flash, 8MB PSRAM)",
        "network_status": "ONLINE (LoRa Mesh Link)" if is_network_connected else "DISCONNECTED (Offline Hill Isolation)",
        "metrics_read": {
            "resultant_tilt_deg": round(resultant_tilt, 2),
            "pore_kpa": pore_kpa,
            "vibration_rms": vibration_rms
        },
        "edge_risk_score": round(edge_risk_score, 3),
        "status": status,
        "siren_relay_gpio_active": siren_relay_active,
        "edge_decision": action_taken,
        "cloud_sync_pending": not is_network_connected,
        "inference_latency_ms": 3.4,
        # LoRaWAN IN865 Telemetry
        "frequency_mhz": 865.2,
        "spreading_factor": "SF8BW125",
        "signal_rssi_dbm": -76 if is_network_connected else -118,
        "snr_db": 9.4 if is_network_connected else -4.2,
        "battery_voltage_v": 3.28,
        "battery_pct": 94.5,
        "solar_harvester_mw": 485.0,
        "flash_queue_depth": 0 if is_network_connected else 348,
        "mesh_hop_count": 2 if is_network_connected else 0,
        "active_current_ma": 18.2 if status != "NORMAL" else 0.014
    }
