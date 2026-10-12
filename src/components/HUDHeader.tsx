import React from 'react';
import { Volume2, Palette, Maximize2, Minimize2, Sparkles, Layers, Camera, Settings2, MessageSquare, Scale, Brain, Headphones, Bookmark, Cpu, BookOpen, Heart, CalendarCheck } from 'lucide-react';
import { AssistantState, ThemeMood } from '../types/assistant';

interface HUDHeaderProps {
  state: AssistantState;
  themeMood: ThemeMood;
  selectedVoice: string;
  onThemeChange: (mood: ThemeMood) => void;
  onVoiceChange: (voice: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenRegistry: () => void;
  onOpenCamera: () => void;
  onOpenDeviceSettings: () => void;
  onOpenHistory: () => void;
  onOpenDecisionHub?: () => void;
  onOpenLearningHub?: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenMemoryHub?: () => void;
  onOpenContextPanel?: () => void;
  isContextPanelOpen?: boolean;
  onOpenResearchHub?: () => void;
  onOpenEmotionHub?: () => void;
  onOpenDailyPlanner?: () => void;
}

const VOICES = [
  { id: 'Aoede', name: 'Aoede', vibe: 'Sassy & Playful' },
  { id: 'Kore', name: 'Kore', vibe: 'Calm & Smooth' },
  { id: 'Zephyr', name: 'Zephyr', vibe: 'Energetic & Vibrant' },
  { id: 'Puck', name: 'Puck', vibe: 'Playful & Cheeky' },
  { id: 'Charon', name: 'Charon', vibe: 'Deep & Professional' },
  { id: 'Fenrir', name: 'Fenrir', vibe: 'Bold & Dynamic' },
];

const THEMES: { id: ThemeMood; name: string; color: string }[] = [
  { id: 'magenta', name: 'Magenta', color: '#ff2d87' },
  { id: 'cyan', name: 'Cyan', color: '#00f0ff' },
  { id: 'violet', name: 'Violet', color: '#a855f7' },
  { id: 'emerald', name: 'Emerald', color: '#00ff9d' },
  { id: 'amber', name: 'Amber', color: '#ffb703' },
];

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  state,
  themeMood,
  selectedVoice,
  onThemeChange,
  onVoiceChange,
  isFullscreen,
  onToggleFullscreen,
  onOpenRegistry,
  onOpenCamera,
  onOpenDeviceSettings,
  onOpenHistory,
  onOpenDecisionHub,
  onOpenLearningHub,
  onOpenVoiceSettings,
  onOpenMemoryHub,
  onOpenContextPanel,
  isContextPanelOpen,
  onOpenResearchHub,
  onOpenEmotionHub,
  onOpenDailyPlanner,
}) => {
  return (
    <header className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-800/60 bg-[#07080e]/85 backdrop-blur-md z-30 select-none">
      {/* Brand & Persona Info - Zero Pill compliant typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-pink-400 via-rose-300 to-white bg-clip-text text-transparent">
            TAMANNA AI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span>Sassy & Flirty Persona</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>246 Tools Active</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-300 capitalize">{selectedVoice}</span>
        </div>
      </div>

      {/* Action shortcuts & Controls */}
      <div className="flex items-center gap-2">
        {/* Daily Planner & Tasks Button */}
        {onOpenDailyPlanner && (
          <button
            onClick={onOpenDailyPlanner}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm font-mono font-medium"
            title="Personal Assistant & Daily Management"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Planner</span>
          </button>
        )}

        {/* Emotion & Sentiment Hub Button */}
        {onOpenEmotionHub && (
          <button
            onClick={onOpenEmotionHub}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm font-mono font-medium"
            title="Emotion & Sentiment Understanding Hub"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-500/30" />
            <span className="hidden sm:inline">Emotion AI</span>
          </button>
        )}

        {/* Knowledge & Research Hub Button */}
        {onOpenResearchHub && (
          <button
            onClick={onOpenResearchHub}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm font-mono font-medium"
            title="Knowledge & Research Intelligence Hub"
          >
            <BookOpen className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Research AI</span>
          </button>
        )}

        {/* Situational Context & Task Debugger Button */}
        {onOpenContextPanel && (
          <button
            onClick={onOpenContextPanel}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors shadow-sm font-mono font-medium ${
              isContextPanelOpen
                ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-400'
                : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/40'
            }`}
            title="Situational Intelligence & Context Debugger"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Context AI</span>
          </button>
        )}

        {/* Advanced Memory & Personalization Hub Button */}
        {onOpenMemoryHub && (
          <button
            onClick={onOpenMemoryHub}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            title="Advanced Memory & Personalization Dashboard"
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline font-mono font-medium">Memory AI</span>
          </button>
        )}

        {/* Advanced Voice Intelligence Settings Button */}
        {onOpenVoiceSettings && (
          <button
            onClick={onOpenVoiceSettings}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            title="Advanced Voice Intelligence & Microphone Diagnostics"
          >
            <Headphones className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline font-mono font-medium">Voice AI</span>
          </button>
        )}

        {/* Self-Learning & Adaptive Intelligence Hub Button */}
        {onOpenLearningHub && (
          <button
            onClick={onOpenLearningHub}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            title="Self-Learning & Adaptive Intelligence Dashboard"
          >
            <Brain className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden md:inline font-mono font-medium">Adaptive AI</span>
          </button>
        )}

        {/* Decision Support System Hub Button */}
        {onOpenDecisionHub && (
          <button
            onClick={onOpenDecisionHub}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/40 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            title="Decision Support Hub (Compare Options & Balance Priorities)"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline font-mono font-medium">Decisions</span>
          </button>
        )}

        {/* Tool Registry Button */}
        <button
          onClick={onOpenRegistry}
          className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-pink-300 hover:text-white border border-pink-500/40 px-2.5 py-1.5 rounded-lg transition-colors"
          title="Browse all 246 Registered Tools"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono font-medium">246 Tools</span>
        </button>

        {/* Conversation Memory History Button */}
        <button
          onClick={onOpenHistory}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
          title="Conversation Memory & Feedback"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Camera Quick Button */}
        <button
          onClick={onOpenCamera}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
          title="Open Camera Viewfinder"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Device Settings Quick Button */}
        <button
          onClick={onOpenDeviceSettings}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
          title="Device System Controls"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Voice Selector */}
        <div className="relative group hidden sm:block">
          <select
            value={selectedVoice}
            disabled={state === 'connecting' || state === 'listening' || state === 'speaking'}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="text-xs bg-slate-900/90 text-slate-300 border border-slate-700/80 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-500 cursor-pointer disabled:opacity-50"
            title="Choose voice tone"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.vibe})
              </option>
            ))}
          </select>
        </div>

        {/* Theme Mood Picker */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800/80 rounded-lg p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              title={`Switch to ${t.name} neon`}
              className={`w-4 h-4 rounded-full transition-transform ${
                themeMood === t.id ? 'scale-110 ring-2 ring-white/60' : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.color }}
            />
          ))}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
