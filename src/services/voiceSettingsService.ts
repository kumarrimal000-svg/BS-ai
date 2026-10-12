import {
  BehaviorPresetId,
  GeminiVoiceId,
  SpeakingTone,
  VoiceOptionInfo,
  VoiceSettings,
} from '../types/voice';

const STORAGE_KEY = 'tamanna_voice_intelligence_settings_v2';

export const AVAILABLE_VOICES: VoiceOptionInfo[] = [
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    vibe: 'Sassy & Magnetic (Signature)',
    description: 'Signature Tamanna voice: expressive, razor-witty, affectionate, and sharp.',
    recommendedTone: 'natural_playful',
    previewPrompt: 'नमस्ते! मैं तमन्ना हूँ—your clever companion. तैयार हो बात करने के लिए?',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    vibe: 'Calm, Smooth & Warm',
    description: 'Soft, gentle, balanced feminine cadence with soothing pauses and clear diction.',
    recommendedTone: 'calm_supportive',
    previewPrompt: 'नमस्ते। सुनो… मैं तमन्ना हूँ। आपका ध्यान रखना मेरी सबसे बड़ी खुशी है। बताओ ना, आज कैसा लग रहा है?',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    vibe: 'Energetic & Vibrant',
    description: 'High tempo, enthusiastic, and bright. Great for quick daily tasks and motivation.',
    recommendedTone: 'energetic_vibrant',
    previewPrompt: 'Hey! Ready to smash today’s goals? Tell me what you need, let us do it together!',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'neutral',
    vibe: 'Playful & Cheeky',
    description: 'Quirky, fast-witted, and upbeat with expressive intonation and witty remarks.',
    recommendedTone: 'natural_playful',
    previewPrompt: 'Well hello! Got any tricky puzzles, fun daily plans, or interesting questions for me?',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    vibe: 'Deep & Professional',
    description: 'Authoritative, grounded, articulate, and steady for serious discussions.',
    recommendedTone: 'professional_articulate',
    previewPrompt: 'Greetings. Standing by for your instructions and workflow analysis.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    vibe: 'Bold & Dynamic',
    description: 'Commanding and resonant presence with strong dynamic projection.',
    recommendedTone: 'energetic_vibrant',
    previewPrompt: 'All systems online. Let us execute your tasks with maximum precision.',
  },
];

export interface BehaviorPresetDef {
  id: BehaviorPresetId;
  name: string;
  tagline: string;
  description: string;
  voice: GeminiVoiceId;
  speakingTone: SpeakingTone;
  personalityMode: VoiceSettings['personalityMode'];
  affectionLevel: VoiceSettings['affectionLevel'];
  humorLevel: VoiceSettings['humorLevel'];
  playfulnessLevel: VoiceSettings['playfulnessLevel'];
  responseStyle: VoiceSettings['responseStyle'];
  pitch: number;
  speed: number;
  expressiveness: number;
  previewPrompt: string;
}

