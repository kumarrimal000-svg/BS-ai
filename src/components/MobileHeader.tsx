import React from 'react';
import { Sparkles, Activity, Settings, Volume2, ShieldCheck, Wifi } from 'lucide-react';
import { AssistantState, ThemeMood } from '../types/assistant';

interface MobileHeaderProps {
  state: AssistantState;
  themeMood: ThemeMood;
  onOpenSettings: () => void;
  onOpenQuickMenu?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  state,
  themeMood,
  onOpenSettings,
}) => {
  // Color styling based on state
  const statusColor =
    state === 'speaking'
      ? 'text-pink-400 bg-pink-500/10 border-pink-500/30'
      : state === 'listening'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : state === 'connecting'
      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      : 'text-slate-400 bg-slate-800/40 border-slate-700/40';

  const statusLabel =
    state === 'speaking'
      ? 'Speaking'
      : state === 'listening'
      ? 'Listening'
      : state === 'connecting'
      ? 'Connecting'
      : 'Ready';

  return (
    <header className="w-full max-w-md mx-auto px-4 pt-3 pb-2 flex items-center justify-between z-30 select-none">
      {/* Left: Branding & Sparkle */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 p-[1.5px] shadow-[0_0_15px_rgba(236,72,153,0.35)] flex items-center justify-center">
          <div className="w-full h-full bg-[#0b0c16] rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#07080e]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-200 to-purple-300 font-sans">
              TAMANNA
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold tracking-wider">
              AI
            </span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-tight flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Next-Gen Voice Assistant</span>
          </p>
        </div>
      </div>

      {/* Right: Live Status Pill & Settings Icon */}
      <div className="flex items-center gap-2">
        <div
          className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium flex items-center gap-1.5 backdrop-blur-md transition-all duration-300 ${statusColor}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              state === 'speaking'
                ? 'bg-pink-400 animate-ping'
                : state === 'listening'
                ? 'bg-emerald-400 animate-pulse'
                : state === 'connecting'
                ? 'bg-cyan-400 animate-spin'
                : 'bg-slate-400'
            }`}
          />
          <span>{statusLabel}</span>
        </div>

        <button
          onClick={onOpenSettings}
          aria-label="Open Settings"
          className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-pink-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 active:scale-95"
        >
          <Settings className="w-4 h-4 text-purple-300 hover:rotate-45 transition-transform" />
        </button>
      </div>
    </header>
  );
};
