package com.weathergpt.dto.advisory;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SectorAdvisoryResponse {
    private LocationInfo location;
    private String generatedAt;
    private String requestedSector;         // all, agriculture, aviation, marine, urban
    private AgricultureAdvisory agriculture;
    private AviationBriefing aviation;
    private MarineAdvisory marine;
    private SmartCityAdvisory smartCity;
    private List<String> primaryDirectives;
    private String disclaimer;              // "WeatherGPT Decision-Support Tool: Aligned with MoES/IMD guidelines."
}
