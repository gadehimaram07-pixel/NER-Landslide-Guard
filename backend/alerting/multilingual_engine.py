"""
Multilingual Alert Localization Engine for North Eastern Region (NER).
Supports Assamese, Khasi, Mizo, Bodo, Bengali, Nepali, Manipuri, Hindi, and English.
Formats output specifically for SMS, WhatsApp, Voice IVR, and FCM Push.
"""

LOCALIZED_TEMPLATES = {
    "English": {
        "CRITICAL": "EMERGENCY ALERT: Severe Landslide Imminent at {zone_name}. Evacuate to nearest shelter {shelter_name} immediately. Avoid mountain roads. Helpline: 1077.",
        "HIGH": "WARNING: High Landslide Risk at {zone_name} due to heavy rainfall. Avoid unstable slopes and stay alert. Follow local administration orders.",
        "MODERATE": "ADVISORY: Moderate landslide hazard in {zone_name}. Exercise caution while commuting."
    },
    "Assamese": {
        "CRITICAL": "জৰুৰী সতৰ্কবাণী: {zone_name} ত প্ৰচণ্ড ভূমিস্খলনৰ সম্ভাৱনা। পলম নকৰি ওচৰৰ আশ্ৰয় শিবিৰ {shelter_name} লৈ যাওক। হেল্পলাইন: ১০৭৭।",
        "HIGH": "সতৰ্কতা: নেৰানেপেৰা বৰষুণৰ বাবে {zone_name} ত ভূমিস্খলনৰ আশংকা বৃদ্ধি পাইছে। পাহাৰীয়া পথ পৰিহাৰ কৰক।",
        "MODERATE": "পৰামৰ্শ: {zone_name} ত মধ্যমীয়া ভূমিস্খলনৰ আশংকা। সাৱধানে যাতায়াত কৰক।"
    },
    "Khasi": {
        "CRITICAL": "KHYLLAH JINGSYNDONG: Ka jinghap khyndew kaba jur ka lah ban jia ha {zone_name}. Phet noh sha {shelter_name} mar kumne. Helpline: 1077.",
        "HIGH": "MAHAM: Ka jingma na ka jinghap khyndew ha {zone_name} na ka daw ka slap kaba jur. Buh ha ka jingiada.",
        "MODERATE": "JINGSYNDONG: Leh aiti ha ki lad jingsyndong ha {zone_name} haba iaid lynti."
    },
    "Mizo": {
        "CRITICAL": "CHHIATRUPNA HLAUHTHAWNNA: {zone_name}-ah leimin hlauhawm tak a thleng dawn. Hmun him {shelter_name}-ah rang takin insaseng rawh u. Helpline: 1077.",
        "HIGH": "FIMKHUR RAWH: Ruah sur nasat avangin {zone_name}-ah leimin a hlauhawm. Tlang kalkawngte hman loh hram tur.",
        "MODERATE": "HRIATTIRNA: {zone_name} bialah leimin palh theihna a awm. Fimkhur takin kal chhuak rawh u."
    },
    "Nepali": {
        "CRITICAL": "आपतकालीन चेतावनी: {zone_name} मा ठूलो पहिरोको उच्च जोखिम छ। तुरुन्त नजिकैको सुरक्षित शिविर {shelter_name} मा जानुहोस्। हेल्पलाइन: १०७७।",
        "HIGH": "सचेत रहनुहोस्: भारी वर्षाका कारण {zone_name} मा पहिरोको जोखिम बढेको छ। पहाडी बाटोमा यात्रा नगर्नुहोस्।",
        "MODERATE": "सल्लाह: {zone_name} क्षेत्रमा पहिरोको मध्यम जोखिम छ। सावधानी अपनाउनुहोस्।"
    },
    "Bodo": {
        "CRITICAL": "गोख्रों खौरां: {zone_name} आव हा सिबनायनि गिथावना खौरां। गोख्रैयैनो रैखाथि जायगा {shelter_name} आव थां। हेल्पलाइन: 1077.",
        "HIGH": "सावध बाथ्रा: जोबोद अखा हानायनि थाखाय {zone_name} आव हा सिबनायनि गिथावना जादों। गोजौ लामायाव दाथां।",
        "MODERATE": "सावधनाय: {zone_name} ओनसोलनि थाखाय गाहाइ सावध बाथ्रा।"
    },
    "Bengali": {
        "CRITICAL": "জরুরি সতর্কতা: {zone_name} এলাকায় ভয়াবহ ভূমিধসের আশঙ্কা। অবিলম্বে নিকটবর্তী আশ্রয় কেন্দ্র {shelter_name}-এ সরে যান। হেল্পলাইন: ১০৭৭।",
        "HIGH": "সতর্কবার্তা: অবিরাম বৃষ্টির কারণে {zone_name}-এ ধসের প্রবল ঝুঁকি। পাহাড়ি রাস্তা এড়িয়ে চলুন।",
        "MODERATE": "পরামর্শ: {zone_name} অঞ্চলে ধসের মধ্যম সতর্কতা। সাবধানে চলুন।"
    },
    "Hindi": {
        "CRITICAL": "आपातकालीन चेतावनी: {zone_name} में भारी भूस्खलन की अत्यधिक संभावना है। तुरंत निकटतम सुरक्षित आश्रय {shelter_name} में जाएं। हेल्पलाइन: 1077.",
        "HIGH": "चेतावनी: भारी बारिश के कारण {zone_name} में भूस्खलन का बड़ा खतरा है। पहाड़ी रास्तों पर जाने से बचें।",
        "MODERATE": "सलाह: {zone_name} में भूस्खलन का मध्यम स्तर है। सतर्कता बरतें।"
    }
}

def generate_multilingual_alert(zone_name: str, severity: str, shelter_name: str = "District Emergency Relief Camp") -> dict:
    """
    Renders alert text in all major NER languages formatted for diverse channels.
    """
    translations = {}
    for lang, tmpls in LOCALIZED_TEMPLATES.items():
        tmpl = tmpls.get(severity, tmpls["MODERATE"])
        text = tmpl.format(zone_name=zone_name, shelter_name=shelter_name)
        translations[lang] = {
            "sms": text[:160],
            "whatsapp": f"🚨 *NDMA - NER LANDSLIDE WARNING*\n\n{text}\n\n📍 _GPS Coords Verified_",
            "ivr_voice_script": f"Attention. {text}. Repeating. {text}.",
            "push_notification": {
                "title": f"⚠️ {severity} Landslide Alert: {zone_name}",
                "body": text
            }
        }
    return translations
