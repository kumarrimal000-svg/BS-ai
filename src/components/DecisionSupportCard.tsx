import React from 'react';
import { ThemeMood } from '../types/assistant';
import { Scale, X, Check, AlertOctagon, UserCheck, Maximize2, ArrowRight } from 'lucide-react';

interface DecisionOption {
  id?: string;
  name: string;
  pros?: string[];
  cons?: string[];
  risks?: string[];
  ratings?: any;
}

interface DecisionSupportCardProps {
  decision: {
    topic: string;
    options: DecisionOption[];
    userPreferences?: string;
  } | null;
  themeMood: ThemeMood;
  onClose: () => void;
  onOpenModal?: () => void;
}

export const DecisionSupportCard: React.FC<DecisionSupportCardProps> = ({
  decision,
  themeMood,
  onClose,
  onOpenModal,
}) => {
  if (!decision) return null;

  const topOption = decision.options?.[0];

  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-md w-[92%] sm:w-96 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative rounded-2xl bg-slate-950/95 border border-slate-800 p-4 shadow-2xl backdrop-blur-xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Decision Support System
              </span>
              <h4 className="text-xs font-semibold text-white truncate max-w-[190px]">
                {decision.topic}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenModal && (
              <button
                onClick={onOpenModal}
                title="Expand Deep Analysis"
                className="p-1 text-indigo-400 hover:text-white rounded-md transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* User Neutrality Notice */}
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300 mb-2.5">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Objective trade-offs provided. The final choice rests completely with you.</span>
        </div>

        {/* Options Overview */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
          {decision.options.map((opt, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-indigo-300 text-xs truncate">
                  {i + 1}. {opt.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  Option {i + 1}
                </span>
              </div>

              {/* Top Pros */}
              {opt.pros && opt.pros.length > 0 && (
                <div className="mb-1 space-y-0.5">
                  <div className="flex items-start gap-1 text-[11px] text-slate-300">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{opt.pros[0]}</span>
                  </div>
                </div>
              )}

              {/* Watchpoint */}
              {((opt.cons && opt.cons.length > 0) || (opt.risks && opt.risks.length > 0)) && (
                <div className="flex items-start gap-1 text-[11px] text-amber-300/90">
                  <AlertOctagon className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">
                    {opt.cons?.[0] || opt.risks?.[0]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        {onOpenModal && (
          <button
            onClick={onOpenModal}
            className="w-full mt-3 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/50 transition-colors"
          >
            <span>Open Interactive Comparison Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
