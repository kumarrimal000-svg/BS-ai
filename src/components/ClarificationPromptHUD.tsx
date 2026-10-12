import React from 'react';
import { ClarificationPrompt, ThemeMood } from '../types/assistant';
import { HelpCircle, X, CornerDownRight } from 'lucide-react';

interface ClarificationPromptHUDProps {
  prompt: ClarificationPrompt | null;
  themeMood: ThemeMood;
  onSelectOption: (option: string) => void;
  onDismiss: () => void;
}

export const ClarificationPromptHUD: React.FC<ClarificationPromptHUDProps> = ({
  prompt,
  themeMood,
  onSelectOption,
  onDismiss,
}) => {
  if (!prompt) return null;

  const accentColor =
    themeMood === 'magenta' ? 'text-pink-400 border-pink-500/40 bg-pink-950/40' :
    themeMood === 'cyan' ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' :
    themeMood === 'violet' ? 'text-purple-400 border-purple-500/40 bg-purple-950/40' :
    themeMood === 'emerald' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' :
    'text-amber-400 border-amber-500/40 bg-amber-950/40';

  return (
    <div className="fixed top-20 left-4 z-40 max-w-sm w-[92%] sm:w-88 animate-in slide-in-from-left-4 duration-300">
      <div className="relative rounded-2xl bg-slate-950/95 border border-slate-800 p-4 shadow-2xl backdrop-blur-xl text-white">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${accentColor}`}>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Tamanna Needs Clarification
              </span>
              <h4 className="text-xs font-semibold text-white">
                Ambiguity Detected
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-slate-200 mb-3 leading-relaxed">
          {prompt.question}
        </p>

        {prompt.options && prompt.options.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400">Quick options:</span>
            <div className="flex flex-wrap gap-1.5">
              {prompt.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectOption(opt)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 hover:border-pink-500/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3 text-pink-400" />
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
