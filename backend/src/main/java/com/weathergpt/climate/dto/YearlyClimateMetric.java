package com.weathergpt.climate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YearlyClimateMetric {
    private int year;
    private Double meanTemperature;      // annual mean °C
    private Double maxTemperature;       // peak summer temperature °C
    private Double minTemperature;       // coldest winter temperature °C
    private Double totalPrecipitation;   // annual cumulative rainfall mm
    private int extremeHeatDaysCount;    // days with Tmax >= 40°C
    private int heavyRainDaysCount;      // days with Rain >= 64.5mm
    private Double tempAnomalyVsBaseline;// °C deviation from long-term mean
}
