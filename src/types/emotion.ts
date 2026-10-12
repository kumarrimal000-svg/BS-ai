export type DetectedEmotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'frustrated'
  | 'worried'
  | 'confused'
  | 'excited'
  | 'calm'
  | 'tired'
  | 'neutral';

export type SentimentType = 'positive' | 'negative' | 'neutral' | 'mixed';

export type EmotionConfidence = 'high' | 'moderate' | 'tentative';

export type RecommendedTone =
  | 'calm_supportive'
  | 'energetic_vibrant'
  | 'simplified_clear'
  | 'gentle_empathetic'
  | 'natural_playful';

export interface AcousticFeatures {
  averageVolume: number;
  peakVolume: number;
  volumeVariance: number;
  tempoRate: 'slow' | 'normal' | 'fast';
  available: boolean;
}

export interface EmotionAnalysisResult {
  id: string;
  primaryEmotion: DetectedEmotion;
  secondaryEmotion?: DetectedEmotion;
  sentiment: SentimentType;
  sentimentScore: number; // -1.0 (strongly negative) to +1.0 (strongly positive)
  confidence: EmotionConfidence;
  confidenceScore: number; // 0.0 to 1.0
  linguisticSignals: string[];
  acousticSignals: string[];
  adaptationDirective: string;
  recommendedTone: RecommendedTone;
  tentativeDisclaimer?: string;
  safetyRisk: boolean;
  safetyNote?: string;
  turnText: string;
  timestamp: number;
}

export interface EmotionSettings {
  enabled: boolean;
  acousticAnalysisEnabled: boolean;
  adaptiveToneResponse: boolean;
  empathyLevel: 'subtle' | 'balanced' | 'supportive';
  showMoodIndicator: boolean;
}

export interface EmotionHistoryItem {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant';
  text: string;
  primaryEmotion: DetectedEmotion;
  sentiment: SentimentType;
  sentimentScore: number;
  confidence: EmotionConfidence;
  adaptationSummary: string;
}

export interface EmotionStateSnapshot {
  activeEmotion: DetectedEmotion;
  activeSentiment: SentimentType;
  sentimentScore: number;
  confidence: EmotionConfidence;
  confidenceScore: number;
  recommendedTone: RecommendedTone;
  adaptationDirective: string;
  tentativeDisclaimer?: string;
  safetyRisk: boolean;
  safetyNote?: string;
  acousticStatus: 'active' | 'unavailable' | 'silent';
  acousticMetrics?: {
    volumeRms: number;
    peakLevel: number;
    volumeVariance: number;
    speakingTempo: 'slow' | 'normal' | 'fast';
  };
  lastLinguisticSignals: string[];
  history: EmotionHistoryItem[];
  settings: EmotionSettings;
}

export type EmotionListener = (snapshot: EmotionStateSnapshot) => void;
