package com.weathergpt.controller;

import com.weathergpt.dto.ApiResponse;
import com.weathergpt.dto.advisory.SectorAdvisoryResponse;
import com.weathergpt.service.SectorAdvisoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public endpoints for Sector-Specific Decision Support Advisories
 * (Agriculture, Aviation, Marine/Fisheries, Smart City).
 */
@RestController
@RequestMapping("/api/weather/advisories")
@RequiredArgsConstructor
public class SectorAdvisoryController {

    private final SectorAdvisoryService sectorAdvisoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<SectorAdvisoryResponse>> getAdvisories(
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "all") String sector,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {

        if ((location == null || location.isBlank()) && (latitude == null || longitude == null)) {
            throw new IllegalArgumentException("Either 'location' or ('latitude' and 'longitude') must be provided");
        }

        SectorAdvisoryResponse response = sectorAdvisoryService.generateAdvisories(location, sector, latitude, longitude);
        return ResponseEntity.ok(ApiResponse.success("Sector advisories retrieved", response));
    }
}
