package com.weathergpt.dto.advisory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgricultureAdvisory {
    private String sowingAdvisory;           // e.g., "POSTPONE SOWING: Heavy rain expected within 48h"
    private String irrigationRecommendation; // e.g., "SUSPEND IRRIGATION: 24mm rainfall forecasted"
    private String sprayingWindow;          // e.g., "UNFAVORABLE: Wind speed > 15 km/h, drift risk"
    private String harvestingGuidance;       // e.g., "HARVEST READY: Dry conditions next 3 days"
    private Double soilMoistureIndex;        // % capacity
    private String pestDiseaseRisk;          // HIGH / MODERATE / LOW based on humidity + temp
    private List<String> cropSpecificTips;   // Guidance for wheat, rice, cotton, vegetables
}
