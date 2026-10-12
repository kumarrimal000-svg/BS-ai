import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  Cpu,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { TaskContextManager } from '../services/taskContextManager';
import { TaskContextSnapshot, DetectedIntent, TaskActionStatus } from '../types/context';

interface ContextDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateUtterance?: (text: string) => void;
}

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({
  isOpen,
  onClose,
  onSimulateUtterance,
}) => {
  const [snapshot, setSnapshot] = useState<TaskContextSnapshot>(
    TaskContextManager.getInstance().getSnapshot()
  );
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsub = TaskContextManager.getInstance().subscribe(setSnapshot);
    return unsub;
  }, []);

  if (!isOpen) return null;

  const getIntentColor = (intent: DetectedIntent) => {
    switch (intent) {
      case 'follow_up':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
      case 'command':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'information_request':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'question':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'correction':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'confirmation':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'cancellation':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  const getStatusBadge = (status: TaskActionStatus) => {
    switch (status) {
      case 'executing':
        return {
          label: 'EXECUTING',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />,
          color: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
        };
      case 'success':
        return {
          label: 'SUCCESS',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
        };
      case 'cannot_perform':
        return {
          label: 'LIMITED CAPABILITY',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          color: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
        };
      case 'failed':
        return {
          label: 'FAILED',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
          color: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
        };
      case 'clarification_needed':
        return {
          label: 'CLARIFICATION NEEDED',
          icon: <HelpCircle className="w-3.5 h-3.5 text-purple-400" />,
          color: 'bg-purple-950/80 border-purple-500/60 text-purple-300',
        };
      default:
        return {
          label: 'IDLE',
          icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
          color: 'bg-slate-900 border-slate-700 text-slate-300',
        };
    }
  };

  const statusInfo = getStatusBadge(snapshot.actionStatus);

  const handleSimulate = (phrase: string) => {
    TaskContextManager.getInstance().recordUserUtterance(phrase);
    if (onSimulateUtterance) {
      onSimulateUtterance(phrase);
    }
  };

  const handleReset = () => {
    TaskContextManager.getInstance().resetTaskContext();
  };

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 max-w-sm sm:max-w-md w-full transition-all duration-300 ${
        isMinimized ? 'h-auto' : 'max-h-[85vh] overflow-hidden'
      }`}
    >
      <div className="bg-[#0b0c16]/95 border border-purple-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase">
                Context & Situational Panel
              </span>
              <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-600/40">
                DEBUG
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-3.5 space-y-3 overflow-y-auto max-h-[70vh] text-xs">
            {/* Status & Intent Ribbon */}
            <div className="flex items-center justify-between gap-2">
              {/* Detected Intent */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Intent:</span>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-bold ${getIntentColor(
                    snapshot.detectedIntent
                  )}`}
                >
                  {snapshot.detectedIntent.replace('_', ' ')}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {(snapshot.intentConfidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Action Status */}
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold ${statusInfo.color}`}
              >
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            </div>

            {/* Current Task & Step */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Current Task:</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold truncate max-w-[200px]">
                  {snapshot.currentTaskTitle || 'No active task sequence'}
                </span>
              </div>

              {snapshot.currentStep && (
                <div className="flex items-center gap-1 text-[10px] text-slate-300 font-mono pl-4 border-l-2 border-cyan-500/40">
                  <span className="text-slate-500">Step {snapshot.stepIndex}:</span>
                  <span className="truncate">{snapshot.currentStep}</span>
                </div>
              )}

              {snapshot.latestUserInstruction && (
                <div className="text-[10px] bg-purple-950/30 border border-purple-900/40 rounded p-1.5 text-purple-200">
                  <span className="text-slate-500 font-mono text-[9px] block">LATEST INSTRUCTION:</span>
                  <span className="italic font-medium">"{snapshot.latestUserInstruction}"</span>
                </div>
              )}
            </div>

            {/* Current Context & Active Entities */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Active Context Entities
              </span>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[9px]">LAST APP:</span>
                  <span className="text-pink-300 font-semibold truncate block">
                    {snapshot.activeEntities.lastApp || 'None'}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                  <span className="text-slate-500 block text-[9px]">LAST QUERY / ITEM:</span>
                  <span className="text-cyan-300 font-semibold truncate block">
                    {snapshot.activeEntities.lastQuery || 'None'}
                  </span>
                </div>
              </div>

              {snapshot.activeEntities.lastUrl && (
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800/80 text-[10px] font-mono">
                  <span className="text-slate-500 block text-[9px]">TARGET URL:</span>
                  <span className="text-emerald-300 truncate block">
                    {snapshot.activeEntities.lastUrl}
                  </span>
                </div>
              )}
            </div>

            {/* Selected Tool & Previous Action */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Selected Tool & Execution
                </span>
                {snapshot.toolBeingUsed && (
                  <span className="text-[9px] font-mono text-cyan-400 animate-pulse">RUNNING</span>
                )}
              </div>

              <div className="text-[11px] font-mono">
                {snapshot.toolBeingUsed ? (
                  <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-800/50">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Executing: <strong>{snapshot.toolBeingUsed}</strong></span>
                  </div>
                ) : snapshot.previousAction ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Last Tool:</span>
                      <strong className="text-purple-300">{snapshot.previousAction.toolName}</strong>
                    </div>
                    {snapshot.previousAction.message && (
                      <p className="text-[10px] text-slate-300 italic">
                        "{snapshot.previousAction.message}"
                      </p>
                    )}
                    {snapshot.previousAction.capabilityLimit && (
                      <div className="bg-amber-950/40 border border-amber-800/50 rounded p-1.5 text-[10px] text-amber-300 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{snapshot.previousAction.capabilityLimit}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500 text-[10px]">No recent tool execution</span>
                )}
              </div>
            </div>

            {/* Error Recovery & Next Option */}
            {snapshot.suggestedNextOption && (
              <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-2.5 text-[10px] space-y-1">
                <div className="flex items-center gap-1 text-cyan-300 font-semibold uppercase text-[9px]">
                  <Sparkles className="w-3 h-3" />
                  <span>Situational Recovery / Next Step:</span>
                </div>
                <p className="text-slate-300">{snapshot.suggestedNextOption}</p>
              </div>
            )}

            {/* Follow-up Command Simulator (Quick test buttons) */}
            <div className="border-t border-slate-800/80 pt-2.5 space-y-1.5">
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">
                Follow-Up & Situational Test Triggers
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={() => handleSimulate('Ab ye karo.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-purple-900/40 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-200 transition-colors text-left flex items-center justify-between"
                >
                  <span>"Ab ye karo."</span>
                  <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                </button>
                <button
                  onClick={() => handleSimulate('Isko change karo.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-orange-900/40 border border-slate-800 hover:border-orange-500/50 text-slate-300 hover:text-orange-200 transition-colors text-left flex items-center justify-between"
                >
                  <span>"Isko change karo."</span>
                  <ArrowRight className="w-2.5 h-2.5 text-orange-400" />
                </button>
                <button
                  onClick={() => handleSimulate('Pehle wala hata do.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-rose-900/40 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 transition-colors text-left flex items-center justify-between"
                >
                  <span>"Pehle wala hata do."</span>
                  <ArrowRight className="w-2.5 h-2.5 text-rose-400" />
                </button>
                <button
                  onClick={() => handleSimulate('Wahi dobara karo.')}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-cyan-900/40 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition-colors text-left flex items-center justify-between"
                >
                  <span>"Wahi dobara karo."</span>
                  <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                </button>
              </div>

              {/* YouTube to Playback test flow */}
              <div className="mt-1 flex gap-1.5">
                <button
                  onClick={() => handleSimulate('Bhojpuri song search karo.')}
                  className="flex-1 px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-200 text-[10px] text-center"
                >
                  1. "Bhojpuri song search karo"
                </button>
                <button
                  onClick={() => handleSimulate('Ab isko chalao.')}
                  className="flex-1 px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-200 text-[10px] text-center"
                >
                  2. "Ab isko chalao"
                </button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Context</span>
              </button>
              <span className="text-slate-500 font-mono text-[9px]">
                Separated from permanent memory
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
