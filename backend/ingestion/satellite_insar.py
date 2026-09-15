"""
Satellite InSAR Ground Deformation & Autonomous Uninstrumented Landslide Detection Module.
Ingests Synthetic Aperture Radar (SAR) interferometric displacement, Line-of-Sight (LOS) velocity vectors,
and autonomously detects landslides in remote blind-spots where ZERO ground IoT sensors exist.
"""

import uuid
from datetime import datetime, timedelta
from database import get_connection

def get_insar_displacement_feed():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT i.*, z.name as zone_name, z.state, z.latitude, z.longitude
    FROM insar_data i
    JOIN zones z ON i.zone_id = z.id
    ORDER BY ABS(i.velocity_mm_per_year) DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "zone_id": r["zone_id"],
            "zone_name": r["zone_name"],
            "state": r["state"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "satellite": r["satellite"],
            "acquisition_date": r["acquisition_date"],
            "cumulative_displacement_mm": r["cumulative_displacement_mm"],
            "velocity_mm_per_year": r["velocity_mm_per_year"],
            "coherence": r["coherence"],
            "risk_flag": r["risk_flag"],
            # High coherence (>0.6) signifies dependable radar phase correlation in steep mountainous canopy
            "measurement_reliability": "HIGH" if r["coherence"] >= 0.7 else "MODERATE"
        })
    return results

