export interface SignTranslationResponse {
  detectedSign: string;
  confidence: number;
  description: string;
  alternativeInterpretations?: string[];
  error?: string;
}

export interface CorrectionResponse {
  correctedSentence: string;
  originalGlosses: string[];
  explanation: string;
  error?: string;
}

export interface TranslationHistoryItem {
  id: string;
  timestamp: string;
  rawGlosses: string[];
  correctedSentence: string;
  explanation?: string;
  hasAudio?: boolean;
}

export interface ASLGlossItem {
  gloss: string;
  label: string;
  category: "greetings" | "pronouns" | "actions" | "objects" | "common" | "alphabet";
  emoji?: string;
  description?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: "Male" | "Female";
  description: string;
}
