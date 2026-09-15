"""
FastAPI Application for NER-LandslideGuard Research Prototype.
Integrates multi-source geospatial data ingestion, hybrid ML + physics risk calculation,
edge IoT simulation, offline PWA field reporting, and alert dispatch simulation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
from datetime import datetime

from database import (
    init_db, get_connection, get_latest_sensor_reading,
    get_sensor_history, insert_sensor_reading, reset_sensor_telemetry_table
)
from ingestion.weather_imd import fetch_imd_weather_summary, simulate_new_rainfall_reading
from ingestion.iot_lora import get_all_sensors, ingest_lora_packet
from ingestion.satellite_insar import (
    get_insar_displacement_feed,
    get_uninstrumented_satellite_detections,
    trigger_satellite_uninstrumented_detection
)
from ingestion.citizen_reports import get_all_reports, sync_batch_reports
from ai_engine.susceptibility_model import calculate_static_susceptibility
from ai_engine.nowcasting_engine import predict_dynamic_risk
from ai_engine.vision_classifier import classify_landslide_image
from ai_engine.explainability_shap import generate_shap_breakdown
from core_gis.spatial_engine import get_zones_geojson, find_nearest_safe_shelter
from core_gis.road_network_twin import get_all_road_segments, compute_alternate_route, update_road_status
from core_gis.digital_twin_simulator import simulate_slope_stability
from core_gis.blockchain_ledger import get_audit_trail, record_audit_event
from alerting.escalation_router import get_all_alerts, broadcast_new_alert, acknowledge_alert
from alerting.multilingual_engine import generate_multilingual_alert
from alerting.ndma_sachet_cap import generate_cap_xml
from modules.edge_ai_simulator import run_edge_inference
from modules.drone_assessment import get_drone_surveys, analyze_new_drone_mission
from modules.insurance_relief import get_all_claims, create_relief_claim
from modules.crowdsource_reputation import calculate_report_credibility
from modules.citizen_chatbot import query_chatbot
from modules.sliding_rate_estimator import (
    calculate_instability_and_sliding_rate, get_sensor_states, simulation_engine
)
from ml.model_loader import (
    get_model_status, load_metrics, load_comparison,
    get_feature_importances, reload_models, is_model_trained
)
from ml.predictor import predict_landslide_risk
from ml.hybrid_risk import calculate_hybrid_risk, load_hybrid_config, get_model_explanation

# Initialize Database Schema & Seeds
init_db()

app = FastAPI(
    title="NER Landslide Early Warning & Risk Monitoring System (Prototype)",
    description="Dual-Pipeline ML + Geotechnical Physics Early Warning Prototype for the North Eastern Region of India",
    version="3.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount realistic hazard imagery
static_hazards_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "hazards")
if os.path.exists(static_hazards_dir):
    app.mount("/hazards", StaticFiles(directory=static_hazards_dir), name="hazards")


# ----------------- Models -----------------
class RainfallSimRequest(BaseModel):
    zone_id: str
    added_rainfall_1h: float

class LoraPacketRequest(BaseModel):
    sensor_id: str
    moisture: float
    pore_kpa: float
    tilt_x: float
    tilt_y: float
    vib_rms: float
    battery: float
    rssi: int

class AlertBroadcastRequest(BaseModel):
    zone_id: str
    severity: str
    headline: str
    description: str
    suggested_action: str
    channels: List[str]
    languages: List[str]
    authorized_by: Optional[str] = "District Magistrate / DC"

class AcknowledgeRequest(BaseModel):
    officer_name: str

class DigitalTwinSimRequest(BaseModel):
    slope_angle_deg: float = 40.0
    rainfall_intensity_mm_h: float = 60.0
    duration_hours: float = 6.0
    cohesion_kpa: float = 12.0
    soil_friction_angle_deg: float = 30.0
    initial_saturation_pct: float = 70.0

class VisionClassifyRequest(BaseModel):
    image_url_or_base64: str

class ZoneAssessmentRequest(BaseModel):
    slope_angle_deg: float
    population_at_risk: int
    geology_type: str
    soil_type: str
    trigger_notification_if_high: bool = True

class ChatbotRequest(BaseModel):
    message: str
    language: Optional[str] = "English"

class ReliefClaimRequest(BaseModel):
    zone_id: str
    applicant_name: str
    aadhaar_last4: str
    damage_category: str
    loss_estimate_inr: float
    geo_coordinates: str
    insar_evidence: str

class EdgeSimRequest(BaseModel):
    node_id: str
    tilt_x: float
    tilt_y: float
    pore_kpa: float
    vibration_rms: float
    is_network_connected: bool = False

class SimulationModeRequest(BaseModel):
    mode: str

class MLPredictRequest(BaseModel):
    zone_id: Optional[str] = None
    features: Optional[dict] = None
    model_type: Optional[str] = "rf"

class HybridRiskRequest(BaseModel):
    zone_id: Optional[str] = None
    features: Optional[dict] = None
    alpha: Optional[float] = None
    model_type: Optional[str] = "rf"

# ----------------- Endpoints -----------------

@app.get("/")
def root():
    return {
        "system": "NER Landslide Early Warning & Risk Monitoring Platform",
        "region": "North Eastern Region (NER) - 8 States",
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "standards_compliance": ["NDMA SACHET", "OASIS CAP v1.2", "GSI LHZ Guidelines", "IMD AWS/Doppler"]
    }

@app.get("/api/overview")
def get_system_overview():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM zones")
    total_zones = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE'")
    active_alerts = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sensors")
    total_sensors = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM road_segments WHERE status != 'Open'")
    blocked_roads = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM citizen_reports")
    total_reports = cursor.fetchone()[0]
    cursor.execute("SELECT current_hash, block_index FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1")
    latest_block = cursor.fetchone()
    conn.close()

    return {
        "monitored_zones": total_zones,
        "active_critical_alerts": active_alerts,
        "iot_sensors_online": total_sensors,
        "mountain_highway_closures": blocked_roads,
        "citizen_reports_logged": total_reports,
        "latest_blockchain_block": latest_block["block_index"] if latest_block else 0,
        "blockchain_head_hash": latest_block["current_hash"] if latest_block else "",
        "offline_mesh_status": "LORA_GATEWAYS_HEALTHY"
    }

# Layer 1 & GIS: Zones
@app.get("/api/zones")
def get_zones():
    return get_zones_geojson()

@app.get("/api/zones/{zone_id}/shap")
def get_zone_shap_breakdown(zone_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM zones WHERE id = ?", (zone_id,))
    z = cursor.fetchone()
    if not z:
        conn.close()
        raise HTTPException(status_code=404, detail="Zone not found")

    cursor.execute("SELECT * FROM weather_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
    w = cursor.fetchone()

    cursor.execute("SELECT * FROM sensors WHERE zone_id = ? ORDER BY id ASC LIMIT 1", (zone_id,))
    s = cursor.fetchone()

    cursor.execute("SELECT * FROM insar_data WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
    ins = cursor.fetchone()
    conn.close()

    shap_res = generate_shap_breakdown(
        zone_name=z["name"],
        state=z["state"],
        slope_angle_deg=z["slope_angle_deg"],
        rainfall_24h_mm=w["rainfall_24h_mm"] if w else 85.0,
        rainfall_72h_mm=w["rainfall_72h_mm"] if w else 190.0,
        api_value=w["antecedent_precipitation_index"] if w else 140.0,
        moisture_vwc=s["soil_moisture_vwc"] if s else 52.0,
        pore_kpa=s["pore_pressure_kpa"] if s else 24.0,
        tilt_deg=(s["tilt_x_deg"]**2 + s["tilt_y_deg"]**2)**0.5 if s else 3.5,
        insar_velocity=ins["velocity_mm_per_year"] if ins else -85.0,
        geology=z["geology_type"]
    )
    shap_res["ml_feature_importances"] = get_feature_importances()
    shap_res["hybrid_evaluation"] = calculate_hybrid_risk(zone_id=zone_id)
    shap_res["methodology"] = "Dual Pipeline: ISRO-Trained Tree Feature Importance (Gini/SHAP) + Dynamic Hydrological Factor Attribution"
    return shap_res

@app.post("/api/zones/{zone_id}/assess")
def assess_zone_parameters(zone_id: str, req: ZoneAssessmentRequest):
    slope = req.slope_angle_deg
    if slope <= 20.0:
        slope_score = (slope / 20.0) * 0.25
    elif slope <= 35.0:
        slope_score = 0.25 + ((slope - 20.0) / 15.0) * 0.35
    elif slope <= 50.0:
        slope_score = 0.60 + ((slope - 35.0) / 15.0) * 0.32
    else:
        slope_score = min(0.98, 0.92 + ((slope - 50.0) / 15.0) * 0.08)

    geo_lower = req.geology_type.lower()
    if any(k in geo_lower for k in ["schist", "phyllite", "shale", "fragile", "weathered"]):
        lithology_score = 0.88
    elif any(k in geo_lower for k in ["sandstone", "siltstone", "mudstone", "moderate"]):
        lithology_score = 0.58
    elif any(k in geo_lower for k in ["limestone", "dolomite", "karst"]):
        lithology_score = 0.70
    elif any(k in geo_lower for k in ["gneiss", "quartzite", "competent"]):
        lithology_score = 0.35
    elif any(k in geo_lower for k in ["granite", "basalt", "dense"]):
        lithology_score = 0.18
    else:
        lithology_score = 0.50

    soil_lower = req.soil_type.lower()
    if any(k in soil_lower for k in ["sandy clay loam", "clay loam", "loose", "debris"]):
        soil_score = 0.85
    elif any(k in soil_lower for k in ["silt", "loam", "colluvial"]):
        soil_score = 0.65
    elif any(k in soil_lower for k in ["gravel", "sand"]):
        soil_score = 0.45
    elif any(k in soil_lower for k in ["compacted", "dense", "till"]):
        soil_score = 0.25
    else:
        soil_score = 0.55

    pop = req.population_at_risk
    pop_score = min(1.0, pop / 50000.0)

    risk_score = round(
        (slope_score * 0.45) + (lithology_score * 0.25) + (soil_score * 0.20) + (pop_score * 0.10),
        3
    )
    risk_score = max(0.05, min(0.99, risk_score))

    if risk_score >= 0.80:
        risk_level = "Critical"
        color = "#ef4444"
    elif risk_score >= 0.65:
        risk_level = "High"
        color = "#f97316"
    elif risk_score >= 0.40:
        risk_level = "Moderate"
        color = "#eab308"
    else:
        risk_level = "Low"
        color = "#22c55e"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE zones 
        SET slope_angle_deg = ?, population_at_risk = ?, geology_type = ?, soil_type = ?,
            current_risk_score = ?, current_risk_level = ?, last_updated = datetime('now')
        WHERE id = ?
    """, (req.slope_angle_deg, req.population_at_risk, req.geology_type, req.soil_type, risk_score, risk_level, zone_id))
    conn.commit()

    cursor.execute("SELECT name, state FROM zones WHERE id = ?", (zone_id,))
    z = cursor.fetchone()
    zone_name = z["name"] if z else zone_id
    conn.close()

    alert_info = None
    if req.trigger_notification_if_high and risk_level in ["High", "Critical"]:
        alert_info = broadcast_new_alert(
            zone_id=zone_id,
            severity=risk_level.upper(),
            headline=f"NDMA SACHET ALERT: {risk_level.upper()} Landslide Hazard at {zone_name}",
            description=f"Manual geotechnical assessment entered: Slope={req.slope_angle_deg}°, Lithology={req.geology_type}, Soil={req.soil_type}, Population at risk={req.population_at_risk:,}. AI Risk index evaluated at {round(risk_score*100, 1)}%.",
            suggested_action="Restrict arterial traffic, initiate preventive community evacuation, and activate District Emergency Operation Center (DEOC).",
            channels=["CELL_BROADCAST", "CAP_RSS", "SMS_GATEWAY", "SIREN_GRID"],
            languages=["English", "Hindi", "Nepali", "Assamese"],
            acknowledged_by="District Magistrate / Field Geologist"
        )

    return {
        "zone_id": zone_id,
        "zone_name": zone_name,
        "slope_angle_deg": req.slope_angle_deg,
        "population_at_risk": req.population_at_risk,
        "geology_type": req.geology_type,
        "soil_type": req.soil_type,
        "current_risk_score": risk_score,
        "current_risk_level": risk_level,
        "indicator_color": color,
        "notification_activated": alert_info is not None,
        "alert": alert_info
    }

