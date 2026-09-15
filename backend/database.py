"""
Database configuration and SQLite operational storage for NER Landslide Early Warning System.
"""

import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "ner_lews.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Monitored Zones / Micro-catchments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        elevation_m REAL NOT NULL,
        slope_angle_deg REAL NOT NULL,
        geology_type TEXT NOT NULL,
        soil_type TEXT NOT NULL,
        vegetation_cover TEXT NOT NULL,
        baseline_susceptibility REAL NOT NULL,
        current_risk_level TEXT NOT NULL,
        current_risk_score REAL NOT NULL,
        population_at_risk INTEGER NOT NULL,
        critical_infrastructure TEXT NOT NULL,
        last_updated TEXT NOT NULL
    )
    """)

    # 2. IoT Sensor Nodes (LoRa / NB-IoT)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        soil_moisture_vwc REAL NOT NULL,
        pore_pressure_kpa REAL NOT NULL,
        tilt_x_deg REAL NOT NULL,
        tilt_y_deg REAL NOT NULL,
        vibration_rms REAL NOT NULL,
        battery_pct REAL NOT NULL,
        signal_rssi INTEGER NOT NULL,
        connectivity_mode TEXT NOT NULL,
        edge_alarm_state TEXT NOT NULL,
        last_heartbeat TEXT NOT NULL,
        FOREIGN KEY (zone_id) REFERENCES zones(id)
    )
    """)

    # 3. Weather Ingestion Records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weather_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        rainfall_1h_mm REAL NOT NULL,
        rainfall_24h_mm REAL NOT NULL,
        rainfall_72h_mm REAL NOT NULL,
        antecedent_precipitation_index REAL NOT NULL,
        forecast_24h_mm REAL NOT NULL,
        forecast_48h_mm REAL NOT NULL,
        relative_humidity REAL NOT NULL,
        temperature_c REAL NOT NULL,
        source TEXT NOT NULL
    )
    """)

    # 4. InSAR Ground Displacement Records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS insar_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id TEXT NOT NULL,
        satellite TEXT NOT NULL,
        acquisition_date TEXT NOT NULL,
        cumulative_displacement_mm REAL NOT NULL,
        velocity_mm_per_year REAL NOT NULL,
        coherence REAL NOT NULL,
        risk_flag TEXT NOT NULL
    )
    """)

    # 4b. Autonomous Satellite Detections in Uninstrumented Areas (Zero Ground Sensors)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS satellite_uninstrumented_detections (
        id TEXT PRIMARY KEY,
        location_name TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        sensor_count INTEGER DEFAULT 0,
        satellite_mission TEXT NOT NULL,
        detection_method TEXT NOT NULL,
        event_type TEXT NOT NULL,
        estimated_area_sqm REAL NOT NULL,
        estimated_volume_m3 REAL NOT NULL,
        los_subsidence_velocity_mm_yr REAL NOT NULL,
        coherence_drop TEXT NOT NULL,
        trigger_cause TEXT NOT NULL,
        threat_level TEXT NOT NULL,
        nearest_infrastructure TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        status TEXT NOT NULL
    )
    """)

    # 5. Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        headline TEXT NOT NULL,
        description TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        channels_dispatched TEXT NOT NULL,
        languages_sent TEXT NOT NULL,
        escalation_level TEXT NOT NULL,
        cap_identifier TEXT NOT NULL,
        created_at TEXT NOT NULL,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        status TEXT NOT NULL
    )
    """)

    # 6. Citizen & Field Reports
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citizen_reports (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        reporter_phone TEXT NOT NULL,
        reporter_role TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        zone_id TEXT,
        incident_type TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        cv_classification TEXT,
        cv_confidence REAL,
        severity_tag TEXT NOT NULL,
        credibility_score REAL NOT NULL,
        offline_queued INTEGER DEFAULT 0,
        synced_at TEXT NOT NULL,
        verified_by_official INTEGER DEFAULT 0
    )
    """)

    # 7. Road Network Segments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_segments (
        id TEXT PRIMARY KEY,
        highway_no TEXT NOT NULL,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        start_point TEXT NOT NULL,
        end_point TEXT NOT NULL,
        length_km REAL NOT NULL,
        status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        blockage_reason TEXT,
        alternate_route TEXT,
        coordinates_json TEXT NOT NULL
    )
    """)

    # 8. Blockchain Immutable Audit Ledger
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS blockchain_blocks (
        block_index INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        nonce INTEGER NOT NULL
    )
    """)

    # 9. Insurance & Relief Claims
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS relief_claims (
        claim_id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        applicant_name TEXT NOT NULL,
        aadhaar_last4 TEXT NOT NULL,
        damage_category TEXT NOT NULL,
        loss_estimate_inr REAL NOT NULL,
        geo_coordinates TEXT NOT NULL,
        insar_evidence_summary TEXT NOT NULL,
        ai_verification_status TEXT NOT NULL,
        payout_recommendation_inr REAL NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 10. Sensor Telemetry & Ground Sliding Rate Prediction History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_telemetry_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        soil_moisture REAL NOT NULL,
        vibration REAL NOT NULL,
        tilt REAL NOT NULL,
        moisture_rate REAL DEFAULT 0.0,
        vibration_rate REAL DEFAULT 0.0,
        tilt_rate REAL DEFAULT 0.0,
        sensor_status TEXT DEFAULT 'ONLINE',
        location TEXT DEFAULT 'Gangtok-Ranipool Slope Node Alpha',
        instability_score REAL NOT NULL,
        predicted_sliding_rate REAL NOT NULL,
        risk_level TEXT NOT NULL,
        scenario_mode TEXT DEFAULT 'AUTO'
    )
    """)

    conn.commit()

    # Seed initial realistic NER data if zones empty
    cursor.execute("SELECT COUNT(*) FROM zones")
    if cursor.fetchone()[0] == 0:
        seed_ner_data(cursor)
        conn.commit()

    # Seed sensor telemetry demo sequence if empty
    cursor.execute("SELECT COUNT(*) FROM sensor_telemetry_readings")
    if cursor.fetchone()[0] == 0:
        seed_sensor_telemetry_data(cursor)
        conn.commit()

    conn.close()

