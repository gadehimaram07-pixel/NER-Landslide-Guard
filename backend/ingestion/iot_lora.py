"""
IoT Sensor & LoRaWAN / NB-IoT Gateway Ingestion Engine.
Processes moisture (VWC), pore water pressure, biaxial tilt, vibration, and mesh health.
"""

from datetime import datetime
from database import get_connection

def get_all_sensors():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT s.*, z.name as zone_name, z.state, z.slope_angle_deg 
    FROM sensors s
    JOIN zones z ON s.zone_id = z.id
    ORDER BY s.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        # Calculate resultant vector tilt: sqrt(tilt_x^2 + tilt_y^2)
        resultant_tilt = round((r["tilt_x_deg"]**2 + r["tilt_y_deg"]**2) ** 0.5, 2)
        results.append({
            "id": r["id"],
            "zone_id": r["zone_id"],
            "zone_name": r["zone_name"],
            "name": r["name"],
            "sensor_type": r["sensor_type"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "soil_moisture_vwc": r["soil_moisture_vwc"],
            "pore_pressure_kpa": r["pore_pressure_kpa"],
            "tilt_x_deg": r["tilt_x_deg"],
            "tilt_y_deg": r["tilt_y_deg"],
            "resultant_tilt_deg": resultant_tilt,
            "vibration_rms": r["vibration_rms"],
            "battery_pct": r["battery_pct"],
            "signal_rssi": r["signal_rssi"],
            "connectivity_mode": r["connectivity_mode"],
            "edge_alarm_state": r["edge_alarm_state"],
            "last_heartbeat": r["last_heartbeat"]
        })
    return results

def ingest_lora_packet(sensor_id: str, moisture: float, pore_kpa: float, tilt_x: float, tilt_y: float, vib_rms: float, battery: float, rssi: int):
    """
    Ingests raw packet from LoRaWAN gateway. Evaluates edge trigger logic.
    """
    conn = get_connection()
    cursor = conn.cursor()

    resultant_tilt = (tilt_x**2 + tilt_y**2) ** 0.5
    alarm_state = "NORMAL"
    if resultant_tilt > 5.0 or moisture > 60.0 or pore_kpa > 25.0:
        alarm_state = "TRIGGERED"
    elif resultant_tilt > 2.5 or moisture > 45.0:
        alarm_state = "WARNING"

    now_str = datetime.utcnow().isoformat()
    cursor.execute("""
    UPDATE sensors
    SET soil_moisture_vwc = ?, pore_pressure_kpa = ?, tilt_x_deg = ?, tilt_y_deg = ?, vibration_rms = ?, battery_pct = ?, signal_rssi = ?, edge_alarm_state = ?, last_heartbeat = ?
    WHERE id = ?
    """, (moisture, pore_kpa, tilt_x, tilt_y, vib_rms, battery, rssi, alarm_state, now_str, sensor_id))

    conn.commit()
    conn.close()
    return {
        "sensor_id": sensor_id,
        "alarm_state": alarm_state,
        "resultant_tilt": round(resultant_tilt, 2),
        "timestamp": now_str
    }
