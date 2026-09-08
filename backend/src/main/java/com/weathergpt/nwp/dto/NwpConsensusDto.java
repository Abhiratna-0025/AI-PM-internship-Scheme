package com.weathergpt.nwp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NwpConsensusDto {
    private int consensusScorePercentage; // e.g., 94
    private String confidenceLevel;       // HIGH, MODERATE, LOW
    private Double ensembleMeanTemp;      // °C
    private Double ensembleMeanPrecip;    // mm
    private Double tempSpread;            // max - min across models
    private Double precipSpread;          // max - min precip across models
    private String synopticSummary;       // Plain language synoptic forecast summary
    private String divergenceNote;        // Where models agree or diverge
}
