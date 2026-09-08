package com.weathergpt.ingest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StationTelemetryDto {
    private String stationId;          // e.g. "IMD-DELHI-001"
    private String stationName;        // e.g. "Safdarjung Weather Observatory"
    private String timestamp;          // ISO-8601
    private Double latitude;
    private Double longitude;
    private Double temperature;        // °C
    private Integer humidity;          // %
    private Double pressureHpa;        // hPa
    private Double windSpeedKmh;       // km/h
    private Integer windDirectionDeg;  // 0-360
    private Double rainfallMmPerHour;  // mm/hr
    private Double solarRadiationWm2;  // W/m²
}
