export type FeedbackRating = 'helpful' | 'unhelpful';

export type FeedbackCategory =
  | 'accuracy'
  | 'tone'
  | 'language'
  | 'verbosity'
  | 'tool_use'
  | 'clarification'
  | 'other';

export type VerificationStatus =
  | 'user_correction'
  | 'user_preference'
  | 'unverified_feedback'
  | 'verified_fact';

export type PreferredLanguage = 'auto' | 'english' | 'hindi' | 'hinglish';

export type ResponseDetailLevel = 'concise' | 'balanced' | 'detailed';

export type CommunicationStyle =
  | 'flirty_sassy'
  | 'clever_witty'
  | 'professional_smart'
  | 'direct_concise';

export interface UserFeedback {
  id: string;
  turnId?: string;
  promptText: string;
  responseText: string;
  rating: FeedbackRating;
  category: FeedbackCategory;
  comment?: string;
  correctionText?: string;
  timestamp: number;
  status: VerificationStatus;
}

export interface LearnedPreference {
  id: string;
  key: string;
  label: string;
  category: 'language' | 'verbosity' | 'tone' | 'topic_interest' | 'custom_rule';
  value: string;
  confidence: number; // 0.0 to 1.0
  source: 'explicit_setting' | 'inferred_feedback' | 'conversation_pattern';
  scope: 'session' | 'persistent';
  userApproved: boolean;
  timestamp: number;
}

export interface MistakeCorrection {
  id: string;
  originalQuery: string;
  faultyResponseSnippet: string;
  correctiveGuidance: string;
  detectedIssue: string;
  timesPrevented: number;
  timestamp: number;
  status: 'prompt_guard_active' | 'pending_verification';
}

export interface AdaptiveMetrics {
  totalRatings: number;
  helpfulCount: number;
  unhelpfulCount: number;
  correctionsCount: number;
  adaptationsAppliedCount: number;
}

export interface InfrastructureCapabilityStatus {
  promptContextInjection: {
    status: 'active';
    description: 'Dynamic real-time prompt steering for Gemini 3.8 Live & Text models.';
  };
  voiceAdaptation: {
    status: 'active';
    description: 'Real-time spoken cadence, verbosity, and Hindi/English/Hinglish speech modulation.';
  };
  mistakeGuardrails: {
    status: 'active';
    description: 'Active prompt-level avoidance and corrective guidance checks.';
  };
  localStorageMemory: {
    status: 'active';
    description: 'Encrypted browser local storage with granular user review and deletion controls.';
  };
  modelWeightFineTuning: {
    status: 'requires_additional_infrastructure';
    description: 'Direct model weight gradient updates require offline TPU/GPU fine-tuning clusters and dataset compilation.';
  };
}

export interface AdaptiveProfile {
  enabled: boolean; // User consent toggle for memory & adaptation
  languagePreference: PreferredLanguage;
  detailLevel: ResponseDetailLevel;
  communicationStyle: CommunicationStyle;
  learnedPreferences: LearnedPreference[];
  mistakeCorrections: MistakeCorrection[];
  feedbackHistory: UserFeedback[];
  metrics: AdaptiveMetrics;
  infrastructureStatus: InfrastructureCapabilityStatus;
}