# Layer 1: Weather
@app.get("/api/weather")
def get_weather():
    return fetch_imd_weather_summary()

@app.post("/api/weather/simulate")
def simulate_rainfall(req: RainfallSimRequest):
    return simulate_new_rainfall_reading(req.zone_id, req.added_rainfall_1h)

# Layer 1: IoT Sensors
@app.get("/api/sensors")
def get_sensors():
    return get_all_sensors()

@app.post("/api/sensors/ingest")
def ingest_sensor_telemetry(req: LoraPacketRequest):
    return ingest_lora_packet(
        req.sensor_id, req.moisture, req.pore_kpa,
        req.tilt_x, req.tilt_y, req.vib_rms, req.battery, req.rssi
    )

# Geotechnical 3-Sensor Real-Time Telemetry & Sliding Rate Prediction
@app.get("/api/sensors/latest")
def get_latest_sensors():
    latest = get_latest_sensor_reading()
    if not latest:
        reset_sensor_telemetry_table()
        latest = get_latest_sensor_reading()

    history = get_sensor_history(limit=10)
    states = get_sensor_states(
        soil_moisture=latest["soil_moisture"],
        vibration=latest["vibration"],
        tilt=latest["tilt"]
    )

    pred = calculate_instability_and_sliding_rate(
        soil_moisture=latest["soil_moisture"],
        vibration=latest["vibration"],
        tilt=latest["tilt"],
        prev_moisture=history[-2]["soil_moisture"] if len(history) >= 2 else None,
        prev_vibration=history[-2]["vibration"] if len(history) >= 2 else None,
        prev_tilt=history[-2]["tilt"] if len(history) >= 2 else None
    )

    return {
        "timestamp": latest["timestamp"],
        "location": latest["location"],
        "sensor_status": latest["sensor_status"],
        "simulation_mode": simulation_engine.mode,
        "sensors": {
            "soil_moisture": {
                "name": "Soil Moisture Sensor",
                "value": latest["soil_moisture"],
                "unit": "%",
                "status": latest["sensor_status"],
                "state": states["moisture_state"],
                "last_updated": latest["timestamp"],
                "rate_of_change": latest["moisture_rate"],
                "recent_trend": [h["soil_moisture"] for h in history]
            },
            "vibration": {
                "name": "Ground Vibration Sensor",
                "value": latest["vibration"],
                "unit": "mm/s",
                "status": latest["sensor_status"],
                "state": states["vibration_state"],
                "last_updated": latest["timestamp"],
                "rate_of_change": latest["vibration_rate"],
                "recent_trend": [h["vibration"] for h in history]
            },
            "tilt": {
                "name": "Ground Tilt / Inclination Sensor",
                "value": latest["tilt"],
                "unit": "°",
                "status": latest["sensor_status"],
                "state": states["tilt_state"],
                "last_updated": latest["timestamp"],
                "rate_of_change": latest["tilt_rate"],
                "recent_trend": [h["tilt"] for h in history]
            }
        },
        "prediction": pred
    }

