package com.weathergpt.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request body for the natural-language weather query endpoint.
 *
 * Supports two input modes:
 * <ul>
 *   <li><b>Text mode</b> — set {@code message} via JSON body (existing behavior).</li>
 *   <li><b>Voice mode</b> — record audio on the client and upload it as a file.
 *       When {@code message} is absent but {@code audio} is present, the backend
 *       performs server-side speech-to-text before query interpretation.</li>
 * </ul>
 *
 * For browser-based voice input that does not require server-side STT, clients
 * can transcribe locally with the Web Speech API and send the result as {@code message}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatQueryRequest {

    @Size(max = 500, message = "Message must not exceed 500 characters")
    private String message;

    /**
    * Optional audio payload for voice queries.
    * When present and {@code message} is blank, the backend transcribes the audio
    * before interpreting the weather query.
    *
    * Expected format: audio/x-wav or audio/mpeg (client-dependent).
    * Maximum upload size is governed by the server's multipart configuration.
    */
    private byte[] audio;

    /**
    * Optional MIME type of the uploaded audio (e.g. "audio/wav", "audio/mpeg").
    * Used to select the appropriate transcription path when server-side STT is active.
    */
    private String audioContentType;
}
