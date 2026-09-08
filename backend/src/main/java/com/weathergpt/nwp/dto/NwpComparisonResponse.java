package com.weathergpt.nwp.dto;

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
public class NwpComparisonResponse {
    private LocationInfo location;
    private String generatedAt;
    private List<ModelForecastDto> models;
    private NwpConsensusDto consensus;
    private String synopticAnalysis;
    private List<String> meteorologicalAdvisories;
}
