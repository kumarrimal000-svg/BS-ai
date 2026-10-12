import React, { useState, useEffect } from 'react';
import { Wifi, Radio, Plane, Sun, Battery, Activity, X, ShieldAlert, Brain, Sparkles, Trash2, ArrowUpRight, Headphones, Volume2, Mic, Bookmark, EyeOff, Shield, Cpu, Terminal, BookOpen, Heart } from 'lucide-react';
import { NativeBridge } from '../services/nativeBridge';
import { AdaptiveLearningEngine } from '../services/adaptiveLearningEngine';
import { VoiceSettingsService } from '../services/voiceSettingsService';
import { MemoryManager } from '../services/memoryManager';
import { TaskContextManager } from '../services/taskContextManager';
import { ResearchEngine } from '../services/researchEngine';
import { EmotionEngine } from '../services/emotionEngine';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brightness: number;
  onBrightnessChange: (val: number) => void;
  onOpenLearningHub?: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenMemoryHub?: () => void;
  onOpenContextPanel?: () => void;
  onOpenResearchHub?: () => void;
  onOpenEmotionHub?: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  brightness,
  onBrightnessChange,
  onOpenLearningHub,
  onOpenVoiceSettings,
  onOpenMemoryHub,
  onOpenContextPanel,
  onOpenResearchHub,
  onOpenEmotionHub,
}) => {
  const [wifiOn, setWifiOn] = useState<boolean>(true);
  const [mobileDataOn, setMobileDataOn] = useState<boolean>(true);
  const [airplaneOn, setAirplaneOn] = useState<boolean>(false);
  const [batteryText, setBatteryText] = useState<string>('Detecting...');
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine);
  const [learningProfile, setLearningProfile] = useState(AdaptiveLearningEngine.getInstance().getProfile());
  const [voiceSettings, setVoiceSettings] = useState(VoiceSettingsService.getInstance().getSettings());
  const [memorySettings, setMemorySettings] = useState(MemoryManager.getInstance().getSettings());
  const [memoriesCount, setMemoriesCount] = useState(MemoryManager.getInstance().getAllMemories().length);
  const [projectsCount, setProjectsCount] = useState(MemoryManager.getInstance().getAllProjects().length);
  const [contextSettings, setContextSettings] = useState(TaskContextManager.getInstance().getSettings());
  const [researchCount, setResearchCount] = useState(ResearchEngine.getInstance().getAllSessionReports().length);
  const [emotionSnapshot, setEmotionSnapshot] = useState(EmotionEngine.getInstance().getSnapshot());

  const bridge = NativeBridge.getInstance();

  useEffect(() => {
    if (!isOpen) return;
    const engine = AdaptiveLearningEngine.getInstance();
    const memoryMgr = MemoryManager.getInstance();
    const contextMgr = TaskContextManager.getInstance();
    const researchEngine = ResearchEngine.getInstance();
    const emotionEngine = EmotionEngine.getInstance();
    const unsubLearning = engine.subscribe(setLearningProfile);
    const unsubVoice = VoiceSettingsService.getInstance().subscribe(setVoiceSettings);
    const unsubContext = contextMgr.subscribeSettings(setContextSettings);
    const unsubResearch = researchEngine.subscribeReports((list) => setResearchCount(list.length));
    const unsubEmotion = emotionEngine.subscribe(setEmotionSnapshot);
    const unsubMemory = memoryMgr.subscribe(() => {
      setMemorySettings(memoryMgr.getSettings());
      setMemoriesCount(memoryMgr.getAllMemories().length);
      setProjectsCount(memoryMgr.getAllProjects().length);
    });

    return () => {
      unsubLearning();
      unsubVoice();
      unsubMemory();
      unsubContext();
      unsubResearch();
      unsubEmotion();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        setBatteryText(`${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'Discharging'})`);
      }).catch(() => {
        setBatteryText('Battery API restricted');
      });
    } else {
      setBatteryText('Not supported by browser');
    }

    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleWifi = () => {
    setWifiOn(!wifiOn);
    bridge.launchUri('intent:#Intent;action=android.settings.WIFI_SETTINGS;end');
  };

  const handleToggleData = () => {
    setMobileDataOn(!mobileDataOn);
    bridge.launchUri('intent:#Intent;action=android.settings.DATA_ROAMING_SETTINGS;end');
  };

  const handleToggleAirplane = () => {
    setAirplaneOn(!airplaneOn);
    bridge.launchUri('intent:#Intent;action=android.settings.AIRPLANE_MODE_SETTINGS;end');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-700/80 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              DEVICE SYSTEM CONTROLLER
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggles Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            onClick={handleToggleWifi}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              wifiOn
                ? 'bg-pink-600/20 border-pink-500/50 text-pink-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Wifi className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Wi-Fi</span>
            <span className="text-[9px] font-mono">{wifiOn ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleData}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              mobileDataOn
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Data</span>
            <span className="text-[9px] font-mono">{mobileDataOn ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleAirplane}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              airplaneOn
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Plane className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Airplane</span>
            <span className="text-[9px] font-mono">{airplaneOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Screen Brightness Slider */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Screen Brightness</span>
            </span>
            <span className="font-mono text-amber-400 font-bold">{brightness}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Voice Intelligence & Speech Processing Section */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-pink-300 font-bold uppercase tracking-wider">
              <Headphones className="w-4 h-4 text-pink-400" />
              <span>Voice Intelligence & Audio</span>
            </span>
            {onOpenVoiceSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVoiceSettings();
                }}
                className="text-[11px] text-pink-400 hover:text-pink-200 flex items-center gap-0.5 font-medium"
              >
                <span>Voice Settings</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">VOICE</span>
              <span className="text-white font-bold">{voiceSettings.voice}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">SPEED</span>
              <span className="text-pink-400 font-bold">{voiceSettings.speed.toFixed(2)}x</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">VOLUME</span>
              <span className="text-emerald-400 font-bold">{voiceSettings.volume}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
            <span className="text-slate-400">
              Spoken Mode: <strong className="text-white uppercase">{voiceSettings.language}</strong>
            </span>
            <span className="text-slate-400">
              Auto-Interruption: <strong className={voiceSettings.autoInterruptOnSpeech ? 'text-emerald-400' : 'text-slate-500'}>
                {voiceSettings.autoInterruptOnSpeech ? 'Enabled' : 'Off'}
              </strong>
            </span>
          </div>
        </div>

        {/* Memory & Personalization System Section */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-purple-300 font-bold uppercase tracking-wider">
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span>Memory & Personalization</span>
            </span>
            {onOpenMemoryHub && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMemoryHub();
                }}
                className="text-[11px] text-purple-400 hover:text-purple-200 flex items-center gap-0.5 font-medium"
              >
                <span>Memory Hub</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">MEMORIES</span>
                <span className="text-white font-bold">{memoriesCount}</span>
              </div>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                {projectsCount} Projs
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">STATUS</span>
                <span className={memorySettings.temporaryMode ? 'text-purple-400 font-bold' : memorySettings.memoryEnabled ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {memorySettings.temporaryMode ? 'Incognito' : memorySettings.memoryEnabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <button
                onClick={() => {
                  const updated = MemoryManager.getInstance().updateSettings({
                    memoryEnabled: !memorySettings.memoryEnabled,
                  });
                  setMemorySettings(updated);
                }}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                {memorySettings.memoryEnabled ? 'Pause' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <EyeOff className="w-3 h-3 text-purple-400" />
              <span>Temporary Mode:</span>
              <strong className={memorySettings.temporaryMode ? 'text-purple-400' : 'text-slate-500'}>
                {memorySettings.temporaryMode ? 'On' : 'Off'}
              </strong>
            </span>
            <button
              onClick={() => {
                const updated = MemoryManager.getInstance().updateSettings({
                  temporaryMode: !memorySettings.temporaryMode,
                });
                setMemorySettings(updated);
              }}
              className="text-purple-400 hover:text-purple-200 underline font-medium"
            >
              Toggle Incognito
            </button>
          </div>
        </div>

        {/* Learning & Improvement Intelligence Section */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-pink-300 font-bold uppercase tracking-wider">
              <Brain className="w-4 h-4 text-pink-400" />
              <span>Adaptive Intelligence & Learning</span>
            </span>
            {onOpenLearningHub && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLearningHub();
                }}
                className="text-[11px] text-pink-400 hover:text-pink-200 flex items-center gap-0.5 font-medium"
              >
                <span>Full Dashboard</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-mono">FEEDBACK RECORDED</span>
              <span className="text-white font-bold">
                {learningProfile.metrics.totalRatings > 0 ? (
                  `${learningProfile.metrics.totalRatings} signals (${Math.round((learningProfile.metrics.helpfulCount / learningProfile.metrics.totalRatings) * 100)}% helpful)`
                ) : (
                  '0 (No data yet)'
                )}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-mono">MISTAKE GUARDS</span>
              <span className="text-pink-300 font-bold">
                {learningProfile.mistakeCorrections.length} active
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
              Lang: <strong className="text-white uppercase">{learningProfile.languagePreference}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
              Detail: <strong className="text-white uppercase">{learningProfile.detailLevel}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
              Style: <strong className="text-white uppercase">{learningProfile.communicationStyle.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
            <span className="text-slate-400">
              Status: <strong className={learningProfile.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                {learningProfile.enabled ? 'Continuous Tuning Active' : 'Paused'}
              </strong>
            </span>
            {(learningProfile.learnedPreferences.length > 0 || learningProfile.metrics.totalRatings > 0) && (
              <button
                onClick={() => {
                  if (confirm('Clear stored adaptive preferences and feedback?')) {
                    AdaptiveLearningEngine.getInstance().clearLearningData('all');
                  }
                }}
                className="text-rose-400 hover:text-rose-200 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Stored Memory</span>
              </button>
            )}
          </div>
        </div>

        {/* Situational Intelligence & Context Debug Panel */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Situational Intelligence & Context</span>
            </span>
            {onOpenContextPanel && (
              <button
                onClick={() => {
                  onClose();
                  onOpenContextPanel();
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-semibold"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Open Debugger</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Tracks multi-turn context, resolves follow-up commands (<em>"Ab ye karo"</em>, <em>"Isko change karo"</em>, <em>"Pehle wala hata do"</em>, <em>"Wahi dobara karo"</em>), enforces capability truthfulness, and isolates temporary task context.
          </p>

          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            {/* Developer Context Panel Toggle */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 block font-medium">Developer Context Panel</span>
                <span className="text-[10px] text-slate-500">Show floating HUD showing live intent & task states</span>
              </div>
              <button
                onClick={() => {
                  const nextVal = !contextSettings.developerPanelEnabled;
                  TaskContextManager.getInstance().setDeveloperPanelEnabled(nextVal);
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  contextSettings.developerPanelEnabled ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
              </button>
            </div>

            {/* Smart Confirmation Toggle */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 block font-medium">Smart Confirmation</span>
                <span className="text-[10px] text-slate-500">Run safe tasks instantly; ask only for ambiguous commands</span>
              </div>
              <button
                onClick={() => {
                  const nextVal = !contextSettings.smartConfirmationEnabled;
                  TaskContextManager.getInstance().toggleSmartConfirmation(nextVal);
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  contextSettings.smartConfirmationEnabled ? 'bg-purple-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Knowledge & Research Intelligence Hub Card */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-pink-300 font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-pink-400" />
              <span>Knowledge & Research Intelligence</span>
            </span>
            {onOpenResearchHub && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResearchHub();
                }}
                className="text-[11px] text-pink-400 hover:text-pink-200 flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Research Hub</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">SESSION RESEARCH</span>
              <span className="text-white font-bold">{researchCount} topics cached</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">FACT CHECKING</span>
              <span className="text-emerald-400 font-bold">Active & Verified</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Deconstructs complex research queries into structured sub-questions, compares trade-offs, and enforces strict truthfulness without hallucinated sources.
          </p>
        </div>

        {/* Emotion & Sentiment Understanding Hub */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl space-y-2.5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-500/30" />
              <span>Emotion & Sentiment System</span>
            </span>
            {onOpenEmotionHub && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEmotionHub();
                }}
                className="text-[11px] text-pink-400 hover:text-pink-200 flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Emotion Hub</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">CURRENT ESTIMATE</span>
              <span className="text-white font-bold capitalize">
                {emotionSnapshot.activeEmotion} ({emotionSnapshot.activeSentiment})
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">EMPATHY LEVEL</span>
              <span className="text-pink-300 font-bold capitalize">
                {emotionSnapshot.settings.empathyLevel}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Estimates user emotional tone and sentiment to naturally adapt speaking cadence, simplify confusion, and deliver supportive, non-judgmental assistance.
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl space-y-2 text-xs font-mono text-slate-300 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>Battery Status:</span>
            </span>
            <span className="text-white">{batteryText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Network State:</span>
            <span className={networkOnline ? 'text-emerald-400' : 'text-rose-400'}>
              {networkOnline ? 'Online (Active)' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Hardware settings are integrated via Android System intents and Web Device APIs.
          </span>
        </div>
      </div>
    </div>
  );
};
