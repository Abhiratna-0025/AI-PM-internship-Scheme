package com.weathergpt;

import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastDay;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.nwp.NwpModelService;
import com.weathergpt.nwp.dto.NwpComparisonResponse;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class NwpModelServiceTest {

    @Mock
    private WeatherService weatherService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private NwpModelService nwpModelService;

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
        given(weatherService.getCurrentWeather(any(GeoLocation.class))).willReturn(
                CurrentWeatherResponse.builder().temperature(31.0).windSpeed(14.0).build());
        given(weatherService.getForecast(any(GeoLocation.class), anyInt())).willReturn(
                ForecastResponse.builder().days(List.of(ForecastDay.builder().precipitationSum(0.0).build())).build());
    }

    @Test
    @DisplayName("Compares GFS, ECMWF, and WRF models and computes consensus score")
    void compareModels_computesConsensus() {
        NwpComparisonResponse response = nwpModelService.compareModels("Delhi");

        assertThat(response).isNotNull();
        assertThat(response.getModels()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(response.getConsensus()).isNotNull();
        assertThat(response.getConsensus().getConsensusScorePercentage()).isBetween(50, 100);
        assertThat(response.getConsensus().getConfidenceLevel()).isIn("HIGH", "MODERATE", "LOW");
        assertThat(response.getSynopticAnalysis()).contains("Delhi");
    }
}
