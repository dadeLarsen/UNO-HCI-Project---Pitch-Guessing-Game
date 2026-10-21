import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A small, hand-written typing layer over the (non-standard) Web Speech API.
 * TypeScript's lib.dom does not ship types for SpeechRecognition, so we define
 * only the members we actually use instead of pulling in an extra @types package.
 */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Errors that mean "stop trying", as opposed to ones we can recover from. */
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed']);

export interface SpeechRecognitionState {
  /** True when the browser supports the Web Speech API (Chrome does; Firefox does not). */
  isSupported: boolean;
  /** True while we are actively listening (including automatic restarts). */
  isListening: boolean;
  /** The partial, in-progress transcript — good for live "subtitles". */
  interimTranscript: string;
  /** Everything the recognizer has finalized so far. */
  finalTranscript: string;
  /** The last error name, e.g. "not-allowed" or "no-speech". */
  error: string | null;
}

export interface SpeechRecognitionApi extends SpeechRecognitionState {
  start(): void;
  stop(): void;
  clear(): void;
}

/**
 * Wraps window.SpeechRecognition (aka webkitSpeechRecognition) in React-friendly state.
 *
 * Chrome stops the recognizer after a few seconds of silence even when
 * `continuous` is true, so we listen for the `end` event and transparently
 * restart as long as the user hasn't pressed Stop.
 */
export function useSpeechRecognition(lang = 'en-US'): SpeechRecognitionApi {
  const getConstructor = useCallback((): SpeechRecognitionCtor | null => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  const [isSupported] = useState<boolean>(() => getConstructor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs so the event handlers (created once per recognition instance) always
  // see the latest values without needing to re-create the recognizer.
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;

  const createRecognition = useCallback((): SpeechRecognitionLike | null => {
    const Ctor = getConstructor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }
      if (finalText) {
        // Append with a space so consecutive utterances don't run together.
        setFinalTranscript(prev => (prev ? `${prev} ${finalText}` : finalText));
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (FATAL_ERRORS.has(event.error)) {
        shouldListenRef.current = false;
        setIsListening(false);
      }
      // "no-speech" and "aborted" are normal during quiet gaps — don't scare the user.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      // Chrome ended the session (silence timeout, stream limit, etc.).
      // If the user still wants to listen, start a fresh session.
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldListenRef.current = false;
        }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    return recognition;
  }, [getConstructor]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('unsupported');
      return;
    }
    shouldListenRef.current = true;
    setError(null);
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      // start() throws InvalidStateError if a session is already running —
      // that's fine, we're already listening.
      setIsListening(true);
    }
  }, [createRecognition, isSupported]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const clear = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Never leave a recognizer running if the component unmounts.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, interimTranscript, finalTranscript, error, start, stop, clear };
}
