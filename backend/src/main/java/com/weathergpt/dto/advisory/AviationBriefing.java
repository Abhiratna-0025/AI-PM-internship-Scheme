package com.weathergpt.dto.advisory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AviationBriefing {
    private String metarCode;               // e.g., "VIDP 071200Z 28012KT 6000 SCT030 32/24 Q1008 NOSIG"
    private String tafCode;                 // e.g., "TAF VIDP 071200Z 0712/0818 28010KT 5000 HZ ..."
    private String flightCategory;          // VFR (Visual), MVFR (Marginal), IFR (Instrument), LIFR (Low IFR)
    private Double visibilityKm;            // km
    private String cloudCeiling;            // e.g., "3000 ft AGL" or "UNLIMITED"
    private Double crosswindKnots;          // estimated crosswind
    private String turbulenceRisk;          // LOW / MODERATE / SEVERE
    private String convectiveStormAlert;    // CB / Thunderstorm alert
}
