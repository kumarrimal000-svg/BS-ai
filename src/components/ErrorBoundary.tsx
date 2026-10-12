import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Tamanna AI Applet ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
    } catch {
      window.location.reload();
    }
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen min-h-screen bg-[#07080e] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-pink-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/40 flex items-center justify-center text-pink-400 mb-4 shadow-inner">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 via-rose-300 to-white bg-clip-text text-transparent mb-1">
              TAMANNA AI ASSISTANT
            </h1>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Display recovery system active
            </p>

            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-5 text-left text-xs text-rose-300/90 font-mono overflow-auto max-h-32">
              <div className="flex items-center gap-2 mb-1 text-rose-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Render Notice:</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {this.state.error?.message || 'Component re-initialization needed.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Tamanna UI</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-all"
                title="Reset cache and reload"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
