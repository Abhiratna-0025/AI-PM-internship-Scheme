package com.weathergpt.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Multilingual localization service supporting 10 Indian languages and English:
 * English (en), Hindi (hi), Bengali (bn), Tamil (ta), Telugu (te),
 * Marathi (mr), Gujarati (gu), Kannada (kn), Malayalam (ml), Punjabi (pa).
 */
@Service
public class LocalizationService {

    // Unicode block patterns for Indian scripts
    private static final Pattern DEVANAGARI_PATTERN = Pattern.compile("[\\u0900-\\u097F]");
    private static final Pattern BENGALI_PATTERN = Pattern.compile("[\\u0980-\\u09FF]");
    private static final Pattern GURMUKHI_PATTERN = Pattern.compile("[\\u0A00-\\u0A7F]");
    private static final Pattern GUJARATI_PATTERN = Pattern.compile("[\\u0A80-\\u0AFF]");
    private static final Pattern TAMIL_PATTERN = Pattern.compile("[\\u0B80-\\u0BFF]");
    private static final Pattern TELUGU_PATTERN = Pattern.compile("[\\u0C00-\\u0C7F]");
    private static final Pattern KANNADA_PATTERN = Pattern.compile("[\\u0C80-\\u0CFF]");
    private static final Pattern MALAYALAM_PATTERN = Pattern.compile("[\\u0D00-\\u0D7F]");

    private final Map<String, Map<String, String>> translations = new HashMap<>();

    public LocalizationService() {
        initTranslations();
    }

    /**
     * Detects language from text script, or falls back to provided default.
     */
    public String detectLanguage(String text, String defaultLang) {
        if (text == null || text.isBlank()) {
            return defaultLang != null && !defaultLang.isBlank() ? defaultLang.toLowerCase(Locale.ROOT) : "en";
        }
        if (DEVANAGARI_PATTERN.matcher(text).find()) {
            // Could be Hindi or Marathi; default to Hindi unless specified
            return (defaultLang != null && defaultLang.equalsIgnoreCase("mr")) ? "mr" : "hi";
        }
        if (TAMIL_PATTERN.matcher(text).find()) return "ta";
        if (TELUGU_PATTERN.matcher(text).find()) return "te";
        if (BENGALI_PATTERN.matcher(text).find()) return "bn";
        if (GUJARATI_PATTERN.matcher(text).find()) return "gu";
        if (KANNADA_PATTERN.matcher(text).find()) return "kn";
        if (MALAYALAM_PATTERN.matcher(text).find()) return "ml";
        if (GURMUKHI_PATTERN.matcher(text).find()) return "pa";

        return (defaultLang != null && !defaultLang.isBlank()) ? defaultLang.toLowerCase(Locale.ROOT) : "en";
    }

    /**
     * Translates a key or phrase to the target language.
     */
    public String translate(String key, String lang) {
        if (lang == null || lang.equalsIgnoreCase("en")) {
            return key;
        }
        Map<String, String> langMap = translations.get(lang.toLowerCase(Locale.ROOT));
        if (langMap != null && langMap.containsKey(key)) {
            return langMap.get(key);
        }
        return key;
    }

    /**
     * Translates weather condition description.
     */
    public String translateWeatherDescription(String desc, String lang) {
        if (desc == null || lang == null || lang.equalsIgnoreCase("en")) return desc;
        return translate(desc, lang);
    }

