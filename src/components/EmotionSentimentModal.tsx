import React, { useState } from 'react';
import {
  Heart,
  Smile,
  Frown,
  AlertTriangle,
  Zap,
  Coffee,
  CheckCircle2,
  HelpCircle,
  Activity,
  X,
  Sparkles,
  Shield,
  ShieldCheck,
  Settings2,
  Clock,
  Trash2,
  Play,
  RotateCcw,
  Mic,
  Volume2,
  Sliders,
  PhoneCall,
  Info,
} from 'lucide-react';
import {
  DetectedEmotion,
  EmotionConfidence,
  EmotionHistoryItem,
  EmotionSettings,
  EmotionStateSnapshot,
  RecommendedTone,
  SentimentType,
} from '../types/emotion';
import { EmotionEngine } from '../services/emotionEngine';

interface EmotionSentimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: EmotionStateSnapshot;
  onSendTestPrompt?: (promptText: string) => void;
}

const EMOTION_BADGES: Record<
  DetectedEmotion,
  { label: string; hindi: string; color: string; border: string; bg: string }
> = {
  happy: { label: 'Happy', hindi: 'खुश', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/40' },
  excited: { label: 'Excited', hindi: 'उत्साहित', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-950/40' },
  calm: { label: 'Calm', hindi: 'शांत', color: 'text-teal-400', border: 'border-teal-500/40', bg: 'bg-teal-950/40' },
  frustrated: { label: 'Frustrated', hindi: 'परेशान', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-950/40' },
  angry: { label: 'Angry', hindi: 'क्रोधित', color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-950/50' },
  confused: { label: 'Confused', hindi: 'उलझन में', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/40' },
  worried: { label: 'Worried', hindi: 'चिंतित', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-950/40' },
  sad: { label: 'Sad', hindi: 'उदास', color: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-950/40' },
  tired: { label: 'Tired', hindi: 'थका हुआ', color: 'text-slate-400', border: 'border-slate-500/40', bg: 'bg-slate-900/60' },
  neutral: { label: 'Neutral', hindi: 'सामान्य', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/30' },
};

const SAMPLE_PROMPTS = [
  { text: 'Bohat thak gaya hoon yaar, aaj pura din busy tha.', emotion: 'tired', desc: 'Fatigue / Low Energy' },
  { text: 'Kuch samajh nahi aa raha, ye process kaise kaam karta hai?', emotion: 'confused', desc: 'Confusion / Simplify' },
  { text: 'Arre wah! Yeh feature kitna kamaal ka hai, maza aa gaya!', emotion: 'excited', desc: 'Excited / High Energy' },
  { text: 'Dimag kharab ho raha hai mera, bar bar fail ho raha hai!', emotion: 'frustrated', desc: 'Frustration / Calm support' },
  { text: 'Main gussa nahi hoon, bas aaram se solution chahiye.', emotion: 'calm', desc: 'Negation Awareness' },
  { text: 'Bohot tension ho rahi hai kal ke interview ko lekar.', emotion: 'worried', desc: 'Worried / Reassurance' },
  { text: 'Tamanna, aaj ka din bohot achha raha!', emotion: 'happy', desc: 'Happy / Banter' },
];

export const EmotionSentimentModal: React.FC<EmotionSentimentModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onSendTestPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trajectory' | 'sandbox' | 'settings'>('overview');
  const engine = EmotionEngine.getInstance();

  if (!isOpen) return null;

  const currentBadge = EMOTION_BADGES[snapshot.activeEmotion] || EMOTION_BADGES.neutral;

  const handleToggle = (key: keyof EmotionSettings) => {
    const current = snapshot.settings[key];
    if (typeof current === 'boolean') {
      engine.saveSettings({ [key]: !current });
    }
  };

  const handleEmpathyChange = (level: 'subtle' | 'balanced' | 'supportive') => {
    engine.saveSettings({ empathyLevel: level });
  };

  const handleClearHistory = () => {
    engine.clearHistory();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Heart className="w-5 h-5 fill-pink-500/30" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Emotion & Sentiment Understanding
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Adaptive Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Contextual emotional awareness & empathetic conversational response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/20 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live State</span>
          </button>
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'trajectory'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Trajectory ({snapshot.history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'sandbox'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Emotion Sandbox</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'settings'
                ? 'border-pink-500 text-pink-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Settings & Privacy</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & LIVE STATE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Active Emotion Card */}
              <div
                className={`p-5 rounded-2xl border backdrop-blur-md ${currentBadge.bg} ${currentBadge.border}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Current Detected Emotion (Estimate)
                    </span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <h3 className={`text-2xl font-black tracking-tight ${currentBadge.color}`}>
                        {currentBadge.label}
                      </h3>
                      <span className="text-base text-slate-400 font-medium">({currentBadge.hindi})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-slate-300">
                      Confidence: {snapshot.confidence} (
                      {Math.round(snapshot.confidenceScore * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Sentiment</span>
                    <div className="font-semibold text-slate-200 capitalize mt-0.5">
                      {snapshot.activeSentiment} ({snapshot.sentimentScore >= 0 ? '+' : ''}
                      {snapshot.sentimentScore})
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Recommended Tone</span>
                    <div className="font-semibold text-pink-300 capitalize mt-0.5">
                      {snapshot.recommendedTone.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Acoustic Sensor</span>
                    <div className="font-semibold text-emerald-400 mt-0.5 flex items-center space-x-1">
                      <Volume2 className="w-3 h-3" />
                      <span>{snapshot.acousticStatus === 'active' ? 'Mic Active' : 'Text Only'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Empathy Level</span>
                    <div className="font-semibold text-slate-200 capitalize mt-0.5">
                      {snapshot.settings.empathyLevel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spoken Adaptation Directive */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-pink-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Tamanna's Spoken Adaptation Directive</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-slate-800">
                  {snapshot.adaptationDirective}
                </p>
                {snapshot.tentativeDisclaimer && (
                  <div className="text-xs text-amber-300/90 italic bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-semibold not-italic">Tentative Phrasing: </span>"
                    {snapshot.tentativeDisclaimer}"
                  </div>
                )}
              </div>

              {/* Detected Linguistic Signals */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Detected Linguistic Signals & Context</span>
                  <span className="text-[11px] text-slate-500">
                    {snapshot.lastLinguisticSignals.length} signals
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.lastLinguisticSignals.length > 0 ? (
                    snapshot.lastLinguisticSignals.map((sig, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700/60"
                      >
                        {sig}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      No strong emotional markers detected yet in current session.
                    </span>
                  )}
                </div>
              </div>

              {/* Safety Distress Alert (if triggered) */}
              {snapshot.safetyRisk && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-2">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                    <PhoneCall className="w-4 h-4" />
                    <span>Protective Care & Distress Protocol</span>
                  </div>
                  <p className="text-xs text-rose-200">
                    Severe distress detected. Tamanna responds with calm empathy and strongly encourages reaching out to trusted support or dedicated helplines:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-black/40 border border-rose-500/30">
                      <span className="font-semibold text-rose-300">Tele-MANAS:</span> 14416 / 1800-891-4416
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-rose-500/30">
                      <span className="font-semibold text-rose-300">Kiran Helpline:</span> 1800-599-0019
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRAJECTORY & HISTORY */}
          {activeTab === 'trajectory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Showing recent emotional turns ({snapshot.history.length})
                </span>
                {snapshot.history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {snapshot.history.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No emotion history recorded yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Start speaking or test one of the sample prompts in the Sandbox!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...snapshot.history].reverse().map((item) => {
                    const badge = EMOTION_BADGES[item.primaryEmotion] || EMOTION_BADGES.neutral;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${badge.bg} ${badge.border} ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-slate-400 capitalize">
                              Sentiment: {item.sentiment} ({item.sentimentScore})
                            </span>
                          </div>
                          <span className="text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="text-xs text-slate-200 font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                          "{item.text}"
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                          <span className="font-semibold text-pink-400">Adaptation:</span>
                          <span className="line-clamp-1">{item.adaptationSummary}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMOTION SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                Click any realistic prompt below to test how Tamanna estimates emotional context, respects negation, and adapts her spoken cadence:
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_PROMPTS.map((sample, idx) => {
                  const badge = EMOTION_BADGES[sample.emotion as DetectedEmotion] || EMOTION_BADGES.neutral;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1 pr-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.border} ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-slate-400">{sample.desc}</span>
                        </div>
                        <p className="text-xs text-slate-200">"{sample.text}"</p>
                      </div>

                      <button
                        onClick={() => {
                          engine.analyzeUtterance(sample.text);
                          if (onSendTestPrompt) {
                            onSendTestPrompt(sample.text);
                          }
                          setActiveTab('overview');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shrink-0 flex items-center space-x-1 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Test</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & PRIVACY */}
          {activeTab === 'settings' && (
            <div className="space-y-5 text-xs">
              {/* Feature Toggles */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                <h4 className="font-bold text-white text-sm">System Controls</h4>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-semibold text-slate-200">Emotion Engine Active</div>
                    <div className="text-[11px] text-slate-400">
                      Enable real-time linguistic sentiment and mood estimation
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={snapshot.settings.enabled}
                    onChange={() => handleToggle('enabled')}
                    className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Adaptive Spoken Cadence</div>
                    <div className="text-[11px] text-slate-400">
                      Automatically adjust tone and explanation style based on emotional cues
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={snapshot.settings.adaptiveToneResponse}
                    onChange={() => handleToggle('adaptiveToneResponse')}
                    className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Acoustic Audio Metrics</div>
                    <div className="text-[11px] text-slate-400">
                      Include microphone RMS volume and variance when voice is streaming
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={snapshot.settings.acousticAnalysisEnabled}
                    onChange={() => handleToggle('acousticAnalysisEnabled')}
                    className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Show Mood Indicator on Screen</div>
                    <div className="text-[11px] text-slate-400">
                      Display HUD card showing active emotion estimate and response style
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={snapshot.settings.showMoodIndicator}
                    onChange={() => handleToggle('showMoodIndicator')}
                    className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Empathy Level */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-white text-sm">Empathy & Cadence Level</h4>
                <p className="text-[11px] text-slate-400">
                  Adjust how overtly Tamanna expresses empathy in her spoken voice responses:
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['subtle', 'balanced', 'supportive'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleEmpathyChange(lvl)}
                      className={`p-2.5 rounded-xl border text-center capitalize transition-all ${
                        snapshot.settings.empathyLevel === lvl
                          ? 'bg-pink-600/20 border-pink-500 text-pink-300 font-bold'
                          : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strict Privacy & Trust Notice */}
              <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Privacy & Trust Guarantees</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-teal-200/90 leading-relaxed list-disc list-inside">
                  <li>
                    <strong>Probabilistic Estimates Only:</strong> Tamanna treats all emotion detection as estimates, never claiming absolute mind-reading.
                  </li>
                  <li>
                    <strong>No Fake Biometrics:</strong> Tamanna never claims to analyze facial expressions, eye contact, or body language.
                  </li>
                  <li>
                    <strong>Honest Audio Metrics:</strong> When mic acoustics are offline or user is typing, Tamanna strictly relies on text/context.
                  </li>
                  <li>
                    <strong>Zero Judgment:</strong> Sentiment analysis is used exclusively to assist better communication, never to judge the user.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
