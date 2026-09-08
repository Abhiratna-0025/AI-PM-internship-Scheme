package com.weathergpt.controller;

import com.weathergpt.dto.ApiResponse;
import com.weathergpt.ingest.Wis2IngestionService;
import com.weathergpt.ingest.dto.StationTelemetryDto;
import com.weathergpt.ingest.dto.Wis2NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * Endpoints for real-time meteorological data ingestion (WMO WIS 2.0 and Automatic Weather Stations).
 */
@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
public class IngestController {

    private final Wis2IngestionService ingestionService;

    @PostMapping("/wis2")
    public ResponseEntity<ApiResponse<String>> ingestWis2(@RequestBody Wis2NotificationDto notification) {
        boolean success = ingestionService.ingestWis2Notification(notification);
        if (!success) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid WMO WIS 2.0 notification payload"));
        }
        return ResponseEntity.ok(ApiResponse.success("WMO WIS 2.0 notification ingested successfully", notification.getId()));
    }

    @PostMapping("/telemetry")
    public ResponseEntity<ApiResponse<String>> ingestTelemetry(@RequestBody StationTelemetryDto telemetry) {
        boolean success = ingestionService.ingestStationTelemetry(telemetry);
        if (!success) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Station ID is required"));
        }
        return ResponseEntity.ok(ApiResponse.success("Station telemetry ingested successfully", telemetry.getStationId()));
    }

    @GetMapping("/stations")
    public ResponseEntity<ApiResponse<List<StationTelemetryDto>>> getAllStations() {
        return ResponseEntity.ok(ApiResponse.success("Active weather telemetry stations retrieved", ingestionService.getAllStations()));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTelemetry() {
        return ingestionService.registerTelemetryEmitter();
    }
}
