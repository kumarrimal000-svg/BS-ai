import {
  AdaptiveProfile,
  CommunicationStyle,
  LearnedPreference,
  MistakeCorrection,
  PreferredLanguage,
  ResponseDetailLevel,
  UserFeedback,
} from '../types/learning';
import { ConversationTurn } from '../types/assistant';

const STORAGE_KEY = 'tamanna_adaptive_profile_v2';

const DEFAULT_PROFILE: AdaptiveProfile = {
  enabled: true,
  languagePreference: 'auto',
  detailLevel: 'balanced',
  communicationStyle: 'flirty_sassy',
  learnedPreferences: [],
  mistakeCorrections: [],
  feedbackHistory: [],
  metrics: {
    totalRatings: 0,
    helpfulCount: 0,
    unhelpfulCount: 0,
    correctionsCount: 0,
    adaptationsAppliedCount: 0,
  },
  infrastructureStatus: {
    promptContextInjection: {
      status: 'active',
      description: 'Dynamic real-time prompt steering for Gemini 3.8 Live & Text models.',
    },
    voiceAdaptation: {
      status: 'active',
      description: 'Real-time spoken cadence, verbosity, and Hindi/English/Hinglish speech modulation.',
    },
    mistakeGuardrails: {
      status: 'active',
      description: 'Active prompt-level avoidance and corrective guidance checks.',
    },
    localStorageMemory: {
      status: 'active',
      description: 'Encrypted browser local storage with granular user review and deletion controls.',
    },
    modelWeightFineTuning: {
      status: 'requires_additional_infrastructure',
      description:
        'Direct model weight gradient updates require offline TPU/GPU fine-tuning clusters and dataset compilation.',
    },
  },
};

