package com.weathergpt.climate.dto;

import com.weathergpt.dto.weather.LocationInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClimateTrendResponse {
    private LocationInfo location;
    private String analysisPeriod;              // e.g. "2014 - 2024 (10 Years)"
    private Double warmingRatePerDecade;        // °C per decade (slope)
    private Double precipitationTrendAnomalyPercent; // % change vs historical normal
    private Double baselineMeanTemperature;     // 30-year normal mean temp °C
    private Double baselineAnnualPrecipitation;  // 30-year normal annual rainfall mm
    private List<YearlyClimateMetric> yearlyMetrics;
    private List<String> climateInsights;
    private String dataCitation;                // "Open-Meteo Historical Weather Archive / ERA5 Reanalysis"
}
