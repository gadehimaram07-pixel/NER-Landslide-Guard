"""
IMD Weather Ingestion & Antecedent Precipitation Index (API) Engine for NER.
Tracks live Doppler radar rainfall, automated weather stations (AWS), and 24-48h forecasts.
"""

from datetime import datetime
from database import get_connection

# Empirical decay factor for Himalayan terrains (GSI & IMD standard)
API_DECAY_FACTOR = 0.85

# Caine/Guzzetti empirical rainfall threshold parameters for Eastern Himalayas: I = 14.82 * D^(-0.39)
# If 24h intensity exceeds threshold, probability of failure spikes
def calculate_critical_rainfall_threshold(duration_hours=24):
    """Returns critical rainfall intensity (mm/h) for given duration."""
    return 14.82 * (duration_hours ** (-0.39))

def update_antecedent_precipitation(rainfall_today_mm, previous_api=0.0):
    """
    Computes Antecedent Precipitation Index (API):
    API_t = P_t + k * API_{t-1}
    """
    return round(rainfall_today_mm + (API_DECAY_FACTOR * previous_api), 2)

def fetch_imd_weather_summary():
    """
    Fetches latest weather logs for all zones and computes nowcasting metrics.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT w.*, z.name as zone_name, z.state, z.slope_angle_deg
    FROM weather_logs w
    JOIN zones z ON w.zone_id = z.id
    ORDER BY w.timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        crit_intensity_24h = calculate_critical_rainfall_threshold(24)
        actual_intensity_24h = r["rainfall_24h_mm"] / 24.0
        threshold_exceedance_pct = round((actual_intensity_24h / crit_intensity_24h) * 100, 1)

        status = "NORMAL"
        if threshold_exceedance_pct >= 150:
            status = "EXTREME_WARNING"
        elif threshold_exceedance_pct >= 100:
            status = "CRITICAL_THRESHOLD_EXCEEDED"
        elif threshold_exceedance_pct >= 70:
            status = "ADVISORY"

        results.append({
            "zone_id": r["zone_id"],
            "zone_name": r["zone_name"],
            "state": r["state"],
            "station_name": r["station_name"],
            "timestamp": r["timestamp"],
            "rainfall_1h_mm": r["rainfall_1h_mm"],
            "rainfall_24h_mm": r["rainfall_24h_mm"],
            "rainfall_72h_mm": r["rainfall_72h_mm"],
            "api_value": r["antecedent_precipitation_index"],
            "forecast_24h_mm": r["forecast_24h_mm"],
            "forecast_48h_mm": r["forecast_48h_mm"],
            "relative_humidity": r["relative_humidity"],
            "temperature_c": r["temperature_c"],
            "source": r["source"],
            "threshold_exceedance_pct": threshold_exceedance_pct,
            "weather_warning_status": status
        })
    return results

def simulate_new_rainfall_reading(zone_id: str, added_rainfall_1h: float):
    """
    Simulates new incoming telemetry from IMD AWS or Doppler feed and updates database.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM weather_logs WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
    row = cursor.fetchone()

    now_str = datetime.utcnow().isoformat()
    if row:
        new_24h = row["rainfall_24h_mm"] + added_rainfall_1h
        new_72h = row["rainfall_72h_mm"] + added_rainfall_1h
        new_api = update_antecedent_precipitation(new_24h, row["antecedent_precipitation_index"])
        cursor.execute("""
        UPDATE weather_logs 
        SET rainfall_1h_mm = ?, rainfall_24h_mm = ?, rainfall_72h_mm = ?, antecedent_precipitation_index = ?, timestamp = ?
        WHERE id = ?
        """, (added_rainfall_1h, new_24h, new_72h, new_api, now_str, row["id"]))
    conn.commit()
    conn.close()
    return {"status": "success", "zone_id": zone_id, "updated_at": now_str}
