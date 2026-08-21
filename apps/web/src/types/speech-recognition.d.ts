/**
 * Minimal Web Speech API typings.
 *
 * TypeScript ships no lib definitions for SpeechRecognition, and two hooks were
 * each declaring their own conflicting `Window` augmentation, which broke the
 * production type check. This is the single shared declaration.
 */

interface FvSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface FvSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  0: FvSpeechRecognitionAlternative;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<FvSpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

interface Window {
  SpeechRecognition?: { new (): SpeechRecognition };
  webkitSpeechRecognition?: { new (): SpeechRecognition };
}