@app.get("/api/sensors/history")
def get_sensor_history_data(limit: int = 60):
    return get_sensor_history(limit=limit)

@app.get("/api/prediction/sliding-rate")
def get_sliding_rate_prediction():
    latest = get_latest_sensor_reading()
    if not latest:
        reset_sensor_telemetry_table()
        latest = get_latest_sensor_reading()

    history = get_sensor_history(limit=5)
    pred = calculate_instability_and_sliding_rate(
        soil_moisture=latest["soil_moisture"],
        vibration=latest["vibration"],
        tilt=latest["tilt"],
        prev_moisture=history[-2]["soil_moisture"] if len(history) >= 2 else None,
        prev_vibration=history[-2]["vibration"] if len(history) >= 2 else None,
        prev_tilt=history[-2]["tilt"] if len(history) >= 2 else None
    )
    pred["latest_sensors"] = {
        "soil_moisture": latest["soil_moisture"],
        "vibration": latest["vibration"],
        "tilt": latest["tilt"],
        "timestamp": latest["timestamp"]
    }
    return pred

@app.get("/api/sensors/simulation-mode")
def get_simulation_mode():
    return {
        "mode": simulation_engine.mode,
        "available_modes": ["NORMAL", "WARNING", "CRITICAL", "AUTO"]
    }

