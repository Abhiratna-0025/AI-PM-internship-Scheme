package com.weathergpt.voice;

import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Default no-op text-to-speech service.
 *
 * When no real TTS provider bean is present, this service is used and synthesis
 * always returns empty. Clients can fall back to browser-based {@code speechSynthesis}
 * (Web Speech API) for spoken output, which is often the simplest path for the
 * mobile/rural-accessibility use case in the project brief.
 *
 * To enable server-side TTS, provide a bean implementing
 * {@link TextToSpeechService} with a higher precedence than this one.
 */
@Service
public class NoOpTextToSpeechService implements TextToSpeechService {

    @Override
    public Optional<TtsResult> synthesize(String text, String audioFormat) {
        // No server-side TTS configured — fall back to client-side speech synthesis.
        return Optional.empty();
    }
}
