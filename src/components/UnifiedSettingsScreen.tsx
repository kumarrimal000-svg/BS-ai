import React, { useState } from 'react';
import {
  User,
  Volume2,
  Globe,
  Brain,
  Palette,
  Shield,
  Sparkles,
  Sliders,
  ChevronRight,
  Eye,
  Check,
  Moon,
  Sun,
  Flame,
  Info,
} from 'lucide-react';
import { ThemeMood } from '../types/assistant';

interface UnifiedSettingsScreenProps {
  themeMood: ThemeMood;
  onThemeChange: (theme: ThemeMood) => void;
  onOpenVoiceSettings: (tab?: string) => void;
  onOpenMemoryHub: () => void;
  onOpenDeviceSettings: () => void;
  onOpenLearningAnalytics: () => void;
  onOpenContextPanel: () => void;
}

export const UnifiedSettingsScreen: React.FC<UnifiedSettingsScreenProps> = ({
  themeMood,
  onThemeChange,
  onOpenVoiceSettings,
  onOpenMemoryHub,
  onOpenDeviceSettings,
  onOpenLearningAnalytics,
  onOpenContextPanel,
}) => {
  const THEME_OPTIONS: { id: ThemeMood; name: string; color: string }[] = [
    { id: 'magenta', name: 'Magenta Glow', color: '#ff2d87' },
    { id: 'cyan', name: 'Cyber Cyan', color: '#00f0ff' },
    { id: 'violet', name: 'Futuristic Violet', color: '#a855f7' },
    { id: 'emerald', name: 'Emerald Matrix', color: '#00ff9d' },
    { id: 'amber', name: 'Solar Amber', color: '#ffb703' },
  ];

  const sections = [
    {
      title: 'Personality & Persona',
      hindi: 'व्यक्तित्व और स्वभाव',
      icon: User,
      color: 'text-pink-400',
      action: () => onOpenVoiceSettings('personality'),
      desc: 'Sassy, caring, playful or smart assistant style',
    },
    {
      title: 'Proactive Conversation (खुद से बात करे)',
      hindi: 'तमन्ना खुद बातचीत शुरू करे',
      icon: Sparkles,
      color: 'text-rose-400',
      action: () => onOpenVoiceSettings('conversation'),
      desc: 'Silence detection, time greetings, mood & topic follow-up',
    },
    {
      title: 'Voice & Speech Output',
      hindi: 'आवाज़ और गति',
      icon: Volume2,
      color: 'text-violet-400',
      action: () => onOpenVoiceSettings('voice'),
      desc: 'Aoede, Kore, Zephyr voices, speed & volume',
    },
    {
      title: 'Language & Pronunciation',
      hindi: 'भाषा और बोलचाल',
      icon: Globe,
      color: 'text-cyan-400',
      action: () => onOpenVoiceSettings('language'),
      desc: 'Natural Hinglish, Pure Hindi, or Modern English',
    },
    {
      title: 'Memory & Personalization',
      hindi: 'मेमोरी और निजीकरण',
      icon: Brain,
      color: 'text-purple-400',
      action: () => onOpenMemoryHub(),
      desc: 'View, edit, or delete remembered context & facts',
    },
    {
      title: 'Device & Hardware Controls',
      hindi: 'डिवाइस और हार्डवेयर',
      icon: Sliders,
      color: 'text-amber-400',
      action: () => onOpenDeviceSettings(),
      desc: 'Screen brightness, Wi-Fi shortcuts, battery status',
    },
    {
      title: 'Self-Learning & Adaptive AI',
      hindi: 'अडैप्टिव लर्निंग',
      icon: Sparkles,
      color: 'text-rose-400',
      action: () => onOpenLearningAnalytics(),
      desc: 'Mistake prevention, feedback logs & continuous improvement',
    },
    {
      title: 'Privacy & Permissions',
      hindi: 'गोपनीयता और सुरक्षा',
      icon: Shield,
      color: 'text-emerald-400',
      action: () => onOpenVoiceSettings('privacy'),
      desc: 'Strict transparency: no fake claims, full user data control',
    },
    {
      title: 'Developer Diagnostics & Context',
      hindi: 'डेवलपर संदर्भ',
      icon: Eye,
      color: 'text-sky-400',
      action: () => onOpenContextPanel(),
      desc: 'Inspect real-time conversation state & intent triggers',
    },
  ];

  return (
    <div className="w-full h-full pb-28 pt-2 px-4 overflow-y-auto no-scrollbar select-none animate-in fade-in duration-200">
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <span>Tamanna Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize personality, voice, theme & security
          </p>
        </div>

        {/* Ambient Theme Selector Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Ambient Aura & Hologram Mood
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {THEME_OPTIONS.map((t) => {
              const isSelected = themeMood === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-white/80 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full mb-1 border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-[9px] text-slate-300 font-medium truncate w-full text-center">
                    {t.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Sections List */}
        <div className="space-y-2">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <button
                key={idx}
                onClick={sec.action}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/90 transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center ${sec.color} group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                      {sec.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {sec.desc}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            );
          })}
        </div>

        {/* Real Permissions Transparency Note */}
        <div className="mt-5 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-purple-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-300">
            <strong className="text-purple-300">No Fake Capabilities:</strong> Tamanna uses real browser and Web APIs. Actions like system Wi-Fi toggle safely launch official Android settings screens via system intents.
          </div>
        </div>
      </div>
    </div>
  );
};
