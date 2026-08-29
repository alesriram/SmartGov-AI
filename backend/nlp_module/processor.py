"""
NLP Module
----------
Handles multilingual language recognition, auto-translation to English,
complaint summarization, entity extraction, and intent classification.
Supports: Telugu, Tinglish (Telugu in English), Hindi, Hinglish, Tamil,
Kannada, and English.
"""
import json
import os
import re
from typing import Dict, Optional
from urllib import request

# Category keywords for English & Romanized Indian languages (Tinglish, Hinglish, Tanglish, Kanglish)
MULTILINGUAL_KEYWORDS = {
    "roads": [
        # English
        "pothole", "potholes", "road", "roads", "crack", "asphalt", "highway", "street damage", "flyover", "divider",
        # Telugu / Tinglish
        "guntha", "gunthalu", "guntalu", "roadu", "dhaari", "dari", "biddalu", "raallu", "veedhi", "pedda guntha",
        "రోడ్డు", "గుంత", "గుంతలు", "దారి", "రహదారి", "రోడ్లు",
        # Hindi / Hinglish
        "khadda", "khadde", "sadak", "gaddha", "gaddhe", "rastah", "toota", "tooti", "marammat",
        "सड़क", "गड्ढा", "गड्ढे", "रास्ता", "टूटी",
        # Tamil / Tanglish
        "pallam", "saalai", "theru", "kuzhi", "kuli", "salai",
        "சாலை", "பள்ளம்", "குழி", "தெரு",
        # Kannada / Kanglish
        "gundi", "gundigalu", "raste", "beedi",
        "ರಸ್ತೆ", "ಗುಂಡಿ", "ಬೀದಿ",
    ],
    "sanitation": [
        # English
        "garbage", "trash", "waste", "overflow", "dump", "litter", "smell", "bin", "cleanup", "stink", "drain",
        # Telugu / Tinglish
        "chetha", "chettah", "chethakundi", "dhump", "vasana", "kamputho", "kamp", "moriki", "dharlo chetha",
        "చెత్త", "చెత్తకుండీ", "కంపు", "వాసన", "మురుగు",
        # Hindi / Hinglish
        "kachra", "kachda", "kooda", "koodey", "badboo", "safai", "gandagi", "dhalav", "dher",
        "कचरा", "कूड़ा", "बदबू", "सफाई", "गंदगी",
        # Tamil / Tanglish
        "kuppai", "thottil", "naatram", "kasaada", "sudham",
        "குப்பை", "நாற்றம்", "சுத்தம்",
        # Kannada / Kanglish
        "kachada", "kachhada", "kola", "kudike", "durvasane",
        "ಕಸ", "ಕಸದ", "ದುರ್ವಾಸನೆ", "ಕೊಳಚೆ",
    ],
    "water_supply": [
        # English
        "water", "leak", "pipe", "supply", "tap", "sewage", "drainage", "pipeline", "drinking water", "manhole",
        # Telugu / Tinglish
        "neellu", "neeru", "neella", "manhole", "pipeu", "leakage", "kalusitha", "taage neellu", "moriki neellu",
        "నీళ్ళు", "నీరు", "పైపు", "లీకేజీ", "మురుగునీరు", "తాగునీరు", "మ్యాన్‌హోల్",
        # Hindi / Hinglish
        "paani", "pani", "nal", "leakage", "ganda paani", "sewer", "naala", "peene ka paani", "jal",
        "पानी", "नल", "गंदा पानी", "सीवर", "नाला", "जल",
        # Tamil / Tanglish
        "thanni", "kuzhaai", "neer", "saakadai", "velliye",
        "தண்ணீர்", "குழாய்", "சாக்கடை", "நீர்",
        # Kannada / Kanglish
        "neeru", "kudiyuva neeru", "holasu neeru", "nalu",
        "ನೀರು", "ಕೊಳವೆ", "ಚರಂಡಿ", "ಕುಡಿಯುವ ನೀರು",
    ],
    "electricity": [
        # English
        "streetlight", "street light", "power", "electric", "pole", "wire", "outage", "sparking", "transformer", "bulb",
        # Telugu / Tinglish
        "karrentu", "current", "stambham", "lightu", "teegalu", "velagadam ledu", "cheekati", "transformer",
        "కరెంటు", "స్తంభం", "లైటు", "తీగలు", "చీకటి", "కరెంట్",
        # Hindi / Hinglish
        "bijli", "batti", "khamba", "taar", "andhera", "light chali gayi", "transformer phata", "chamk",
        "बिजली", "बत्ती", "खंभा", "तार", "अंधेरा", "लाइट",
        # Tamil / Tanglish
        "minsaram", "vilakku", "kambam", "iruttu", "kambi",
        "மின்சாரம்", "விளக்கு", "கம்பம்", "இருட்டு",
        # Kannada / Kanglish
        "vidyut", "deepa", "kamba", "kattale",
        "ವಿದ್ಯುತ್", "ದೀಪ", "ಕಂಬ", "ಕತ್ತಲೆ",
    ],
    "traffic": [
        # English
        "parking", "traffic", "signal", "jam", "illegal parking", "encroachment", "vehicle", "blockage", "auto",
        # Telugu / Tinglish
        "trafficu", "jaam", "aagipoyindi", "nadavadam ledu", "bandlu", "signalu", "road block",
        "ట్రాఫిక్", "జామ్", "వాహనాలు", "సిగ్నల్", "రోడ్డు దిగ్బంధం",
        # Hindi / Hinglish
        "traffic jam", "gaadi", "jaam lag gaya", "chakka jam", "signal kharab", "sadak band",
        "ट्रैफिक", "जाम", "गाड़ी", "सिग्नल खराब", "गाड़ियां",
        # Tamil / Tanglish
        "pokuvarathu", "vahanam", "nerisal", "signal vela seiyala",
        "போக்குவரத்து", "நெரிசல்", "வாகனம்",
        # Kannada / Kanglish
        "sarige", "vahanagalu", "sanchara", "traffic jam",
        "ಸಂಚಾರ", "ವಾಹನ", "ಸಾರಿಗೆ",
    ],
    "public_health": [
        # English
        "mosquito", "mosquitoes", "dengue", "malaria", "disease", "stagnant water", "health hazard", "epidemic", "stray dogs",
        # Telugu / Tinglish
        "domalu", "dengue", "rogalu", "kukkalu", "pichikukkalu", "neellu aagipoyi", "hospital",
        "దోమలు", "డెంగ్యూ", "మలేరియా", "కుక్కలు", "వ్యాధులు",
        # Hindi / Hinglish
        "machhar", "dengue", "bimari", "kutte", "awarah kutte", "mahamari", "swasthya",
        "मच्छर", "डेंगू", "बीमारी", "कुत्ते", "महामारी",
        # Tamil / Tanglish
        "kosu", "noai", "dengue", "naaigal", "kuzhandhaigal",
        "கொசு", "நோய்", "டெங்கு", "நாய்கள்",
        # Kannada / Kanglish
        "solle", "roga", "kayile", "naayigalu",
        "ಸೊಳ್ಳೆ", "ರೋಗ", "ಕಾಯಿಲೆ", "ನಾಯಿಗಳು",
    ],
}

