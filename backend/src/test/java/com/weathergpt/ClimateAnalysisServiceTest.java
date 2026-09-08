package com.weathergpt;

import com.weathergpt.climate.ClimateAnalysisService;
import com.weathergpt.climate.dto.ClimateTrendResponse;
import com.weathergpt.service.WeatherService;
import com.weathergpt.weather.model.GeoLocation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ClimateAnalysisServiceTest {

    @Mock
    private WeatherService weatherService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private ClimateAnalysisService climateAnalysisService;

    private static final GeoLocation DELHI = GeoLocation.builder()
            .name("Delhi")
            .latitude(28.61)
            .longitude(77.20)
            .country("India")
            .timezone("Asia/Kolkata")
            .build();

    @BeforeEach
    void setUp() {
        given(weatherService.resolveLocation("Delhi")).willReturn(DELHI);
    }

    @Test
    @DisplayName("Calculates decadal warming trends and yearly metrics")
    void analyzeClimateTrends_computesDecadalWarming() {
        ClimateTrendResponse response = climateAnalysisService.analyzeClimateTrends("Delhi", 2015, 2024);

        assertThat(response).isNotNull();
        assertThat(response.getWarmingRatePerDecade()).isGreaterThan(0.0);
        assertThat(response.getBaselineMeanTemperature()).isGreaterThan(20.0);
        assertThat(response.getYearlyMetrics()).hasSize(10);
        assertThat(response.getClimateInsights()).isNotEmpty();
    }
}
