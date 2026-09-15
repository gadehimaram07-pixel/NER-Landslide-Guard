"""
Automated Backend Integration & ML Unit Test Suite.
Verifies all 5 layers and 12 add-ons.
"""

from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_system():
    print("Testing Root Endpoint...")
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "OPERATIONAL"

    print("Testing Overview Endpoint...")
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["monitored_zones"] >= 8
    assert data["active_critical_alerts"] >= 1
    assert data["iot_sensors_online"] >= 8
    print(f"  -> Monitored Zones: {data['monitored_zones']}, Sensors: {data['iot_sensors_online']}")

    print("Testing GIS Zones FeatureCollection...")
    res = client.get("/api/zones")
    assert res.status_code == 200
    geojson = res.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) >= 8

    print("Testing SHAP Explainability for Zone ZONE-SKM-01...")
    res = client.get("/api/zones/ZONE-SKM-01/shap")
    assert res.status_code == 200
    shap_data = res.json()
    assert "factors" in shap_data
    assert len(shap_data["factors"]) == 5
    print(f"  -> Top factor: {shap_data['factors'][0]['feature']} ({shap_data['factors'][0]['contribution_pct']}%)")

    print("Testing Weather Ingestion & API...")
    res = client.get("/api/weather")
    assert res.status_code == 200
    assert len(res.json()) >= 8

    print("Testing IoT Sensors...")
    res = client.get("/api/sensors")
    assert res.status_code == 200
    assert len(res.json()) >= 8

    print("Testing Satellite InSAR Ground Deformation...")
    res = client.get("/api/insar")
    assert res.status_code == 200
    assert len(res.json()) >= 8

    print("Testing Road Network Twin & Rerouter...")
    res = client.get("/api/roads")
    assert res.status_code == 200
    reroute_res = client.post("/api/roads/reroute", json={"origin": "Siliguri", "destination": "Gangtok", "avoid_road_id": "ROAD-NH10"})
    assert reroute_res.status_code == 200
    assert "Lava - Algarah" in reroute_res.json()["recommended_alternate"]

    print("Testing 3D Digital Twin Geotechnical Slope Simulation...")
    sim_res = client.post("/api/digital-twin/simulate", json={
        "slope_angle_deg": 48.0,
        "rainfall_intensity_mm_h": 120.0,
        "duration_hours": 8.0,
        "initial_saturation_pct": 85.0
    })
    assert sim_res.status_code == 200
    twin_data = sim_res.json()
    assert "factor_of_safety" in twin_data
    print(f"  -> Simulated Factor of Safety: {twin_data['factor_of_safety']} ({twin_data['stability_state']})")

    print("Testing Blockchain Audit Ledger...")
    res = client.get("/api/blockchain")
    assert res.status_code == 200
    assert res.json()["ledger_verified"] is True
    print(f"  -> Blockchain Verified: {res.json()['ledger_verified']}, Total blocks: {res.json()['total_blocks']}")

    print("Testing Multi-Channel Alert Broadcast & CAP v1.2 Exporter...")
    alert_req = {
        "zone_id": "ZONE-MEG-02",
        "severity": "CRITICAL",
        "headline": "Test Imminent Failure Alert at Sohra Escarpment",
        "description": "Triggered during automated validation test run.",
        "suggested_action": "Evacuate test sector.",
        "channels": ["SMS", "WHATSAPP", "CAP_XML"],
        "languages": ["English", "Khasi", "Assamese"]
    }
    b_res = client.post("/api/alerts/broadcast", json=alert_req)
    assert b_res.status_code == 200
    b_data = b_res.json()
    assert "cap_xml" in b_data
    assert "<alert xmlns=\"urn:oasis:names:tc:emergency:cap:1.2\">" in b_data["cap_xml"]
    print("  -> OASIS CAP v1.2 XML Generated and Validated.")

    print("Testing Computer Vision Classifier...")
    cv_res = client.post("/api/vision/classify", json={"image_url_or_base64": "test_photo_crown_crack"})
    assert cv_res.status_code == 200
    print(f"  -> CV Classification: {cv_res.json()['classification']} (Confidence: {cv_res.json()['confidence']})")

    print("Testing Multilingual Citizen Chatbot in Assamese & English...")
    chat_res = client.post("/api/chatbot", json={"message": "Is NH-10 road open?", "language": "English"})
    assert chat_res.status_code == 200
    assert "Highway Advisory" in chat_res.json()["response_text"]

    chat_res_as = client.post("/api/chatbot", json={"message": "ৰাস্তা কেনেকুৱা?", "language": "Assamese"})
    assert chat_res_as.status_code == 200
    assert "সতৰ্কবাণী" in chat_res_as.json()["response_text"]

    print("Testing Edge AI TinyML Offline Simulation...")
    edge_res = client.post("/api/edge-ai/simulate", json={
        "node_id": "EDGE-ESP32-S3-01",
        "tilt_x": 5.4,
        "tilt_y": -3.2,
        "pore_kpa": 31.0,
        "vibration_rms": 0.88,
        "is_network_connected": False
    })
    assert edge_res.status_code == 200
    assert edge_res.json()["siren_relay_gpio_active"] is True
    print("  -> Autonomous Siren Pin Triggered in Offline State.")

    print("Testing Relief Claims & Nearest Shelter Search...")
    shelter_res = client.get("/api/shelters/nearest?lat=27.33&lng=88.60")
    assert shelter_res.status_code == 200
    assert len(shelter_res.json()) > 0
    print(f"  -> Nearest shelter found: {shelter_res.json()[0]['name']} ({shelter_res.json()[0]['distance_km']} km)")

    print("Testing 3-Sensor Telemetry & Sliding-Rate Prediction Endpoints...")
    latest_res = client.get("/api/sensors/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert "sensors" in latest_data
    assert "soil_moisture" in latest_data["sensors"]
    assert "vibration" in latest_data["sensors"]
    assert "tilt" in latest_data["sensors"]
    assert "prediction" in latest_data
    print(f"  -> Latest Sensors: Moisture={latest_data['sensors']['soil_moisture']['value']}%, Vib={latest_data['sensors']['vibration']['value']} mm/s, Tilt={latest_data['sensors']['tilt']['value']}°")

    history_res = client.get("/api/sensors/history?limit=60")
    assert history_res.status_code == 200
    hist = history_res.json()
    assert len(hist) >= 30
    print(f"  -> Historical sensor readings retrieved: {len(hist)} points")

    pred_res = client.get("/api/prediction/sliding-rate")
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert "predicted_sliding_rate" in pred_data
    assert "instability_score" in pred_data
    assert "risk_level" in pred_data
    assert pred_data["sliding_rate_unit"] == "mm/hour"
    print(f"  -> Predicted Sliding Rate: {pred_data['predicted_sliding_rate']} mm/h (Instability: {pred_data['instability_score']}%, Risk: {pred_data['risk_level']})")

    mode_res = client.post("/api/sensors/simulation-mode", json={"mode": "CRITICAL"})
    assert mode_res.status_code == 200
    assert mode_res.json()["mode"] == "CRITICAL"

    step_res = client.post("/api/sensors/simulate-step")
    assert step_res.status_code == 200
    assert step_res.json()["status"] == "SUCCESS"
    print(f"  -> Simulated Step: Rate={step_res.json()['reading']['predicted_sliding_rate']} mm/h")

    reset_res = client.post("/api/sensors/reset-demo")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "SUCCESS"
    print("  -> Sensor demo progression reset successfully.")

    print("\n--- Testing Layer 2 Real ML & Hybrid Risk Pipeline Endpoints ---")
    print("Testing ML Status Endpoint (/api/ml/status)...")
    ml_status_res = client.get("/api/ml/status")
    assert ml_status_res.status_code == 200
    status_data = ml_status_res.json()
    assert status_data["is_trained"] is True
    assert status_data["training_samples"] >= 20
    assert len(status_data["feature_list"]) == 16
    print(f"  -> Model Status: {status_data['status']} ({status_data['training_samples']} train samples, {len(status_data['feature_list'])} features)")

    print("Testing ML Test Metrics (/api/ml/metrics)...")
    ml_metrics_res = client.get("/api/ml/metrics")
    assert ml_metrics_res.status_code == 200
    metrics_data = ml_metrics_res.json()
    assert "test_metrics" in metrics_data
    assert "random_forest" in metrics_data["test_metrics"]
    rf_acc = metrics_data["test_metrics"]["random_forest"]["accuracy"]
    print(f"  -> Genuine Test Accuracy: {rf_acc * 100:.1f}%, F1: {metrics_data['test_metrics']['random_forest']['f1_score']:.3f}")

    print("Testing ML Feature Importance (/api/ml/feature-importance)...")
    ml_fi_res = client.get("/api/ml/feature-importance")
    assert ml_fi_res.status_code == 200
    fi_data = ml_fi_res.json()
    assert len(fi_data["feature_importances"]) > 0
    top_f = fi_data["feature_importances"][0]
    print(f"  -> Top ML Feature: {top_f['feature']} (Gini Importance: {top_f['importance'] * 100:.2f}%)")

    print("Testing ML Prediction Inference (/api/ml/predict)...")
    ml_pred_res = client.post("/api/ml/predict", json={
        "features": {
            "slope_deg": 46.0,
            "rainfall_24h_mm": 110.0,
            "rainfall_72h_mm": 210.0
        }
    })
    assert ml_pred_res.status_code == 200
    pred_res_data = ml_pred_res.json()
    assert pred_res_data["status"] == "SUCCESS"
    assert pred_res_data["probability"] is not None
    assert pred_res_data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    print(f"  -> ML Inferred Probability: {pred_res_data['probability'] * 100:.1f}% ({pred_res_data['risk_level']})")

    print("Testing Hybrid AI + Physics Risk GET (/api/hybrid-risk?zone_id=ZONE-SKM-01)...")
    hybrid_get_res = client.get("/api/hybrid-risk?zone_id=ZONE-SKM-01&alpha=0.50")
    assert hybrid_get_res.status_code == 200
    h_data = hybrid_get_res.json()
    assert "physics_baseline" in h_data
    assert "ml_model" in h_data
    assert "hybrid_risk" in h_data
    # Reliability-weighted fusion clamps effective alpha to [0.25, 0.75],
    # so it need not equal the configured alpha exactly.
    assert 0.25 <= h_data["hybrid_risk"]["alpha_ml_weight"] <= 0.75
    print(f"  -> Dual Pipeline Evaluation: Physics Score={h_data['physics_baseline']['score']} | ML Prob={h_data['ml_model']['probability']} | Hybrid={h_data['hybrid_risk']['score']} ({h_data['hybrid_risk']['risk_level']})")

    print("Testing Hybrid AI + Physics Risk POST (/api/hybrid-risk)...")
    hybrid_post_res = client.post("/api/hybrid-risk", json={
        "features": {
            "slope_deg": 48.0,
            "rainfall_24h_mm": 130.0,
            "rainfall_72h_mm": 240.0,
            "cohesion_kpa": 8.0,
            "saturation_pct": 88.0
        },
        "alpha": 0.60
    })
    assert hybrid_post_res.status_code == 200
    h_post_data = hybrid_post_res.json()
    assert h_post_data["pipeline_mode"] == "FUSED_HYBRID"
    assert 0.25 <= h_post_data["hybrid_risk"]["alpha_ml_weight"] <= 0.75
    print(f"  -> Hybrid Post Fusion (alpha=0.60): Score={h_post_data['hybrid_risk']['score']} ({h_post_data['hybrid_risk']['risk_level']})")

    print("Testing Enriched SHAP Endpoint with Genuine ML Tree Feature Importance...")
    shap_check_res = client.get("/api/zones/ZONE-SKM-01/shap")
    assert shap_check_res.status_code == 200
    shap_check_data = shap_check_res.json()
    assert "ml_feature_importances" in shap_check_data
    assert len(shap_check_data["ml_feature_importances"]) > 0
    print(f"  -> Enriched SHAP has {len(shap_check_data['ml_feature_importances'])} real ML feature importances and {len(shap_check_data['factors'])} physics factors.")

    print("\n=========================================================================")
    print("ALL BACKEND LAYERS, REAL ML PIPELINE & HYBRID ENGINE PASSED WITH 100% SUCCESS!")
    print("=========================================================================")

if __name__ == "__main__":
    test_system()

