import React from 'react';
import { Mic, MicOff, Power, Square, Volume2, Sparkles } from 'lucide-react';
import { AssistantState, ThemeMood } from '../types/assistant';

interface CentralMicButtonProps {
  state: AssistantState;
  themeMood: ThemeMood;
  onToggleSession: () => void;
  onInterrupt: () => void;
  onTriggerProactive?: () => void;
}

const BUTTON_THEMES: Record<ThemeMood, {
  border: string;
  glow: string;
  gradient: string;
  activeRing: string;
}> = {
  magenta: {
    border: 'border-pink-500/50',
    glow: 'shadow-[0_0_40px_rgba(255,45,135,0.45)]',
    gradient: 'from-pink-600 via-rose-600 to-purple-800',
    activeRing: 'ring-pink-500/40',
  },
  cyan: {
    border: 'border-cyan-400/50',
    glow: 'shadow-[0_0_40px_rgba(0,240,255,0.45)]',
    gradient: 'from-cyan-500 via-sky-600 to-blue-800',
    activeRing: 'ring-cyan-400/40',
  },
  violet: {
    border: 'border-purple-400/50',
    glow: 'shadow-[0_0_40px_rgba(168,85,247,0.45)]',
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-900',
    activeRing: 'ring-purple-400/40',
  },
  emerald: {
    border: 'border-emerald-400/50',
    glow: 'shadow-[0_0_40px_rgba(0,255,157,0.45)]',
    gradient: 'from-emerald-500 via-teal-600 to-green-900',
    activeRing: 'ring-emerald-400/40',
  },
  amber: {
    border: 'border-amber-400/50',
    glow: 'shadow-[0_0_40px_rgba(255,183,3,0.45)]',
    gradient: 'from-amber-500 via-orange-600 to-red-900',
    activeRing: 'ring-amber-400/40',
  },
};

export const CentralMicButton: React.FC<CentralMicButtonProps> = ({
  state,
  themeMood,
  onToggleSession,
  onInterrupt,
  onTriggerProactive,
}) => {
  const theme = BUTTON_THEMES[themeMood];
  const isConnected = state === 'listening' || state === 'speaking' || state === 'connecting';

  const handleClick = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }

    if (state === 'speaking') {
      // Tapping while speaking interrupts or disconnects
      onInterrupt();
    } else {
      onToggleSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 select-none">
      {/* Central Ergonomic Button */}
      <div className="relative flex items-center justify-center">
        {/* Animated Radial Ripple Rings */}
        {isConnected && (
          <>
            <div
              className={`absolute -inset-4 rounded-full border border-current opacity-25 animate-ping pointer-events-none ${
                state === 'speaking' ? 'text-rose-400' : 'text-cyan-400'
              }`}
            />
            <div
              className={`absolute -inset-2 rounded-full border border-dashed border-current opacity-30 animate-spin [animation-duration:12s] pointer-events-none ${
                state === 'speaking' ? 'text-pink-400' : 'text-sky-400'
              }`}
            />
          </>
        )}

        <button
          onClick={handleClick}
          aria-label={
            state === 'disconnected'
              ? 'Start voice session with Tamanna'
              : state === 'speaking'
              ? 'Interrupt Tamanna'
              : 'End voice session'
          }
          className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white border ${
            state === 'disconnected'
              ? 'bg-slate-900/90 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
              : state === 'connecting'
              ? `bg-gradient-to-tr ${theme.gradient} border-white/60 text-white animate-pulse ${theme.glow}`
              : state === 'speaking'
              ? `bg-gradient-to-tr ${theme.gradient} border-white/80 text-white ${theme.glow} ring-4 ${theme.activeRing}`
              : `bg-gradient-to-tr ${theme.gradient} border-white/70 text-white ${theme.glow} ring-2 ${theme.activeRing}`
          }`}
        >
          {state === 'disconnected' && (
            <Power className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
          )}

          {state === 'connecting' && (
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          )}

          {state === 'listening' && (
            <div className="relative flex items-center justify-center">
              <Mic className="w-9 h-9 animate-bounce [animation-duration:1.8s]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}

          {state === 'speaking' && (
            <div className="relative flex items-center justify-center">
              <Volume2 className="w-9 h-9 animate-pulse" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
            </div>
          )}
        </button>
      </div>

      {/* Button Sub-Label */}
      <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-slate-300">
        {state === 'disconnected' && (
          <span className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={onToggleSession}>
            TAP TO WAKE
          </span>
        )}

        {state === 'connecting' && (
          <span className="text-cyan-300 flex items-center gap-1.5 animate-pulse">
            INITIALIZING LIVE AUDIO
          </span>
        )}

        {state === 'listening' && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300">MIC ACTIVE</span>
            {onTriggerProactive && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <button
                  onClick={onTriggerProactive}
                  className="text-pink-300 hover:text-white transition-all bg-pink-500/20 hover:bg-pink-500/35 border border-pink-500/40 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-sans active:scale-95 shadow-sm shadow-pink-500/20"
                >
                  <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                  <span>तमन्ना, तुम बोलो</span>
                </button>
              </>
            )}
            <span aria-hidden="true" className="text-slate-600">·</span>
            <button
              onClick={onToggleSession}
              className="text-slate-400 hover:text-rose-400 transition-colors underline decoration-slate-600 underline-offset-4 text-[10px]"
            >
              DISCONNECT
            </button>
          </div>
        )}

        {state === 'speaking' && (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            <span className="text-pink-300 font-medium">TAMANNA SPEAKING</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <button
              onClick={onInterrupt}
              className="text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px]"
            >
              INTERRUPT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
