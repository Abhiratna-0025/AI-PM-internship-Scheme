package com.weathergpt.dto.chat;

import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request body for the natural-language weather query endpoint.
 *
 * Supports:
 * <ul>
 *   <li><b>Text mode</b> — set {@code message} via JSON body.</li>
 *   <li><b>Voice mode</b> — audio recording payload in multipart or base64.</li>
 *   <li><b>Multilingual</b> — optional {@code language} code (hi, ta, te, bn, mr, gu, en, etc.).</li>
 *   <li><b>Contextual continuity</b> — optional {@code sessionId} for multi-turn conversations.</li>
 *   <li><b>Sector context</b> — optional {@code sector} (agriculture, aviation, marine, urban).</li>
 * </ul>
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
     */
    private byte[] audio;

    /**
     * Optional MIME type of the uploaded audio (e.g. "audio/wav", "audio/mpeg").
     */
    private String audioContentType;

    /**
     * Optional user language preference (e.g., "en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa").
     * Defaults to auto-detection from text script or "en".
     */
    private String language;

    /**
     * Optional session ID for multi-turn conversational context memory.
     */
    private String sessionId;

    /**
     * Optional sector focus (e.g., "agriculture", "aviation", "marine", "urban").
     */
    private String sector;
}