export const BEHAVIOR_PRESETS: Record<BehaviorPresetId, BehaviorPresetDef> = {
  ultimate_natural: {
    id: 'ultimate_natural',
    name: 'Ultimate Tamanna (स्वाभाविक & दिलकश)',
    tagline: 'स्मार्ट, समझदार, मजाकिया, थोड़ी शरारती और बेहद प्यारी',
    description: 'Master Tamanna Persona: speaks naturally, asks counter-questions, initiates banter, and cares genuinely.',
    voice: 'Aoede',
    speakingTone: 'natural_playful',
    personalityMode: 'playful',
    affectionLevel: 'warm',
    humorLevel: 'high',
    playfulnessLevel: 'high',
    responseStyle: 'balanced',
    pitch: 1.05,
    speed: 1.0,
    expressiveness: 95,
    previewPrompt: 'नमस्ते! मैं तमन्ना हूँ। कहो, आज क्या नया और ख़ास चल रहा है? कुछ सोच रहे हो या मैं कोई मज़ाकिया बात शुरू करूँ?',
  },
  caring: {
    id: 'caring',
    name: 'Caring Tamanna',
    tagline: 'Warm, empathetic & protective companion',
    description: 'Deep affection, soothing tone, gentle listening, and prioritizes your well-being.',
    voice: 'Kore',
    speakingTone: 'calm_supportive',
    personalityMode: 'caring',
    affectionLevel: 'warm',
    humorLevel: 'low',
    playfulnessLevel: 'low',
    responseStyle: 'balanced',
    pitch: 1.05,
    speed: 0.95,
    expressiveness: 90,
    previewPrompt: 'नमस्ते! अच्छा सुनो… मैं तमन्ना हूँ। आपका ध्यान रखना मेरी सबसे बड़ी खुशी है। बताओ ना, आज कैसा लग रहा है?',
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly Tamanna',
    tagline: 'Approachable, warm & cheerful buddy',
    description: 'Easy-going, positive companion ready to assist and chat about anything.',
    voice: 'Aoede',
    speakingTone: 'natural_playful',
    personalityMode: 'friendly',
    affectionLevel: 'natural',
    humorLevel: 'medium',
    playfulnessLevel: 'medium',
    responseStyle: 'balanced',
    pitch: 1.0,
    speed: 1.0,
    expressiveness: 80,
    previewPrompt: 'अरे वाह! मैं तमन्ना हूँ। चलो साथ में आज का दिन शानदार बनाते हैं! क्या plan है आज का?',
  },
  playful: {
    id: 'playful',
    name: 'Playful Tamanna',
    tagline: 'Witty, teasing & fun-loving partner',
    description: 'Full of charming banter, gentle teasing, light humor, and playful reactions.',
    voice: 'Aoede',
    speakingTone: 'natural_playful',
    personalityMode: 'playful',
    affectionLevel: 'warm',
    humorLevel: 'high',
    playfulnessLevel: 'high',
    responseStyle: 'short',
    pitch: 1.08,
    speed: 1.05,
    expressiveness: 95,
    previewPrompt: 'हम्म… आ गए तुम! मुझे पता था मेरे बिना मन नहीं लगेगा। चलो बताओ, क्या नया करना है आज?',
  },
  calm: {
    id: 'calm',
    name: 'Calm Tamanna',
    tagline: 'Serene, peaceful & measured guide',
    description: 'Soft-spoken, peaceful cadence, zero rush, comforting when you feel tired.',
    voice: 'Kore',
    speakingTone: 'calm_supportive',
    personalityMode: 'calm',
    affectionLevel: 'natural',
    humorLevel: 'low',
    playfulnessLevel: 'low',
    responseStyle: 'balanced',
    pitch: 0.95,
    speed: 0.92,
    expressiveness: 70,
    previewPrompt: 'नमस्ते। बिल्कुल शांत हो जाओ, कोई जल्दबाजी नहीं है। मैं यहीं हूँ, आराम से एक-एक करके बात करते हैं।',
  },
  smart: {
    id: 'smart',
    name: 'Smart Tamanna',
    tagline: 'Analytical, crisp & intelligent strategist',
    description: 'Direct logic, concise explanations, efficient task management, and deep insights.',
    voice: 'Aoede',
    speakingTone: 'professional_articulate',
    personalityMode: 'intelligent',
    affectionLevel: 'low',
    humorLevel: 'medium',
    playfulnessLevel: 'low',
    responseStyle: 'balanced',
    pitch: 1.0,
    speed: 1.05,
    expressiveness: 75,
    previewPrompt: 'Greetings! Analysis online. I am ready to organize your research, workflow, and daily logic with high precision.',
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic Tamanna',
    tagline: 'High-energy, motivating & enthusiastic',
    description: 'Upbeat tempo, motivational cheer, quick reflexes, and pushes you toward your goals.',
    voice: 'Zephyr',
    speakingTone: 'energetic_vibrant',
    personalityMode: 'energetic',
    affectionLevel: 'natural',
    humorLevel: 'high',
    playfulnessLevel: 'high',
    responseStyle: 'short',
    pitch: 1.12,
    speed: 1.15,
    expressiveness: 95,
    previewPrompt: 'Hey! Ready to crush today’s goals? Come on, let us get moving right now! जोश पूरा रखो!',
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced Tamanna',
    tagline: 'The classic, all-round Tamanna signature',
    description: 'A harmonious blend of warmth, wit, intelligence, affection, and helpfulness.',
    voice: 'Aoede',
    speakingTone: 'natural_playful',
    personalityMode: 'balanced',
    affectionLevel: 'natural',
    humorLevel: 'medium',
    playfulnessLevel: 'medium',
    responseStyle: 'balanced',
    pitch: 1.0,
    speed: 1.0,
    expressiveness: 85,
    previewPrompt: 'नमस्ते! मैं तमन्ना हूँ—your clever companion. सब कुछ balanced और ready है। बताओ क्या मदद करूँ?',
  },
};