def seed_ner_data(cursor):
    now_str = datetime.utcnow().isoformat()

    # 1. Strategic Zones across NER
    zones = [
        ("ZONE-SKM-01", "Gangtok - Ranipool Corridor", "Sikkim", "East Sikkim", 27.3389, 88.6065, 1650.0, 42.5, "Schist & Phyllite (Fragile)", "Sandy Clay Loam", "Sub-tropical Alpine", 0.78, "Critical", 0.89, 45000, "NH-10 Lifeline & 132kV Power Line", now_str),
        ("ZONE-MEG-02", "Cherrapunji (Sohra) Escarpment", "Meghalaya", "East Khasi Hills", 25.2744, 91.7323, 1430.0, 48.0, "Sandstone & Limestone Karst", "Silty Loam", "Dense Rainforest", 0.65, "High", 0.74, 18000, "SH-5 Mawkdok Bridge & Water Intake", now_str),
        ("ZONE-ASM-03", "Haflong Hill Section", "Assam", "Dima Hasao", 25.1697, 93.0189, 680.0, 36.0, "Tertiary Shale & Siltstone", "Clayey Red Soil", "Bamboo & Degraded Forest", 0.72, "High", 0.76, 22000, "Lumding-Badarpur Hill Railway Line", now_str),
        ("ZONE-NGL-04", "Kohima - Paglapahar Bypass", "Nagaland", "Kohima", 25.6751, 94.1086, 1444.0, 39.5, "Disang Shale & Ophiolite", "Lateritic Clay", "Mixed Broadleaf", 0.81, "Critical", 0.92, 38000, "NH-29 Heavy Freight Corridor", now_str),
        ("ZONE-MIZ-05", "Aizawl Hunthar Slump", "Mizoram", "Aizawl", 23.7271, 92.7176, 1132.0, 44.0, "Surma Siltstone & Claystone", "Loamy Sand", "Urban Steep Slope", 0.84, "Critical", 0.88, 52000, "Aizawl-Lengpui Airport Arterial Road", now_str),
        ("ZONE-ARN-06", "Bhalukpong - Tawang Axis", "Arunachal Pradesh", "West Kameng", 27.2644, 92.4206, 2200.0, 52.0, "Granite Gneiss & Mica Schist", "Coarse Skeletal Soil", "Coniferous High Elevation", 0.70, "Moderate", 0.58, 14000, "Strategic Border Highway & Sela Bypass", now_str),
        ("ZONE-MNP-07", "Noney Tupul Valley", "Manipur", "Noney", 24.8115, 93.6372, 850.0, 46.0, "Disang Sediments & Mudstone", "Silty Clay Loam", "Semi-Evergreen Forest", 0.85, "Critical", 0.94, 12000, "Jiribam-Imphal New Railway Pier 119", now_str),
        ("ZONE-TRP-08", "Atharamura Range Corridor", "Tripura", "Khowai", 23.8315, 91.6367, 340.0, 28.0, "Tipam Sandstone & Clay", "Red Sandy Loam", "Teak Plantation & Bamboo", 0.45, "Moderate", 0.52, 9500, "NH-8 Agartala Inter-state Link", now_str),
    ]
    cursor.executemany("""
    INSERT INTO zones VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, zones)

    # 2. IoT Sensor Nodes
    sensors = [
        ("SENS-SKM-101", "ZONE-SKM-01", "Ranipool Slope Borehole-1", "Tilt+Moisture+Pore", 27.3392, 88.6070, 48.6, 28.4, 3.8, -1.9, 0.42, 92.0, -74, "LoRaWAN Mesh", "TRIGGERED", now_str),
        ("SENS-SKM-102", "ZONE-SKM-01", "NH-10 Culvert Node-2", "Vibration+Tilt", 27.3340, 88.6021, 41.2, 19.8, 1.2, 0.4, 0.18, 85.0, -82, "LoRaWAN Mesh", "NORMAL", now_str),
        ("SENS-MEG-201", "ZONE-MEG-02", "Sohra Rim Overhang Node", "Tilt+Moisture", 25.2750, 91.7330, 62.4, 34.1, 4.5, 2.8, 0.65, 78.0, -68, "NB-IoT Cellular", "WARNING", now_str),
        ("SENS-ASM-301", "ZONE-ASM-03", "Haflong Railway Cutting S-4", "Tilt+Acoustic", 25.1710, 93.0210, 52.1, 24.3, 2.9, 1.1, 0.38, 88.0, -79, "LoRaWAN Mesh", "WARNING", now_str),
        ("SENS-NGL-401", "ZONE-NGL-04", "Paglapahar Cliff Inclinometer", "Dual Inclinometer+Moisture", 25.6760, 94.1090, 59.8, 38.9, 6.2, -4.4, 0.88, 64.0, -88, "LoRaWAN Mesh", "TRIGGERED", now_str),
        ("SENS-MIZ-501", "ZONE-MIZ-05", "Hunthar Creep Inclinometer-A", "Deep Borehole Wire Piezometer", 23.7280, 92.7180, 54.2, 31.5, 5.1, 3.2, 0.74, 91.0, -72, "NB-IoT Cellular", "TRIGGERED", now_str),
        ("SENS-ARN-601", "ZONE-ARN-06", "West Kameng Ridge Node", "Solar Tilt Node", 27.2650, 92.4215, 34.0, 14.2, 0.8, -0.3, 0.12, 96.0, -85, "LoRaWAN Mesh", "NORMAL", now_str),
        ("SENS-MNP-701", "ZONE-MNP-07", "Tupul Pier Slope Sensor-X", "Tilt+Piezometer+Strain", 24.8125, 93.6385, 68.9, 44.2, 7.8, 5.6, 1.12, 71.0, -81, "LoRaWAN Mesh", "TRIGGERED", now_str),
    ]
    cursor.executemany("""
    INSERT INTO sensors VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, sensors)

    # 3. Weather Ingestion Records
    weather = [
        ("ZONE-SKM-01", "IMD Gangtok AWS", now_str, 18.5, 142.0, 285.0, 218.4, 110.0, 160.0, 96.0, 16.4, "IMD Doppler Radar + AWS"),
        ("ZONE-MEG-02", "IMD Sohra AWS", now_str, 24.0, 198.0, 420.0, 345.2, 180.0, 240.0, 99.0, 18.2, "IMD Cherrapunji AWS"),
        ("ZONE-ASM-03", "IMD Haflong AWS", now_str, 12.0, 94.0, 178.0, 134.0, 75.0, 110.0, 91.0, 24.5, "IMD Silchar Doppler"),
        ("ZONE-NGL-04", "IMD Kohima AWS", now_str, 21.0, 165.0, 310.0, 248.6, 125.0, 185.0, 95.0, 17.8, "IMD Kohima Agromet"),
        ("ZONE-MIZ-05", "IMD Aizawl AWS", now_str, 19.5, 155.0, 290.0, 230.1, 115.0, 170.0, 97.0, 21.0, "IMD Lengpui AWS"),
        ("ZONE-ARN-06", "IMD Bomdila AWS", now_str, 6.0, 42.0, 88.0, 68.5, 35.0, 50.0, 84.0, 11.2, "IMD Tawang Station"),
        ("ZONE-MNP-07", "IMD Noney Station", now_str, 28.0, 210.0, 395.0, 318.9, 140.0, 200.0, 98.0, 23.1, "IMD Imphal Doppler"),
        ("ZONE-TRP-08", "IMD Khowai AWS", now_str, 5.0, 38.0, 74.0, 56.0, 30.0, 45.0, 82.0, 27.6, "IMD Agartala AWS"),
    ]
    cursor.executemany("""
    INSERT INTO weather_logs (zone_id, station_name, timestamp, rainfall_1h_mm, rainfall_24h_mm, rainfall_72h_mm, antecedent_precipitation_index, forecast_24h_mm, forecast_48h_mm, relative_humidity, temperature_c, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, weather)

    # 4. InSAR Ground Displacement
    insar = [
        ("ZONE-SKM-01", "Sentinel-1A InSAR", (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"), -42.8, -125.0, 0.74, "RAPID_ACCELERATION"),
        ("ZONE-MEG-02", "Sentinel-1B InSAR", (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"), -18.4, -45.0, 0.81, "STEADY_CREEP"),
        ("ZONE-ASM-03", "Sentinel-1A InSAR", (datetime.utcnow() - timedelta(days=4)).strftime("%Y-%m-%d"), -28.1, -72.0, 0.69, "ELEVATED_DEFORMATION"),
        ("ZONE-NGL-04", "Sentinel-1A InSAR", (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"), -58.6, -180.0, 0.78, "CRITICAL_SUBSIDENCE"),
        ("ZONE-MIZ-05", "Sentinel-1B InSAR", (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"), -49.2, -145.0, 0.76, "CRITICAL_SUBSIDENCE"),
        ("ZONE-ARN-06", "Sentinel-1A InSAR", (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"), -8.5, -15.0, 0.85, "STABLE_NORMAL"),
        ("ZONE-MNP-07", "Sentinel-1A InSAR", (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"), -72.4, -240.0, 0.71, "CRITICAL_SLUMPING"),
        ("ZONE-TRP-08", "Sentinel-1B InSAR", (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d"), -4.2, -8.0, 0.88, "STABLE_NORMAL"),
    ]
    cursor.executemany("""
    INSERT INTO insar_data (zone_id, satellite, acquisition_date, cumulative_displacement_mm, velocity_mm_per_year, coherence, risk_flag)
    VALUES (?,?,?,?,?,?,?)
    """, insar)

    # 4b. Seed Satellite Detections for Uninstrumented Areas (Zero Ground Sensors)
    cursor.execute("SELECT COUNT(*) FROM satellite_uninstrumented_detections")
    if cursor.fetchone()[0] == 0:
        sat_uninst = [
            (
                "SAT-DISC-001",
                "Dzongu Upper Gorge Flank",
                "Sikkim",
                "North Sikkim",
                27.5340,
                88.5210,
                0,
                "Sentinel-1A SAR + Sentinel-2 MSI",
                "Interferometric Coherence Decorrelation & Amplitude Delta (ΔdB +5.8)",
                "Massive Debris Flow & Escarpment Rupture",
                52000.0,
                160000.0,
                -310.0,
                "0.81 -> 0.12 (Catastrophic Decorrelation)",
                "NASA IMERG 24h Satellite Cloudburst (218mm) over uninstrumented ridge",
                "CRITICAL_UNMONITORED",
                "Sankalang Valley Suspension Bridge & Dzongu Arterial Link (1.2 km downstream)",
                "Autonomous alert triggered. Priority drone reconnaissance dispatched by North Sikkim DDMA.",
                (datetime.utcnow() - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "ACTIVE_UNVERIFIED_BY_GROUND"
            ),
            (
                "SAT-DISC-002",
                "Sonapur Karst Upper Ridge",
                "Meghalaya",
                "East Jaintia Hills",
                25.1480,
                92.3820,
                0,
                "Sentinel-1B InSAR Radar",
                "Differential InSAR (DInSAR) Fringe Rupture & Bare-Earth Backscatter Shift",
                "High-Velocity Colluvial Rockslide",
                38000.0,
                110000.0,
                -285.0,
                "0.78 -> 0.16 (Severe Phase Decorrelation)",
                "Extreme Antecedent Downpour (320mm / 48h) on fractured limestone bedrock",
                "CRITICAL_UNMONITORED",
                "NH-6 Sonapur Tunnel Mouth approach (overhanging arterial freight corridor)",
                "Immediate highway patrol convoy halted. SDRF single-lane diversion initiated.",
                (datetime.utcnow() - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "ACTIVE_UNVERIFIED_BY_GROUND"
            )
        ]
        cursor.executemany("""
        INSERT INTO satellite_uninstrumented_detections VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, sat_uninst)

    # 5. Active Road Network
    roads = [
        ("ROAD-NH10", "NH-10", "Sevoke - Rangpo - Gangtok", "Sikkim", "Sevoke (WB)", "Gangtok", 112.0, "Blocked", "Critical", "Debris flow near 29th Mile and slope subsidence at Ranipool", "Via Lava - Algarah - Reshi border link", json.dumps([[26.8833, 88.4667], [27.1764, 88.5284], [27.3389, 88.6065]])),
        ("ROAD-NH29", "NH-29", "Dimapur - Chumukedima - Kohima", "Nagaland", "Dimapur", "Kohima", 74.0, "Caution", "Critical", "Active rockfall at Paglapahar stretch; heavy vehicles diverted", "Old Kohima road via Niuland-Zhadima", json.dumps([[25.9064, 93.7279], [25.7925, 93.9312], [25.6751, 94.1086]])),
        ("ROAD-NH6", "NH-6", "Shillong - Jowai - Silchar", "Meghalaya", "Shillong", "Silchar", 215.0, "Caution", "High", "Mudslide near Sonapur tunnel mouth; single-lane convoy pilot", "Via Umkiang emergency bypass", json.dumps([[25.5788, 91.8933], [25.4452, 92.2023], [24.8333, 92.7789]])),
        ("ROAD-NH27", "NH-27", "Guwahati - Nagaon - Lumding", "Assam", "Guwahati", "Lumding", 182.0, "Open", "Low", "All lanes operational with precautionary patrol at hill cuttings", "Primary national arterial", json.dumps([[26.1445, 91.7362], [26.3456, 92.6841], [25.7512, 93.1704]])),
        ("ROAD-NH54", "NH-54", "Aizawl - Serchhip - Lunglei", "Mizoram", "Aizawl", "Lunglei", 175.0, "Blocked", "Critical", "Deep roadbed cleavage at Hunthar; geotechnical team deployed", "Durtlang bypass for light emergency vehicles only", json.dumps([[23.7271, 92.7176], [23.3100, 92.8500], [22.8800, 92.7300]])),
        ("ROAD-NH37", "NH-37", "Imphal - Noney - Jiribam", "Manipur", "Jiribam", "Imphal", 220.0, "Blocked", "Critical", "Massive mudslide cutting off bridge approach near Tupul", "Guwahati - Dimapur - Kohima alternative freight corridor", json.dumps([[24.8000, 93.1200], [24.8115, 93.6372], [24.8170, 93.9368]])),
    ]
    cursor.executemany("""
    INSERT INTO road_segments VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, roads)

    # 6. Active Alerts
    alerts = [
        (
            "ALERT-NER-2026-001",
            "ZONE-MNP-07",
            "CRITICAL",
            "Red Alert: Imminent Debris Flow Threat at Tupul Valley Slopes",
            "Heavy 72h rainfall (395mm) combined with 72mm/yr InSAR ground displacement and sensor tilt exceeding 7.8° indicates imminent slope failure. Immediate evacuation of low-lying railway camps and hillside settlements ordered.",
            "Evacuate within 2 hours to Tamenglong Govt Higher Secondary School Shelter. Avoid NH-37 valley section.",
            "SMS, WHATSAPP, IVR_VOICE, FCM_PUSH, LOCAL_SIREN",
            "Manipuri, English, Hindi",
            "NDRF_SDRF_DEPLOYED",
            "IN-NDMA-CAP-202609-08912",
            now_str,
            "Major R. Sharma (DC Noney)",
            now_str,
            "ACTIVE"
        ),
        (
            "ALERT-NER-2026-002",
            "ZONE-SKM-01",
            "CRITICAL",
            "Flash Flood & Landslide Evacuation Warning - Ranipool & NH-10",
            "Pore water pressure surged to 28.4 kPa with continuous downpour. High probability of roadbed sliding near 29th Mile.",
            "Halt all heavy vehicle movement towards Gangtok. Move residents of lower Ranipool to Community Hall.",
            "SMS, WHATSAPP, IVR_VOICE, FCM_PUSH",
            "Nepali, Assamese, English, Hindi",
            "DISTRICT_MAGISTRATE_ACTION",
            "IN-NDMA-CAP-202609-08913",
            now_str,
            "T. Bhutia (DDMA East Sikkim)",
            now_str,
            "ACTIVE"
        ),
        (
            "ALERT-NER-2026-003",
            "ZONE-NGL-04",
            "HIGH",
            "Severe Landslip Alert - NH-29 Paglapahar Section",
            "Biaxial tilt accelerated by 6.2 degrees. Intermittent rockfalls reported. Highway clearance teams on standby.",
            "Drive with utmost caution. Strictly follow SDRF single-lane convoy control.",
            "SMS, WHATSAPP, FCM_PUSH",
            "English, Nagamese, Hindi",
            "PANCHAYAT_VDMC_WARNED",
            "IN-NDMA-CAP-202609-08914",
            now_str,
            "V. Angami (SDO Kohima)",
            now_str,
            "ACTIVE"
        )
    ]
    cursor.executemany("""
    INSERT INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, alerts)

    # 7. Citizen Reports
    citizen_reports = [
        (
            "REP-001",
            "Dhanraj Rai",
            "+919862011223",
            "Citizen Resident",
            27.3365,
            88.6042,
            "ZONE-SKM-01",
            "Road Surface Fissure & Retaining Wall Bulge",
            "A 15cm wide transverse tension crack opened across the road right above our village nursery after last night's rainfall. Field engineer survey confirmed active shear scarp.",
            "/hazards/crown_tension_crack.jpg",
            "Tension Cracks Detected",
            0.96,
            "CRITICAL",
            94.5,
            0,
            now_str,
            1
        ),
        (
            "REP-002",
            "Lalremruata",
            "+919436155667",
            "Field Village Officer",
            25.2750,
            91.7330,
            "ZONE-MEG-02",
            "Drainage Culvert Overflow & Foundation Scour",
            "Mountain stream culvert blocked by fallen timber and silt debris. Torrential runoff overtopping road surface and scouring toe foundation.",
            "/hazards/culvert_overflow_scour.jpg",
            "Culvert Overtopping & Scour",
            0.92,
            "HIGH",
            96.0,
            0,
            now_str,
            1
        ),
        (
            "REP-003",
            "K. Pamei",
            "+919612088990",
            "SDRF Volunteer",
            24.8130,
            93.6390,
            "ZONE-MNP-07",
            "Major Slope Mud Slide Over Rail Cutting",
            "Heavy mud and boulder accumulation blocking railway cutting line. Northeast Frontier Railway survey crew on-site inspecting ballast displacement.",
            "/hazards/rail_cutting_mudslide.jpg",
            "Road Severely Blocked / Rail Cutting",
            0.98,
            "CRITICAL",
            98.0,
            0,
            now_str,
            1
        ),
        (
            "REP-004",
            "Gaurav Gogoi",
            "+919864012345",
            "SDRF Field Officer",
            27.3392,
            88.6070,
            "ZONE-SKM-01",
            "Active Mudslide on Highway NH-10",
            "Continuous saturated mudflow with shale gravel cascading across NH-10. Both lanes completely buried under 1.5m debris; vehicular traffic halted.",
            "/hazards/mudslide_highway.jpg",
            "Slope Debris / Active Mudslide",
            0.97,
            "CRITICAL",
            99.0,
            0,
            now_str,
            1
        ),
        (
            "REP-005",
            "N. Dkhar",
            "+919436123999",
            "PWD Assistant Engineer",
            25.1710,
            93.0210,
            "ZONE-ASM-03",
            "Retaining Wall Bulge & Rupture",
            "Concrete gravity retaining buttress showing 18cm lateral outward tilt with stones popping from weep holes. Hydrostatic blowout imminent under monsoon rain.",
            "/hazards/retaining_wall_rupture.jpg",
            "Road Severely Blocked / Wall Failure",
            0.95,
            "HIGH",
            95.0,
            0,
            now_str,
            1
        )
    ]
    cursor.executemany("""
    INSERT INTO citizen_reports VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, citizen_reports)

    # 8. Genesis Block for Blockchain Audit Ledger
    genesis_payload = json.dumps({
        "event": "SYSTEM_GENESIS",
        "description": "NER Landslide Early Warning System Ledger Initialized",
        "jurisdiction": "North Eastern Region (Sikkim, Meghalaya, Assam, Nagaland, Mizoram, Arunachal Pradesh, Manipur, Tripura)",
        "protocol": "NDMA_CAP_V1.2_COMPLIANT"
    })
    import hashlib
    genesis_content = f"0:{now_str}:GENESIS:{genesis_payload}:{'0'*64}:0"
    genesis_hash = hashlib.sha256(genesis_content.encode()).hexdigest()
    cursor.execute("""
    INSERT INTO blockchain_blocks VALUES (0, ?, 'GENESIS', ?, '0000000000000000000000000000000000000000000000000000000000000000', ?, 0)
    """, (now_str, genesis_payload, genesis_hash))

    # 9. Relief Claim Seed
    claim = (
        "CLAIM-SDRF-2026-041",
        "ZONE-SKM-01",
        "Pemba Lepcha",
        "8812",
        "Agricultural Terracing & Residential Cracking",
        350000.0,
        "27.3385 N, 88.6058 E",
        "Sentinel-1 InSAR shows -42.8mm cumulative subsidence; borehole tilt confirms shear deformation.",
        "VERIFIED_BY_AI_AND_FIELD_OFFICER",
        280000.0,
        now_str
    )
    cursor.execute("""
    INSERT INTO relief_claims VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, claim)

