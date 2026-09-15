"""
NDMA SACHET & OASIS Common Alerting Protocol (CAP v1.2) Exporter.
Produces standards-compliant XML & JSON feeds for national disaster mesh interoperability.
"""

from datetime import datetime
import xml.etree.ElementTree as ET

def generate_cap_xml(alert_dict: dict) -> str:
    """
    Generates standard OASIS CAP v1.2 XML document.
    """
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+00:00")
    identifier = alert_dict.get("cap_identifier", f"IN-NDMA-CAP-{int(datetime.utcnow().timestamp())}")

    root = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    
    ET.SubElement(root, "identifier").text = identifier
    ET.SubElement(root, "sender").text = "in-gov-ndma-ner-lews@nic.in"
    ET.SubElement(root, "sent").text = now_str
    ET.SubElement(root, "status").text = "Actual"
    ET.SubElement(root, "msgType").text = "Alert"
    ET.SubElement(root, "scope").text = "Public"

    # Info block
    info = ET.SubElement(root, "info")
    ET.SubElement(info, "category").text = "Geo"
    ET.SubElement(info, "event").text = "Landslide / Mass Wasting"
    
    urgency_map = {"CRITICAL": "Immediate", "HIGH": "Expected", "MODERATE": "Future"}
    severity_map = {"CRITICAL": "Extreme", "HIGH": "Severe", "MODERATE": "Moderate"}
    certainty_map = {"CRITICAL": "Observed", "HIGH": "Likely", "MODERATE": "Possible"}

    sev = alert_dict.get("severity", "HIGH").upper()
    ET.SubElement(info, "urgency").text = urgency_map.get(sev, "Expected")
    ET.SubElement(info, "severity").text = severity_map.get(sev, "Severe")
    ET.SubElement(info, "certainty").text = certainty_map.get(sev, "Likely")
    ET.SubElement(info, "eventCode")
    
    ET.SubElement(info, "headline").text = alert_dict.get("headline", "Landslide Early Warning")
    ET.SubElement(info, "description").text = alert_dict.get("description", "Potential slope failure identified by AI model.")
    ET.SubElement(info, "instruction").text = alert_dict.get("suggested_action", "Follow local disaster authority guidance.")
    ET.SubElement(info, "contact").text = "State Emergency Operations Centre (SEOC) Toll Free: 1070 / 1077"

    # Area
    area = ET.SubElement(info, "area")
    ET.SubElement(area, "areaDesc").text = alert_dict.get("zone_name", "North Eastern Region Slope Sector")
    if "latitude" in alert_dict and "longitude" in alert_dict:
        ET.SubElement(area, "circle").text = f"{alert_dict['latitude']},{alert_dict['longitude']},15.0"

    return ET.tostring(root, encoding="utf-8", method="xml").decode("utf-8")
