import { useCallback, useRef, useState } from 'react';

export type SpeechStatus = 'idle' | 'speaking' | 'paused' | 'stopped';

interface UseVoiceOutputReturn {
  status: SpeechStatus;
  speak: (text: string, lang?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSupported: boolean;
}

/**
 * Hook for text-to-speech output using the browser's Web Speech API.
 *
 * Usage:
 *  - Call speak(text) to read a response aloud.
 *  - Use stop/pause/resume for playback control.
 *  - The voice used is the best available match for the requested language.
 */
export function useVoiceOutput(): UseVoiceOutputReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined'
    && typeof (window as any).speechSynthesis !== 'undefined';

  const speak = useCallback((text: string, lang: string = 'en-IN') => {
    if (!isSupported || !text) return;

    // Cancel any in-flight speech first.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');
    utterance.onpause = () => setStatus('paused');
    utterance.onresume = () => setStatus('speaking');

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setStatus('idle');
    utteranceRef.current = null;
  }, []);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  return { status, speak, stop, pause, resume, isSupported };
}