def seed_sensor_telemetry_data(cursor):
    """Seed 60 realistic historical telemetry records."""
    from modules.sliding_rate_estimator import generate_seed_telemetry
    seed_records = generate_seed_telemetry(num_records=60)
    for r in seed_records:
        cursor.execute("""
        INSERT INTO sensor_telemetry_readings (
            timestamp, soil_moisture, vibration, tilt,
            moisture_rate, vibration_rate, tilt_rate,
            sensor_status, location, instability_score,
            predicted_sliding_rate, risk_level, scenario_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r["timestamp"], r["soil_moisture"], r["vibration"], r["tilt"],
            r["moisture_rate"], r["vibration_rate"], r["tilt_rate"],
            r["sensor_status"], r["location"], r["instability_score"],
            r["predicted_sliding_rate"], r["risk_level"], r["scenario_mode"]
        ))

def get_latest_sensor_reading():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_telemetry_readings ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_sensor_history(limit: int = 60):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM (
        SELECT * FROM sensor_telemetry_readings ORDER BY id DESC LIMIT ?
    ) ORDER BY id ASC
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def insert_sensor_reading(
    timestamp: str,
    soil_moisture: float,
    vibration: float,
    tilt: float,
    moisture_rate: float,
    vibration_rate: float,
    tilt_rate: float,
    sensor_status: str,
    location: str,
    instability_score: float,
    predicted_sliding_rate: float,
    risk_level: str,
    scenario_mode: str
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sensor_telemetry_readings (
        timestamp, soil_moisture, vibration, tilt,
        moisture_rate, vibration_rate, tilt_rate,
        sensor_status, location, instability_score,
        predicted_sliding_rate, risk_level, scenario_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        timestamp, soil_moisture, vibration, tilt,
        moisture_rate, vibration_rate, tilt_rate,
        sensor_status, location, instability_score,
        predicted_sliding_rate, risk_level, scenario_mode
    ))
    conn.commit()
    conn.close()

def reset_sensor_telemetry_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensor_telemetry_readings")
    seed_sensor_telemetry_data(cursor)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded successfully.")

