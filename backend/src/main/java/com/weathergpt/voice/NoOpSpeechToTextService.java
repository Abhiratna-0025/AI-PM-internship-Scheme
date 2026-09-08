package com.weathergpt.voice;

import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Default no-op speech-to-text service.
 *
 * When no real STT provider bean is present, this service is used and transcription
 * always returns empty. The chat flow then asks the client to supply the message as
 * text — which is exactly what the Web Speech API path on the frontend does.
 *
 * To enable server-side STT, provide a bean implementing
 * {@link SpeechToTextService} with a higher precedence than this one (e.g. via
 * {@code @Primary} or by removing this conditional bean and wiring a real provider).
 */
@Service
public class NoOpSpeechToTextService implements SpeechToTextService {

    @Override
    public Optional<String> transcribe(byte[] audio, String audioContentType) {
        // No server-side STT configured — fall back to client-side transcription.
        return Optional.empty();
    }
}
