package com.weathergpt.ingest;

import com.weathergpt.ingest.dto.StationTelemetryDto;
import com.weathergpt.ingest.dto.Wis2NotificationDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class Wis2IngestionService {

    private final Map<String, StationTelemetryDto> stationCache = new ConcurrentHashMap<>();
    private final List<SseEmitter> telemetryEmitters = new CopyOnWriteArrayList<>();

    public Wis2IngestionService() {
        // Seed with standard MoES/IMD reference observatories
        seedDefaultStations();
    }

    public boolean ingestWis2Notification(Wis2NotificationDto notification) {
        if (notification == null || notification.getTopic() == null) {
            return false;
        }
        log.info("Ingesting WMO WIS 2.0 message id={} on topic={}", notification.getId(), notification.getTopic());
        broadcastEvent("WIS2_MESSAGE", notification);
        return true;
    }

    public boolean ingestStationTelemetry(StationTelemetryDto telemetry) {
        if (telemetry == null || telemetry.getStationId() == null) {
            return false;
        }
        if (telemetry.getTimestamp() == null) {
            telemetry.setTimestamp(Instant.now().toString());
        }
        stationCache.put(telemetry.getStationId(), telemetry);
        log.info("Ingested AWS IoT telemetry from station {} ({}): Temp={}°C, Rain={}mm/hr",
                telemetry.getStationId(), telemetry.getStationName(), telemetry.getTemperature(), telemetry.getRainfallMmPerHour());
        broadcastEvent("STATION_TELEMETRY", telemetry);
        return true;
    }

    public List<StationTelemetryDto> getAllStations() {
        return new ArrayList<>(stationCache.values());
    }

    public Optional<StationTelemetryDto> getStation(String stationId) {
        return Optional.ofNullable(stationCache.get(stationId));
    }

    public SseEmitter registerTelemetryEmitter() {
        SseEmitter emitter = new SseEmitter(180_000L);
        telemetryEmitters.add(emitter);

        emitter.onCompletion(() -> telemetryEmitters.remove(emitter));
        emitter.onTimeout(() -> telemetryEmitters.remove(emitter));
        emitter.onError(e -> telemetryEmitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("WeatherGPT Telemetry Stream Active (WMO WIS 2.0 / AWS Ingestion)"));
        } catch (IOException e) {
            telemetryEmitters.remove(emitter);
        }

        return emitter;
    }

    private void broadcastEvent(String eventName, Object data) {
        List<SseEmitter> dead = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : telemetryEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (Exception e) {
                dead.add(emitter);
            }
        }
        telemetryEmitters.removeAll(dead);
    }

    private void seedDefaultStations() {
        stationCache.put("IMD-DEL-01", StationTelemetryDto.builder()
                .stationId("IMD-DEL-01")
                .stationName("Safdarjung Observatory, New Delhi")
                .timestamp(Instant.now().toString())
                .latitude(28.58)
                .longitude(77.21)
                .temperature(31.4)
                .humidity(68)
                .pressureHpa(1008.2)
                .windSpeedKmh(12.5)
                .windDirectionDeg(280)
                .rainfallMmPerHour(0.0)
                .solarRadiationWm2(450.0)
                .build());

        stationCache.put("IMD-MUM-01", StationTelemetryDto.builder()
                .stationId("IMD-MUM-01")
                .stationName("Colaba Coastal Weather Station, Mumbai")
                .timestamp(Instant.now().toString())
                .latitude(18.90)
                .longitude(72.81)
                .temperature(29.8)
                .humidity(82)
                .pressureHpa(1011.0)
                .windSpeedKmh(18.2)
                .windDirectionDeg(240)
                .rainfallMmPerHour(4.2)
                .solarRadiationWm2(320.0)
                .build());
    }
}