URGENCY_KEYWORDS = {
    "critical": [
        # English
        "urgent", "emergency", "danger", "dangerous", "accident", "fire", "collapsed", "electrocute", "ambulance", "life threatening",
        # Indian languages
        "pranam", "pranapayyam", "chaala dangerous", "bhayankaram", "khatra", "jaanleva", "haadsa", "maranam",
        "ప్రమాదం", "అత్యవసరం", "ఖత్రా", "जानलेवा", "दुर्घटना", "ஆபத்து", "ಅಪಾಯ",
    ],
    "high": [
        # English
        "overflow", "flooding", "flood", "broken", "leaking heavily", "days", "weeks", "severe", "cannot walk",
        # Indian languages
        "chaala rojulu", "chaala rojuluga", "chala kashtam", "bahut din", "pareshani", "romba naal", "tumba dina",
        "చాలా రోజులుగా", "చాలా కష్టం", "बहुत दिन", "भारी", "ரொம்ப", "ತುಂಬಾ",
    ],
}


def _detect_script_language(text: str) -> str:
    """Detects Indian languages from native Unicode character blocks."""
    telugu_count = len(re.findall(r"[\u0C00-\u0C7F]", text))
    hindi_count = len(re.findall(r"[\u0900-\u097F]", text))
    tamil_count = len(re.findall(r"[\u0B80-\u0BFF]", text))
    kannada_count = len(re.findall(r"[\u0C80-\u0CFF]", text))

    counts = {
        "Telugu": telugu_count,
        "Hindi": hindi_count,
        "Tamil": tamil_count,
        "Kannada": kannada_count,
    }
    top_lang, max_cnt = max(counts.items(), key=lambda x: x[1])
    if max_cnt >= 2:
        return top_lang

    # Check for Romanized Indian scripts (Tinglish, Hinglish, Tanglish, Kanglish)
    lower = text.lower()
    tinglish_hits = sum(1 for w in ["meeda", "guntha", "chetha", "neellu", "padindi", "unnadi", "ledu", "chesi", "bagoledu", "raavadam", "veedhi"] if w in lower)
    hinglish_hits = sum(1 for w in ["sadak", "khadda", "kachra", "paani", "bahut", "raha", "rahi", "gaya", "hai", "nahi", "kharab", "gali"] if w in lower)
    tanglish_hits = sum(1 for w in ["romba", "pallam", "kuppai", "thanni", "irukku", "saalai", "nikkuthu", "illai"] if w in lower)
    kanglish_hits = sum(1 for w in ["tumba", "gundi", "kachada", "neeru", "biddide", "raste", "ide", "illa"] if w in lower)

    roman_counts = {
        "Tinglish (Telugu-English)": tinglish_hits,
        "Hinglish (Hindi-English)": hinglish_hits,
        "Tanglish (Tamil-English)": tanglish_hits,
        "Kanglish (Kannada-English)": kanglish_hits,
    }
    top_roman, r_cnt = max(roman_counts.items(), key=lambda x: x[1])
    if r_cnt >= 1:
        return top_roman

    return "English"


