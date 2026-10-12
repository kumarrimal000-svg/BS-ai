import React, { useEffect, useState } from 'react';
import { AssistantState } from '../types/assistant';
import { ThumbsUp, ThumbsDown, Sparkles, Check } from 'lucide-react';

interface VoiceTranscriptSubtitleProps {
  lastTranscript: { role: 'user' | 'assistant'; text: string } | null;
  state: AssistantState;
  onQuickFeedback?: (rating: 'helpful' | 'unhelpful', text: string) => void;
  onOpenCorrectionModal?: (promptText: string, responseText: string) => void;
}

export const VoiceTranscriptSubtitle: React.FC<VoiceTranscriptSubtitleProps> = ({
  lastTranscript,
  state,
  onQuickFeedback,
  onOpenCorrectionModal,
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [role, setRole] = useState<'user' | 'assistant'>('assistant');
  const [fade, setFade] = useState<boolean>(false);
  const [rated, setRated] = useState<'helpful' | 'unhelpful' | null>(null);

  useEffect(() => {
    if (lastTranscript && lastTranscript.text) {
      setDisplayText(lastTranscript.text);
      setRole(lastTranscript.role);
      setFade(false);
      setRated(null);

      // Auto fade after silence
      const timer = setTimeout(() => {
        setFade(true);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [lastTranscript]);

  if (!displayText || state === 'disconnected') return null;

  const handleRate = (rating: 'helpful' | 'unhelpful') => {
    setRated(rating);
    onQuickFeedback?.(rating, displayText);
  };

  return (
    <div
      className={`max-w-md mx-auto px-4 py-2 transition-opacity duration-500 text-center select-none ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div className="inline-block bg-slate-950/85 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl transition-all">
        <span className="text-[10px] uppercase font-mono tracking-wider text-pink-400 block mb-0.5">
          {role === 'assistant' ? 'TAMANNA' : 'YOU'}
        </span>
        <p className="text-sm font-medium text-slate-100 leading-snug">
          "{displayText}"
        </p>

        {/* Adaptive Learning Feedback Controls for Assistant Turns */}
        {role === 'assistant' && (
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px]">
            {rated ? (
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1 animate-in fade-in">
                <Check className="w-3 h-3" />
                <span>{rated === 'helpful' ? 'Preference noted!' : 'Guiding rule logged!'}</span>
              </span>
            ) : (
              <>
                <button
                  onClick={() => handleRate('helpful')}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1"
                  title="Helpful response"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span className="text-[10px]">Good</span>
                </button>

                <button
                  onClick={() => handleRate('unhelpful')}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1"
                  title="Needs improvement"
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span className="text-[10px]">Improve</span>
                </button>

                {onOpenCorrectionModal && (
                  <button
                    onClick={() => onOpenCorrectionModal('', displayText)}
                    className="p-1 text-slate-400 hover:text-pink-300 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1"
                    title="Correct this answer or tune behavior"
                  >
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    <span className="text-[10px]">Tune</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
