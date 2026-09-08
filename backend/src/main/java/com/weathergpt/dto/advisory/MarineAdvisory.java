package com.weathergpt.dto.advisory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarineAdvisory {
    private String seaState;                // Calm, Smooth, Slight, Moderate, Rough, Very Rough, High
    private Double waveHeightMeters;        // significant wave height in meters
    private Double swellPeriodSeconds;      // seconds
    private Integer windBeaufortScale;      // 0 to 12
    private Double windSpeedKnots;          // knots
    private boolean fishermenWarningActive; // true if unsafe for small craft / coastal fishermen
    private String fishermenAction;         // e.g., "SAFE: Normal coastal fishing permitted" or "WARNING: Do NOT venture into deep sea"
    private String tidalCurrentNote;        // Tidal guidance
}
