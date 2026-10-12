import React, { useState } from 'react';
import { FeedbackCategory, FeedbackRating, UserFeedback } from '../types/learning';
import { AdaptiveLearningEngine } from '../services/adaptiveLearningEngine';
import { X, ThumbsUp, ThumbsDown, CheckCircle2, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnId?: string;
  promptText?: string;
  responseText?: string;
  initialRating?: FeedbackRating;
  onFeedbackSaved?: (feedback: UserFeedback) => void;
}

const CATEGORIES: { id: FeedbackCategory; label: string; description: string }[] = [
  { id: 'accuracy', label: 'Factual Accuracy', description: 'Incorrect calculation, outdated fact, or mistake' },
  { id: 'language', label: 'Language Preference', description: 'Wanted Hindi, Hinglish, or English' },
  { id: 'verbosity', label: 'Length & Detail', description: 'Too long, too short, or missing steps' },
  { id: 'tone', label: 'Tone & Persona', description: 'Too sassy, too dry, or wrong attitude' },
  { id: 'tool_use', label: 'Tool & Action', description: 'Failed or missed triggering device/web tool' },
  { id: 'other', label: 'General Quality', description: 'Other suggestion or feedback' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  turnId,
  promptText = '',
  responseText = '',
  initialRating = 'helpful',
  onFeedbackSaved,
}) => {
  const [rating, setRating] = useState<FeedbackRating>(initialRating);
  const [category, setCategory] = useState<FeedbackCategory>('accuracy');
  const [comment, setComment] = useState<string>('');
  const [correctionText, setCorrectionText] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const engine = AdaptiveLearningEngine.getInstance();
    const feedback = engine.recordFeedback({
      turnId,
      promptText: promptText.trim() || 'Direct Voice Interaction',
      responseText: responseText.trim() || 'Spoken Voice Response',
      rating,
      category,
      comment: comment.trim() || undefined,
      correctionText: correctionText.trim() || undefined,
    });

    setSavedSuccess(true);
    onFeedbackSaved?.(feedback);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>FEEDBACK & CORRECTION</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Help Tamanna learn and adapt to your preferences
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h4 className="text-base font-bold text-white">Feedback Learned Successfully!</h4>
            <p className="text-xs text-slate-300 max-w-xs">
              Tamanna will adapt future responses and active guardrails based on your guidance.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Snippet preview */}
            {(promptText || responseText) && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                {promptText && (
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">YOU SAID:</span>
                    <p className="text-slate-200 font-medium line-clamp-2">"{promptText}"</p>
                  </div>
                )}
                {responseText && (
                  <div className="pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-pink-400 block">TAMANNA RESPONDED:</span>
                    <p className="text-pink-100 font-medium line-clamp-2">"{responseText}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Rating Buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                How was this response?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRating('helpful')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                    rating === 'helpful'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                  <span>Helpful & Good</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating('unhelpful')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                    rating === 'unhelpful'
                      ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4 text-rose-400" />
                  <span>Needs Improvement</span>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Feedback Focus Area
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      category === cat.id
                        ? 'bg-pink-950/50 border-pink-500/60 text-pink-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">{cat.label}</span>
                    <span className="text-[9px] text-slate-500 line-clamp-1">{cat.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Correction / Guidance */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Correction or Ideal Answer <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="e.g., The official price was actually ₹12,999, or: Explain in conversational Hinglish instead."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 min-h-[60px]"
              />
            </div>

            {/* Additional Comments */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Notes or Preferences
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g., Keep answers brief, or talk in Hindi next time"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Safe AI Notice */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Your feedback directly tunes Tamanna's prompt-level guardrails and preference memory. You retain full control to view and erase this data anytime.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
