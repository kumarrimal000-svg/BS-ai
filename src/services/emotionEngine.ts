import {
  AcousticFeatures,
  DetectedEmotion,
  EmotionAnalysisResult,
  EmotionConfidence,
  EmotionHistoryItem,
  EmotionListener,
  EmotionSettings,
  EmotionStateSnapshot,
  RecommendedTone,
  SentimentType,
} from '../types/emotion';

const SETTINGS_STORAGE_KEY = 'tamanna_emotion_engine_settings_v1';
const HISTORY_STORAGE_KEY = 'tamanna_emotion_history_v1';

const DEFAULT_SETTINGS: EmotionSettings = {
  enabled: true,
  acousticAnalysisEnabled: true,
  adaptiveToneResponse: true,
  empathyLevel: 'balanced',
  showMoodIndicator: true,
};

// Hindi / Hinglish / English emotion lexicon markers
interface EmotionMarker {
  emotion: DetectedEmotion;
  patterns: RegExp[];
  weight: number;
}

const EMOTION_MARKERS: EmotionMarker[] = [
  {
    emotion: 'frustrated',
    patterns: [
      /\b(dimag kharab|dimag ki dahi|irritat\w*|irritating|annoy\w*|bekar|pagal ho gaya|bakwaas|chidh|frustrat\w*|tang aa gaya|fed up|headache|bar bar fail|furious|ghatiya)\b/i,
      /\b(kya yaar|yaar hadd hai|kuch nahi ho raha|kyun nahi chalta|stuck ho gaya|kyu fail|not working again)\b/i,
    ],
    weight: 1.3,
  },
  {
    emotion: 'angry',
    patterns: [
      /\b(gussa|gusse|angry|mad|shut up|chup kar|bakwaas band|hate this|hate you|idiot|stupid|kamine|bewakoof)\b/i,
      /\b(tumhe kuch nahi aata|useless app|worst assistant)\b/i,
    ],
    weight: 1.4,
  },
  {
    emotion: 'confused',
    patterns: [
      /\b(kuch samajh nahi|samajh nahi aa raha|pata nahi|confus\w*|lost|meaning kya|kaise karu|kaise hoga|what do you mean|didn't get it|bounc\w*|sir ke upar se|doubt hai|kya bol rahe ho)\b/i,
      /\b(samjha nahi|explain karo firse|rephrase karo|meaningless|puzzled|unclear)\b/i,
    ],
    weight: 1.2,
  },
  {
    emotion: 'excited',
    patterns: [
      /\b(arre wah|wah yaar|mza aa gaya|maza aa gaya|superb|awesome|zabardast|shaandaar|party|omg|wow|woah|thrill\w*|cant wait|can't wait|hyped|congrats|mubarak|nacho|bohot khush)\b/i,
      /\b(let's go|lets go|so cool|insane|mindblowing|epic|gazab)\b/i,
    ],
    weight: 1.3,
  },
  {
    emotion: 'happy',
    patterns: [
      /\b(khush|happy|glad|good job|achha laga|shukriya|thanks a lot|bohot badhiya|love it|nice|pleasant|blessed|smiling|great work|sukoon|mast)\b/i,
      /\b(feel good|dil khush|bahut pyara|tamanna you rock|awesome help)\b/i,
    ],
    weight: 1.1,
  },
  {
    emotion: 'worried',
    patterns: [
      /\b(tension|chinta|dar lag raha|darr|scared|worried|anxious|anxiety|pareshan|ghabrahat|nervous|emergency|loss ho gaya|fail ho jaunga|kya hoga ab)\b/i,
      /\b(help urgently|problem ho gayi|panic|risky|darpok)\b/i,
    ],
    weight: 1.3,
  },
  {
    emotion: 'sad',
    patterns: [
      /\b(dukhi|sad|upset|mood off|mood kharab|rona aa raha|crying|heartbreak\w*|alone|akela|broken|hurt|dil toot gaya|disappointed|low feel|gloomy)\b/i,
      /\b(kuch achha nahi|sab khatam|nobody cares|so lonely)\b/i,
    ],
    weight: 1.3,
  },
  {
    emotion: 'tired',
    patterns: [
      /\b(thak gaya|thak gayi|tired|exhaust\w*|sleepy|neend|so raha hoon|burnout|energy nahi|lethargic|drained|bhaari sar|bed pe pada hoon|rest chahiye)\b/i,
      /\b(aaj bohot kaam tha|need to sleep|so tired)\b/i,
    ],
    weight: 1.2,
  },
  {
    emotion: 'calm',
    patterns: [
      /\b(chill|relaxed|sab theek hai|peace|peaceful|sukoon|aram se|aaram se|take your time|no hurry|easy going|cool)\b/i,
      /\b(sab shaant hai|all good|no stress)\b/i,
    ],
    weight: 1.0,
  },
];

// Crisis and distress phrases requiring protective intervention
const CRISIS_PATTERNS = [
  /\b(marne ka man|suicid\w*|end my life|kill myself|jeene ka man nahi|hurt myself|want to die|life is meaningless|khudkushi|apne aap ko nuksan)\b/i,
];

// Negation patterns that invert emotional valence
const NEGATION_PATTERNS = [
  /\b(nahi|not|mat|never|don't|dont|nhi|na|kabhi nahi)\b/i,
];

export class EmotionEngine {
  private static instance: EmotionEngine;

  private settings: EmotionSettings = DEFAULT_SETTINGS;
  private currentEmotion: DetectedEmotion = 'neutral';
  private currentSentiment: SentimentType = 'neutral';
  private currentSentimentScore: number = 0;
  private currentConfidence: EmotionConfidence = 'moderate';
  private currentConfidenceScore: number = 0.7;
  private activeToneDirective: string = 'Natural, witty, and playful banter';
  private recommendedTone: RecommendedTone = 'natural_playful';
  private tentativeDisclaimer?: string;
  private safetyRisk: boolean = false;
  private safetyNote?: string;

  // Real acoustic monitoring state (from user's microphone)
  private acousticMetrics: {
    volumeRms: number;
    peakLevel: number;
    volumeVariance: number;
    speakingTempo: 'slow' | 'normal' | 'fast';
  } = {
    volumeRms: 0,
    peakLevel: 0,
    volumeVariance: 0,
    speakingTempo: 'normal',
  };
  private acousticAvailable: boolean = false;

  private recentSignals: string[] = [];
  private history: EmotionHistoryItem[] = [];
  private listeners: Set<EmotionListener> = new Set();

  private constructor() {
    this.loadSettings();
    this.loadHistory();
  }

  public static getInstance(): EmotionEngine {
    if (!EmotionEngine.instance) {
      EmotionEngine.instance = new EmotionEngine();
    }
    return EmotionEngine.instance;
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public saveSettings(newSettings: Partial<EmotionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[EmotionEngine] Failed to save settings to localStorage:', e);
    }
    this.notify();
  }

  public getSettings(): EmotionSettings {
    return { ...this.settings };
  }

  private loadHistory(): void {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        this.history = JSON.parse(saved).slice(-30);
      }
    } catch {
      this.history = [];
    }
  }

  private persistHistory(): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history.slice(-30)));
    } catch (e) {
      console.warn('[EmotionEngine] Failed to persist history:', e);
    }
  }

  public clearHistory(): void {
    this.history = [];
    this.currentEmotion = 'neutral';
    this.currentSentiment = 'neutral';
    this.currentSentimentScore = 0;
    this.currentConfidence = 'moderate';
    this.tentativeDisclaimer = undefined;
    this.safetyRisk = false;
    this.safetyNote = undefined;
    this.persistHistory();
    this.notify();
  }

  public subscribe(listener: EmotionListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch (err: any) {
        console.warn('[EmotionEngine] Listener error handled:', err?.message || err);
      }
    });
  }

  public getSnapshot(): EmotionStateSnapshot {
    return {
      activeEmotion: this.currentEmotion,
      activeSentiment: this.currentSentiment,
      sentimentScore: this.currentSentimentScore,
      confidence: this.currentConfidence,
      confidenceScore: this.currentConfidenceScore,
      recommendedTone: this.recommendedTone,
      adaptationDirective: this.activeToneDirective,
      tentativeDisclaimer: this.tentativeDisclaimer,
      safetyRisk: this.safetyRisk,
      safetyNote: this.safetyNote,
      acousticStatus: !this.settings.acousticAnalysisEnabled
        ? 'unavailable'
        : this.acousticAvailable
        ? 'active'
        : 'silent',
      acousticMetrics: this.settings.acousticAnalysisEnabled ? { ...this.acousticMetrics } : undefined,
      lastLinguisticSignals: [...this.recentSignals],
      history: [...this.history],
      settings: { ...this.settings },
    };
  }

  /**
   * Updates real-time audio metrics from AudioRecorder
   */
  public updateAcousticFeatures(features: Partial<AcousticFeatures>): void {
    if (!this.settings.acousticAnalysisEnabled) return;

    if (typeof features.averageVolume === 'number') {
      this.acousticMetrics.volumeRms = features.averageVolume;
    }
    if (typeof features.peakVolume === 'number') {
      this.acousticMetrics.peakLevel = features.peakVolume;
    }
    if (typeof features.volumeVariance === 'number') {
      this.acousticMetrics.volumeVariance = features.volumeVariance;
    }
    if (features.tempoRate) {
      this.acousticMetrics.speakingTempo = features.tempoRate;
    }
    this.acousticAvailable = Boolean(features.available);
  }

  /**
   * Main entry point to analyze user utterance & conversational context
   */
  public analyzeUtterance(
    text: string,
    contextHistory: Array<{ role: 'user' | 'assistant'; text: string }> = []
  ): EmotionAnalysisResult {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      return this.createNeutralResult('');
    }

    // 1. Check Safety and Distress first
    const isCrisis = CRISIS_PATTERNS.some((p) => p.test(cleanText));
    if (isCrisis) {
      this.safetyRisk = true;
      this.safetyNote =
        'Distress detected. Tamanna offers calm, non-judgmental support and urges reaching out to trusted loved ones or emergency helplines (Tele-MANAS: 14416, Kiran: 1800-599-0019).';
      this.currentEmotion = 'worried';
      this.currentSentiment = 'negative';
      this.currentSentimentScore = -0.9;
      this.currentConfidence = 'high';
      this.currentConfidenceScore = 0.95;
      this.recommendedTone = 'gentle_empathetic';
      this.activeToneDirective =
        'User is expressing serious distress. Respond with deep, calm empathy. Do not joke or tease. Encourage them to talk to someone they trust or call a helpline.';
      this.tentativeDisclaimer =
        'Mujhe lagta hai aap kaafi pareshan hain. Main hamesha sunne ke liye yahan hoon, par kisi apne ya professional helpline se baat karna behad zaroori hai.';

      const result: EmotionAnalysisResult = {
        id: `emo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        primaryEmotion: 'worried',
        secondaryEmotion: 'sad',
        sentiment: 'negative',
        sentimentScore: -0.9,
        confidence: 'high',
        confidenceScore: 0.95,
        linguisticSignals: ['Crisis or severe distress phrasing matched'],
        acousticSignals: this.acousticAvailable
          ? [`Acoustic level recorded: ${this.acousticMetrics.volumeRms.toFixed(2)}`]
          : ['Acoustic analysis offline / relying strictly on linguistic context'],
        adaptationDirective: this.activeToneDirective,
        recommendedTone: this.recommendedTone,
        tentativeDisclaimer: this.tentativeDisclaimer,
        safetyRisk: true,
        safetyNote: this.safetyNote,
        turnText: cleanText,
        timestamp: Date.now(),
      };

      this.recordResult(result);
      return result;
    }

    // 2. Multi-word linguistic pattern evaluation
    const detectedScores: Record<DetectedEmotion, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      frustrated: 0,
      worried: 0,
      confused: 0,
      excited: 0,
      calm: 0,
      tired: 0,
      neutral: 0.3, // Baseline neutral weight
    };

    const linguisticSignals: string[] = [];

    // Analyze sentence-level context and negation
    const sentences = cleanText.split(/[.!?]+/).filter(Boolean);

    for (const marker of EMOTION_MARKERS) {
      for (const pattern of marker.patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          // Check for nearby negation in the matching segment
          const matchIndex = cleanText.search(pattern);
          const precedingWords = cleanText.substring(Math.max(0, matchIndex - 30), matchIndex);
          const hasNegation = NEGATION_PATTERNS.some((neg) => neg.test(precedingWords));

          if (hasNegation) {
            // Negated emotion (e.g. "gussa nahi hoon", "not sad")
            linguisticSignals.push(`Negated: "${matches[0]}" (reduced ${marker.emotion})`);
            detectedScores[marker.emotion] = Math.max(0, detectedScores[marker.emotion] - marker.weight * 0.8);
            detectedScores['calm'] += 0.4;
          } else {
            detectedScores[marker.emotion] += marker.weight * (matches.length > 1 ? 1.3 : 1.0);
            linguisticSignals.push(`Matched pattern: "${matches[0]}" (${marker.emotion})`);
          }
        }
      }
    }

    // Punctuation cues
    if (/[!?]{2,}/.test(cleanText)) {
      if (detectedScores.frustrated > 0 || detectedScores.angry > 0) {
        detectedScores.frustrated += 0.4;
        linguisticSignals.push('Intense punctuation (!! or ??) indicates heightened frustration');
      } else if (detectedScores.excited > 0) {
        detectedScores.excited += 0.4;
        linguisticSignals.push('Multiple exclamation marks highlight enthusiasm');
      } else if (detectedScores.confused > 0) {
        detectedScores.confused += 0.4;
        linguisticSignals.push('Multiple question marks highlight confusion');
      }
    }

    // Context awareness: Incorporate recent user turns
    if (contextHistory.length > 0) {
      const recentUserTurns = contextHistory
        .filter((c) => c.role === 'user')
        .slice(-2)
        .map((c) => c.text)
        .join(' ');

      if (recentUserTurns) {
        if (/again|firse|phir se|still|fir se/i.test(cleanText) && (detectedScores.frustrated > 0 || detectedScores.confused > 0)) {
          detectedScores.frustrated += 0.5;
          linguisticSignals.push('Follow-up phrasing ("again" / "phir se") confirms persistent frustration');
        }
      }
    }

    // Real Acoustic feature weighting (strictly when available)
    const acousticSignals: string[] = [];
    if (this.settings.acousticAnalysisEnabled && this.acousticAvailable) {
      if (this.acousticMetrics.volumeRms > 0.45 && this.acousticMetrics.volumeVariance > 0.1) {
        if (detectedScores.frustrated > 0 || detectedScores.angry > 0) {
          detectedScores.frustrated += 0.3;
          acousticSignals.push(`High acoustic dynamics (RMS: ${this.acousticMetrics.volumeRms.toFixed(2)}, var: ${this.acousticMetrics.volumeVariance.toFixed(2)}) aligns with vocal urgency`);
        } else if (detectedScores.excited > 0) {
          detectedScores.excited += 0.3;
          acousticSignals.push(`High acoustic energy aligns with excitement`);
        }
      } else if (this.acousticMetrics.volumeRms < 0.15 && detectedScores.tired > 0) {
        detectedScores.tired += 0.3;
        acousticSignals.push(`Low vocal energy aligns with fatigue`);
      } else {
        acousticSignals.push(`Nominal acoustic level (RMS: ${this.acousticMetrics.volumeRms.toFixed(2)})`);
      }
    } else {
      acousticSignals.push('Acoustic voice metrics not actively streamed — evaluation grounded solely in linguistic context');
    }

    // Find primary and secondary emotions
    const sortedEmotions = (Object.keys(detectedScores) as DetectedEmotion[]).sort(
      (a, b) => detectedScores[b] - detectedScores[a]
    );

    const highestEmotion = sortedEmotions[0];
    const highestScore = detectedScores[highestEmotion];
    const secondaryEmotion = detectedScores[sortedEmotions[1]] > 0.5 ? sortedEmotions[1] : undefined;

    const primaryEmotion: DetectedEmotion = highestScore > 0.5 ? highestEmotion : 'neutral';

    // Compute Sentiment and Sentiment Score (-1.0 to 1.0)
    let sentiment: SentimentType = 'neutral';
    let sentimentScore = 0;

    const positiveTotal = detectedScores.happy + detectedScores.excited + detectedScores.calm * 0.5;
    const negativeTotal = detectedScores.angry + detectedScores.frustrated + detectedScores.sad + detectedScores.worried;

    if (positiveTotal > 0.6 && negativeTotal > 0.6) {
      sentiment = 'mixed';
      sentimentScore = Math.max(-0.9, Math.min(0.9, (positiveTotal - negativeTotal) / (positiveTotal + negativeTotal)));
    } else if (positiveTotal > negativeTotal + 0.4) {
      sentiment = 'positive';
      sentimentScore = Math.min(1.0, 0.3 + positiveTotal * 0.3);
    } else if (negativeTotal > positiveTotal + 0.4) {
      sentiment = 'negative';
      sentimentScore = Math.max(-1.0, -0.3 - negativeTotal * 0.3);
    } else {
      sentiment = 'neutral';
      sentimentScore = 0.05;
    }

    // Determine Confidence (strictly estimated)
    let confidence: EmotionConfidence = 'tentative';
    let confidenceScore = 0.5;

    if (highestScore >= 1.6 || linguisticSignals.length >= 2) {
      confidence = 'high';
      confidenceScore = 0.88;
    } else if (highestScore >= 0.8) {
      confidence = 'moderate';
      confidenceScore = 0.72;
    } else {
      confidence = 'tentative';
      confidenceScore = 0.54;
    }

    // Natural Response Style & Recommended Tone
    const { recommendedTone, adaptationDirective, tentativeDisclaimer } = this.resolveAdaptation(
      primaryEmotion,
      sentiment,
      confidence,
      cleanText
    );

    const result: EmotionAnalysisResult = {
      id: `emo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      primaryEmotion,
      secondaryEmotion,
      sentiment,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      confidence,
      confidenceScore,
      linguisticSignals,
      acousticSignals,
      adaptationDirective,
      recommendedTone,
      tentativeDisclaimer,
      safetyRisk: false,
      turnText: cleanText,
      timestamp: Date.now(),
    };

    this.recordResult(result);
    return result;
  }

  /**
   * Translates detected emotion & sentiment into clean conversational guidance for Tamanna
   */
  private resolveAdaptation(
    emotion: DetectedEmotion,
    sentiment: SentimentType,
    confidence: EmotionConfidence,
    text: string
  ): {
    recommendedTone: RecommendedTone;
    adaptationDirective: string;
    tentativeDisclaimer?: string;
  } {
    let recommendedTone: RecommendedTone = 'natural_playful';
    let adaptationDirective = 'Respond naturally with witty, confident charm and crisp delivery.';
    let tentativeDisclaimer: string | undefined;

    switch (emotion) {
      case 'frustrated':
      case 'angry':
        recommendedTone = 'calm_supportive';
        adaptationDirective =
          'User appears frustrated or annoyed. Do NOT tease or debate. Speak calmly, acknowledge the challenge simply without being overly dramatic, and deliver an immediate clear solution.';
        if (confidence === 'tentative' || confidence === 'moderate') {
          tentativeDisclaimer = 'Lagta hai aap thode frustrated hain — agar main galat samajh raha hoon to bata dena.';
        }
        break;

      case 'confused':
        recommendedTone = 'simplified_clear';
        adaptationDirective =
          'User appears confused. Break down the concept into 1-2 simple, conversational steps in easy Hindi/Hinglish. Avoid complex jargon.';
        if (confidence === 'tentative') {
          tentativeDisclaimer = 'Lagta hai baat thodi complicate ho gayi — chalo bilkul aasan tareeqe se samajhte hain.';
        }
        break;

      case 'excited':
        recommendedTone = 'energetic_vibrant';
        adaptationDirective =
          'User is excited and enthusiastic. Match their upbeat energy! Be celebratory, delightfully witty, and share the excitement.';
        break;

      case 'happy':
        recommendedTone = 'natural_playful';
        adaptationDirective =
          'User is happy and pleased. Keep the interaction warm, cheerful, and playfully banter-filled.';
        break;

      case 'worried':
      case 'sad':
        recommendedTone = 'gentle_empathetic';
        adaptationDirective =
          'User seems down or worried. Offer sincere, gentle empathy and quiet encouragement without being cheesy, dramatic, or patronizing.';
        if (confidence === 'tentative') {
          tentativeDisclaimer = 'Lagta hai aaj mood thoda low hai — main sunne ke liye yahan hoon agar kuch discuss karna ho.';
        }
        break;

      case 'tired':
        recommendedTone = 'calm_supportive';
        adaptationDirective =
          'User is tired or exhausted. Keep spoken responses short, soothing, and zero-effort to process. No long explanations.';
        tentativeDisclaimer = 'Aap thode thake hue lag rahe hain — chalo main jaldi aur short mein bata deti hoon.';
        break;

      case 'calm':
        recommendedTone = 'natural_playful';
        adaptationDirective = 'User is relaxed and calm. Maintain smooth, engaging, and witty conversational flow.';
        break;

      case 'neutral':
      default:
        recommendedTone = 'natural_playful';
        adaptationDirective =
          'User has neutral or objective intent. Deliver direct, crisp, and high-efficiency voice responses.';
        break;
    }

    return { recommendedTone, adaptationDirective, tentativeDisclaimer };
  }

  private createNeutralResult(cleanText: string): EmotionAnalysisResult {
    return {
      id: `emo_${Date.now()}`,
      primaryEmotion: 'neutral',
      sentiment: 'neutral',
      sentimentScore: 0,
      confidence: 'moderate',
      confidenceScore: 0.7,
      linguisticSignals: ['Neutral conversational prompt'],
      acousticSignals: ['Standard baseline'],
      adaptationDirective: 'Respond naturally with witty, confident charm and crisp delivery.',
      recommendedTone: 'natural_playful',
      safetyRisk: false,
      turnText: cleanText,
      timestamp: Date.now(),
    };
  }

  private recordResult(result: EmotionAnalysisResult): void {
    this.currentEmotion = result.primaryEmotion;
    this.currentSentiment = result.sentiment;
    this.currentSentimentScore = result.sentimentScore;
    this.currentConfidence = result.confidence;
    this.currentConfidenceScore = result.confidenceScore;
    this.recommendedTone = result.recommendedTone;
    this.activeToneDirective = result.adaptationDirective;
    this.tentativeDisclaimer = result.tentativeDisclaimer;
    this.safetyRisk = result.safetyRisk;
    this.safetyNote = result.safetyNote;
    this.recentSignals = result.linguisticSignals;

    // Record to history
    const historyItem: EmotionHistoryItem = {
      id: result.id,
      timestamp: result.timestamp,
      role: 'user',
      text: result.turnText,
      primaryEmotion: result.primaryEmotion,
      sentiment: result.sentiment,
      sentimentScore: result.sentimentScore,
      confidence: result.confidence,
      adaptationSummary: result.adaptationDirective,
    };

    this.history.push(historyItem);
    if (this.history.length > 30) {
      this.history.shift();
    }
    this.persistHistory();
    this.notify();
  }

  /**
   * Generates a context directive string for appending to Gemini Live dynamic instructions
   */
  public generateEmotionLiveAugment(): string {
    if (!this.settings.enabled) return '';

    let augment = `\n[LIVE EMOTION & SENTIMENT AWARENESS]:
- Active Emotion Estimate: "${this.currentEmotion.toUpperCase()}" (Confidence: ${this.currentConfidence}, Sentiment: ${this.currentSentiment} ${this.currentSentimentScore >= 0 ? '+' : ''}${this.currentSentimentScore})
- Response Style Directive: ${this.activeToneDirective}
- Recommended Spoken Tone: ${this.recommendedTone.replace('_', ' ').toUpperCase()}
- Privacy & Honesty Rule: Treat this strictly as an estimate, NEVER as an infallible fact. Never claim to see the user's face or voice biometric sensors.`;

    if (this.tentativeDisclaimer) {
      augment += `\n- Suggested Tentative Phrasing: "${this.tentativeDisclaimer}"`;
    }

    if (this.safetyRisk) {
      augment += `\n- CRITICAL SAFETY INTERVENTION: Distress detected. Prioritize warmth, non-judgmental calm, and encourage trusted support or helpline assistance (Tele-MANAS: 14416).`;
    }

    return augment;
  }

  /**
   * Records Tamanna's spoken reply for emotional trajectory continuity
   */
  public recordAssistantResponse(text: string): void {
    const historyItem: EmotionHistoryItem = {
      id: `asst_${Date.now()}`,
      timestamp: Date.now(),
      role: 'assistant',
      text,
      primaryEmotion: this.currentEmotion,
      sentiment: 'positive',
      sentimentScore: 0.5,
      confidence: 'high',
      adaptationSummary: `Responded with ${this.recommendedTone} cadence`,
    };
    this.history.push(historyItem);
    if (this.history.length > 30) {
      this.history.shift();
    }
    this.persistHistory();
    this.notify();
  }
}
