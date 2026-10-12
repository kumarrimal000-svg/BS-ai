import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Mic,
  Gauge,
  Sliders,
  Globe,
  Smile,
  ShieldCheck,
  Play,
  Square,
  RotateCcw,
  Check,
  Radio,
  Zap,
  Sparkles,
  Headphones,
  Heart,
  MessageSquare,
  Bookmark,
  Shield,
  Bell,
  SlidersHorizontal,
  Flame,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  AffectionLevel,
  BehaviorPresetId,
  GeminiVoiceId,
  HumorLevel,
  PersonalityMode,
  PlayfulnessLevel,
  ResponseSpeed,
  ResponseStyle,
  SpeakingTone,
  VoiceLanguage,
  VoiceSettings,
} from '../types/voice';
import {
  AVAILABLE_VOICES,
  BEHAVIOR_PRESETS,
  VoiceSettingsService,
} from '../services/voiceSettingsService';
import { MicrophoneTester } from '../services/AudioRecorder';
import { PersonalAssistantService } from '../services/personalAssistantService';
import { MemoryManager } from '../services/memoryManager';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTestPrompt?: (prompt: string) => void;
  initialTab?: SettingsTab;
}

export type SettingsTab =
  | 'voice'
  | 'personality'
  | 'conversation'
  | 'language'
  | 'emotion'
  | 'custom'
  | 'memory'
  | 'privacy'
  | 'notifications'
  | 'advanced';

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSendTestPrompt,
  initialTab = 'voice',
}) => {
  const [settings, setSettings] = useState<VoiceSettings>(() =>
    VoiceSettingsService.getInstance().getSettings()
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // Reset confirmation dialog state
  const [resetConfirmType, setResetConfirmType] = useState<
    'none' | 'personality' | 'voice' | 'all'
  >('none');

  // Mic hardware test state
  const [micTestStatus, setMicTestStatus] = useState<
    'idle' | 'recording' | 'analyzing' | 'ready_to_play' | 'playing' | 'error'
  >('idle');
  const [micTestProgress, setMicTestProgress] = useState<number>(0);
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [micTestResult, setMicTestResult] = useState<{
    peakDb: number;
    avgDb: number;
    hasAudioInput: boolean;
    backgroundNoiseLevel: 'low' | 'moderate' | 'high';
  } | null>(null);
  const [micTestError, setMicTestError] = useState<string | null>(null);

  const testerRef = useRef<MicrophoneTester | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (testerRef.current) {
        testerRef.current.cleanup();
        testerRef.current = null;
      }
      setMicTestStatus('idle');
      VoiceSettingsService.getInstance().stopVoicePreview();
      setIsPlayingPreview(false);
      setResetConfirmType('none');
      return;
    }

    const unsubscribe = VoiceSettingsService.getInstance().subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<VoiceSettings>) => {
    const updated = VoiceSettingsService.getInstance().updateSettings(partial);
    setSettings(updated);
  };

  const handleApplyPreset = (presetId: BehaviorPresetId) => {
    const updated = VoiceSettingsService.getInstance().applyPreset(presetId);
    setSettings(updated);
  };

  const handlePlayPreview = async (customText?: string) => {
    if (isPlayingPreview) {
      VoiceSettingsService.getInstance().stopVoicePreview();
      setIsPlayingPreview(false);
      return;
    }
    setIsPlayingPreview(true);
    await VoiceSettingsService.getInstance().playVoicePreview(customText);
    setIsPlayingPreview(false);
  };

  const handleExecuteReset = () => {
    if (resetConfirmType === 'personality') {
      VoiceSettingsService.getInstance().resetPersonality();
    } else if (resetConfirmType === 'voice') {
      VoiceSettingsService.getInstance().resetVoice();
    } else if (resetConfirmType === 'all') {
      VoiceSettingsService.getInstance().resetAllSettings();
    }
    setResetConfirmType('none');
  };

  // Hardware mic test
  const handleStartMicTest = async () => {
    if (micTestStatus === 'recording' || micTestStatus === 'playing') return;

    setMicTestError(null);
    setMicTestStatus('recording');
    setMicTestProgress(0);
    setMicTestResult(null);

    if (!testerRef.current) {
      testerRef.current = new MicrophoneTester();
    }

    const startTime = Date.now();
    const durationMs = 3000;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setMicTestProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 50);

    try {
      const result = await testerRef.current.startTest(durationMs, (dbPct, freqData) => {
        setMicVolumeLevel(dbPct);
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / freqData.length) * 2;
            let x = 0;
            for (let i = 0; i < freqData.length / 2; i++) {
              const barHeight = (freqData[i] / 255) * canvas.height;
              const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
              grad.addColorStop(0, '#ec4899');
              grad.addColorStop(1, '#8b5cf6');
              ctx.fillStyle = grad;
              ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
              x += barWidth;
            }
          }
        }
      });

      clearInterval(progressInterval);
      setMicTestProgress(100);
      setMicTestResult(result);
      setMicTestStatus('ready_to_play');
    } catch (err: any) {
      clearInterval(progressInterval);
      setMicTestStatus('error');
      setMicTestError(err?.message || 'Could not access microphone.');
    }
  };

  const handlePlayMicSample = async () => {
    if (!testerRef.current || micTestStatus === 'playing') return;
    try {
      setMicTestStatus('playing');
      await testerRef.current.playTestSample(() => {
        setMicTestStatus('ready_to_play');
      });
    } catch (err: any) {
      setMicTestError(err?.message || 'Playback error');
      setMicTestStatus('ready_to_play');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'voice', label: 'Voice', icon: Headphones },
    { id: 'personality', label: 'Personality', icon: Heart },
    { id: 'conversation', label: 'Conversation', icon: MessageSquare },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'emotion', label: 'Emotion', icon: Smile },
    { id: 'custom', label: 'Custom', icon: Sliders },
    { id: 'memory', label: 'Memory', icon: Bookmark },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-[#0d111c] to-[#080911] border border-pink-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  TAMANNA MASTER SETTINGS
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Voice & Companion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Personalized female voice, caring personality presets, daily management & audio controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePlayPreview()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isPlayingPreview
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/20'
              }`}
              title="Speak a live test sample with selected settings"
            >
              {isPlayingPreview ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview Tamanna</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10 Tab Navigation Bar */}
        <div className="flex border-b border-slate-800 px-3 bg-slate-950/60 overflow-x-auto gap-1 scrollbar-none py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-200">
          {/* TAB 1: VOICE */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Voice Response Enable Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-pink-400" />
                    Spoken Audio Responses
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    When enabled, Tamanna speaks aloud with real-time natural audio. When disabled, she responds in text subtitles.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ voiceResponseEnabled: !settings.voiceResponseEnabled })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    settings.voiceResponseEnabled ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Voice Selection Cards */}
              <div>
                <h4 className="text-xs font-mono uppercase text-pink-400 tracking-wider mb-2.5">
                  Select Tamanna Female Voice Identity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_VOICES.map((v) => {
                    const isSelected = settings.voice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleUpdate({ voice: v.id, speakingTone: v.recommendedTone })}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-950/30 border-pink-500 shadow-md shadow-pink-500/10'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-white">{v.name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              v.gender === 'female'
                                ? 'bg-pink-500/20 text-pink-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-xs text-pink-300/90 font-medium mb-1">{v.vibe}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                          {v.description}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPreview(v.previewPrompt);
                          }}
                          className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Hear Sample</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pitch, Speed, Volume & Expressiveness Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                {/* Speech Speed */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Speech Speed</span>
                    <span className="text-pink-400 font-mono">{settings.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.speed}
                    onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) })}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Controls speaking pace. 1.0x is natural cadence; 1.15x is punchy & energetic.
                  </p>
                </div>

                {/* Voice Pitch */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Voice Pitch</span>
                    <span className="text-pink-400 font-mono">{(settings.pitch || 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.pitch || 1.0}
                    onChange={(e) => handleUpdate({ pitch: parseFloat(e.target.value) })}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Fine-tune vocal tone height. Higher pitch gives youthful & cheerful expression.
                  </p>
                </div>

                {/* Expressiveness */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Vocal Expressiveness</span>
                    <span className="text-pink-400 font-mono">{settings.expressiveness || 85}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={settings.expressiveness || 85}
                    onChange={(e) => handleUpdate({ expressiveness: parseInt(e.target.value, 10) })}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dynamic vocal inflection and natural emotion modulation across sentences.
                  </p>
                </div>

                {/* Voice Volume */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Voice Volume</span>
                    <span className="text-pink-400 font-mono">{settings.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.volume}
                    onChange={(e) => handleUpdate({ volume: parseInt(e.target.value, 10) })}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Audio gain level for synthesized speech playback.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONALITY */}
          {activeTab === 'personality' && (
            <div className="space-y-6">
              {/* One-Tap Behavior Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-mono uppercase text-pink-400 tracking-wider">
                    One-Tap Personality Presets
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Instantly configures voice, tone, humor & affection
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(Object.keys(BEHAVIOR_PRESETS) as BehaviorPresetId[]).map((key) => {
                    const preset = BEHAVIOR_PRESETS[key];
                    const isSelected = settings.activePreset === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleApplyPreset(key)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-pink-950/40 border-pink-500 shadow-md shadow-pink-500/10 ring-1 ring-pink-500'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">{preset.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-pink-400" />}
                        </div>
                        <p className="text-xs text-pink-300/80 font-medium mb-1">{preset.tagline}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personality Mode, Affection, Humor, Playfulness Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                {/* Personality Mode */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Personality Mode
                  </label>
                  <select
                    value={settings.personalityMode || 'balanced'}
                    onChange={(e) => handleUpdate({ personalityMode: e.target.value as PersonalityMode })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="balanced">Balanced (Signature Tamanna)</option>
                    <option value="caring">Caring (Deep empathy & protection)</option>
                    <option value="friendly">Friendly (Approachable companion)</option>
                    <option value="playful">Playful (Banter & teasing)</option>
                    <option value="calm">Calm (Serene & peaceful)</option>
                    <option value="intelligent">Intelligent (Crisp & analytical)</option>
                    <option value="energetic">Energetic (Motivating & upbeat)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Defines Tamanna's core demeanor and relational approach with you.
                  </p>
                </div>

                {/* Affection Level */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Affection Level
                  </label>
                  <select
                    value={settings.affectionLevel || 'natural'}
                    onChange={(e) => handleUpdate({ affectionLevel: e.target.value as AffectionLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="low">Low (Polite & professional)</option>
                    <option value="natural">Natural (Warm everyday care)</option>
                    <option value="warm">Warm (Close companion phrasing)</option>
                    <option value="high">High (Deep affectionate care)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Controls affectionate phrasing like "सुनो", "अच्छा जी", "बताओ ना".
                  </p>
                </div>

                {/* Humor Level */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Humor Level
                  </label>
                  <select
                    value={settings.humorLevel || 'medium'}
                    onChange={(e) => handleUpdate({ humorLevel: e.target.value as HumorLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="low">Low (Straightforward & focused)</option>
                    <option value="medium">Medium (Light wit & good humor)</option>
                    <option value="high">High (Playful teasing & clever jokes)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Determines frequency of witty remarks and friendly humor.
                  </p>
                </div>

                {/* Playfulness Level */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Playfulness
                  </label>
                  <select
                    value={settings.playfulnessLevel || 'medium'}
                    onChange={(e) => handleUpdate({ playfulnessLevel: e.target.value as PlayfulnessLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="low">Low (Composed & steady)</option>
                    <option value="medium">Medium (Spirited & charming)</option>
                    <option value="high">High (Banter, reactions & teasing)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Adds lively banter and cute teasing reactions without being disrespectful.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONVERSATION */}
          {activeTab === 'conversation' && (
            <div className="space-y-4">
              {/* Proactive Conversation Initiator (तमन्ना खुद से बात करे) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900/60 border border-pink-500/40 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <h4 className="text-sm font-bold text-white">तमन्ना खुद से बात करे (Proactive Initiator)</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      तमन्ना केवल आपके सवाल का इंतज़ार नहीं करती—शांत होने पर खुद बातचीत शुरू करती है, हाल-चाल पूछती है और फॉलो-अप लेती है।
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdate({ proactiveConversation: !settings.proactiveConversation })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ml-3 ${
                      settings.proactiveConversation ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {settings.proactiveConversation && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Silence Timeout */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-1">
                        शांति का समय (Silence Detection Timeout)
                      </label>
                      <select
                        value={settings.proactiveSilenceSeconds || 20}
                        onChange={(e) => handleUpdate({ proactiveSilenceSeconds: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value={15}>15 Seconds (त्वरित बातचीत)</option>
                        <option value={20}>20 Seconds (संतुलित - Recommended)</option>
                        <option value={30}>30 Seconds (आराम से)</option>
                        <option value={45}>45 Seconds (लंबा ठहराव)</option>
                      </select>
                    </div>

                    {/* Proactive Categories Toggles */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.proactiveGreetings ?? true}
                          onChange={(e) => handleUpdate({ proactiveGreetings: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-950 text-pink-600 focus:ring-pink-500"
                        />
                        <span>समय अनुसार ग्रीट (Morning, Evening, Late Night)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.proactiveTopicFollowUp ?? true}
                          onChange={(e) => handleUpdate({ proactiveTopicFollowUp: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-950 text-pink-600 focus:ring-pink-500"
                        />
                        <span>पिछली बातों व प्रोजेक्ट्स का फॉलो-अप</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.proactiveMoodCheck ?? true}
                          onChange={(e) => handleUpdate({ proactiveMoodCheck: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-950 text-pink-600 focus:ring-pink-500"
                        />
                        <span>मूड व स्वास्थ्य का हाल पूछना (Well-being Check)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Natural Indian Expressions */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Natural Conversational Expressions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uses authentic colloquial phrases dynamically: “हम्म…”, “अच्छा जी…”, “अरे वाह!”, “ओह अच्छा!”, “सच में?”, “अच्छा सुनो…”, “समझ गई।”.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ naturalExpressions: !settings.naturalExpressions })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    settings.naturalExpressions ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Auto Follow-up */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Auto Follow-Up Questions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Asks natural short follow-up questions when useful to keep conversation flowing smoothly.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ autoFollowUp: !settings.autoFollowUp })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    settings.autoFollowUp ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Context Awareness */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Context Awareness & Reference Resolution</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Resolves referents like "isko", "it", "previous task", or "change that" using immediate conversational history.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ contextAwareness: !settings.contextAwareness })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    settings.contextAwareness ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Interruptible Voice */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Interruptible Voice (Barge-In)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immediately stops Tamanna's speech the instant you speak, providing natural conversational turn-taking.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ autoInterruptOnSpeech: !settings.autoInterruptOnSpeech })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    settings.autoInterruptOnSpeech ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Response Length Style */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                  Spoken Response Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short', 'balanced', 'detailed'] as ResponseStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleUpdate({ responseStyle: style })}
                      className={`p-2.5 rounded-lg border text-center text-xs font-semibold uppercase font-mono transition-all ${
                        settings.responseStyle === style
                          ? 'bg-pink-950/40 border-pink-500 text-pink-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Short: 1-2 punchy sentences. Balanced: natural 2-3 sentences. Detailed: thorough explanations when needed.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-2">Spoken Language Preference</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'Auto Detect', desc: 'Adapts to your speech' },
                    { id: 'hinglish', label: 'Hinglish', desc: 'Modern blend of Hindi & English' },
                    { id: 'hindi', label: 'Hindi (हिन्दी)', desc: 'Pure conversational Hindi' },
                    { id: 'english', label: 'English', desc: 'Clear modern English' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleUpdate({ language: lang.id as VoiceLanguage })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        settings.language === lang.id
                          ? 'bg-pink-950/40 border-pink-500 text-pink-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{lang.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{lang.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-pink-400" />
                  Multilingual Understanding Details
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Tamanna accurately understands Indian English accents, colloquial Hindi phrases ("arre yaar", "sun na", "theek hai"), common abbreviations, and rapid voice commands.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: EMOTION */}
          {activeTab === 'emotion' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-1">Contextual Emotional Adaptation</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Tamanna dynamically modifies her delivery based on conversational cues:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-emerald-400">Happy</span>
                    <p className="text-[10px] text-slate-400">Cheerful, upbeat voice</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-cyan-400">Excited</span>
                    <p className="text-[10px] text-slate-400">Energetic, punchy tempo</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-violet-400">Serious</span>
                    <p className="text-[10px] text-slate-400">Calm, mature & focused</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-pink-400">Concerned</span>
                    <p className="text-[10px] text-slate-400">Gentle caring & comforting</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-white block mb-1">Privacy Guarantee</span>
                Tamanna treats emotion recognition as an estimate based on your words and never claims infallible certainty or accesses unauthorized sensors.
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOMIZATION */}
          {activeTab === 'custom' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Fine-Tuned Custom Personality</h4>
                  <p className="text-xs text-slate-400">
                    Adjust specific personality sliders to shape your unique Tamanna companion.
                  </p>
                </div>
                <button
                  onClick={() => handlePlayPreview()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Test Tone</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                {[
                  { key: 'warmth', label: 'Warmth', desc: 'Friendliness & empathy' },
                  { key: 'care', label: 'Care', desc: 'Protective & supportive focus' },
                  { key: 'humor', label: 'Humor', desc: 'Light jokes & wit' },
                  { key: 'playfulness', label: 'Playfulness', desc: 'Banter & teasing reactions' },
                  { key: 'energy', label: 'Energy', desc: 'Pacing and enthusiasm' },
                  { key: 'formality', label: 'Formality', desc: 'Casual vs structured phrasing' },
                  { key: 'affection', label: 'Affection', desc: 'Companion endearments' },
                  { key: 'voiceExpressiveness', label: 'Expressiveness', desc: 'Melodic vocal variation' },
                ].map((item) => {
                  const val =
                    (settings.customPersonality as any)?.[item.key] ?? 70;
                  return (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{item.label}</span>
                        <span className="text-pink-400 font-mono">{val}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={val}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10);
                          handleUpdate({
                            customPersonality: {
                              ...settings.customPersonality,
                              [item.key]: num,
                            },
                          });
                        }}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Assistant Memory Active</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Remember useful preferences and task-related context across conversations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const assistant = PersonalAssistantService.getInstance();
                    assistant.updateSettings({ memoryEnabled: !assistant.getSettings().memoryEnabled });
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    PersonalAssistantService.getInstance().getSettings().memoryEnabled
                      ? 'bg-purple-600 justify-end'
                      : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-semibold text-white block">Strict Privacy Guardrails</span>
                <p className="text-slate-400">
                  Sensitive passwords, financial credentials, or private details are NEVER saved. You can review, edit, or delete any stored memory item at any time via the Memory AI dashboard.
                </p>
              </div>
            </div>
          )}

          {/* TAB 8: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Anti-Fake Execution & Privacy Standard
                </h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>No device action is pretended or faked without verified execution.</li>
                  <li>All daily tasks, notes, reminders, and schedule events are stored locally in your browser storage.</li>
                  <li>External calendar access is transparently reported as not connected until authenticated.</li>
                  <li>No telemetry or third-party ad tracking is conducted.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Reminder Audio Chime</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plays a gentle synthesized chime when any scheduled reminder becomes due.
                  </p>
                </div>
                <button
                  onClick={() => PersonalAssistantService.getInstance().playReminderChime()}
                  className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
                >
                  Test Chime
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-sm font-semibold text-white">Browser Notifications</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Current status: {PersonalAssistantService.getInstance().getSnapshot().notificationPermission}
                  </p>
                </div>
                <button
                  onClick={() => PersonalAssistantService.getInstance().requestNotificationPermission()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                >
                  Request Permission
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Hardware Mic Diagnostics */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Mic className="w-4 h-4 text-pink-400" />
                      Hardware Microphone Diagnostics
                    </h4>
                    <p className="text-xs text-slate-400">
                      Real audio input verification, signal-to-noise check & frequency visualizer
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {micTestStatus === 'ready_to_play' && (
                      <button
                        onClick={handlePlayMicSample}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Play Sample
                      </button>
                    )}
                    <button
                      onClick={handleStartMicTest}
                      disabled={micTestStatus === 'recording' || micTestStatus === 'playing'}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-50"
                    >
                      {micTestStatus === 'recording' ? 'Testing...' : 'Test Microphone'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {micTestStatus === 'recording' && (
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-pink-500 h-full transition-all duration-75"
                      style={{ width: `${micTestProgress}%` }}
                    />
                  </div>
                )}

                {/* Spectrum Canvas */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={50}
                  className="w-full h-12 bg-slate-950 rounded-lg border border-slate-800 mb-2"
                />

                {micTestResult && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-2 rounded-lg bg-slate-950">
                    <div>
                      <span className="text-slate-400 text-[10px]">Peak Level</span>
                      <p className="font-mono text-white font-bold">{micTestResult.peakDb} dB</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Average Level</span>
                      <p className="font-mono text-white font-bold">{micTestResult.avgDb} dB</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Noise Level</span>
                      <p className="font-mono text-emerald-400 font-bold capitalize">
                        {micTestResult.backgroundNoiseLevel}
                      </p>
                    </div>
                  </div>
                )}

                {micTestError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">{micTestError}</p>
                )}
              </div>

              {/* Hardware DSP Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                {[
                  { key: 'noiseSuppression', label: 'Noise Suppression', desc: 'Cancels background fan/room noise' },
                  { key: 'echoCancellation', label: 'Acoustic Echo Cancellation', desc: 'Prevents feedback loop with speaker' },
                  { key: 'autoGainControl', label: 'Auto Gain Control (AGC)', desc: 'Levels out loud and quiet speaking' },
                  { key: 'highpassFilter', label: '80Hz Highpass Filter', desc: 'Filters low-frequency desk rumbles' },
                ].map((dsp) => {
                  const isChecked = Boolean((settings as any)[dsp.key]);
                  return (
                    <div key={dsp.key} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950">
                      <div>
                        <span className="text-xs font-semibold text-white block">{dsp.label}</span>
                        <span className="text-[10px] text-slate-400">{dsp.desc}</span>
                      </div>
                      <button
                        onClick={() => handleUpdate({ [dsp.key]: !isChecked })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          isChecked ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <div className="bg-white w-3.5 h-3.5 rounded-full shadow" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Reset Settings Section */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-2">Reset Settings</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setResetConfirmType('personality')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700"
                  >
                    Reset Tamanna Personality
                  </button>
                  <button
                    onClick={() => setResetConfirmType('voice')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700"
                  >
                    Reset Tamanna Voice
                  </button>
                  <button
                    onClick={() => setResetConfirmType('all')}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-xs font-medium text-rose-300 border border-rose-500/40"
                  >
                    Reset All Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Confirmation Dialog Overlay */}
        {resetConfirmType !== 'none' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-pink-500/40 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Confirm Reset</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {resetConfirmType === 'personality'
                  ? 'Are you sure you want to restore Tamanna’s personality and companion mode to defaults?'
                  : resetConfirmType === 'voice'
                  ? 'Are you sure you want to reset speech speed, pitch, volume, and voice selection to defaults?'
                  : 'Are you sure you want to reset all Tamanna voice and personality settings to defaults? Your saved tasks and conversation history will not be deleted.'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setResetConfirmType('none')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteReset}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
