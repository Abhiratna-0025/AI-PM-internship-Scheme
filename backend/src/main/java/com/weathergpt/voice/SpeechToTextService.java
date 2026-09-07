package com.weathergpt.voice;

/**
 * Converts uploaded audio into text for downstream weather query interpretation.
 *
 * Implementations may delegate to an offline engine (e.g. Whisper local), a cloud
 * STT provider, or return {@code Optional.empty()} when server-side STT is disabled.
 *
 * When no implementation capable of transcribing is available, the chat flow falls
 * back to asking the client to provide the transcription as plain text.
 */
public interface SpeechToTextService {

    /**
     * Transcribe the given audio payload.
     *
     * @param audio            raw audio bytes
     * @param audioContentType MIME type of the audio (e.g. "audio/wav", "audio/mpeg")
     * @return the transcribed text, or an empty optional when transcription is not
     *         available for the given payload / provider configuration
     */
    java.util.Optional<String> transcribe(byte[] audio, String audioContentType);
}
