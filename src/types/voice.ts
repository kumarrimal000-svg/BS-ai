export type GeminiVoiceId = 'Aoede' | 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

export type VoiceLanguage = 'auto' | 'hinglish' | 'hindi' | 'english';

export type SpeakingTone =
  | 'natural_playful'
  | 'calm_supportive'
  | 'energetic_vibrant'
  | 'professional_articulate';

export type PersonalityMode =
  | 'balanced'
  | 'caring'
  | 'friendly'
  | 'playful'
  | 'calm'
  | 'intelligent'
  | 'energetic';

export type AffectionLevel = 'low' | 'natural' | 'warm' | 'high';

export type HumorLevel = 'low' | 'medium' | 'high';

export type PlayfulnessLevel = 'low' | 'medium' | 'high';

export type ResponseStyle = 'short' | 'balanced' | 'detailed';

export type ResponseSpeed = 'instant' | 'natural' | 'relaxed';

export type BehaviorPresetId =
  | 'ultimate_natural'
  | 'caring'
  | 'friendly'
  | 'playful'
  | 'calm'
  | 'smart'
  | 'energetic'
  | 'balanced';

export interface CustomPersonalityTraits {
  warmth: number; // 0 to 100
  care: number; // 0 to 100
  humor: number; // 0 to 100
  playfulness: number; // 0 to 100
  energy: number; // 0 to 100
  formality: number; // 0 to 100
  affection: number; // 0 to 100
  responseLength: number; // 0 to 100
  voiceExpressiveness: number; // 0 to 100
}

export interface VoiceOptionInfo {
  id: GeminiVoiceId;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  vibe: string;
  description: string;
  recommendedTone: SpeakingTone;
  previewPrompt: string;
}

export interface VoiceSettings {
  voice: GeminiVoiceId;
  speed: number; // 0.8 to 1.3, default 1.0
  pitch: number; // 0.8 to 1.3, default 1.0
  volume: number; // 0 to 100, default 100
  expressiveness: number; // 0 to 100, default 85
  emotionLevel: number; // 0 to 100, default 80
  pauseLevel: number; // 0 to 100, default 50
  responseSpeed: ResponseSpeed;
  language: VoiceLanguage;
  speakingTone: SpeakingTone;
  voiceResponseEnabled: boolean; // true = audio playback, false = text/subtitle only

  // Master Personality & Companion Mode
  personalityMode: PersonalityMode;
  affectionLevel: AffectionLevel;
  humorLevel: HumorLevel;
  playfulnessLevel: PlayfulnessLevel;
  responseStyle: ResponseStyle;

  // Master Conversation Controls
  autoFollowUp: boolean;
  naturalExpressions: boolean; // “हम्म…”, “अच्छा जी…”, “अरे वाह!”
  contextAwareness: boolean;
  autoLanguage: boolean;

  // Proactive Conversation System (तमन्ना खुद से बात करे)
  proactiveConversation: boolean; // Tamanna initiates conversation when user is silent or upon greeting
  proactiveSilenceSeconds: number; // Duration of user silence before Tamanna initiates (15, 20, 30s)
  proactiveGreetings: boolean; // Time-of-day contextual greetings
  proactiveTopicFollowUp: boolean; // Follow-up on previous projects or discussions
  proactiveMoodCheck: boolean; // Mood and well-being inquiry

  // Custom Fine-Tuning
  customPersonality: CustomPersonalityTraits;
  activePreset: BehaviorPresetId;

  // Hardware Audio Processing
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  highpassFilter: boolean; // cuts low-frequency hum < 80Hz
  autoInterruptOnSpeech: boolean; // interrupts assistant when user speaks
  micSensitivity: number; // 1 to 100, default 65
}

export interface MicTestResult {
  status: 'idle' | 'recording' | 'analyzing' | 'playing' | 'completed' | 'error';
  peakDb: number;
  avgDb: number;
  hasAudioInput: boolean;
  backgroundNoiseLevel: 'low' | 'moderate' | 'high';
  recordingDurationMs: number;
  message?: string;
}

