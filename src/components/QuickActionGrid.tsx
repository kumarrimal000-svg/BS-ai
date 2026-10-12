import React from 'react';
import {
  MessageSquare,
  Search,
  Camera,
  Languages,
  BookOpen,
  Bell,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface QuickActionGridProps {
  onSelectAction: (actionKey: 'chat' | 'search' | 'camera' | 'translate' | 'notes' | 'reminder') => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ onSelectAction }) => {
  const actions = [
    {
      key: 'chat' as const,
      title: 'AI Chat',
      desc: 'Ask Tamanna anything',
      hindiDesc: 'बातचीत करें',
      icon: MessageSquare,
      gradient: 'from-pink-500/20 to-purple-500/10',
      border: 'border-pink-500/30 hover:border-pink-500/60',
      iconColor: 'text-pink-400',
    },
    {
      key: 'search' as const,
      title: 'Smart Search',
      desc: 'Research & answers',
      hindiDesc: 'सर्च & रिसर्च',
      icon: Search,
      gradient: 'from-cyan-500/20 to-blue-500/10',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      iconColor: 'text-cyan-400',
    },
    {
      key: 'camera' as const,
      title: 'BS Camera',
      desc: 'Scan, OCR & ask Tamanna',
      hindiDesc: 'स्कैन, OCR & सवाल 📷',
      icon: Camera,
      gradient: 'from-pink-500/20 to-purple-500/10',
      border: 'border-pink-500/30 hover:border-pink-500/60',
      iconColor: 'text-pink-400',
    },
    {
      key: 'translate' as const,
      title: 'Translate',
      desc: 'Hindi, English & more',
      hindiDesc: 'अनुवाद & भाषा',
      icon: Languages,
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      iconColor: 'text-emerald-400',
    },
    {
      key: 'notes' as const,
      title: 'Notes & Tasks',
      desc: 'Daily study & tasks',
      hindiDesc: 'नोट्स & पढ़ाई',
      icon: BookOpen,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      iconColor: 'text-amber-400',
    },
    {
      key: 'reminder' as const,
      title: 'Reminder',
      desc: 'Planner & alarms',
      hindiDesc: 'रिमाइंडर & प्लान',
      icon: Bell,
      gradient: 'from-rose-500/20 to-pink-500/10',
      border: 'border-rose-500/30 hover:border-rose-500/60',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto px-4 mt-1 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1.5 font-semibold">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>Quick Actions</span>
        </span>
        <span className="text-[10px] text-slate-500 font-sans">
          Tap or Speak
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.key}
              onClick={() => onSelectAction(act.key)}
              className={`group text-left p-3 rounded-2xl bg-gradient-to-br ${act.gradient} bg-slate-900/60 border ${act.border} backdrop-blur-md transition-all duration-200 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className={`w-8 h-8 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-center ${act.iconColor} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  {act.title}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {act.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
