"""
Multilingual Citizen AI Advisory Chatbot.
Handles conversational inquiries in Assamese, Khasi, Mizo, Nepali, Hindi, and English
regarding road blockages, evacuation centers, alert levels, and relief compensation.
"""

from database import get_connection

INTENTS = {
    "road_status": ["road", "highway", "nh-10", "nh-29", "nh-6", "route", "blocked", "open", "traffic", "travel", "ৰাস্তা", "পথ", "बाटो", "kawng"],
    "shelter": ["shelter", "evacuate", "relief camp", "stadium", "safe place", "school", "hospital", "আশ্ৰয়", "शिविर", "hmun him"],
    "risk_level": ["risk", "danger", "hazard", "gangtok", "shillong", "kohima", "aizawl", "alert", "rain", "সম্ভাৱনা", "जोखिम", "hlauhawm"],
    "claim_relief": ["claim", "compensation", "money", "relief", "fund", "loss", "house damaged", "ক্ষতিপূৰণ", "मुआब्जा", "zangnadawmna"]
}

def query_chatbot(user_message: str, language: str = "English") -> dict:
    msg_lower = user_message.lower()
    
    matched_intent = "general"
    for intent, keywords in INTENTS.items():
        if any(kw in msg_lower for kw in keywords):
            matched_intent = intent
            break

    conn = get_connection()
    cursor = conn.cursor()

    if matched_intent == "road_status":
        cursor.execute("SELECT highway_no, name, status, blockage_reason, alternate_route FROM road_segments WHERE status != 'Open' LIMIT 2")
        rows = cursor.fetchall()
        closures = [f"{r['highway_no']} ({r['name']}): {r['status']} - {r['blockage_reason']}. Alternate: {r['alternate_route']}" for r in rows]
        info_text = " | ".join(closures) if closures else "All monitored highways are currently operational."

        responses = {
            "English": f"🚧 Highway Advisory: {info_text}",
            "Assamese": f"🚧 পথ সতৰ্কবাণী: {info_text} সাৱধানে ভ্ৰমণ কৰক।",
            "Mizo": f"🚧 Kalkawng Chanchin: {info_text} Fimkhur takin kal ang che.",
            "Nepali": f"🚧 सडक जानकारी: {info_text} कृपया वैकल्पिक बाटो प्रयोग गर्नुहोस्।",
            "Hindi": f"🚧 राष्ट्रीय राजमार्ग अपडेट: {info_text} यात्रा से पूर्व नियंत्रण कक्ष 1077 पर संपर्क करें।"
        }
    elif matched_intent == "shelter":
        responses = {
            "English": "📍 Emergency Shelters: Active relief camps are open at Gangtok Paljor Stadium, Cherrapunji Ramakrishna Mission, Kohima IG Stadium, and Aizawl Hawla Indoor Stadium. Toll-free helpline: 1077.",
            "Assamese": "📍 জৰুৰী আশ্ৰয় কেন্দ্ৰ: পাৰ্শ্বৱৰ্তী আশ্ৰয় শিবিৰসমূহ খোলা আছে। জৰুৰীকালীন সাহায্যৰ বাবে ১০৭৭ নম্বৰত ফোন কৰক।",
            "Mizo": "📍 Chhiatrupna Hmun Him: Aizawl Hawla Indoor Stadium leh veng hrang hranga relief camp-te hawn a ni. Helpline: 1077.",
            "Nepali": "📍 सुरक्षित आश्रयस्थल: गंगटोक पाल्जोर स्टेडियम र नजिकका सामुदायिक केन्द्रहरू खुला छन्। हेल्पलाइन: १०७७।",
            "Hindi": "📍 राहत शिविर: निकटतम सुरक्षित राहत केंद्र चालू हैं। अधिक सहायता के लिए 1077 डायल करें।"
        }
    elif matched_intent == "risk_level":
        cursor.execute("SELECT name, current_risk_level, current_risk_score FROM zones WHERE current_risk_level = 'Critical' LIMIT 2")
        crit_zones = cursor.fetchall()
        zone_names = ", ".join([f"{z['name']} ({round(z['current_risk_score']*100)}% risk)" for z in crit_zones])
        responses = {
            "English": f"⚠️ High Alert Zones: {zone_names} are currently under Red Critical Alert. Please stay clear of steep unreinforced slopes.",
            "Assamese": f"⚠️ বিপদজনক অঞ্চল: {zone_names} ত ৰেড এলাৰ্ট জাৰি কৰা হৈছে। সাৱধানে থাকক।",
            "Mizo": f"⚠️ Hlauhawm Zual Bialte: {zone_names}-ah te hian Red Alert puan a ni. Tlang pang tawlh thut thei lakah fimkhur rawh u.",
            "Nepali": f"⚠️ उच्च जोखिम क्षेत्र: {zone_names} मा रातो चेतावनी जारी गरिएको छ।",
            "Hindi": f"⚠️ चेतावनी क्षेत्र: {zone_names} में रेड अलर्ट घोषित किया गया है।"
        }
    elif matched_intent == "claim_relief":
        responses = {
            "English": "📋 Disaster Relief & SDRF Claims: You can submit your damage report with photos and GPS directly on this portal. Verified claims are disbursed within 7 business days under NDMA norms.",
            "Assamese": "📋 দুৰ্যোগ সাহায্য: আপুনি ফটো আৰু স্থান সংলগ্ন কৰি এই পৰ্টেলতে ক্ষতিপূৰণৰ আবেদন কৰিব পাৰে।",
            "Mizo": "📋 Chhiatrupna Zangnadawmna: He portal-ah hian thlalak leh GPS nena zangnadawmna dilna a thehluh theih e.",
            "Nepali": "📋 राहत र क्षतिपूर्ति: तपाईंले यसै पोर्टलमा तस्बिर र जीपीएस स्थानसहित क्षतिपूर्तिको दाबी पेश गर्न सक्नुहुन्छ।",
            "Hindi": "📋 आपदा राहत सहायता: आप क्षतिग्रस्त संपत्ति के फोटो और स्थान के साथ सीधे आवेदन कर सकते हैं।"
        }
    else:
        responses = {
            "English": "Namaste! I am your AI Landslide Safety Assistant for the North Eastern Region. You can ask me about road closures, weather warnings, nearest safe shelters, or relief claims.",
            "Assamese": "নমস্কাৰ! মই উত্তৰ-পূব অঞ্চলৰ ভূমিস্খলন প্ৰতিৰোধ এআই সহায়ক। আপুনি পথৰ অৱস্থা, বতৰৰ সতৰ্কবাণী বা আশ্ৰয় শিবিৰৰ বিষয়ে সুধিব পাৰে।",
            "Mizo": "Chibai! North East leimin vensakna AI ka ni e. Kalkawng dinhmun, ruah sur hlauhawm, leh hmun him chungchang min zawt thei e.",
            "Nepali": "नमस्ते! म उत्तर-पूर्वी क्षेत्रको पहिरो पूर्वचेतावनी एआई सहायक हुँ। सडक, मौसम, वा सुरक्षित शिविरबारे सोध्न सक्नुहुन्छ।",
            "Hindi": "नमस्ते! मैं पूर्वोत्तर भारत भूस्खलन पूर्व चेतावनी एआई सहायक हूँ। आप मुझसे मार्ग स्थिति, सुरक्षित शिविर या सहायता के बारे में पूछ सकते हैं।"
        }

    conn.close()

    answer = responses.get(language, responses["English"])
    return {
        "user_message": user_message,
        "detected_intent": matched_intent,
        "language": language,
        "response_text": answer,
        "audio_stream_simulated": True
    }
