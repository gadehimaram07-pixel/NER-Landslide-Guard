"""
Spatial Engine & GeoJSON Provider for North Eastern Region (NER).
Generates Leaflet/Mapbox-ready FeatureCollections for landslide zones, IoT sensors,
evacuation shelters, and hazard heatmaps.
"""

import math
from database import get_connection

# Evacuation Shelters strategically mapped in NER hill stations
NER_SHELTERS = [
    {"id": "SHL-SKM-01", "name": "Gangtok Paljor Stadium Disaster Relief Center", "zone_id": "ZONE-SKM-01", "lat": 27.3312, "lng": 88.6145, "capacity": 2500, "supplies_days": 14, "medical_team": True},
    {"id": "SHL-SKM-02", "name": "Ranipool Govt Senior Secondary School Shelter", "zone_id": "ZONE-SKM-01", "lat": 27.3050, "lng": 88.5880, "capacity": 800, "supplies_days": 7, "medical_team": True},
    {"id": "SHL-MEG-01", "name": "Cherrapunji Ramakrishna Mission Relief Camp", "zone_id": "ZONE-MEG-02", "lat": 25.2810, "lng": 91.7250, "capacity": 1200, "supplies_days": 10, "medical_team": True},
    {"id": "SHL-ASM-01", "name": "Haflong Government College Gymnasium", "zone_id": "ZONE-ASM-03", "lat": 25.1780, "lng": 93.0250, "capacity": 1500, "supplies_days": 10, "medical_team": True},
    {"id": "SHL-NGL-01", "name": "Kohima Indira Gandhi Stadium Evacuation Base", "zone_id": "ZONE-NGL-04", "lat": 25.6880, "lng": 94.1150, "capacity": 3000, "supplies_days": 21, "medical_team": True},
    {"id": "SHL-MIZ-01", "name": "Aizawl Hawla Indoor Stadium Transit Shelter", "zone_id": "ZONE-MIZ-05", "lat": 23.7380, "lng": 92.7250, "capacity": 2200, "supplies_days": 14, "medical_team": True},
    {"id": "SHL-ARN-01", "name": "Tawang Multipurpose Community Hall", "zone_id": "ZONE-ARN-06", "lat": 27.5850, "lng": 91.8650, "capacity": 900, "supplies_days": 18, "medical_team": True},
    {"id": "SHL-MNP-01", "name": "Tamenglong DC Complex Emergency Shelter", "zone_id": "ZONE-MNP-07", "lat": 24.9850, "lng": 93.4920, "capacity": 1400, "supplies_days": 12, "medical_team": True},
]

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_zones_geojson():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM zones")
    rows = cursor.fetchall()
    conn.close()

    features = []
    for r in rows:
        color_map = {
            "Critical": "#ef4444",
            "High": "#f97316",
            "Moderate": "#eab308",
            "Low": "#22c55e"
        }
        color = color_map.get(r["current_risk_level"], "#3b82f6")

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [r["longitude"], r["latitude"]]
            },
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "state": r["state"],
                "district": r["district"],
                "elevation_m": r["elevation_m"],
                "slope_angle_deg": r["slope_angle_deg"],
                "geology_type": r["geology_type"],
                "soil_type": r["soil_type"],
                "vegetation_cover": r["vegetation_cover"],
                "baseline_susceptibility": r["baseline_susceptibility"],
                "current_risk_level": r["current_risk_level"],
                "current_risk_score": r["current_risk_score"],
                "population_at_risk": r["population_at_risk"],
                "critical_infrastructure": r["critical_infrastructure"],
                "last_updated": r["last_updated"],
                "marker_color": color
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

def find_nearest_safe_shelter(lat: float, lng: float):
    """
    Finds closest evacuation centers sorted by distance from current coordinates.
    """
    results = []
    for s in NER_SHELTERS:
        dist = haversine_distance_km(lat, lng, s["lat"], s["lng"])
        results.append({
            **s,
            "distance_km": dist
        })
    results.sort(key=lambda x: x["distance_km"])
    return results[:3]
