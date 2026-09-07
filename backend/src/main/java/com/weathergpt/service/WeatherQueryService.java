package com.weathergpt.service;

import com.weathergpt.dto.chat.ChatQueryRequest;
import com.weathergpt.dto.chat.ChatResponse;
import com.weathergpt.dto.weather.CurrentWeatherResponse;
import com.weathergpt.dto.weather.ForecastDay;
import com.weathergpt.dto.weather.ForecastResponse;
import com.weathergpt.voice.SpeechToTextService;
import com.weathergpt.weather.model.GeoLocation;
import com.weathergpt.weather.query.ParsedWeatherQuery;
import com.weathergpt.weather.query.TimeReference;
import com.weathergpt.weather.query.WeatherIntent;
import com.weathergpt.weather.query.WeatherQueryInterpreter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates the natural-language weather flow:
 *
 * user message → query interpretation → location resolution (existing
 * geocoding) → real weather data (existing WeatherService) → grounded response.
 *
 * Weather facts always come from the providers via {@link WeatherService} —
 * never from the query understanding layer.
 *
 * Voice input path:
 * <ul>
 *   <li>If the client uploads audio, {@link SpeechToTextService} transcribes it
 *       into text before interpretation.</li>
 *   <li>If the client already transcribed locally (Web Speech API), the text is
 *       sent as {@code message} and no server-side STT is used.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class WeatherQueryService {

    private static final int FORECAST_TOMORROW_DAYS = 2;
    private static final int FORECAST_WEEK_DAYS = 7;
    private static final int FORECAST_TODAY_DAYS = 1;

    private final WeatherQueryInterpreter interpreter;
    private final WeatherService weatherService;
    private final WeatherResponseGenerator responseGenerator;
    private final SpeechToTextService speechToTextService;

    /**
     * Process a text-based query (existing behavior).
     *
     * @deprecated Use {@link #processQuery(ChatQueryRequest)} for the unified text-or-voice path.
     *             Kept for backward compatibility with callers that still pass raw text.
     */
    @Deprecated
    public ChatResponse processQuery(String message) {
        ChatQueryRequest request = ChatQueryRequest.builder()
                .message(message == null ? "" : message)
                .build();
        return processQuery(request);
    }

    /**
     * Process a natural-language weather query that may come from text or from a
     * voice recording.
     *
     * When {@code request.message} is blank but {@code request.audio} is present,
     * the backend attempts server-side speech-to-text transcription first.
     * If transcription is unavailable, the caller is expected to have transcribed
     * locally and should send the result as {@code message} instead.
     */
    public ChatResponse processQuery(ChatQueryRequest request) {
        String message = request.getMessage();

        if (message == null || message.isBlank()) {
            if (request.getAudio() != null && request.getAudio().length > 0) {
                Optional<String> transcription = speechToTextService.transcribe(
                        request.getAudio(), request.getAudioContentType());
                if (transcription.isPresent() && !transcription.get().isBlank()) {
                    message = transcription.get();
                }
            }
            if (message == null || message.isBlank()) {
                return ChatResponse.builder()
                        .answer("I couldn't understand the audio. Please try saying your question again, "
                                + "or type it out — for example: \"What's the weather in Delhi?\"")
                        .intent(WeatherIntent.UNSUPPORTED)
                        .build();
            }
        }

        ParsedWeatherQuery parsed = interpreter.interpret(message);

        if (parsed.getIntent() == WeatherIntent.UNSUPPORTED) {
            return ChatResponse.builder()
                    .answer("I can only answer weather-related questions right now. Try asking something like "
                            + "\"What's the weather in Delhi?\" or \"Will it rain tomorrow in Mumbai?\".")
                    .intent(WeatherIntent.UNSUPPORTED)
                    .timeReference(parsed.getTimeReference())
                    .build();
        }

        if (parsed.getTimeReference() == TimeReference.UNSUPPORTED) {
            return ChatResponse.builder()
                    .answer("I can't provide weather for that time range yet. Historical weather is planned for a "
                            + "future phase. I currently support now, today, tomorrow, this week, and this weekend.")
                    .intent(parsed.getIntent())
                    .timeReference(TimeReference.UNSUPPORTED)
                    .build();
        }

        if (parsed.getLocationQuery() == null || parsed.getLocationQuery().isBlank()) {
            return ChatResponse.builder()
                    .answer("Please specify the location for which you want weather information. For example: "
                            + "\"Will it rain tomorrow in Delhi?\"")
                    .intent(parsed.getIntent())
                    .timeReference(parsed.getTimeReference())
                    .build();
        }

        GeoLocation location = weatherService.resolveLocation(parsed.getLocationQuery());
        return buildDataResponse(parsed, location);
    }

    private ChatResponse buildDataResponse(ParsedWeatherQuery parsed, GeoLocation location) {
        TimeReference time = parsed.getTimeReference();
        WeatherIntent intent = parsed.getIntent();

        switch (time) {
            case TOMORROW, NEXT_DAY -> {
                // NEXT_DAY is defined to behave exactly like TOMORROW.
                ForecastResponse forecast = weatherService.getForecast(location, FORECAST_TOMORROW_DAYS);
                return responseGenerator.forecastDay(parsed, location, forecast, dayAt(forecast, 1), time);
            }
            case THIS_WEEK -> {
                ForecastResponse forecast = weatherService.getForecast(location, FORECAST_WEEK_DAYS);
                return responseGenerator.forecastWeek(parsed, location, forecast);
            }
            case THIS_WEEKEND -> {
                ForecastResponse forecast = weatherService.getForecast(location, FORECAST_WEEK_DAYS);
                return responseGenerator.forecastWeekend(parsed, location, weekendDays(forecast));
            }
            default -> {
                if (intent == WeatherIntent.RAIN_QUERY) {
                    // Umbrella-style queries need today's precipitation probability,
                    // which comes from forecast data, not current conditions.
                    ForecastResponse forecast = weatherService.getForecast(location, FORECAST_TODAY_DAYS);
                    return responseGenerator.forecastDay(parsed, location, forecast, dayAt(forecast, 0), time);
                }
                CurrentWeatherResponse current = weatherService.getCurrentWeather(location);
                return responseGenerator.currentWeather(parsed, location, current);
            }
        }
    }

    private static ForecastDay dayAt(ForecastResponse forecast, int index) {
        if (forecast == null || forecast.getDays() == null || index >= forecast.getDays().size()) {
            return null;
        }
        return forecast.getDays().get(index);
    }

    private static List<ForecastDay> weekendDays(ForecastResponse forecast) {
        if (forecast == null || forecast.getDays() == null) {
            return List.of();
        }
        return forecast.getDays().stream()
                .filter(day -> {
                    try {
                        DayOfWeek dayOfWeek = LocalDate.parse(day.getDate()).getDayOfWeek();
                        return dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .toList();
    }
}
