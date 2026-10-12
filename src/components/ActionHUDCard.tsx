import React, { useEffect, useState } from 'react';
import { ExternalLink, Compass, X, Sparkles } from 'lucide-react';
import { BrowserActionItem, ThemeMood } from '../types/assistant';

interface ActionHUDCardProps {
  action: BrowserActionItem | null;
  themeMood: ThemeMood;
  onClose: () => void;
  onOpenPreview: (action: BrowserActionItem) => void;
}

export const ActionHUDCard: React.FC<ActionHUDCardProps> = ({
  action,
  themeMood,
  onClose,
  onOpenPreview,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (action) {
      setVisible(true);
      // Auto-hide after 12 seconds if not interacted with
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 12000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [action]);

  if (!action || !visible) return null;

  const handleLaunchTab = () => {
    if (action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-pink-500/40 bg-slate-950/90 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(255,45,135,0.25)] text-slate-100">
        {/* Holographic Top Glow Strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse" />

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Compass className="w-4 h-4 animate-spin [animation-duration:8s]" />
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-pink-400 font-bold flex items-center gap-1.5">
                <span>TOOL CALL TRIGGERED</span>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
              </div>
              <div className="font-semibold text-sm text-white">
                {action.siteName || 'Browser Action'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {action.description && (
          <p className="text-xs text-slate-300/90 mb-3 italic">
            "{action.description}"
          </p>
        )}

        <div className="text-[11px] font-mono text-slate-400 truncate mb-3 bg-black/40 px-2 py-1 rounded border border-white/5">
          {action.url}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLaunchTab}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-xs py-2 px-3 rounded-lg shadow transition-all active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </button>

          <button
            onClick={() => onOpenPreview(action)}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700 transition-colors"
          >
            <span>In-App View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
