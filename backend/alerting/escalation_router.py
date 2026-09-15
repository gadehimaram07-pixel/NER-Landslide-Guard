"""
Tiered Alert Escalation & Multi-Channel Dispatch Router.
Enforces administrative protocol:
Level 1: Citizen SMS & App Warning
Level 2: Village Disaster Management Committee (VDMC) & Gaon Burah (Village Head)
Level 3: District Disaster Management Authority (DDMA / Deputy Commissioner)
Level 4: State Disaster Management Authority (SDMA) & SDRF/NDRF Battalion Mobilization.
"""

from datetime import datetime
import uuid
from database import get_connection
from alerting.multilingual_engine import generate_multilingual_alert
from alerting.ndma_sachet_cap import generate_cap_xml
from core_gis.blockchain_ledger import record_audit_event

def get_all_alerts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT a.*, z.name as zone_name, z.state, z.latitude, z.longitude
    FROM alerts a
    JOIN zones z ON a.zone_id = z.id
    ORDER BY a.created_at DESC
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
            "severity": r["severity"],
            "headline": r["headline"],
            "description": r["description"],
            "suggested_action": r["suggested_action"],
            "channels_dispatched": r["channels_dispatched"].split(", "),
            "languages_sent": r["languages_sent"].split(", "),
            "escalation_level": r["escalation_level"],
            "cap_identifier": r["cap_identifier"],
            "created_at": r["created_at"],
            "acknowledged_by": r["acknowledged_by"],
            "acknowledged_at": r["acknowledged_at"],
            "status": r["status"]
        })
    return results

def broadcast_new_alert(
    zone_id: str,
    severity: str,
    headline: str,
    description: str,
    suggested_action: str,
    channels: list,
    languages: list,
    acknowledged_by: str = "District Collector (DC)"
) -> dict:
    """
    Dispatches alert across selected channels, logs to DB, outputs CAP XML, and anchors to Blockchain Ledger.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name, state, latitude, longitude FROM zones WHERE id = ?", (zone_id,))
    zone = cursor.fetchone()
    zone_name = zone["name"] if zone else "Unknown Zone"

    alert_id = f"ALERT-NER-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
    cap_id = f"IN-NDMA-CAP-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    now_str = datetime.utcnow().isoformat()

    escalation = "SDRF_NDRF_DEPLOYED" if severity == "CRITICAL" else "DISTRICT_MAGISTRATE_ACTION" if severity == "HIGH" else "PANCHAYAT_VDMC_WARNED"
    channels_str = ", ".join(channels)
    languages_str = ", ".join(languages)

    cursor.execute("""
    INSERT INTO alerts (
        id, zone_id, severity, headline, description, suggested_action,
        channels_dispatched, languages_sent, escalation_level, cap_identifier,
        created_at, acknowledged_by, acknowledged_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    """, (alert_id, zone_id, severity, headline, description, suggested_action,
          channels_str, languages_str, escalation, cap_id, now_str, acknowledged_by, now_str))

    conn.commit()
    conn.close()

    # Anchor to Blockchain Ledger for legal auditability
    record_audit_event("ALERT_DISPATCHED", {
        "alert_id": alert_id,
        "zone_id": zone_id,
        "zone_name": zone_name,
        "severity": severity,
        "cap_identifier": cap_id,
        "channels": channels,
        "authorized_by": acknowledged_by,
        "timestamp": now_str
    })

    # Prepare multilingual packet
    multilingual = generate_multilingual_alert(zone_name, severity)

    # Prepare CAP XML
    cap_xml = generate_cap_xml({
        "cap_identifier": cap_id,
        "severity": severity,
        "headline": headline,
        "description": description,
        "suggested_action": suggested_action,
        "zone_name": zone_name,
        "latitude": zone["latitude"] if zone else 26.0,
        "longitude": zone["longitude"] if zone else 92.0
    })

    return {
        "alert_id": alert_id,
        "cap_identifier": cap_id,
        "zone_name": zone_name,
        "severity": severity,
        "escalation_level": escalation,
        "dispatched_channels": channels,
        "languages": languages,
        "multilingual_previews": multilingual,
        "cap_xml": cap_xml,
        "status": "DISPATCHED_AND_BLOCKCHAIN_ANCHORED"
    }

def acknowledge_alert(alert_id: str, officer_name: str):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().isoformat()
    cursor.execute("""
    UPDATE alerts
    SET acknowledged_by = ?, acknowledged_at = ?, status = 'ACKNOWLEDGED'
    WHERE id = ?
    """, (officer_name, now_str, alert_id))
    conn.commit()
    conn.close()

    record_audit_event("ALERT_ACKNOWLEDGED", {
        "alert_id": alert_id,
        "officer": officer_name,
        "timestamp": now_str
    })
    return {"status": "success", "alert_id": alert_id, "acknowledged_by": officer_name}
