import React from 'react';
import { BookOpen, Sparkles, X, ArrowRight, ShieldCheck, CheckCircle2, Globe, ExternalLink } from 'lucide-react';
import { ResearchReport } from '../types/research';
import { ThemeMood } from '../types/assistant';

interface ResearchFloatingCardProps {
  report: ResearchReport | null;
  themeMood: ThemeMood;
  onClose: () => void;
  onOpenModal: () => void;
}

export const ResearchFloatingCard: React.FC<ResearchFloatingCardProps> = ({
  report,
  themeMood,
  onClose,
  onOpenModal,
}) => {
  if (!report) return null;

  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0b0c16]/95 border border-purple-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-pink-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
              Research & Knowledge Dossier
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Topic Title & Badges */}
        <div className="mb-2">
          <h4 className="text-sm font-bold text-white leading-snug line-clamp-1">
            {report.topic}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded-full bg-pink-950/70 border border-pink-500/40 text-pink-300 font-semibold">
              {report.mode.replace('_', ' ').toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{report.confidence.toUpperCase()} CONFIDENCE</span>
            </span>
            {report.realtimeSearchUsed ? (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>LIVE WEB</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300">
                VERIFIED KB
              </span>
            )}
          </div>
        </div>

        {/* Direct Spoken Answer */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 mb-3 text-xs text-slate-200 leading-relaxed">
          <div className="flex items-center gap-1 text-[10px] font-mono text-pink-400 mb-1">
            <Sparkles className="w-3 h-3" />
            <span className="font-semibold uppercase">Direct Answer:</span>
          </div>
          <p className="line-clamp-3 italic">"{report.directAnswer}"</p>
        </div>

        {/* Key Takeaways summary */}
        {report.keyFacts && report.keyFacts.length > 0 && (
          <div className="mb-3 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{report.keyFacts[0]}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-500/20 text-xs">
          <span className="text-[10px] text-slate-400 font-mono">
            {report.sources.length} sources analyzed
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenModal();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-[11px] shadow-md transition-all"
          >
            <span>View Full Dossier</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