def _call_external_llm_nlp(description: str) -> Optional[Dict]:
    """
    Invokes Groq / Gemini via assistant_service engine to auto-detect language
    and translate to fluent English with structured JSON response.
    """
    from assistant_service import call_gemini_api, call_groq_api, get_llm_status

    status = get_llm_status()
    system_prompt = (
        "You are an expert multilingual Indian civic complaint triage NLP system. "
        "The citizen input can be in English, Telugu (తెలుగు), Tinglish (Telugu written in Latin alphabet), "
        "Hindi (हिंदी), Hinglish (Hindi in Latin alphabet), Tamil (தமிழ்), Tanglish, Kannada (ಕನ್ನಡ), or Kanglish.\n"
        "Your tasks:\n"
        "1. Identify the detected language (e.g. 'Telugu', 'Tinglish', 'Hindi', 'Hinglish', 'Tamil', 'Kannada', 'English').\n"
        "2. Translate the complaint into clear, fluent, professional English (if already English, keep as-is).\n"
        "3. Classify into category: exactly one of ['roads', 'sanitation', 'water_supply', 'electricity', 'traffic', 'public_health', 'general'].\n"
        "4. Determine urgency_signal: exactly one of ['critical', 'high', 'medium', 'low'].\n"
        "5. Provide a short 1-sentence English summary (< 200 chars).\n"
        "6. Extract entities: locations (list of places), durations, numbers.\n"
        "Return ONLY a strictly valid JSON object with keys: "
        "detected_language, translated_description, category, urgency_signal, summary, entities."
    )
    user_prompt = f"Citizen Grievance:\n\"\"\"{description}\"\"\""

    # Try Groq first (sub-second fast)
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
    if groq_key:
        try:
            raw = call_groq_api(user_prompt, system_prompt, groq_key, groq_model)
            clean = re.sub(r"^```json\s*", "", raw.strip(), flags=re.IGNORECASE)
            clean = re.sub(r"\s*```$", "", clean)
            match = re.search(r"\{.*\}", clean, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if "translated_description" in parsed:
                    return parsed
        except Exception as e:
            print(f"[nlp_module] Groq parse attempt notice: {e}")

    # Try Gemini as secondary
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    if gemini_key:
        try:
            raw = call_gemini_api(user_prompt, system_prompt, gemini_key, gemini_model)
            clean = re.sub(r"^```json\s*", "", raw.strip(), flags=re.IGNORECASE)
            clean = re.sub(r"\s*```$", "", clean)
            match = re.search(r"\{.*\}", clean, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if "translated_description" in parsed:
                    return parsed
        except Exception as e:
            print(f"[nlp_module] Gemini parse attempt notice: {e}")

    return None


def _rule_based_multilingual_nlp(description: str) -> Dict:
    """Deterministic multilingual rule-based NLP fallback when LLM is offline."""
    text = description.lower()
    detected_lang = _detect_script_language(description)

    # Category scoring across multilingual keywords
    scores = {cat: 0 for cat in MULTILINGUAL_KEYWORDS}
    for cat, keywords in MULTILINGUAL_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                scores[cat] += 2 if len(kw) > 4 else 1
    category = max(scores, key=scores.get) if max(scores.values()) > 0 else "general"

    # Urgency scoring
    urgency = "medium"
    for level, keywords in URGENCY_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            urgency = level
            break

    # Entity extraction
    entities = {
        "locations": re.findall(r"\b(?:near|at|in|opposite|daggara|meeda|paas)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)", description),
        "durations": re.findall(r"\b(\d+\s?(?:day|days|week|weeks|month|months|hour|hours|rojulu|din))\b", text),
        "numbers": re.findall(r"\b\d+\b", description),
    }

    # Synthesize translated description if Indian language detected
    translated = description
    cat_names = {
        "roads": "road and pothole repair",
        "sanitation": "garbage collection and solid waste management",
        "water_supply": "drinking water supply and leakage remediation",
        "electricity": "street lighting and electrical grid maintenance",
        "traffic": "traffic flow and parking regulation",
        "public_health": "public health and vector control hazard",
        "general": "civic service resolution",
    }
    if detected_lang != "English":
        translated = f"Citizen reported {cat_names.get(category, 'civic issue')} [translated from {detected_lang}]: \"{description}\""

    sentences = re.split(r'(?<=[.!?])\s+', description.strip())
    summary = sentences[0] if sentences else description
    if len(summary) > 200:
        summary = summary[:197] + "..."

    return {
        "category": category,
        "urgency_signal": urgency,
        "entities": entities,
        "summary": summary,
        "translated_description": translated,
        "detected_language": detected_lang,
    }


def process_complaint_text(description: str) -> Dict:
    """
    Main entry point for processing citizen complaint text.
    Attempts LLM multilingual recognition & translation first; falls back
    to multilingual rule-based parser seamlessly.
    """
    llm_result = _call_external_llm_nlp(description)
    if llm_result:
        # Standardize category
        cat = (llm_result.get("category") or "general").lower().strip()
        if cat not in MULTILINGUAL_KEYWORDS and cat != "general":
            cat = "general"
        llm_result["category"] = cat

        # Standardize urgency
        urg = (llm_result.get("urgency_signal") or "medium").lower().strip()
        if urg not in ["critical", "high", "medium", "low"]:
            urg = "medium"
        llm_result["urgency_signal"] = urg

        return llm_result

    return _rule_based_multilingual_nlp(description)
