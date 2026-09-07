# WeatherGPT Voice Service

Python microservice for speech-to-text (STT) and text-to-speech (TTS) processing.

## Overview

This service provides voice processing capabilities for WeatherGPT. It can be run in two modes:

1. **No-op mode (default)**: Returns empty responses, matching the Java `NoOp*` behavior. Clients fall back to browser-based Web Speech API.

2. **Enabled mode**: Provides actual STT/TTS processing using Whisper (STT) and gTTS/pyttsx3 (TTS).

## Quick Start

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run in no-op mode (default)

```bash
python main.py
```

The service starts on `http://localhost:8001`

### Run with voice enabled

```bash
# Set environment variable
export VOICE_ENABLED=true

# Optionally specify Whisper model size
export WHISPER_MODEL_SIZE=base  # tiny, base, small, medium, large

python main.py
```

### Using Docker

```bash
# Build
docker build -t weathergpt-voice .

# Run in no-op mode
docker run -p 8001:8001 weathergpt-voice

# Run with voice enabled
docker run -p 8001:8001 -e VOICE_ENABLED=true weathergpt-voice
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service status and availability.

```json
{
  "status": "healthy",
  "voice_enabled": false,
  "stt_available": false,
  "tts_available": false
}
```

### Speech-to-Text

```
POST /stt/transcribe
Content-Type: multipart/form-data

- audio: Audio file (WAV, MP3, FLAC, Opus)
- content_type: MIME type (default: audio/wav)
```

**Response (success):**
```json
{
  "success": true,
  "text": "What is the weather in Delhi?"
}
```

**Response (no-op mode / disabled):**
```json
{
  "success": false,
  "error": "Server-side STT is not configured. Please provide text directly or enable voice service."
}
```

### Text-to-Speech (JSON response with base64)

```
POST /tts/synthesize?text=Hello&audio_format=audio/wav
```

**Response:**
```json
{
  "success": true,
  "audio_base64": "<base64-encoded-audio>",
  "mime_type": "audio/wav"
}
```

### Text-to-Speech (direct audio download)

```
GET /tts/speak?text=Hello&audio_format=audio/wav
```

Returns raw audio bytes with appropriate Content-Type header.

## Integration with Java Backend

The Java Spring Boot backend can call this service when voice processing is needed.

### Calling STT from Java

```java
// In WeatherQueryService or a dedicated VoiceServiceClient
public Optional<String> transcribeAudio(byte[] audio, String contentType) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.MULTIPART_FORM_DATA);
    
    MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
    body.add("audio", new InputStreamResource(new ByteArrayInputStream(audio)));
    body.add("content_type", contentType);
    
    ResponseEntity<SttResponse> response = restTemplate.postForEntity(
        "http://voice-service:8001/stt/transcribe",
        new HttpEntity<>(body, headers),
        SttResponse.class
    );
    
    if (response.getBody() != null && response.getBody().isSuccess()) {
        return Optional.of(response.getBody().getText());
    }
    return Optional.empty();
}
```

### Calling TTS from Java

```java
public Optional<TtsResult> synthesizeSpeech(String text, String audioFormat) {
    String url = "http://voice-service:8001/tts/speak?text={text}&audio_format={format}";
    
    ResponseEntity<byte[]> response = restTemplate.getForEntity(
        url,
        byte[].class,
        text,
        audioFormat != null ? audioFormat : "audio/wav"
    );
    
    if (response.getStatusCode().is2xxSuccessful()) {
        String mimeType = response.getHeaders().getContentType().toString();
        return Optional.of(new TtsResult(response.getBody(), mimeType));
    }
    return Optional.empty();
}
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  React Frontend │────▶│ Java Spring Boot │
│  (Web Speech)   │     │   Backend        │
└─────────────────┘     └────────┬─────────┘
                                 │ (optional)
                                 ▼
                        ┌──────────────────┐
                        │ Python Voice     │
                        │ Service          │
                        │ (FastAPI)        │
                        └────────┬─────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐           ┌──────▼──────┐
              │  Whisper  │           │ gTTS /      │
              │  (STT)    │           │ pyttsx3     │
              │           │           │ (TTS)       │
              └───────────┘           └─────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VOICE_ENABLED` | `false` | Enable/disable voice services |
| `WHISPER_MODEL_SIZE` | `base` | Whisper model size (tiny, base, small, medium, large) |
| `DEFAULT_TTS_FORMAT` | `audio/wav` | Default TTS output format |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8001` | Server port |

## Dependencies

- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Whisper**: OpenAI's speech recognition (local, offline)
- **gTTS**: Google Text-to-Speech (requires internet)
- **pyttsx3**: Offline TTS using system voices

## Notes

- Whisper models are downloaded on first use (~140MB for "base" model)
- For production, consider using a cloud STT/TTS provider for better quality
- The service is designed to be stateless and horizontally scalable
