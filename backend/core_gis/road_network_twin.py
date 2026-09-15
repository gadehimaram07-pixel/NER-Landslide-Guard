"""
Road Network Twin & Automated Mountain Highway Rerouter for NER.
Models critical highway lifelines (NH-10, NH-29, NH-6, NH-27, NH-54, NH-37)
and computes emergency rerouting paths around active landslides.
"""

import json
from database import get_connection

def get_all_road_segments():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM road_segments")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "highway_no": r["highway_no"],
            "name": r["name"],
            "state": r["state"],
            "start_point": r["start_point"],
            "end_point": r["end_point"],
            "length_km": r["length_km"],
            "status": r["status"],
            "risk_level": r["risk_level"],
            "blockage_reason": r["blockage_reason"],
            "alternate_route": r["alternate_route"],
            "coordinates": json.loads(r["coordinates_json"])
        })
    return results

def compute_alternate_route(origin: str, destination: str, avoid_road_id: str = None) -> dict:
    """
    Simulates graph rerouting when a mountain highway segment is severed by a landslide.
    """
    roads = get_all_road_segments()
    blocked_road = next((r for r in roads if r["id"] == avoid_road_id), None)

    if blocked_road:
        return {
            "origin": origin or blocked_road["start_point"],
            "destination": destination or blocked_road["end_point"],
            "primary_route": f"{blocked_road['highway_no']} ({blocked_road['name']})",
            "primary_status": blocked_road["status"],
            "closure_reason": blocked_road["blockage_reason"],
            "recommended_alternate": blocked_road["alternate_route"],
            "additional_travel_time_hours": 2.5 if blocked_road["length_km"] < 100 else 4.0,
            "fuel_stations_available": True,
            "convoy_escort_required": True if blocked_road["risk_level"] == "Critical" else False,
            "emergency_helpline": "1077 (Disaster Control Room)"
        }
    
    return {
        "status": "All primary highway links currently navigable with standard seasonal advisories.",
        "recommended_alternate": "Standard arterial route via Asian Highway network"
    }

def update_road_status(road_id: str, new_status: str, risk_level: str, reason: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE road_segments
    SET status = ?, risk_level = ?, blockage_reason = ?
    WHERE id = ?
    """, (new_status, risk_level, reason, road_id))
    conn.commit()
    conn.close()
    return {"status": "success", "road_id": road_id, "new_status": new_status}