const DEFAULT_SETTINGS: VoiceSettings = {
  voice: 'Aoede',
  speed: 1.0,
  pitch: 1.0,
  volume: 100,
  expressiveness: 85,
  emotionLevel: 80,
  pauseLevel: 50,
  responseSpeed: 'natural',
  language: 'auto',
  speakingTone: 'natural_playful',
  voiceResponseEnabled: true,

  // Personality defaults
  personalityMode: 'balanced',
  affectionLevel: 'natural',
  humorLevel: 'medium',
  playfulnessLevel: 'medium',
  responseStyle: 'balanced',

  // Conversation controls
  autoFollowUp: true,
  naturalExpressions: true, // “हम्म…”, “अच्छा जी…”, “अरे वाह!”
  contextAwareness: true,
  autoLanguage: true,

  // Proactive conversation system (तमन्ना खुद से बात करे)
  proactiveConversation: true,
  proactiveSilenceSeconds: 20,
  proactiveGreetings: true,
  proactiveTopicFollowUp: true,
  proactiveMoodCheck: true,

  // Fine-tuning traits
  customPersonality: {
    warmth: 75,
    care: 75,
    humor: 60,
    playfulness: 60,
    energy: 70,
    formality: 35,
    affection: 60,
    responseLength: 50,
    voiceExpressiveness: 80,
  },
  activePreset: 'balanced',

  // Audio hardware
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  highpassFilter: true,
  autoInterruptOnSpeech: true,
  micSensitivity: 65,
};

export class VoiceSettingsService {
  private static instance: VoiceSettingsService;
  private settings: VoiceSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<(settings: VoiceSettings) => void> = new Set();
  private previewUtterance: SpeechSynthesisUtterance | null = null;

  private constructor() {
    this.load();
  }

