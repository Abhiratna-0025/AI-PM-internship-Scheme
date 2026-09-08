package com.weathergpt;

import com.weathergpt.dto.advisory.SectorAdvisoryResponse;
import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastDay;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.service.SectorAdvisoryService;
import com.weathergpt.service.WeatherService;
import com.weathergpt.weather.model.GeoLocation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class SectorAdvisoryServiceTest {

    @Mock
    private WeatherService weatherService;

    @InjectMocks
    private SectorAdvisoryService sectorAdvisoryService;

    private static final GeoLocation PUNE = GeoLocation.builder()
            .name("Pune")
            .latitude(18.52)
            .longitude(73.85)
            .country("India")
            .timezone("Asia/Kolkata")
            .build();

    @BeforeEach
    void setUp() {
        CurrentWeatherResponse current = CurrentWeatherResponse.builder()
                .temperature(29.0)
                .apparentTemperature(31.0)
                .humidity(70)
                .windSpeed(12.0)
                .windDirection(260)
                .pressure(1010.0)
                .visibility(8000.0)
                .weatherDescription("Partly cloudy")
                .build();

        ForecastResponse forecast = ForecastResponse.builder()
                .days(List.of(
                        ForecastDay.builder().date("2026-09-08").tempMax(31.0).tempMin(22.0).precipitationSum(2.0).build(),
                        ForecastDay.builder().date("2026-09-09").tempMax(30.0).tempMin(21.0).precipitationSum(0.0).build()
                ))
                .build();

        given(weatherService.resolveLocation("Pune")).willReturn(PUNE);
        given(weatherService.getCurrentWeather(any(GeoLocation.class))).willReturn(current);
        given(weatherService.getForecast(any(GeoLocation.class), anyInt())).willReturn(forecast);
    }

    @Test
    @DisplayName("Generates agricultural crop advisories including sowing, irrigation, and spraying")
    void generateAgricultureAdvisories() {
        SectorAdvisoryResponse response = sectorAdvisoryService.generateAdvisories("Pune", "agriculture", null, null);

        assertThat(response).isNotNull();
        assertThat(response.getAgriculture()).isNotNull();
        assertThat(response.getAgriculture().getSowingAdvisory()).isNotBlank();
        assertThat(response.getAgriculture().getIrrigationRecommendation()).isNotBlank();
        assertThat(response.getAgriculture().getSoilMoistureIndex()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("Generates aviation briefing including METAR, flight category, and crosswind")
    void generateAviationBriefing() {
        SectorAdvisoryResponse response = sectorAdvisoryService.generateAdvisories("Pune", "aviation", null, null);

        assertThat(response).isNotNull();
        assertThat(response.getAviation()).isNotNull();
        assertThat(response.getAviation().getFlightCategory()).isIn("VFR", "MVFR", "IFR");
        assertThat(response.getAviation().getMetarCode()).contains("KT");
    }

    @Test
    @DisplayName("Generates marine and fishermen safety advisory")
    void generateMarineAdvisories() {
        SectorAdvisoryResponse response = sectorAdvisoryService.generateAdvisories("Pune", "marine", null, null);

        assertThat(response).isNotNull();
        assertThat(response.getMarine()).isNotNull();
        assertThat(response.getMarine().getSeaState()).isNotBlank();
        assertThat(response.getMarine().getFishermenAction()).isNotBlank();
    }

    @Test
    @DisplayName("Generates smart city urban heat island and flood risk metrics")
    void generateSmartCityAdvisories() {
        SectorAdvisoryResponse response = sectorAdvisoryService.generateAdvisories("Pune", "urban", null, null);

        assertThat(response).isNotNull();
        assertThat(response.getSmartCity()).isNotNull();
        assertThat(response.getSmartCity().getWaterloggingFloodRisk()).isNotBlank();
        assertThat(response.getSmartCity().getOutdoorLaborSafety()).isNotBlank();
    }
}
