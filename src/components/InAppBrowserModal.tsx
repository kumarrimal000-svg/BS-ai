import React from 'react';
import { X, ExternalLink, RefreshCw, ShieldCheck, Globe } from 'lucide-react';
import { BrowserActionItem } from '../types/assistant';

interface InAppBrowserModalProps {
  action: BrowserActionItem | null;
  onClose: () => void;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({ action, onClose }) => {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-[85vh] sm:h-[80vh] bg-slate-950 border-t border-slate-700/80 rounded-t-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Browser Top Navigation Bar */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-pink-400" />
            <span className="font-semibold text-xs text-slate-200">
              {action.siteName}
            </span>
          </div>

          {/* URL Display */}
          <div className="flex-1 max-w-md mx-2 bg-black/60 border border-slate-700/60 rounded-lg px-3 py-1 text-xs font-mono text-slate-300 truncate flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{action.url}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(action.url, '_blank', 'noopener,noreferrer')}
              title="Open externally"
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close viewer"
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Browser Frame */}
        <div className="flex-1 w-full bg-slate-900 relative">
          <iframe
            src={action.url}
            title={action.siteName}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />

          {/* Fallback Notice for sites that forbid iframe framing (X-Frame-Options) */}
          <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl shadow-lg max-w-xs text-xs text-slate-300 flex items-center justify-between gap-3 pointer-events-auto">
            <span>Site blocked from embedding?</span>
            <button
              onClick={() => window.open(action.url, '_blank', 'noopener,noreferrer')}
              className="bg-pink-600 hover:bg-pink-500 text-white font-medium px-2.5 py-1 rounded-md text-[11px] shrink-0"
            >
              Open Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
