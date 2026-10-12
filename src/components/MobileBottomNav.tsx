import React from 'react';
import { Home, Grid, Mic, Clock, Settings, Camera } from 'lucide-react';
import { AssistantState } from '../types/assistant';

export type MobileTab = 'home' | 'tools' | 'bscamera' | 'mic' | 'history' | 'settings';

interface MobileBottomNavProps {
  currentTab: MobileTab;
  state: AssistantState;
  onTabChange: (tab: MobileTab) => void;
  onMicPress: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  state,
  onTabChange,
  onMicPress,
}) => {
  const isVoiceActive = state === 'listening' || state === 'speaking' || state === 'connecting';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-purple-500/20 px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.8)] select-none"
      aria-label="Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-between px-1 relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
            currentTab === 'home'
              ? 'text-pink-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${currentTab === 'home' ? 'scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]' : ''}`} />
          <span className="text-[9px] tracking-tight whitespace-nowrap">Home</span>
        </button>

        {/* Tab 2: Tools */}
        <button
          onClick={() => onTabChange('tools')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
            currentTab === 'tools'
              ? 'text-pink-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className={`w-5 h-5 mb-0.5 ${currentTab === 'tools' ? 'scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]' : ''}`} />
          <span className="text-[9px] tracking-tight whitespace-nowrap">Tools</span>
        </button>

        {/* Center: Glowing MIC Floating Button */}
        <div className="relative -top-3.5 mx-1 flex items-center justify-center shrink-0">
          <button
            onClick={onMicPress}
            aria-label={
              state === 'disconnected'
                ? 'Start voice session'
                : state === 'speaking'
                ? 'Interrupt Tamanna'
                : 'Pause microphone'
            }
            className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 border-2 ${
              state === 'speaking'
                ? 'bg-gradient-to-tr from-rose-500 via-pink-600 to-purple-600 border-white text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse'
                : state === 'listening'
                ? 'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 border-white text-white shadow-[0_0_25px_rgba(16,185,129,0.7)] ring-4 ring-emerald-500/30'
                : state === 'connecting'
                ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 border-white text-white animate-spin'
                : 'bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-700 border-pink-400/60 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:scale-105'
            }`}
          >
            <Mic className={`w-5 h-5 ${isVoiceActive ? 'scale-110' : ''}`} />
            {isVoiceActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
            )}
          </button>
        </div>

        {/* Tab 3: BS Camera (📷 Dedicated Camera Scanner) */}
        <button
          onClick={() => onTabChange('bscamera')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 relative ${
            currentTab === 'bscamera'
              ? 'text-pink-400 font-semibold'
              : 'text-slate-400 hover:text-pink-300'
          }`}
        >
          <div className="relative">
            <Camera className={`w-5 h-5 mb-0.5 ${currentTab === 'bscamera' ? 'scale-110 text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]' : 'text-slate-300'}`} />
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
          </div>
          <span className={`text-[9px] tracking-tight whitespace-nowrap ${currentTab === 'bscamera' ? 'text-pink-400 font-bold' : ''}`}>
            BS Camera
          </span>
        </button>

        {/* Tab 4: History */}
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
            currentTab === 'history'
              ? 'text-pink-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className={`w-5 h-5 mb-0.5 ${currentTab === 'history' ? 'scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]' : ''}`} />
          <span className="text-[9px] tracking-tight whitespace-nowrap">History</span>
        </button>

        {/* Tab 5: Settings */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
            currentTab === 'settings'
              ? 'text-pink-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className={`w-5 h-5 mb-0.5 ${currentTab === 'settings' ? 'scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]' : ''}`} />
          <span className="text-[9px] tracking-tight whitespace-nowrap">Settings</span>
        </button>
      </div>
    </nav>
  );
};
