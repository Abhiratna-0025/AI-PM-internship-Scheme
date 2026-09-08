package com.weathergpt.dto.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.weathergpt.climate.dto.ClimateTrendResponse;
import com.weathergpt.dto.advisory.SectorAdvisoryResponse;
import com.weathergpt.dto.alert.AlertResponse;
import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.dto.weather.LocationInfo;
import com.weathergpt.nwp.dto.NwpConsensusDto;
import com.weathergpt.weather.query.TimeReference;
import com.weathergpt.weather.query.WeatherIntent;
import lombok.*;

import java.util.List;

/**
 * Structured response for a natural-language weather query.
 * Includes the conversational answer plus structured data so mobile clients
 * can render weather cards, sector advisories, NWP comparisons, or alert banners.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatResponse {

    /** Conversational, data-grounded answer. */
    private String answer;

    /** Recognized intent, or UNSUPPORTED for non-weather queries. */
    private WeatherIntent intent;

    /** Interpreted time reference. */
    private TimeReference timeReference;

    /** Resolved location (null when the query needs clarification). */
    private LocationInfo location;

    /** Present when the answer is based on real-time conditions. */
    private CurrentWeatherResponse currentWeather;

    /** Present when the answer is based on forecast data. */
    private ForecastResponse forecast;

    /** Simple data-driven weather advisories (not official warnings). */
    private List<String> advisories;

    /** Optional voice-friendly plain-text rendering of the answer. */
    private String voiceAnswer;

    /** Language code of the answer (e.g., "en", "hi", "ta", etc.). */
    private String language;

    /** Present when the query involves sector-specific decision support. */
    private SectorAdvisoryResponse sectorAdvisory;

    /** Present when the query involves numerical weather prediction (NWP) model consensus. */
    private NwpConsensusDto nwpConsensus;

    /** Present when the query involves historical climate analysis. */
    private ClimateTrendResponse climateTrend;

    /** Present when extreme weather warnings or advisories exist. */
    private AlertResponse earlyWarnings;
}