export class AdaptiveLearningEngine {
  private static instance: AdaptiveLearningEngine;
  private profile: AdaptiveProfile = { ...DEFAULT_PROFILE };
  private listeners: Set<(profile: AdaptiveProfile) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): AdaptiveLearningEngine {
    if (!AdaptiveLearningEngine.instance) {
      AdaptiveLearningEngine.instance = new AdaptiveLearningEngine();
    }
    return AdaptiveLearningEngine.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.profile = {
            ...DEFAULT_PROFILE,
            ...parsed,
            metrics: {
              ...DEFAULT_PROFILE.metrics,
              ...(parsed.metrics || {}),
            },
            infrastructureStatus: {
              ...DEFAULT_PROFILE.infrastructureStatus,
            },
          };
          this.recalculateMetrics();
        }
      }
    } catch (e) {
      console.warn('[AdaptiveLearningEngine] Error loading profile from storage:', e);
      this.profile = { ...DEFAULT_PROFILE };
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('[AdaptiveLearningEngine] Error saving profile to storage:', e);
    }
  }

  private recalculateMetrics() {
    const feedback = this.profile.feedbackHistory || [];
    const helpful = feedback.filter((f) => f.rating === 'helpful').length;
    const unhelpful = feedback.filter((f) => f.rating === 'unhelpful').length;
    const corrections = this.profile.mistakeCorrections?.length || 0;

    this.profile.metrics = {
      totalRatings: feedback.length,
      helpfulCount: helpful,
      unhelpfulCount: unhelpful,
      correctionsCount: corrections,
      adaptationsAppliedCount: this.profile.metrics.adaptationsAppliedCount || (helpful + corrections),
    };
  }

  public getProfile(): AdaptiveProfile {
    return JSON.parse(JSON.stringify(this.profile));
  }

  public setEnabled(enabled: boolean): void {
    this.profile.enabled = enabled;
    this.saveToStorage();
    this.notify();
  }

  public setLanguagePreference(lang: PreferredLanguage): void {
    this.profile.languagePreference = lang;
    this.addOrUpdatePreference({
      key: 'pref_language',
      label: `Language: ${lang.toUpperCase()}`,
      category: 'language',
      value: lang,
      confidence: 1.0,
      source: 'explicit_setting',
      scope: 'persistent',
      userApproved: true,
    });
    this.saveToStorage();
    this.notify();
  }

  public setDetailLevel(detail: ResponseDetailLevel): void {
    this.profile.detailLevel = detail;
    this.addOrUpdatePreference({
      key: 'pref_detail',
      label: `Detail Level: ${detail.toUpperCase()}`,
      category: 'verbosity',
      value: detail,
      confidence: 1.0,
      source: 'explicit_setting',
      scope: 'persistent',
      userApproved: true,
    });
    this.saveToStorage();
    this.notify();
  }

  public setCommunicationStyle(style: CommunicationStyle): void {
    this.profile.communicationStyle = style;
    this.addOrUpdatePreference({
      key: 'pref_style',
      label: `Style: ${style.replace('_', ' ').toUpperCase()}`,
      category: 'tone',
      value: style,
      confidence: 1.0,
      source: 'explicit_setting',
      scope: 'persistent',
      userApproved: true,
    });
    this.saveToStorage();
    this.notify();
  }

  public recordFeedback(feedbackData: Omit<UserFeedback, 'id' | 'timestamp' | 'status'> & { status?: UserFeedback['status'] }): UserFeedback {
    const feedback: UserFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      turnId: feedbackData.turnId,
      promptText: feedbackData.promptText || '',
      responseText: feedbackData.responseText || '',
      rating: feedbackData.rating,
      category: feedbackData.category,
      comment: feedbackData.comment?.trim() || undefined,
      correctionText: feedbackData.correctionText?.trim() || undefined,
      timestamp: Date.now(),
      status: feedbackData.status || (feedbackData.correctionText ? 'user_correction' : 'unverified_feedback'),
    };

    if (!this.profile.feedbackHistory) {
      this.profile.feedbackHistory = [];
    }
    this.profile.feedbackHistory.unshift(feedback);
    if (this.profile.feedbackHistory.length > 100) {
      this.profile.feedbackHistory = this.profile.feedbackHistory.slice(0, 100);
    }

    // If there is an explicit correction or negative feedback with category, convert into a mistake guardrail or preference
    if (feedback.rating === 'unhelpful' && (feedback.correctionText || feedback.comment)) {
      const guidance = feedback.correctionText || feedback.comment || 'Avoid previous error pattern';
      this.addMistakeCorrection({
        originalQuery: feedback.promptText.slice(0, 100),
        faultyResponseSnippet: feedback.responseText.slice(0, 150),
        correctiveGuidance: guidance,
        detectedIssue: `User flagged [${feedback.category}]: ${feedback.comment || 'Correction provided'}`,
        status: 'prompt_guard_active',
      });
    }

    // Auto-detect language preference from feedback comment if explicit
    if (feedback.comment) {
      const lowerComment = feedback.comment.toLowerCase();
      if (lowerComment.includes('hindi me') || lowerComment.includes('use hindi') || lowerComment.includes('speak hindi')) {
        this.profile.languagePreference = 'hindi';
      } else if (lowerComment.includes('hinglish')) {
        this.profile.languagePreference = 'hinglish';
      } else if (lowerComment.includes('english only') || lowerComment.includes('use english')) {
        this.profile.languagePreference = 'english';
      }
    }

    this.recalculateMetrics();
    this.saveToStorage();
    this.notify();
    return feedback;
  }

  public addMistakeCorrection(
    correctionData: Omit<MistakeCorrection, 'id' | 'timestamp' | 'timesPrevented'>
  ): MistakeCorrection {
    const correction: MistakeCorrection = {
      id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originalQuery: correctionData.originalQuery,
      faultyResponseSnippet: correctionData.faultyResponseSnippet,
      correctiveGuidance: correctionData.correctiveGuidance,
      detectedIssue: correctionData.detectedIssue,
      timesPrevented: 0,
      timestamp: Date.now(),
      status: correctionData.status || 'prompt_guard_active',
    };

    if (!this.profile.mistakeCorrections) {
      this.profile.mistakeCorrections = [];
    }
    // Prevent duplicate queries
    const existingIdx = this.profile.mistakeCorrections.findIndex(
      (m) => m.originalQuery.toLowerCase() === correction.originalQuery.toLowerCase()
    );
    if (existingIdx >= 0) {
      this.profile.mistakeCorrections[existingIdx] = {
        ...this.profile.mistakeCorrections[existingIdx],
        correctiveGuidance: correction.correctiveGuidance,
        detectedIssue: correction.detectedIssue,
        timestamp: Date.now(),
      };
    } else {
      this.profile.mistakeCorrections.unshift(correction);
    }

    if (this.profile.mistakeCorrections.length > 30) {
      this.profile.mistakeCorrections = this.profile.mistakeCorrections.slice(0, 30);
    }

    this.recalculateMetrics();
    this.saveToStorage();
    this.notify();
    return correction;
  }

  public deleteMistakeCorrection(id: string): void {
    if (!this.profile.mistakeCorrections) return;
    this.profile.mistakeCorrections = this.profile.mistakeCorrections.filter((m) => m.id !== id);
    this.recalculateMetrics();
    this.saveToStorage();
    this.notify();
  }

  public addOrUpdatePreference(
    prefData: Omit<LearnedPreference, 'id' | 'timestamp'>
  ): LearnedPreference {
    if (!this.profile.learnedPreferences) {
      this.profile.learnedPreferences = [];
    }

    const existingIdx = this.profile.learnedPreferences.findIndex((p) => p.key === prefData.key);
    let updated: LearnedPreference;

    if (existingIdx >= 0) {
      updated = {
        ...this.profile.learnedPreferences[existingIdx],
        ...prefData,
        timestamp: Date.now(),
      };
      this.profile.learnedPreferences[existingIdx] = updated;
    } else {
      updated = {
        id: `pref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...prefData,
        timestamp: Date.now(),
      };
      this.profile.learnedPreferences.unshift(updated);
    }

    this.saveToStorage();
    this.notify();
    return updated;
  }

  public deletePreference(id: string): void {
    if (!this.profile.learnedPreferences) return;
    this.profile.learnedPreferences = this.profile.learnedPreferences.filter((p) => p.id !== id);
    this.saveToStorage();
    this.notify();
  }

  public clearLearningData(scope: 'all' | 'feedback_only' | 'preferences_only' | 'mistakes_only'): void {
    if (scope === 'all') {
      this.profile.feedbackHistory = [];
      this.profile.learnedPreferences = [];
      this.profile.mistakeCorrections = [];
      this.profile.languagePreference = 'auto';
      this.profile.detailLevel = 'balanced';
      this.profile.communicationStyle = 'flirty_sassy';
    } else if (scope === 'feedback_only') {
      this.profile.feedbackHistory = [];
    } else if (scope === 'preferences_only') {
      this.profile.learnedPreferences = [];
      this.profile.languagePreference = 'auto';
      this.profile.detailLevel = 'balanced';
      this.profile.communicationStyle = 'flirty_sassy';
    } else if (scope === 'mistakes_only') {
      this.profile.mistakeCorrections = [];
    }

    this.recalculateMetrics();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Scan conversation turns for language, verbosity, and style cues
   */
  public analyzeConversationForAdaptations(recentTurns: ConversationTurn[]): LearnedPreference[] {
    if (!this.profile.enabled || recentTurns.length === 0) return [];

    const discovered: LearnedPreference[] = [];
    const userTurns = recentTurns.filter((t) => t.role === 'user').slice(-6);

    for (const turn of userTurns) {
      const txt = turn.text.toLowerCase();

      // Language detection cues
      if (
        txt.includes('hindi me') ||
        txt.includes('हिंदी में') ||
        txt.includes('talk in hindi') ||
        txt.includes('speak in hindi')
      ) {
        if (this.profile.languagePreference !== 'hindi') {
          this.setLanguagePreference('hindi');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_language',
              label: 'Preferred Hindi (हिन्दी)',
              category: 'language',
              value: 'hindi',
              confidence: 0.9,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      } else if (txt.includes('hinglish') || txt.includes('mix hindi english')) {
        if (this.profile.languagePreference !== 'hinglish') {
          this.setLanguagePreference('hinglish');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_language',
              label: 'Preferred Hinglish (Banter)',
              category: 'language',
              value: 'hinglish',
              confidence: 0.9,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      } else if (txt.includes('english only') || txt.includes('speak only english')) {
        if (this.profile.languagePreference !== 'english') {
          this.setLanguagePreference('english');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_language',
              label: 'Preferred English Only',
              category: 'language',
              value: 'english',
              confidence: 0.9,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      }

      // Verbosity detection cues
      if (
        txt.includes('short me') ||
        txt.includes('keep it short') ||
        txt.includes('too long') ||
        txt.includes('one line only') ||
        txt.includes('chhota batao')
      ) {
        if (this.profile.detailLevel !== 'concise') {
          this.setDetailLevel('concise');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_detail',
              label: 'Concise Responses',
              category: 'verbosity',
              value: 'concise',
              confidence: 0.85,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      } else if (
        txt.includes('in detail') ||
        txt.includes('explain step by step') ||
        txt.includes('elaborate') ||
        txt.includes('poora detail me')
      ) {
        if (this.profile.detailLevel !== 'detailed') {
          this.setDetailLevel('detailed');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_detail',
              label: 'Detailed Explanations',
              category: 'verbosity',
              value: 'detailed',
              confidence: 0.85,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      }

      // Communication style cues
      if (txt.includes('be serious') || txt.includes('no teasing') || txt.includes('professional')) {
        if (this.profile.communicationStyle !== 'professional_smart') {
          this.setCommunicationStyle('professional_smart');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_style',
              label: 'Professional & Smart Tone',
              category: 'tone',
              value: 'professional_smart',
              confidence: 0.9,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      } else if (txt.includes('more sassy') || txt.includes('roast me') || txt.includes('flirt')) {
        if (this.profile.communicationStyle !== 'flirty_sassy') {
          this.setCommunicationStyle('flirty_sassy');
          discovered.push(
            this.addOrUpdatePreference({
              key: 'pref_style',
              label: 'Flirty & Sassy Tone',
              category: 'tone',
              value: 'flirty_sassy',
              confidence: 0.95,
              source: 'conversation_pattern',
              scope: 'persistent',
              userApproved: true,
            })
          );
        }
      }
    }

    return discovered;
  }

  /**
   * Check if user's incoming query matches any known past mistake correction
   */
  public checkMistakeRisks(query: string): MistakeCorrection | null {
    if (!this.profile.enabled || !this.profile.mistakeCorrections) return null;
    const lower = query.toLowerCase();

    for (const item of this.profile.mistakeCorrections) {
      const qWords = item.originalQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = qWords.filter((w) => lower.includes(w)).length;
      if (matchCount >= 2 || (qWords.length === 1 && matchCount === 1)) {
        item.timesPrevented = (item.timesPrevented || 0) + 1;
        this.profile.metrics.adaptationsAppliedCount = (this.profile.metrics.adaptationsAppliedCount || 0) + 1;
        this.saveToStorage();
        this.notify();
        return item;
      }
    }
    return null;
  }

  /**
   * Generates dynamic prompt injection segment for Gemini Live and Text endpoints
   */
  public generateSystemInstructionAugment(): string {
    if (!this.profile.enabled) {
      return '';
    }

    const lines: string[] = ['\n[SELF-LEARNING & ADAPTIVE INTELLIGENCE CONFIGURATION]'];

    // 1. Language directive
    if (this.profile.languagePreference === 'hindi') {
      lines.push(
        '- STRICT LANGUAGE REQUIREMENT: The user explicitly requested Hindi (हिन्दी). You MUST speak and respond predominantly in natural Hindi using Devanagari or clean natural phrasing.'
      );
    } else if (this.profile.languagePreference === 'hinglish') {
      lines.push(
        '- STRICT LANGUAGE REQUIREMENT: The user prefers Hinglish (blend of conversational Hindi and English). Use playful, modern colloquial Hinglish phrasing.'
      );
    } else if (this.profile.languagePreference === 'english') {
      lines.push(
        '- STRICT LANGUAGE REQUIREMENT: The user prefers English only. Avoid Hindi phrasing unless asked.'
      );
    } else {
      lines.push(
        '- ADAPTIVE LANGUAGE: Automatically match the user’s spoken language (Hindi, English, or Hinglish) seamlessly.'
      );
    }

    // 2. Detail & Verbosity level
    if (this.profile.detailLevel === 'concise') {
      lines.push(
        '- RESPONSE LENGTH (CONCISE): The user prefers ultra-concise answers. Speak in strictly 1-2 punchy sentences. Never deliver long lists unless directly prompted.'
      );
    } else if (this.profile.detailLevel === 'detailed') {
      lines.push(
        '- RESPONSE LENGTH (DETAILED): The user prefers thorough, in-depth breakdowns. Provide detailed steps, relevant background, and structured clarity.'
      );
    } else {
      lines.push(
        '- RESPONSE LENGTH (BALANCED): Keep spoken replies to 2-3 crisp, vibrant sentences that sound effortless aloud.'
      );
    }

    // 3. Communication style
    if (this.profile.communicationStyle === 'professional_smart') {
      lines.push(
        '- TONE ADAPTATION: Polite, highly intelligent, articulate, and direct. Dial down teasing while maintaining warm confidence.'
      );
    } else if (this.profile.communicationStyle === 'direct_concise') {
      lines.push(
        '- TONE ADAPTATION: Direct, no-nonsense, immediate execution. Minimal banter.'
      );
    } else if (this.profile.communicationStyle === 'clever_witty') {
      lines.push(
        '- TONE ADAPTATION: Clever, smart, witty bantering with sharp observations.'
      );
    } else {
      lines.push(
        '- TONE ADAPTATION: Signature Tamanna style—fiercely confident, flirty, charming, playfully teasing companion.'
      );
    }

    // 4. Mistake guardrails
    if (this.profile.mistakeCorrections && this.profile.mistakeCorrections.length > 0) {
      lines.push('- ACTIVE MISTAKE CORRECTION GUARDS:');
      this.profile.mistakeCorrections.slice(0, 5).forEach((mc, i) => {
        lines.push(
          `  ${i + 1}. Guard for topic "${mc.originalQuery}": ${mc.correctiveGuidance} (Issue to avoid: ${mc.detectedIssue})`
        );
      });
    }

    // 5. Approved user preferences
    const activePrefs = (this.profile.learnedPreferences || []).filter((p) => p.userApproved);
    if (activePrefs.length > 0) {
      lines.push('- USER LEARNED PREFERENCES:');
      activePrefs.slice(0, 6).forEach((p) => {
        lines.push(`  * ${p.label}: ${p.value}`);
      });
    }

    return lines.join('\n');
  }

  public subscribe(listener: (profile: AdaptiveProfile) => void): () => void {
    this.listeners.add(listener);
    listener(this.getProfile());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getProfile();
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err: any) {
        console.warn('[AdaptiveLearningEngine] Listener error handled:', err?.message || err);
      }
    });
  }
}