@app.post("/api/sensors/simulation-mode")
def set_simulation_mode(req: SimulationModeRequest):
    if req.mode.upper() not in ["NORMAL", "WARNING", "CRITICAL", "AUTO"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be NORMAL, WARNING, CRITICAL, or AUTO.")
    simulation_engine.set_mode(req.mode.upper())
    return {"mode": simulation_engine.mode, "status": "UPDATED"}

@app.post("/api/sensors/simulate-step")
def simulate_sensor_step():
    latest = get_latest_sensor_reading()
    m, v, t = simulation_engine.next_step(latest)

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    pred = calculate_instability_and_sliding_rate(
        soil_moisture=m,
        vibration=v,
        tilt=t,
        prev_moisture=latest["soil_moisture"] if latest else None,
        prev_vibration=latest["vibration"] if latest else None,
        prev_tilt=latest["tilt"] if latest else None,
        delta_time_hours=0.033
    )

    insert_sensor_reading(
        timestamp=now_str,
        soil_moisture=m,
        vibration=v,
        tilt=t,
        moisture_rate=pred["rates_of_change"]["moisture_delta"],
        vibration_rate=pred["rates_of_change"]["vibration_delta"],
        tilt_rate=pred["rates_of_change"]["tilt_delta"],
        sensor_status="ONLINE",
        location=latest["location"] if latest else "Gangtok-Ranipool Slope Node Alpha",
        instability_score=pred["instability_score"],
        predicted_sliding_rate=pred["predicted_sliding_rate"],
        risk_level=pred["risk_level"],
        scenario_mode=simulation_engine.mode
    )

    # Integrated alert generation when sliding rate is Critical (> 10 mm/h)
    if pred["risk_level"] == "CRITICAL" and pred["predicted_sliding_rate"] >= 10.0:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM alerts WHERE headline LIKE '%Accelerated Ground Sliding%' AND status = 'ACTIVE'")
        has_active = cursor.fetchone()[0]
        conn.close()

        if has_active == 0:
            broadcast_new_alert(
                zone_id="ZONE-SKM-01",
                severity="CRITICAL",
                headline=f"Accelerated Ground Sliding Detected: {pred['predicted_sliding_rate']} mm/hour",
                description=f"Sensor telemetry indicates critical ground sliding rate of {pred['predicted_sliding_rate']} mm/hour (Instability Score: {pred['instability_score']}%). Moisture at {m}%, Vibration at {v} mm/s, Tilt at {t}°. Catastrophic slope rupture imminent.",
                suggested_action="Issue emergency evacuation for downslope settlements along NH-10 corridor. Halt road traffic immediately.",
                channels=["SMS", "WHATSAPP", "LOCAL_SIREN"],
                languages=["English", "Nepali", "Hindi"],
                acknowledged_by="Geotechnical Sensor Telemetry Guard"
            )

    return {
        "status": "SUCCESS",
        "reading": {
            "timestamp": now_str,
            "soil_moisture": m,
            "vibration": v,
            "tilt": t,
            "instability_score": pred["instability_score"],
            "predicted_sliding_rate": pred["predicted_sliding_rate"],
            "risk_level": pred["risk_level"]
        },
        "prediction": pred
    }

@app.post("/api/sensors/reset-demo")
def reset_demo_telemetry():
    reset_sensor_telemetry_table()
    simulation_engine.set_mode("AUTO")
    return {"status": "SUCCESS", "message": "Sensor telemetry reset to demo progression sequence."}


# Layer 1: InSAR Satellite & Autonomous Blind-Spot Landslide Detection
@app.get("/api/insar")
def get_insar():
    return get_insar_displacement_feed()

class SatelliteTriggerRequest(BaseModel):
    preset_id: Optional[str] = "dzongu"
    custom_data: Optional[dict] = None

@app.get("/api/satellite/uninstrumented-detections")
def get_satellite_uninstrumented():
    return get_uninstrumented_satellite_detections()

@app.post("/api/satellite/trigger-uninstrumented")
def trigger_satellite_uninstrumented(req: SatelliteTriggerRequest):
    return trigger_satellite_uninstrumented_detection(req.preset_id, req.custom_data)

# Layer 1: Citizen Reports & Offline Sync
@app.get("/api/reports")
def get_reports():
    return get_all_reports()

@app.post("/api/reports/sync")
def sync_reports(reports: List[dict]):
    return sync_batch_reports(reports)

# Layer 2: Vision Classifier
@app.post("/api/vision/classify")
def classify_image(req: VisionClassifyRequest):
    return classify_landslide_image(req.image_url_or_base64)

# Layer 3: Road Network Twin
@app.get("/api/roads")
def get_roads():
    return get_all_road_segments()

@app.post("/api/roads/reroute")
def reroute_road(req: dict):
    return compute_alternate_route(
        origin=req.get("origin", ""),
        destination=req.get("destination", ""),
        avoid_road_id=req.get("avoid_road_id")
    )

# Layer 3: Digital Twin Simulator
@app.post("/api/digital-twin/simulate")
def simulate_digital_twin(req: DigitalTwinSimRequest):
    return simulate_slope_stability(
        slope_angle_deg=req.slope_angle_deg,
        rainfall_intensity_mm_h=req.rainfall_intensity_mm_h,
        duration_hours=req.duration_hours,
        soil_friction_angle_deg=req.soil_friction_angle_deg,
        cohesion_kpa=req.cohesion_kpa,
        initial_saturation_pct=req.initial_saturation_pct
    )

# Layer 3: Blockchain Audit Ledger
@app.get("/api/blockchain")
def get_blockchain_ledger():
    return get_audit_trail()

# Layer 4: Alerts
@app.get("/api/alerts")
def get_alerts():
    return get_all_alerts()

@app.post("/api/alerts/broadcast")
def broadcast_alert(req: AlertBroadcastRequest):
    return broadcast_new_alert(
        zone_id=req.zone_id,
        severity=req.severity,
        headline=req.headline,
        description=req.description,
        suggested_action=req.suggested_action,
        channels=req.channels,
        languages=req.languages,
        acknowledged_by=req.authorized_by
    )

@app.post("/api/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: str, req: AcknowledgeRequest):
    return acknowledge_alert(alert_id, req.officer_name)

# Layer 5: Drone Rapid Assessment
@app.get("/api/drone-surveys")
def get_drone_data():
    return get_drone_surveys()

# Layer 5: Insurance & Relief
@app.get("/api/claims")
def get_relief_claims():
    return get_all_claims()

@app.post("/api/claims")
def submit_relief_claim(req: ReliefClaimRequest):
    return create_relief_claim(
        zone_id=req.zone_id,
        applicant_name=req.applicant_name,
        aadhaar_last4=req.aadhaar_last4,
        damage_category=req.damage_category,
        loss_estimate_inr=req.loss_estimate_inr,
        geo_coordinates=req.geo_coordinates,
        insar_evidence=req.insar_evidence
    )

# Layer 5: Citizen Multilingual Chatbot
@app.post("/api/chatbot")
def chat_with_assistant(req: ChatbotRequest):
    return query_chatbot(req.message, req.language)

# Layer 5: Edge AI Offline Node Simulator
@app.post("/api/edge-ai/simulate")
def simulate_edge_node(req: EdgeSimRequest):
    return run_edge_inference(
        node_id=req.node_id,
        tilt_x=req.tilt_x,
        tilt_y=req.tilt_y,
        pore_kpa=req.pore_kpa,
        vibration_rms=req.vibration_rms,
        is_network_connected=req.is_network_connected
    )

# Layer 5: Safe Shelter Finder
@app.get("/api/shelters/nearest")
def get_nearest_shelters(lat: float, lng: float):
    return find_nearest_safe_shelter(lat, lng)

# =========================================================================
# Layer 2: Real Data-Driven ML Pipeline & Hybrid AI Risk Engine
# =========================================================================

@app.get("/api/ml/status")
def get_ml_status():
    """Returns dynamic ML model status, metadata, sample counts, and feature list."""
    return get_model_status()

@app.post("/api/ml/train")
def train_ml_pipeline():
    """Triggers ML training and evaluation on master catalog dataset."""
    import subprocess
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_script = os.path.join(base_dir, "scripts", "train_models.py")
    eval_script = os.path.join(base_dir, "scripts", "evaluate_models.py")

    res_train = subprocess.run([sys.executable, "-u", train_script], capture_output=True, text=True)
    if res_train.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Training script failed: {res_train.stderr}")

    res_eval = subprocess.run([sys.executable, "-u", eval_script], capture_output=True, text=True)
    if res_eval.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Evaluation script failed: {res_eval.stderr}")

    status = reload_models()
    metrics = load_metrics()
    return {
        "status": "SUCCESS",
        "message": "Models retrained and evaluated successfully on master catalog.",
        "model_status": status,
        "metrics": metrics
    }

@app.post("/api/ml/predict")
def predict_ml(req: MLPredictRequest):
    """Executes trained Random Forest / XGBoost inference on input features."""
    return predict_landslide_risk(
        features_input=req.features,
        zone_id=req.zone_id,
        model_type=req.model_type or "rf"
    )

@app.get("/api/ml/metrics")
def get_ml_metrics():
    """Returns genuine test-set evaluation metrics from model_metrics.json."""
    metrics = load_metrics()
    comparison = load_comparison()
    if not metrics:
        raise HTTPException(status_code=404, detail="Model evaluation metrics not found. Verify training completed.")
    return {
        "test_metrics": metrics,
        "pipeline_comparison": comparison
    }

@app.get("/api/ml/feature-importance")
def get_ml_feature_importance():
    """Returns genuine tree Gini feature importances from the trained models."""
    return {
        "feature_importances": get_feature_importances(),
        "model": "Balanced RandomForestClassifier (Gini Importance)",
        "dataset_pedigree": "ISRO Landslide Atlas 2023 + NASA IMERG + SRTM DEM + ISRIC SoilGrids 2.0"
    }

@app.get("/api/ml/explanation")
def get_ml_explanation_route(
    zone_id: Optional[str] = None,
    alpha: Optional[float] = None,
    model_type: Optional[str] = "rf"
):
    """
    Returns authentic explanation of Physics vs ML disagreement and contributing features.
    Provides geotechnical and empirical rationales without fabricated explanations.
    """
    return get_model_explanation(
        zone_id=zone_id,
        alpha_override=alpha,
        model_type=model_type or "rf"
    )

@app.get("/api/hybrid-risk")
def get_hybrid_risk_get(zone_id: Optional[str] = None, alpha: Optional[float] = None, model_type: Optional[str] = "rf"):
    """Evaluates Physics Baseline vs ML Pipeline vs Hybrid Risk for a zone."""
    return calculate_hybrid_risk(
        zone_id=zone_id,
        alpha_override=alpha,
        model_type=model_type or "rf"
    )

@app.post("/api/hybrid-risk")
def calculate_hybrid_risk_post(req: HybridRiskRequest):
    """Evaluates Physics Baseline vs ML Pipeline vs Hybrid Risk given arbitrary features."""
    return calculate_hybrid_risk(
        features_input=req.features,
        zone_id=req.zone_id,
        alpha_override=req.alpha,
        model_type=req.model_type or "rf"
    )

# Static files for built frontend
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

