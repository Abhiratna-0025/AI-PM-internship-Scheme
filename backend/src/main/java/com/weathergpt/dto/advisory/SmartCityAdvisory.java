package com.weathergpt.dto.advisory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmartCityAdvisory {
    private String urbanHeatIslandIndex;    // LOW / ELEVATED / EXTREME
    private String waterloggingFloodRisk;   // NONE / LOW / MODERATE / HIGH / SEVERE
    private Double outdoorWorkHeatIndex;    // Heat index °C
    private String outdoorLaborSafety;      // "SAFE", "SCHEDULE BREAKS & HYDRATION", "RESTRICT OUTDOOR SHIFTS"
    private Integer aqiEstimate;            // Air Quality Index (estimated/reported)
    private String airQualityCategory;      // Good, Moderate, Poor, Very Poor, Severe
    private String municipalPumpingAdvice;  // Storm drain pumping preparedness
}
