package com.weathergpt.nwp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelForecastDto {
    private String modelName;       // e.g., "GFS (NOAA)", "ECMWF (IFS)", "ICON (DWD)"
    private String modelCode;       // e.g., "gfs", "ecmwf", "icon"
    private String resolution;      // e.g., "13 km", "9 km", "11 km"
    private Double currentTemp;     // predicted current temperature
    private Double maxTemp;         // next 24h max
    private Double minTemp;         // next 24h min
    private Double totalPrecipitation; // next 24h precipitation in mm
    private Integer precipitationProbability; // 0-100%
    private Double maxWindSpeed;    // km/h
    private String synopticCondition; // e.g., "Convective Precipitation", "Clear Ridge"
    private List<Double> hourlyPrecipitationNext6h;
}
