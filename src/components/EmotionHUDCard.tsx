import React from 'react';
import {
  Heart,
  Smile,
  Frown,
  AlertTriangle,
  Zap,
  Coffee,
  CheckCircle2,
  HelpCircle,
  Shield,
  Activity,
  X,
  Sparkles,
  ChevronRight,
  PhoneCall,
  Mic,
  Volume2,
} from 'lucide-react';
import {
  DetectedEmotion,
  EmotionConfidence,
  EmotionStateSnapshot,
  RecommendedTone,
  SentimentType,
} from '../types/emotion';

interface EmotionHUDCardProps {
  snapshot: EmotionStateSnapshot;
  onOpenModal: () => void;
  onDismiss?: () => void;
}

const EMOTION_CONFIG: Record<
  DetectedEmotion,
  { label: string; hindiLabel: string; color: string; border: string; bg: string; icon: React.ReactNode }
> = {
  happy: {
    label: 'Happy',
    hindiLabel: 'खुश',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/40',
    icon: <Smile className="w-4 h-4 text-emerald-400" />,
  },
  excited: {
    label: 'Excited',
    hindiLabel: 'उत्साहित',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/40',
    icon: <Zap className="w-4 h-4 text-amber-400 animate-pulse" />,
  },
  calm: {
    label: 'Calm',
    hindiLabel: 'शांत',
    color: 'text-teal-400',
    border: 'border-teal-500/40',
    bg: 'bg-teal-950/40',
    icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
  },
  frustrated: {
    label: 'Frustrated',
    hindiLabel: 'परेशान',
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/40',
    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
  },
  angry: {
    label: 'Angry',
    hindiLabel: 'क्रोधित',
    color: 'text-red-500',
    border: 'border-red-500/50',
    bg: 'bg-red-950/50',
    icon: <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />,
  },
  confused: {
    label: 'Confused',
    hindiLabel: 'उलझन में',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/40',
    icon: <HelpCircle className="w-4 h-4 text-purple-400" />,
  },
  worried: {
    label: 'Worried',
    hindiLabel: 'चिंतित',
    color: 'text-yellow-400',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-950/40',
    icon: <Activity className="w-4 h-4 text-yellow-400" />,
  },
  sad: {
    label: 'Sad',
    hindiLabel: 'उदास',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-950/40',
    icon: <Frown className="w-4 h-4 text-sky-400" />,
  },
  tired: {
    label: 'Tired',
    hindiLabel: 'थका हुआ',
    color: 'text-slate-400',
    border: 'border-slate-500/40',
    bg: 'bg-slate-900/60',
    icon: <Coffee className="w-4 h-4 text-slate-400" />,
  },
  neutral: {
    label: 'Neutral',
    hindiLabel: 'सामान्य',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/30',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
  },
};

const SENTIMENT_COLORS: Record<SentimentType, { label: string; badge: string }> = {
  positive: { label: 'Positive', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  negative: { label: 'Negative', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  neutral: { label: 'Neutral', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  mixed: { label: 'Mixed', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

const TONE_NAMES: Record<RecommendedTone, string> = {
  calm_supportive: 'Calm & Supportive',
  energetic_vibrant: 'High Energy & Vibrant',
  simplified_clear: 'Simple & Step-by-Step',
  gentle_empathetic: 'Gentle Empathy',
  natural_playful: 'Witty & Playful Banter',
};

export const EmotionHUDCard: React.FC<EmotionHUDCardProps> = ({ snapshot, onOpenModal, onDismiss }) => {
  if (!snapshot.settings.enabled || !snapshot.settings.showMoodIndicator) {
    return null;
  }

  const emotionInfo = EMOTION_CONFIG[snapshot.activeEmotion] || EMOTION_CONFIG.neutral;
  const sentimentInfo = SENTIMENT_COLORS[snapshot.activeSentiment] || SENTIMENT_COLORS.neutral;

  return (
    <div
      className={`relative w-full max-w-md mx-auto backdrop-blur-xl border rounded-2xl p-3.5 shadow-2xl transition-all duration-300 ${emotionInfo.bg} ${emotionInfo.border} text-slate-200 select-none z-20`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10">
            {emotionInfo.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold tracking-wider uppercase ${emotionInfo.color}`}>
                {emotionInfo.label} ({emotionInfo.hindiLabel})
              </span>
              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10">
                Estimate • {snapshot.confidence}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center space-x-1.5">
              <span>Sentiment:</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] border ${sentimentInfo.badge}`}>
                {sentimentInfo.label} ({snapshot.sentimentScore >= 0 ? '+' : ''}
                {snapshot.sentimentScore})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenModal}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Open Emotion & Sentiment Hub"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Close card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Adaptive Response Directive */}
      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Response Style:</span>
          <span className="font-medium text-pink-300">
            {TONE_NAMES[snapshot.recommendedTone]}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed bg-black/30 p-2 rounded-xl border border-white/5">
          {snapshot.adaptationDirective}
        </p>

        {snapshot.tentativeDisclaimer && (
          <div className="text-[11px] text-amber-300/90 italic bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
            "{snapshot.tentativeDisclaimer}"
          </div>
        )}
      </div>

      {/* Acoustic & Privacy Transparency Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center space-x-1.5">
          {snapshot.acousticStatus === 'active' ? (
            <>
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Mic Acoustic Level: {snapshot.acousticMetrics?.volumeRms.toFixed(2)}</span>
            </>
          ) : (
            <>
              <Mic className="w-3 h-3 text-slate-500" />
              <span>Text/Context Analysis • No Audio Sensors Pretended</span>
            </>
          )}
        </div>

        <button
          onClick={onOpenModal}
          className="text-pink-400 hover:underline flex items-center space-x-0.5"
        >
          <span>Emotion Hub</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Safety Alert (if distress detected) */}
      {snapshot.safetyRisk && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start space-x-2">
          <PhoneCall className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-300">Care & Support Available</div>
            <p className="text-[11px] text-rose-200/90 leading-tight mt-0.5">
              Distress detected. Please connect with someone you trust or reach Tele-MANAS (14416 / 1800-891-4416) or Kiran (1800-599-0019).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
