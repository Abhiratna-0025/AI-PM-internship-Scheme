package com.weathergpt.weather.alert;

import com.weathergpt.dto.alert.AlertResponse;
import com.weathergpt.dto.alert.WeatherAlertDto;
import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastDay;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.service.WeatherService;
import com.weathergpt.weather.model.GeoLocation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Early warning and alert generation service implementing the India Meteorological
 * Department (IMD) colour-coded early warning protocol:
 * - GREEN (Normal / No Warning)
 * - YELLOW (Watch / Be Updated)
 * - ORANGE (Alert / Be Prepared)
 * - RED (Warning / Take Action)
 *
 * All automated alerts are classified as AUTOMATED_ADVISORY per MoES/IMD guidelines.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImdEarlyWarningService {

    private final WeatherService weatherService;

    public AlertResponse getEarlyWarnings(String locationQuery) {
        GeoLocation location = weatherService.resolveLocation(locationQuery);
        return getEarlyWarningsForLocation(location);
    }

    public AlertResponse getEarlyWarningsForLocation(GeoLocation location) {
        CurrentWeatherResponse current = weatherService.getCurrentWeather(location);
        ForecastResponse forecast = weatherService.getForecast(location, 3);

        List<WeatherAlertDto> alerts = new ArrayList<>();
        Instant now = Instant.now();

        // 1. Evaluate Heavy Rainfall / Flood Warnings (IMD Scale)
        if (forecast != null && forecast.getDays() != null) {
            for (int i = 0; i < Math.min(forecast.getDays().size(), 3); i++) {
                ForecastDay day = forecast.getDays().get(i);
                double precip = day.getPrecipitationSum() != null ? day.getPrecipitationSum() : 0.0;
                String dayLabel = (i == 0) ? "Today" : (i == 1 ? "Tomorrow" : day.getDate());

                if (precip > 204.4) {
                    alerts.add(WeatherAlertDto.builder()
                            .id("IMD-RED-" + UUID.randomUUID().toString().substring(0, 8))
                            .title(String.format("IMD Red Warning: Extremely Heavy Rainfall (%s)", dayLabel))
                            .description(String.format("Extremely heavy rainfall predicted (%.1f mm). Severe risk of flash floods, inundated low-lying areas, and disrupted rail/road traffic. Take immediate action.", precip))
                            .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                            .alertType(AlertType.HEAVY_RAIN)
                            .severity(AlertSeverity.EXTREME)
                            .source("IMD Colour-Coded Early Warning Standard")
                            .official(false)
                            .issuedAt(now)
                            .effectiveFrom(now.plus(i, ChronoUnit.DAYS))
                            .effectiveUntil(now.plus(i + 1, ChronoUnit.DAYS))
                            .affectedLocations(List.of(location.getName()))
                            .build());
                } else if (precip >= 64.5) {
                    alerts.add(WeatherAlertDto.builder()
                            .id("IMD-ORG-" + UUID.randomUUID().toString().substring(0, 8))
                            .title(String.format("IMD Orange Alert: Heavy to Very Heavy Rain (%s)", dayLabel))
                            .description(String.format("Heavy rainfall expected (%.1f mm). Be prepared for localized flooding and waterlogged roads.", precip))
                            .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                            .alertType(AlertType.HEAVY_RAIN)
                            .severity(AlertSeverity.SEVERE)
                            .source("IMD Colour-Coded Early Warning Standard")
                            .official(false)
                            .issuedAt(now)
                            .effectiveFrom(now.plus(i, ChronoUnit.DAYS))
                            .effectiveUntil(now.plus(i + 1, ChronoUnit.DAYS))
                            .affectedLocations(List.of(location.getName()))
                            .build());
                } else if (precip >= 20.0) {
                    alerts.add(WeatherAlertDto.builder()
                            .id("IMD-YEL-" + UUID.randomUUID().toString().substring(0, 8))
                            .title(String.format("IMD Yellow Watch: Moderate Rainfall (%s)", dayLabel))
                            .description(String.format("Moderate rainfall expected (%.1f mm). Keep updated with latest local forecasts.", precip))
                            .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                            .alertType(AlertType.RAIN)
                            .severity(AlertSeverity.MODERATE)
                            .source("IMD Colour-Coded Early Warning Standard")
                            .official(false)
                            .issuedAt(now)
                            .effectiveFrom(now.plus(i, ChronoUnit.DAYS))
                            .effectiveUntil(now.plus(i + 1, ChronoUnit.DAYS))
                            .affectedLocations(List.of(location.getName()))
                            .build());
                }
            }
        }

        // 2. Evaluate Heatwave Conditions (IMD Plains criteria: Tmax >= 40°C)
        double currentTemp = current.getTemperature() != null ? current.getTemperature() : 25.0;
        if (currentTemp >= 45.0) {
            alerts.add(WeatherAlertDto.builder()
                    .id("IMD-RED-" + UUID.randomUUID().toString().substring(0, 8))
                    .title("IMD Red Warning: Severe Heatwave Conditions")
                    .description(String.format("Maximum temperature has reached %.1f°C. Very high likelihood of heat illness and heat stroke across all age groups. Avoid sun exposure and stay hydrated.", currentTemp))
                    .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                    .alertType(AlertType.HEATWAVE)
                    .severity(AlertSeverity.EXTREME)
                    .source("IMD Colour-Coded Early Warning Standard")
                    .official(false)
                    .issuedAt(now)
                    .effectiveFrom(now)
                    .effectiveUntil(now.plus(24, ChronoUnit.HOURS))
                    .affectedLocations(List.of(location.getName()))
                    .build());
        } else if (currentTemp >= 40.0) {
            alerts.add(WeatherAlertDto.builder()
                    .id("IMD-ORG-" + UUID.randomUUID().toString().substring(0, 8))
                    .title("IMD Orange Alert: Heatwave Conditions")
                    .description(String.format("High temperature observed at %.1f°C. High probability of heat stress for vulnerable populations (infants, elderly, outdoor laborers).", currentTemp))
                    .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                    .alertType(AlertType.HEATWAVE)
                    .severity(AlertSeverity.SEVERE)
                    .source("IMD Colour-Coded Early Warning Standard")
                    .official(false)
                    .issuedAt(now)
                    .effectiveFrom(now)
                    .effectiveUntil(now.plus(24, ChronoUnit.HOURS))
                    .affectedLocations(List.of(location.getName()))
                    .build());
        }

        // 3. Evaluate Thunderstorm & Gale Wind
        double wind = current.getWindSpeed() != null ? current.getWindSpeed() : 0.0;
        if (wind >= 62.0) {
            alerts.add(WeatherAlertDto.builder()
                    .id("IMD-RED-" + UUID.randomUUID().toString().substring(0, 8))
                    .title("IMD Red Warning: Gale Force Squalls / Cyclonic Winds")
                    .description(String.format("Sustained surface winds of %.1f km/h detected. High danger of falling trees, uprooted poles, and structural damage.", wind))
                    .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                    .alertType(AlertType.CYCLONE)
                    .severity(AlertSeverity.EXTREME)
                    .source("IMD Colour-Coded Early Warning Standard")
                    .official(false)
                    .issuedAt(now)
                    .effectiveFrom(now)
                    .effectiveUntil(now.plus(12, ChronoUnit.HOURS))
                    .affectedLocations(List.of(location.getName()))
                    .build());
        } else if (wind >= 45.0) {
            alerts.add(WeatherAlertDto.builder()
                    .id("IMD-YEL-" + UUID.randomUUID().toString().substring(0, 8))
                    .title("IMD Yellow Watch: Strong Gusty Winds")
                    .description(String.format("Gusty winds reaching %.1f km/h. Secure loose outdoor objects.", wind))
                    .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                    .alertType(AlertType.STRONG_WIND)
                    .severity(AlertSeverity.MODERATE)
                    .source("IMD Colour-Coded Early Warning Standard")
                    .official(false)
                    .issuedAt(now)
                    .effectiveFrom(now)
                    .effectiveUntil(now.plus(12, ChronoUnit.HOURS))
                    .affectedLocations(List.of(location.getName()))
                    .build());
        }

        // 4. Evaluate Thunderstorm / Lightning
        if (current.getWeatherCode() != null && (current.getWeatherCode() == 95 || current.getWeatherCode() == 96 || current.getWeatherCode() == 99)) {
            alerts.add(WeatherAlertDto.builder()
                    .id("IMD-ORG-" + UUID.randomUUID().toString().substring(0, 8))
                    .title("IMD Orange Alert: Severe Thunderstorm & Lightning")
                    .description("Active thunderstorm with cloud-to-ground lightning strikes detected. Seek safe indoor shelter; do not stand under isolated trees.")
                    .informationClass(AlertInformationClass.AUTOMATED_ADVISORY)
                    .alertType(AlertType.THUNDERSTORM)
                    .severity(AlertSeverity.SEVERE)
                    .source("IMD Colour-Coded Early Warning Standard")
                    .official(false)
                    .issuedAt(now)
                    .effectiveFrom(now)
                    .effectiveUntil(now.plus(6, ChronoUnit.HOURS))
                    .affectedLocations(List.of(location.getName()))
                    .build());
        }

        String status = alerts.isEmpty()
                ? "IMD Green: Normal atmospheric conditions. No extreme weather warnings active."
                : String.format("IMD Early Warning System: %d automated advisory alerts generated based on meteorological thresholds.", alerts.size());

        return AlertResponse.builder()
                .location(location.getName())
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .alerts(alerts)
                .totalAlerts(alerts.size())
                .officialProviderActive(false)
                .providerStatus(status)
                .build();
    }
}
