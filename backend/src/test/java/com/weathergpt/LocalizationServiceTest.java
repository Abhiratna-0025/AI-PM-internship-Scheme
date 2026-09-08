package com.weathergpt;

import com.weathergpt.service.LocalizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LocalizationServiceTest {

    private final LocalizationService localizationService = new LocalizationService();

    @Test
    @DisplayName("Detects Devanagari script as Hindi")
    void detectDevanagari() {
        String lang = localizationService.detectLanguage("दिल्ली में बारिश होगी?", "en");
        assertThat(lang).isEqualTo("hi");
    }

    @Test
    @DisplayName("Detects Tamil script as Tamil")
    void detectTamil() {
        String lang = localizationService.detectLanguage("சென்னையில் மழை பெய்யுமா?", "en");
        assertThat(lang).isEqualTo("ta");
    }

    @Test
    @DisplayName("Detects Telugu script as Telugu")
    void detectTelugu() {
        String lang = localizationService.detectLanguage("హైదరాబాద్‌లో వర్షం పడుతుందా?", "en");
        assertThat(lang).isEqualTo("te");
    }

    @Test
    @DisplayName("Detects Bengali script as Bengali")
    void detectBengali() {
        String lang = localizationService.detectLanguage("কলকাতায় বৃষ্টি হবে?", "en");
        assertThat(lang).isEqualTo("bn");
    }

    @Test
    @DisplayName("Translates weather condition to Hindi")
    void translateWeatherDescription_hindi() {
        String translated = localizationService.translateWeatherDescription("Heavy rain", "hi");
        assertThat(translated).isEqualTo("भारी बारिश");
    }

    @Test
    @DisplayName("Formats current weather in Hindi")
    void formatCurrentWeather_hindi() {
        String res = localizationService.formatCurrentWeather("Delhi", 32.0, 35.0, 65, 14.0, "Clear sky", "hi");
        assertThat(res).contains("Delhi में वर्तमान मौसम");
        assertThat(res).contains("साफ आसमान");
        assertThat(res).contains("32.0°C");
    }
}
