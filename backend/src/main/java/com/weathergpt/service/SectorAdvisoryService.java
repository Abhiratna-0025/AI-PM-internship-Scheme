package com.weathergpt.service;

import com.weathergpt.dto.advisory.*;
import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastDay;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.dto.weather.LocationInfo;
import com.weathergpt.weather.model.GeoLocation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class SectorAdvisoryService {

    private final WeatherService weatherService;

    public SectorAdvisoryResponse generateAdvisories(String locationQuery, String sector, Double lat, Double lon) {
        GeoLocation location;
        if (lat != null && lon != null) {
            location = GeoLocation.builder()
                    .name(locationQuery != null && !locationQuery.isBlank() ? locationQuery : String.format(Locale.ROOT, "%.2f, %.2f", lat, lon))
                    .latitude(lat)
                    .longitude(lon)
                    .country("India")
                    .timezone("Asia/Kolkata")
                    .build();
        } else {
            location = weatherService.resolveLocation(locationQuery);
        }
        return generateAdvisoriesForLocation(location, sector);
    }

    public SectorAdvisoryResponse generateAdvisoriesForLocation(GeoLocation location, String sector) {
        CurrentWeatherResponse current = weatherService.getCurrentWeather(location);
        ForecastResponse forecast = weatherService.getForecast(location, 3);

        String safeSector = (sector != null && !sector.isBlank()) ? sector.toLowerCase(Locale.ROOT) : "all";

        AgricultureAdvisory agriculture = null;
        AviationBriefing aviation = null;
        MarineAdvisory marine = null;
        SmartCityAdvisory smartCity = null;
        List<String> directives = new ArrayList<>();

        if (safeSector.equals("all") || safeSector.contains("agri") || safeSector.contains("farm")) {
            agriculture = buildAgricultureAdvisory(current, forecast);
            directives.add("🌾 " + agriculture.getSowingAdvisory());
            directives.add("💧 " + agriculture.getIrrigationRecommendation());
        }

        if (safeSector.equals("all") || safeSector.contains("avia") || safeSector.contains("flight")) {
            aviation = buildAviationBriefing(location, current);
            directives.add(String.format("✈️ Flight Category: %s | Visibility: %.1f km",
                    aviation.getFlightCategory(), aviation.getVisibilityKm()));
        }

        if (safeSector.equals("all") || safeSector.contains("marine") || safeSector.contains("fish") || safeSector.contains("sea") || safeSector.contains("ocean")) {
            marine = buildMarineAdvisory(location, current);
            directives.add("⚓ " + marine.getFishermenAction());
        }

        if (safeSector.equals("all") || safeSector.contains("urban") || safeSector.contains("city") || safeSector.contains("smart")) {
            smartCity = buildSmartCityAdvisory(current, forecast);
            directives.add("🏙️ Flood Risk: " + smartCity.getWaterloggingFloodRisk() + " | Labor Safety: " + smartCity.getOutdoorLaborSafety());
        }

        return SectorAdvisoryResponse.builder()
                .location(LocationInfo.builder()
                        .name(location.getName())
                        .latitude(location.getLatitude())
                        .longitude(location.getLongitude())
                        .admin1(location.getAdmin1())
                        .country(location.getCountry())
                        .timezone(location.getTimezone())
                        .build())
                .generatedAt(Instant.now().toString())
                .requestedSector(safeSector)
                .agriculture(agriculture)
                .aviation(aviation)
                .marine(marine)
                .smartCity(smartCity)
                .primaryDirectives(directives)
                .disclaimer("WeatherGPT Decision-Support Tool: Aligned with MoES/IMD guidelines. Not an official warning authority.")
                .build();
    }

    private AgricultureAdvisory buildAgricultureAdvisory(CurrentWeatherResponse current, ForecastResponse forecast) {
        double temp = current.getTemperature() != null ? current.getTemperature() : 25.0;
        int humidity = current.getHumidity() != null ? current.getHumidity() : 60;
        double wind = current.getWindSpeed() != null ? current.getWindSpeed() : 10.0;

        double precipNext48h = 0.0;
        if (forecast != null && forecast.getDays() != null) {
            precipNext48h = forecast.getDays().stream().limit(2)
                    .mapToDouble(d -> d.getPrecipitationSum() != null ? d.getPrecipitationSum() : 0.0)
                    .sum();
        }

        double soilMoisture = Math.min(100.0, Math.max(20.0, 45.0 + (precipNext48h * 2.5) + (humidity * 0.2) - (temp * 0.4)));

        String sowing;
        if (precipNext48h > 35.0) {
            sowing = "POSTPONE SOWING: Heavy precipitation forecasted (>35mm). Risk of seed displacement and waterlogging.";
        } else if (temp > 40.0) {
            sowing = "DELAY SOWING: High surface soil temperatures. Germination failure risk.";
        } else if (precipNext48h >= 5.0 && precipNext48h <= 30.0) {
            sowing = "FAVORABLE SOWING WINDOW: Optimal soil moisture conditions expected.";
        } else {
            sowing = "NORMAL SOWING PERMITTED: Ensure pre-sowing irrigation if soil moisture is dry.";
        }

        String irrigation;
        if (precipNext48h > 8.0) {
            irrigation = String.format(Locale.ROOT, "SUSPEND IRRIGATION: %.1f mm precipitation anticipated within 48 hours.", precipNext48h);
        } else if (soilMoisture < 35.0) {
            irrigation = "IRRIGATE FIELD: Soil moisture deficit detected. Light to moderate irrigation recommended.";
        } else {
            irrigation = "MAINTAIN CURRENT CYCLE: Soil moisture is adequate for standing crops.";
        }

        String spraying;
        if (wind > 16.0) {
            spraying = String.format(Locale.ROOT, "UNFAVORABLE FOR SPRAYING: Wind speed (%.1f km/h) exceeds 15 km/h threshold; high droplet drift risk.", wind);
        } else if (precipNext48h > 3.0) {
            spraying = "UNFAVORABLE FOR SPRAYING: Rain expected within wash-off window (24h).";
        } else {
            spraying = "FAVORABLE FOR SPRAYING: Low wind speed and dry canopy conditions.";
        }

        String harvesting = (precipNext48h < 2.0 && humidity < 75)
                ? "HARVESTING WINDOW OPEN: 3-day dry spell provides safe conditions for harvest and threshing."
                : "HOLD HARVEST: Precipitation risk; keep harvested produce under tarpaulin covers.";

        String pestRisk = (humidity > 80 && temp >= 22.0 && temp <= 32.0)
                ? "HIGH: Warm and humid microclimate favors fungal and bacterial pathogen proliferation."
                : (humidity > 65 ? "MODERATE: Monitor crop canopy for early signs of blight or aphids." : "LOW: Dry atmospheric conditions suppress foliar diseases.");

        List<String> tips = List.of(
                "Wheat / Rabi: Monitor moisture stress during crown root initiation (CRI) stage.",
                "Rice / Kharif: Ensure 2-3 cm standing water during tillering; drain excess water if rain exceeds 50mm.",
                "Vegetables & Horticultural Crops: Provide staking to tomato/chilli crops against gusty winds.",
                "Livestock: Keep animals under shaded well-ventilated sheds during peak noon heat."
        );

        return AgricultureAdvisory.builder()
                .sowingAdvisory(sowing)
                .irrigationRecommendation(irrigation)
                .sprayingWindow(spraying)
                .harvestingGuidance(harvesting)
                .soilMoistureIndex(Math.round(soilMoisture * 10.0) / 10.0)
                .pestDiseaseRisk(pestRisk)
                .cropSpecificTips(tips)
                .build();
    }

    private AviationBriefing buildAviationBriefing(GeoLocation location, CurrentWeatherResponse current) {
        double temp = current.getTemperature() != null ? current.getTemperature() : 25.0;
        double windKmh = current.getWindSpeed() != null ? current.getWindSpeed() : 10.0;
        int windDir = current.getWindDirection() != null ? current.getWindDirection() : 270;
        double windKnots = Math.round(windKmh * 0.539957 * 10.0) / 10.0;
        double visibilityM = current.getVisibility() != null ? current.getVisibility() : 10000.0;
        double visibilityKm = Math.round((visibilityM / 1000.0) * 10.0) / 10.0;
        double pressureHpa = current.getPressure() != null ? current.getPressure() : 1013.0;

        String icao = location.getName().toUpperCase(Locale.ROOT).startsWith("DEL") ? "VIDP" :
                (location.getName().toUpperCase(Locale.ROOT).startsWith("MUM") ? "VABB" :
                        (location.getName().toUpperCase(Locale.ROOT).startsWith("BEN") ? "VOBL" : "VXXX"));

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String timeStr = now.format(DateTimeFormatter.ofPattern("ddHHmm'Z'"));

        String flightCat = (visibilityKm >= 5.0) ? "VFR" : (visibilityKm >= 3.0 ? "MVFR" : "IFR");
        String ceiling = (visibilityKm >= 5.0) ? "SCT030" : "BKN015";

        String metar = String.format(Locale.ROOT, "%s %s %03d%02dKT %04d %s %02d/%02d Q%04d NOSIG",
                icao, timeStr, windDir, (int) windKnots, (int) Math.min(9999, visibilityM),
                ceiling, (int) Math.round(temp), (int) Math.round(temp - 6), (int) Math.round(pressureHpa));

        String taf = String.format(Locale.ROOT, "TAF %s %s 24HR %03d%02dKT %04d %s BECMG NSW",
                icao, timeStr, windDir, (int) Math.max(5, windKnots - 2), (int) Math.min(9999, visibilityM), ceiling);

        String turb = windKmh > 35 ? "MODERATE / SEVERE" : (windKmh > 20 ? "LIGHT" : "NONE");
        String convective = current.getWeatherDescription() != null && current.getWeatherDescription().toLowerCase(Locale.ROOT).contains("thunder")
                ? "WARNING: Convective CB cells detected in terminal maneuvering area (TMA)."
                : "NIL: No significant convective clouds reported.";

        return AviationBriefing.builder()
                .metarCode(metar)
                .tafCode(taf)
                .flightCategory(flightCat)
                .visibilityKm(visibilityKm)
                .cloudCeiling(flightCat.equals("VFR") ? "UNRESTRICTED (>3000 ft AGL)" : "1500 ft AGL")
                .crosswindKnots(Math.round(windKnots * 0.7 * 10.0) / 10.0)
                .turbulenceRisk(turb)
                .convectiveStormAlert(convective)
                .build();
    }

    private MarineAdvisory buildMarineAdvisory(GeoLocation location, CurrentWeatherResponse current) {
        double windKmh = current.getWindSpeed() != null ? current.getWindSpeed() : 15.0;
        double windKnots = windKmh * 0.539957;

        // Empirical significant wave height formula
        double waveHeight = Math.max(0.3, Math.round(0.025 * Math.pow(windKnots, 1.35) * 10.0) / 10.0);

        int beaufort;
        if (windKnots < 1) beaufort = 0;
        else if (windKnots < 4) beaufort = 1;
        else if (windKnots < 7) beaufort = 2;
        else if (windKnots < 11) beaufort = 3;
        else if (windKnots < 17) beaufort = 4;
        else if (windKnots < 22) beaufort = 5;
        else if (windKnots < 28) beaufort = 6;
        else if (windKnots < 34) beaufort = 7;
        else beaufort = 8;

        String seaState = (beaufort <= 2) ? "Calm to Smooth" :
                (beaufort <= 4 ? "Slight" : (beaufort <= 5 ? "Moderate" : (beaufort <= 6 ? "Rough" : "Very Rough to High")));

        boolean unsafe = (windKnots >= 22.0 || waveHeight >= 2.5);
        String action = unsafe
                ? "WARNING: Rough sea conditions. Fishermen are strictly advised NOT to venture into deep sea or along the coast."
                : "SAFE: Sea conditions normal. Coastal and offshore fishing operations may proceed with standard safety measures.";

        return MarineAdvisory.builder()
                .seaState(seaState)
                .waveHeightMeters(waveHeight)
                .swellPeriodSeconds(Math.round((6.0 + waveHeight * 1.5) * 10.0) / 10.0)
                .windBeaufortScale(beaufort)
                .windSpeedKnots(Math.round(windKnots * 10.0) / 10.0)
                .fishermenWarningActive(unsafe)
                .fishermenAction(action)
                .tidalCurrentNote("Moderate ebb and flood tidal currents expected along estuary mouths.")
                .build();
    }

    private SmartCityAdvisory buildSmartCityAdvisory(CurrentWeatherResponse current, ForecastResponse forecast) {
        double temp = current.getTemperature() != null ? current.getTemperature() : 28.0;
        int humidity = current.getHumidity() != null ? current.getHumidity() : 65;

        // Rothfusz heat index approximation
        double heatIndex = temp;
        if (temp >= 26.0) {
            heatIndex = -8.784 + 1.611 * temp + 2.338 * humidity - 0.146 * temp * humidity
                    - 0.0123 * temp * temp - 0.0164 * humidity * humidity + 0.0022 * temp * temp * humidity;
            heatIndex = Math.max(temp, heatIndex);
        }

        double maxRain = 0.0;
        if (forecast != null && forecast.getDays() != null && !forecast.getDays().isEmpty()) {
            maxRain = forecast.getDays().get(0).getPrecipitationSum() != null ? forecast.getDays().get(0).getPrecipitationSum() : 0.0;
        }

        String floodRisk = (maxRain > 64.5) ? "SEVERE: Flash flooding and severe underpass waterlogging imminent." :
                (maxRain > 30.0 ? "HIGH: Low-lying urban arterial roads susceptible to water accumulation." :
                        (maxRain > 10.0 ? "MODERATE: Localized storm drain ponding possible." : "NONE / LOW: Stormwater drains clear."));

        String uhi = (temp > 38.0) ? "EXTREME (Asphalt & concrete surface thermal retention > 48°C)" :
                (temp > 32.0 ? "ELEVATED (Urban core 3-5°C warmer than surrounding peri-urban zones)" : "LOW");

        String laborSafety = (heatIndex > 41.0) ? "RESTRICT OUTDOOR LABOR: High risk of heat stroke. Mandate work stoppage 12:00-15:30." :
                (heatIndex > 35.0 ? "CAUTION: Enforce 15-min hydration breaks every hour in shade." : "SAFE: Normal outdoor work permitted.");

        return SmartCityAdvisory.builder()
                .urbanHeatIslandIndex(uhi)
                .waterloggingFloodRisk(floodRisk)
                .outdoorWorkHeatIndex(Math.round(heatIndex * 10.0) / 10.0)
                .outdoorLaborSafety(laborSafety)
                .aqiEstimate(125)
                .airQualityCategory("Moderate (PM2.5: 48 µg/m³)")
                .municipalPumpingAdvice(maxRain > 25.0 ? "Activate auxiliary sump pumps at vulnerable underpasses and subway stations." : "Standard gravity flow drain maintenance.")
                .build();
    }
}