def get_uninstrumented_satellite_detections():
    """
    Retrieves all autonomous satellite landslide detections in areas with zero IoT ground sensors.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM satellite_uninstrumented_detections ORDER BY detected_at DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "location_name": r["location_name"],
            "state": r["state"],
            "district": r["district"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "sensor_count": r["sensor_count"],
            "satellite_mission": r["satellite_mission"],
            "detection_method": r["detection_method"],
            "event_type": r["event_type"],
            "estimated_area_sqm": r["estimated_area_sqm"],
            "estimated_volume_m3": r["estimated_volume_m3"],
            "los_subsidence_velocity_mm_yr": r["los_subsidence_velocity_mm_yr"],
            "coherence_drop": r["coherence_drop"],
            "trigger_cause": r["trigger_cause"],
            "threat_level": r["threat_level"],
            "nearest_infrastructure": r["nearest_infrastructure"],
            "recommended_action": r["recommended_action"],
            "detected_at": r["detected_at"],
            "status": r["status"]
        })
    return results

def trigger_satellite_uninstrumented_detection(preset_id: str = "dzongu", custom_data: dict = None):
    """
    Simulates / ingests an autonomous satellite radar detection of a newly occurred landslide
    in a remote Himalayan blind-spot with ZERO ground IoT sensors.
    Automatically:
    1. Records into satellite_uninstrumented_detections table
    2. Dispatches a high-priority emergency alert into alerts table
    3. Anchors cryptographic proof into the blockchain ledger
    """
    conn = get_connection()
    cursor = conn.cursor()

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    det_id = f"SAT-DISC-{uuid.uuid4().hex[:6].upper()}"

    presets = {
        "dzongu": {
            "location_name": "Dzongu Upper Flank (North Sikkim)",
            "state": "Sikkim",
            "district": "North Sikkim",
            "latitude": 27.5340,
            "longitude": 88.5210,
            "satellite_mission": "Sentinel-1A SAR + Sentinel-2 MSI (ISRO/ESA)",
            "detection_method": "SAR Amplitude Shift (ΔdB +5.8) & Severe Phase Decorrelation (γ: 0.81 → 0.12)",
            "event_type": "Massive Mountain Debris Avalanche",
            "estimated_area_sqm": 58000.0,
            "estimated_volume_m3": 175000.0,
            "los_subsidence_velocity_mm_yr": -320.0,
            "coherence_drop": "0.81 -> 0.12 (Severe Decorrelation)",
            "trigger_cause": "Intense NASA IMERG Satellite Cloudburst (218 mm/24h) on fragile phyllite bedrock",
            "threat_level": "CRITICAL_UNMONITORED",
            "nearest_infrastructure": "Sankalang River Valley Bridge & Dzongu Arterial Link (1.2 km downstream)",
            "recommended_action": "Autonomous Alert: Dispatch Priority Drone UAV & Alert North Sikkim DDMA"
        },
        "sonapur": {
            "location_name": "Sonapur Karst Upper Ridge (Meghalaya)",
            "state": "Meghalaya",
            "district": "East Jaintia Hills",
            "latitude": 25.1480,
            "longitude": 92.3820,
            "satellite_mission": "Sentinel-1B InSAR Radar",
            "detection_method": "Differential InSAR (DInSAR) Fringe Rupture & Bare-Earth Backscatter Shift",
            "event_type": "High-Velocity Colluvial Rockslide",
            "estimated_area_sqm": 42000.0,
            "estimated_volume_m3": 120000.0,
            "los_subsidence_velocity_mm_yr": -295.0,
            "coherence_drop": "0.78 -> 0.15 (Decorrelated)",
            "trigger_cause": "Extreme Monsoon Downpour (320mm / 48h) on fractured limestone bedrock",
            "threat_level": "CRITICAL_UNMONITORED",
            "nearest_infrastructure": "NH-6 Sonapur Tunnel Mouth approach (overhanging arterial freight lifeline)",
            "recommended_action": "Halt NH-6 heavy convoy traffic immediately. Mobilize SDRF road clearance battalion."
        },
        "sinjol": {
            "location_name": "Sinjol Upper Escarpment (Nagaland)",
            "state": "Nagaland",
            "district": "Chumukedima",
            "latitude": 25.7620,
            "longitude": 93.8850,
            "satellite_mission": "Sentinel-1A C-Band SAR",
            "detection_method": "Persistent Scatterer Interferometry (PSI) Velocity Rupture & Scar Delta",
            "event_type": "Slope Cleavage & Mudflow",
            "estimated_area_sqm": 31000.0,
            "estimated_volume_m3": 85000.0,
            "los_subsidence_velocity_mm_yr": -260.0,
            "coherence_drop": "0.75 -> 0.19 (Decorrelated)",
            "trigger_cause": "Antecedent Soil Saturation on Disang Shales",
            "threat_level": "CRITICAL_UNMONITORED",
            "nearest_infrastructure": "Old Dimapur-Kohima arterial link bypass road",
            "recommended_action": "Pre-evacuate foothill settlements and divert light emergency traffic."
        }
    }

    p = presets.get(preset_id.lower(), presets["dzongu"])
    if custom_data:
        p.update(custom_data)

    cursor.execute("""
    INSERT INTO satellite_uninstrumented_detections VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        det_id,
        p["location_name"],
        p["state"],
        p["district"],
        p["latitude"],
        p["longitude"],
        0,  # Zero ground sensors
        p["satellite_mission"],
        p["detection_method"],
        p["event_type"],
        p["estimated_area_sqm"],
        p["estimated_volume_m3"],
        p["los_subsidence_velocity_mm_yr"],
        p["coherence_drop"],
        p["trigger_cause"],
        p["threat_level"],
        p["nearest_infrastructure"],
        p["recommended_action"],
        now_str,
        "ACTIVE_UNVERIFIED_BY_GROUND"
    ))

    # Also automatically broadcast an emergency alert
    alert_id = f"ALERT-SAT-{uuid.uuid4().hex[:6].upper()}"
    cursor.execute("""
    INSERT INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        alert_id,
        "UNINSTRUMENTED_SATELLITE",
        "CRITICAL",
        f"🛰️ SATELLITE DISCOVERY: Remote Landslide at {p['location_name']} (Zero Ground Sensors)",
        f"Sentinel-1 SAR interferometry autonomously detected a massive {p['event_type']} at [{p['latitude']:.4f}, {p['longitude']:.4f}] with ZERO ground IoT sensors. Coherence: {p['coherence_drop']}, Subsidence: {p['los_subsidence_velocity_mm_yr']} mm/yr. Volume: ~{p['estimated_volume_m3']:,.0f} m³. Nearest: {p['nearest_infrastructure']}.",
        p["recommended_action"],
        "SMS, WHATSAPP, IVR_VOICE, FCM_PUSH, SATELLITE_UAV_RELAY",
        "English, Hindi, Local Dialect",
        "SATELLITE_AUTONOMOUS_TRIGGER",
        f"IN-NDMA-CAP-{uuid.uuid4().hex[:8].upper()}",
        now_str,
        "Sentinel-1 Autonomous Early Warning Engine",
        now_str,
        "ACTIVE"
    ))

    conn.commit()
    conn.close()

    # Blockchain Cryptographic Anchor
    try:
        from core_gis.blockchain_ledger import record_audit_event
        record_audit_event("SATELLITE_AUTONOMOUS_LANDSLIDE_DETECTION", {
            "detection_id": det_id,
            "location": p["location_name"],
            "coordinates": [p["latitude"], p["longitude"]],
            "ground_sensors": 0,
            "satellite": p["satellite_mission"],
            "estimated_debris_m3": p["estimated_volume_m3"],
            "velocity_mm_yr": p["los_subsidence_velocity_mm_yr"],
            "alert_dispatched": alert_id
        })
    except Exception as e:
        print("Blockchain record error (non-fatal):", e)

    return {
        "status": "SUCCESS",
        "message": f"Autonomous Satellite Discovery successfully registered at {p['location_name']} (Zero Ground Sensors).",
        "detection_id": det_id,
        "alert_id": alert_id,
        "details": p
    }