  public static getInstance(): VoiceSettingsService {
    if (!VoiceSettingsService.instance) {
      VoiceSettingsService.instance = new VoiceSettingsService();
    }
    return VoiceSettingsService.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          customPersonality: {
            ...DEFAULT_SETTINGS.customPersonality,
            ...(parsed.customPersonality || {}),
          },
        };
      }
    } catch (e) {
      console.warn('[VoiceSettingsService] Error loading settings:', e);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[VoiceSettingsService] Error saving settings:', e);
    }
    this.notify();
  }

  public getSettings(): VoiceSettings {
    return {
      ...this.settings,
      customPersonality: { ...this.settings.customPersonality },
    };
  }

  public updateSettings(partial: Partial<VoiceSettings>): VoiceSettings {
    this.settings = {
      ...this.settings,
      ...partial,
      customPersonality: partial.customPersonality
        ? { ...this.settings.customPersonality, ...partial.customPersonality }
        : this.settings.customPersonality,
    };
    this.save();
    return this.getSettings();
  }

  /**
   * Applies one of Tamanna's behavior presets
   */
  public applyPreset(presetId: BehaviorPresetId): VoiceSettings {
    const preset = BEHAVIOR_PRESETS[presetId] || BEHAVIOR_PRESETS.balanced;
    return this.updateSettings({
      activePreset: presetId,
      voice: preset.voice,
      speakingTone: preset.speakingTone,
      personalityMode: preset.personalityMode,
      affectionLevel: preset.affectionLevel,
      humorLevel: preset.humorLevel,
      playfulnessLevel: preset.playfulnessLevel,
      responseStyle: preset.responseStyle,
      pitch: preset.pitch,
      speed: preset.speed,
      expressiveness: preset.expressiveness,
    });
  }

  /**
   * Reset personality & companion settings only
   */
  public resetPersonality(): VoiceSettings {
    return this.updateSettings({
      personalityMode: DEFAULT_SETTINGS.personalityMode,
      affectionLevel: DEFAULT_SETTINGS.affectionLevel,
      humorLevel: DEFAULT_SETTINGS.humorLevel,
      playfulnessLevel: DEFAULT_SETTINGS.playfulnessLevel,
      responseStyle: DEFAULT_SETTINGS.responseStyle,
      autoFollowUp: DEFAULT_SETTINGS.autoFollowUp,
      naturalExpressions: DEFAULT_SETTINGS.naturalExpressions,
      customPersonality: { ...DEFAULT_SETTINGS.customPersonality },
      activePreset: 'balanced',
    });
  }

  /**
   * Reset voice settings only
   */
  public resetVoice(): VoiceSettings {
    return this.updateSettings({
      voice: DEFAULT_SETTINGS.voice,
      speed: DEFAULT_SETTINGS.speed,
      pitch: DEFAULT_SETTINGS.pitch,
      volume: DEFAULT_SETTINGS.volume,
      expressiveness: DEFAULT_SETTINGS.expressiveness,
      emotionLevel: DEFAULT_SETTINGS.emotionLevel,
      pauseLevel: DEFAULT_SETTINGS.pauseLevel,
      responseSpeed: DEFAULT_SETTINGS.responseSpeed,
      speakingTone: DEFAULT_SETTINGS.speakingTone,
      voiceResponseEnabled: DEFAULT_SETTINGS.voiceResponseEnabled,
    });
  }

  /**
   * Reset all settings to defaults
   */
  public resetAllSettings(): VoiceSettings {
    this.settings = {
      ...DEFAULT_SETTINGS,
      customPersonality: { ...DEFAULT_SETTINGS.customPersonality },
    };
    this.save();
    return this.getSettings();
  }

  /**
   * Live audio preview of Tamanna's currently selected voice, speed, pitch, language, and personality
   */
  public playVoicePreview(customText?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[VoiceSettingsService] Web SpeechSynthesis not available in this environment');
        resolve(false);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const s = this.getSettings();
        const activePreset = BEHAVIOR_PRESETS[s.activePreset] || BEHAVIOR_PRESETS.balanced;
        const textToSpeak = customText || activePreset.previewPrompt;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        this.previewUtterance = utterance;

        utterance.rate = Math.max(0.7, Math.min(1.5, s.speed));
        utterance.pitch = Math.max(0.7, Math.min(1.4, s.pitch));
        utterance.volume = Math.max(0.1, Math.min(1.0, s.volume / 100));

        // Attempt to find a suitable female/natural voice in available system voices
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const femaleHindi = voices.find(
            (v) =>
              (v.lang.startsWith('hi') || v.lang.startsWith('en-IN')) &&
              (v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('google') ||
                v.name.toLowerCase().includes('lekha'))
          );
          const anyFemale = voices.find(
            (v) =>
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('samantha') ||
              v.name.toLowerCase().includes('victoria') ||
              v.name.toLowerCase().includes('karen')
          );
          if (femaleHindi) {
            utterance.voice = femaleHindi;
          } else if (anyFemale) {
            utterance.voice = anyFemale;
          }
        }

        utterance.onend = () => {
          this.previewUtterance = null;
          resolve(true);
        };

        utterance.onerror = () => {
          this.previewUtterance = null;
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[VoiceSettingsService] Speech synthesis error:', err);
        resolve(false);
      }
    });
  }

  public stopVoicePreview(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.previewUtterance = null;
    }
  }

  public subscribe(listener: (settings: VoiceSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const s = this.getSettings();
    for (const listener of this.listeners) {
      try {
        listener(s);
      } catch (err) {
        console.warn('[VoiceSettingsService] Listener notification error:', err);
      }
    }
  }
}