    /**
     * Formats localized current weather summary.
     */
    public String formatCurrentWeather(String location, double temp, Double apparentTemp,
                                       Integer humidity, Double windSpeed, String condition, String lang) {
        String safeLang = (lang != null) ? lang.toLowerCase(Locale.ROOT) : "en";
        String translatedCondition = translate(condition, safeLang);

        switch (safeLang) {
            case "hi":
                return String.format("%s में वर्तमान मौसम %s है। तापमान %.1f°C%s, नमी %d%% और हवा की गति %.1f किमी/घंटा है।",
                        location, translatedCondition, temp,
                        apparentTemp != null ? String.format(" (महसूस %.1f°C)", apparentTemp) : "",
                        humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "ta":
                return String.format("%s இல் தற்போதைய வானிலை %s ஆகும். வெப்பநிலை %.1f°C, ஈரப்பதம் %d%% மற்றும் காற்றின் வேகம் %.1f கி.மீ/மணி.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "te":
                return String.format("%s లో ప్రస్తుత వాతావరణం %s. ఉష్ణోగ్రత %.1f°C, తేమ %d%% మరియు గాలి వేగం %.1f కి.మీ/గం.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "bn":
                return String.format("%s-এ বর্তমান আবহাওয়া %s। তাপমাত্রা %.1f°C, আর্দ্রতা %d%% এবং বাতাসের গতিবেগ %.1f কিমি/ঘন্টা।",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "mr":
                return String.format("%s मध्ये सध्याचे हवामान %s आहे. तापमान %.1f°C, आर्द्रता %d%% आणि वाऱ्याचा वेग %.1f किमी/तास आहे.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "gu":
                return String.format("%s માં વર્તમાન હવામાન %s છે. તાપમાન %.1f°C, ભેજ %d%% અને પવનની ગતિ %.1f કિમી/કલાક છે.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "kn":
                return String.format("%s ನಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ %s ಆಗಿದೆ. ತಾಪಮಾನ %.1f°C, ತೇವಾಂಶ %d%% ಮತ್ತು ಗಾಳಿಯ ವೇಗ %.1f ಕಿಮೀ/ಗಂಟೆ.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "ml":
                return String.format("%s-ൽ നിലവിലെ കാലാവസ്ഥ %s ആണ്. താപനില %.1f°C, ആർദ്രത %d%%, കാറ്റിന്റെ വേഗത %.1f കി.മീ/മണിക്കൂർ.",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            case "pa":
                return String.format("%s ਵਿੱਚ ਮੌਜੂਦਾ ਮੌਸਮ %s ਹੈ। ਤਾਪਮਾਨ %.1f°C, ਨਮੀ %d%% ਅਤੇ ਹਵਾ ਦੀ ਗਤੀ %.1f ਕਿਲੋਮੀਟਰ/ਘੰਟਾ ਹੈ।",
                        location, translatedCondition, temp, humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
            default:
                return String.format("The current weather in %s is %s with a temperature of %.1f°C%s, humidity %d%% and wind %.1f km/h.",
                        location, condition != null ? condition.toLowerCase(Locale.ROOT) : "clear", temp,
                        apparentTemp != null ? String.format(" (feels like %.1f°C)", apparentTemp) : "",
                        humidity != null ? humidity : 0, windSpeed != null ? windSpeed : 0.0);
        }
    }

    private void initTranslations() {
        // Hindi translations
        Map<String, String> hi = new HashMap<>();
        hi.put("Clear sky", "साफ आसमान");
        hi.put("Mainly clear", "मुख्यतः साफ");
        hi.put("Partly cloudy", "आंशिक रूप से बादल छाए रहेंगे");
        hi.put("Overcast", "बादल छाए रहेंगे");
        hi.put("Fog", "कोहरा");
        hi.put("Light drizzle", "हल्की बूंदाबांदी");
        hi.put("Moderate drizzle", "मध्यम बूंदाबांदी");
        hi.put("Slight rain", "हल्की बारिश");
        hi.put("Moderate rain", "मध्यम बारिश");
        hi.put("Heavy rain", "भारी बारिश");
        hi.put("Thunderstorm", "गरज के साथ बारिश और तूफान");
        hi.put("Consider carrying an umbrella.", "कृपया छाता साथ रखें।");
        hi.put("High temperature alert: stay hydrated and avoid direct sun exposure.", "उच्च तापमान चेतावनी: खूब पानी पिएं और धूप से बचें।");
        hi.put("Strong winds: secure loose outdoor items.", "तेज हवाएं: बाहरी वस्तुओं को सुरक्षित करें।");
        hi.put("Rain is likely tomorrow", "कल बारिश की संभावना है");
        hi.put("No rain is expected tomorrow", "कल बारिश की संभावना नहीं है");
        translations.put("hi", hi);

        // Tamil translations
        Map<String, String> ta = new HashMap<>();
        ta.put("Clear sky", "தெளிவான வானம்");
        ta.put("Partly cloudy", "பகுதி மேகமூட்டம்");
        ta.put("Overcast", "முழு மேகமூட்டம்");
        ta.put("Slight rain", "லேசான மழை");
        ta.put("Moderate rain", "மிதமான மழை");
        ta.put("Heavy rain", "கனமழை");
        ta.put("Thunderstorm", "இடியுடன் கூடிய மழை");
        ta.put("Consider carrying an umbrella.", "குடை எடுத்துச் செல்லவும்.");
        ta.put("Rain is likely tomorrow", "நாளை மழை பெய்ய வாய்ப்புள்ளது");
        translations.put("ta", ta);

        // Telugu translations
        Map<String, String> te = new HashMap<>();
        te.put("Clear sky", "స్పష్టమైన ఆకాశం");
        te.put("Partly cloudy", "పాక్షికంగా మేఘావృతం");
        te.put("Overcast", "దట్టమైన మేఘాలు");
        te.put("Slight rain", "తేలికపాటి వర్షం");
        te.put("Moderate rain", "మధ్యస్థ వర్షం");
        te.put("Heavy rain", "భారీ వర్షం");
        te.put("Thunderstorm", "ఉరుములతో కూడిన వర్షం");
        te.put("Consider carrying an umbrella.", "దయచేసి గొడుగు తీసుకెళ్లండి.");
        translations.put("te", te);

        // Bengali translations
        Map<String, String> bn = new HashMap<>();
        bn.put("Clear sky", "পরিষ্কার আকাশ");
        bn.put("Partly cloudy", "আংশিক মেঘলা");
        bn.put("Overcast", "মেঘলা আকাশ");
        bn.put("Slight rain", "হালকা বৃষ্টি");
        bn.put("Moderate rain", "মাঝারি বৃষ্টি");
        bn.put("Heavy rain", "ভারী বৃষ্টি");
        bn.put("Thunderstorm", "বজ্রবিদ্যুৎ সহ ঝড়-বৃষ্টি");
        bn.put("Consider carrying an umbrella.", "দয়া করে সাথে ছাতা রাখুন।");
        translations.put("bn", bn);

        // Marathi translations
        Map<String, String> mr = new HashMap<>();
        mr.put("Clear sky", "निरभ्र आकाश");
        mr.put("Partly cloudy", "अंशतः ढगाळ");
        mr.put("Overcast", "ढगाळ वातावरण");
        mr.put("Slight rain", "हलका पाऊस");
        mr.put("Moderate rain", "मध्यम पाऊस");
        mr.put("Heavy rain", "मुसळधार पाऊस");
        mr.put("Thunderstorm", "वादळी पाऊस");
        mr.put("Consider carrying an umbrella.", "कृपया छत्री सोबत ठेवा.");
        translations.put("mr", mr);

        // Gujarati translations
        Map<String, String> gu = new HashMap<>();
        gu.put("Clear sky", "સ્વચ્છ આકાશ");
        gu.put("Partly cloudy", "આંશિક વાદળછાયું");
        gu.put("Slight rain", "હળવો વરસાદ");
        gu.put("Moderate rain", "મધ્યમ વરસાદ");
        gu.put("Heavy rain", "ભારે વરસાદ");
        gu.put("Thunderstorm", "ગાજવીજ સાથે વરસાદ");
        gu.put("Consider carrying an umbrella.", "કૃપા કરીને છત્રી સાથે રાખો.");
        translations.put("gu", gu);
    }
}
