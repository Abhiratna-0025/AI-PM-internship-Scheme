import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  interim?: boolean;
  lang?: string;
}

interface UseVoiceInputReturn {
  status: VoiceStatus;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastTranscript: string;
  error: string | null;
}

/**
 * Hook for browser-based speech-to-text using the Web Speech API.
 *
 * Usage:
 *  - Call startListening() to begin capturing speech.
 *  - Call stopListening() to stop.
 *  - The onTranscript callback fires with the final transcript.
 *  - Works best in Chromium-based browsers; Safari and Firefox have partial support.
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onTranscript,
    onError,
    continuous = true,
    interim = true,
    lang = 'en-IN',
  } = options;

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const interimRef = useRef(interim);
  const continuousRef = useRef(continuous);
  const langRef = useRef(lang);
  const accumulatedFinalRef = useRef('');
  const isSpeakingRef = useRef(false);

  // Keep callback refs up to date without re-initializing the recognizer.
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    interimRef.current = interim;
    continuousRef.current = continuous;
    langRef.current = lang;
    if (recognitionRef.current && recognitionRef.current.lang !== lang) {
      recognitionRef.current.lang = lang;
    }
  }, [onTranscript, onError, interim, continuous, lang]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuousRef.current;
    recognition.interimResults = interimRef.current;
    recognition.lang = langRef.current || 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulatedFinalRef.current += result[0].transcript;
          isSpeakingRef.current = true;
        } else if (interimRef.current) {
          interimText += result[0].transcript;
        }
      }
      if (accumulatedFinalRef.current) {
        setLastTranscript(accumulatedFinalRef.current);
      }
      if (interimText && interimRef.current) {
        // Could expose interim text via a separate state if desired.
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore 'no-speech' and 'aborted' when we deliberately stop.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      const msg = `Speech recognition error: ${event.error}`;
      setError(msg);
      setStatus('error');
      onErrorRef.current?.(msg);
    };

    recognition.onend = () => {
      // If we are still supposed to be listening and didn't hit an error,
      // treat this as a natural end of an utterance.
      if (status === 'listening') {
        setStatus('idle');
        if (accumulatedFinalRef.current) {
          onTranscriptRef.current?.(accumulatedFinalRef.current);
          setLastTranscript('');
          accumulatedFinalRef.current = '';
        }
      }
      isSpeakingRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      setError('Speech recognition not available.');
      setStatus('error');
      return;
    }
    setError(null);
    setStatus('listening');
    accumulatedFinalRef.current = '';
    isSpeakingRef.current = false;
    try {
      rec.start();
    } catch {
      // May throw if already started; treat as no-op.
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
    setStatus('idle');
  }, []);

  return {
    status,
    isSupported: (window as any).SpeechRecognition != null
      || (window as any).webkitSpeechRecognition != null,
    startListening,
    stopListening,
    lastTranscript,
    error,
  };
}
