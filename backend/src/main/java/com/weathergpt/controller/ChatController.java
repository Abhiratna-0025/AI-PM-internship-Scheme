package com.weathergpt.controller;

import com.weathergpt.dto.ApiResponse;
import com.weathergpt.dto.chat.ChatQueryRequest;
import com.weathergpt.dto.chat.ChatResponse;
import com.weathergpt.service.WeatherQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Natural-language weather query endpoint (public read access — weather data is
 * public information; authentication remains required for account features).
 *
 * <p>For voice-enabled queries, use {@link VoiceController} which accepts both
 * JSON text and {@code multipart/form-data} audio uploads, and exposes a TTS
 * endpoint at {@code /api/chat/speak}.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final WeatherQueryService weatherQueryService;

    /**
     * Process a text-only weather query.
     *
     * @deprecated Prefer {@link VoiceController#queryVoice(String, org.springframework.web.multipart.MultipartFile, ChatQueryRequest)}
     *             for the unified text-or-voice path. Kept for backward compatibility
     *             with clients that send JSON only.
     */
    @Deprecated
    @PostMapping("/query")
    public ResponseEntity<ApiResponse<ChatResponse>> query(@Valid @RequestBody ChatQueryRequest request) {
        ChatResponse response = weatherQueryService.processQuery(request);
        return ResponseEntity.ok(ApiResponse.success("Query processed", response));
    }
}
