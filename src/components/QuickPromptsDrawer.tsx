import React from 'react';
import { Sparkles, Compass, Flame, Smile, Camera, Music, Phone, Wifi, Sun, ShoppingBag, Activity, CloudSun, DollarSign, Image as ImageIcon, Scale, BookOpen, Heart, CalendarCheck, Clock } from 'lucide-react';
import { AssistantState } from '../types/assistant';

interface QuickPromptsProps {
  state: AssistantState;
  onSendPrompt: (promptText: string) => void;
}

const VOICE_IDEAS = [
  { text: 'कैसी हो तमन्ना? क्या चल रहा है?', icon: Heart, label: 'Conversation' },
  { text: 'Tamanna, aaj mera plan kya hai?', icon: CalendarCheck, label: 'Daily Planner' },
  { text: 'कोई मज़ाकिया बात या किस्सा सुनाओ ना', icon: Flame, label: 'Playful Banter' },
  { text: 'थोड़ा उदास और थका हुआ हूँ, बात करो ना', icon: Heart, label: 'Comfort & Empathy' },
  { text: 'कल जो बात की थी, याद है तुम्हें?', icon: BookOpen, label: 'Memory' },
  { text: 'Kal subah 8 baje padhai yaad dilana', icon: Clock, label: 'Reminder' },
  { text: 'Mere pending tasks dikhao', icon: Sparkles, label: 'Tasks' },
  { text: 'Ek note bana do: Project brainstorm idea', icon: BookOpen, label: 'Notes' },
  { text: 'Tamanna, AI assistants ke baare mein research karo', icon: BookOpen, label: 'Research' },
  { text: 'Ab isko chalao', icon: Compass, label: 'Follow-Up' },
  { text: 'Compare React vs Flutter for my project', icon: Scale, label: 'Decision Support' },
  { text: 'Take a photo, open WhatsApp, and share it', icon: Sparkles, label: 'Multi-Step Plan' },
  { text: 'Play some relaxing music', icon: Music, label: 'Media Player' },
  { text: 'Switch theme to cyan and wink at me', icon: Sparkles, label: 'Visual Reaction' },
];

export const QuickPromptsDrawer: React.FC<QuickPromptsProps> = ({ state, onSendPrompt }) => {
  if (state === 'disconnected') {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 mt-1 select-none">
        <div className="text-center mb-1.5 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          Try saying when connected (246 tools supported):
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {VOICE_IDEAS.slice(0, 4).map((idea, idx) => (
            <div
              key={idx}
              className="text-[11px] bg-slate-900/60 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-xl font-mono flex items-center gap-1.5"
            >
              <idea.icon className="w-3 h-3 text-pink-400" />
              <span>"{idea.text}"</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 overflow-x-auto no-scrollbar py-1 select-none">
      <div className="flex items-center gap-2 whitespace-nowrap justify-start sm:justify-center">
        {VOICE_IDEAS.map((idea, idx) => (
          <button
            key={idx}
            onClick={() => onSendPrompt(idea.text)}
            className="text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            title="Click to send test voice command"
          >
            <idea.icon className="w-3 h-3 text-pink-400" />
            <span>"{idea.text}"</span>
          </button>
        ))}
      </div>
    </div>
  );
};
