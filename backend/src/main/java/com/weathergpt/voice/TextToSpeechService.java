package com.weathergpt.voice;

/**
 * Converts text into spoken audio for voice-enabled responses.
 *
 * Implementations may delegate to an offline TTS engine (e.g. eSpeak, pico2wave),
 * a cloud TTS provider, or return an empty optional when server-side TTS is disabled.
 *
 * When no implementation is available, clients can fall back to browser-based
 * {@code speechSynthesis} for spoken output.
 */
public interface TextToSpeechService {

    /**
     * Synthesize spoken audio from the given text.
     *
     * @param text         text to speak
     * @param audioFormat requested audio format (e.g. "audio/wav", "audio/mpeg",
     *                    or {@code null} for the implementation's default)
     * @return the synthesized audio bytes with the corresponding MIME type, or an
     *         empty optional when TTS is not available
     */
    java.util.Optional<TtsResult> synthesize(String text, String audioFormat);

    /** Result of a TTS synthesis call. */
    record TtsResult(byte[] audio, String mimeType) {}
}
