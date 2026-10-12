import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Mic,
  Camera,
  Smartphone,
  FolderOpen,
  GraduationCap,
  Sparkles,
  CalendarCheck,
  Bell,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface ToolsScreenProps {
  onOpenRegistry: () => void;
  onOpenChat: () => void;
  onOpenSearch: () => void;
  onOpenCamera: (mode?: 'photo' | 'selfie' | 'video') => void;
  onOpenPlanner: () => void;
  onOpenMemory: () => void;
  onOpenVoiceSettings: () => void;
  onOpenDeviceSettings: () => void;
  onOpenDecisionSupport: () => void;
  onSendVoicePrompt: (prompt: string) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  onOpenRegistry,
  onOpenChat,
  onOpenSearch,
  onOpenCamera,
  onOpenPlanner,
  onOpenMemory,
  onOpenVoiceSettings,
  onOpenDeviceSettings,
  onOpenDecisionSupport,
  onSendVoicePrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    {
      id: 'ai_chat',
      title: 'AI & Chat',
      hindiTitle: 'एआई और बातचीत',
      icon: MessageSquare,
      color: 'text-pink-400',
      bg: 'from-pink-500/20 to-rose-500/10',
      items: [
        {
          name: 'Conversational Voice & Chat',
          desc: 'Real-time two-way voice banter with Tamanna',
          action: () => onOpenChat(),
        },
        {
          name: 'Decision Support & Dilemma Solver',
          desc: 'Compare options, pros/cons & clear trade-offs',
          action: () => onOpenDecisionSupport(),
        },
        {
          name: 'Context & Situational Memory',
          desc: 'Recall previous instructions & saved context',
          action: () => onOpenMemory(),
        },
      ],
    },
    {
      id: 'search',
      title: 'Search & Knowledge',
      hindiTitle: 'सर्च और रिसर्च',
      icon: Search,
      color: 'text-cyan-400',
      bg: 'from-cyan-500/20 to-blue-500/10',
      items: [
        {
          name: 'Deep Research Engine',
          desc: 'Comprehensive multi-angle factual research dossier',
          action: () => onOpenSearch(),
        },
        {
          name: 'Smart Web Search',
          desc: 'Browse topics, news, and live updates safely',
          action: () => onSendVoicePrompt('Tamanna, search for latest technology updates'),
        },
        {
          name: 'Factual Accuracy Check',
          desc: 'Verify claims and compare verified facts',
          action: () => onSendVoicePrompt('Tamanna, fact check and verify this statement'),
        },
      ],
    },
    {
      id: 'voice',
      title: 'Voice & Speech',
      hindiTitle: 'आवाज़ और भाषा',
      icon: Mic,
      color: 'text-violet-400',
      bg: 'from-violet-500/20 to-purple-500/10',
      items: [
        {
          name: 'Tamanna Voice Tone & Emotion',
          desc: 'Adjust affection, playful banter & speaking speed',
          action: () => onOpenVoiceSettings(),
        },
        {
          name: 'Mic Hardware Diagnostics',
          desc: 'Check microphone input, noise level and dB levels',
          action: () => onOpenVoiceSettings(),
        },
        {
          name: 'Multilingual Hinglish & Hindi',
          desc: 'Fluent understanding of Hindi, English & accents',
          action: () => onOpenVoiceSettings(),
        },
      ],
    },
    {
      id: 'camera',
      title: 'Camera & Media',
      hindiTitle: 'कैमरा और मीडिया',
      icon: Camera,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/20 to-teal-500/10',
      items: [
        {
          name: 'BS Camera (AI Vision & Scanner)',
          desc: 'Scan objects, book OCR, homework questions & ask Tamanna',
          action: () => onOpenCamera('photo'),
        },
        {
          name: 'Front Selfie Camera',
          desc: 'Capture instant high-res selfie with Tamanna',
          action: () => onOpenCamera('selfie'),
        },
        {
          name: 'Video Recording Mode',
          desc: 'Record video clip with device camera',
          action: () => onOpenCamera('video'),
        },
      ],
    },
    {
      id: 'device',
      title: 'Device Tools',
      hindiTitle: 'डिवाइस टूल्स',
      icon: Smartphone,
      color: 'text-amber-400',
      bg: 'from-amber-500/20 to-orange-500/10',
      items: [
        {
          name: 'System Controller & Brightness',
          desc: 'Adjust screen brightness, Wi-Fi & device shortcuts',
          action: () => onOpenDeviceSettings(),
        },
        {
          name: 'Battery & Network Health',
          desc: 'Monitor battery charging state & internet status',
          action: () => onOpenDeviceSettings(),
        },
        {
          name: 'Android Intent Shortcuts',
          desc: 'Direct links to Wi-Fi settings, Data roaming & Display',
          action: () => onOpenDeviceSettings(),
        },
      ],
    },
    {
      id: 'study',
      title: 'Study & Coding Assistant',
      hindiTitle: 'स्टडी और कोडिंग',
      icon: GraduationCap,
      color: 'text-sky-400',
      bg: 'from-sky-500/20 to-indigo-500/10',
      items: [
        {
          name: 'Homework & Concept Explanation',
          desc: 'Simple step-by-step solutions for tricky questions',
          action: () => onSendVoicePrompt('Tamanna, mujhe ye concept simple tareeqe se samjhao'),
        },
        {
          name: 'Code Review & Bug Fixer',
          desc: 'Analyze algorithms, debug React/TypeScript/Python',
          action: () => onSendVoicePrompt('Tamanna, code review karo aur bugs identify karo'),
        },
        {
          name: 'Quiz & Self-Testing Mode',
          desc: 'Interactive quiz on any subject to practice',
          action: () => onSendVoicePrompt('Tamanna, mere liye ek quick quiz start karo'),
        },
      ],
    },
    {
      id: 'creative',
      title: 'Creative AI Studio',
      hindiTitle: 'क्रिएटिव स्टूडियो',
      icon: Sparkles,
      color: 'text-rose-400',
      bg: 'from-rose-500/20 to-pink-500/10',
      items: [
        {
          name: 'Shayari & Creative Writing',
          desc: 'Soulful poetry, scripts, captions & witty banter',
          action: () => onSendVoicePrompt('Tamanna, ek khubsurat shayari sunao'),
        },
        {
          name: 'Image & Visual Prompt Ideas',
          desc: 'Brainstorm futuristic UI layouts & creative assets',
          action: () => onSendVoicePrompt('Tamanna, creative UI design ke ideas batao'),
        },
        {
          name: 'Sassy Roasting & Banter',
          desc: 'Playful teasers and sharp witty reactions',
          action: () => onSendVoicePrompt('Tamanna, mujhe roast karo apni witty style mein'),
        },
      ],
    },
    {
      id: 'productivity',
      title: 'Productivity & Reminders',
      hindiTitle: 'प्लानर और टास्क',
      icon: CalendarCheck,
      color: 'text-teal-400',
      bg: 'from-teal-500/20 to-emerald-500/10',
      items: [
        {
          name: 'Daily Planner & Morning Brief',
          desc: 'Schedule priorities, daily schedule & check conflicts',
          action: () => onOpenPlanner(),
        },
        {
          name: 'Smart Reminders & Alarms',
          desc: 'Never miss an event, study session or workout',
          action: () => onOpenPlanner(),
        },
        {
          name: 'Voice Notes & Task List',
          desc: 'Dictate notes and organize lists effortlessly',
          action: () => onOpenPlanner(),
        },
      ],
    },
  ];

  const filteredCategories =
    selectedCategory === 'all'
      ? categories
      : categories.filter((c) => c.id === selectedCategory);

  return (
    <div className="w-full h-full pb-28 pt-2 px-4 overflow-y-auto no-scrollbar select-none animate-in fade-in duration-200">
      <div className="max-w-md mx-auto">
        {/* Header Title */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <span>AI Tools Center</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Categorized intelligent tools & automation
              </p>
            </div>
            <button
              onClick={onOpenRegistry}
              className="px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-mono font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span>All 246 Tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category Chips Scroll */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800'
              }`}
            >
              All Tools
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center ${cat.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {cat.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-hindi">
                      {cat.hindiTitle}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {cat.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={item.action}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700 transition-all flex items-center justify-between group active:scale-[0.98]"
                    >
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-pink-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {item.desc}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
