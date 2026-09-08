package com.weathergpt.ingest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Standard WMO WIS 2.0 Notification Message schema.
 * Topic hierarchy: origin/a/wis2/{centre-id}/data/core/weather/...
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Wis2NotificationDto {
    private String id;
    private String type;            // Feature
    private String version;         // v04
    private String pubtime;         // ISO-8601
    private String topic;           // origin/a/wis2/...
    private Map<String, Object> properties;
    private Map<String, Object> geometry;   // GeoJSON point or polygon
    private Object links;           // Canonical download links for BUFR4 / GRIB2 / GeoJSON
}
