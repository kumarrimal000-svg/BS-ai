import React, { useEffect, useState } from 'react';
import { TaskPlan, ThemeMood } from '../types/assistant';
import { TaskPlanner } from '../services/taskPlanner';
import { CheckCircle2, Circle, AlertTriangle, X, Play, Loader2, Ban, BrainCircuit } from 'lucide-react';

interface TaskProgressHUDProps {
  themeMood: ThemeMood;
}

export const TaskProgressHUD: React.FC<TaskProgressHUDProps> = ({ themeMood }) => {
  const [plan, setPlan] = useState<TaskPlan | null>(null);

  useEffect(() => {
    const planner = TaskPlanner.getInstance();
    const unsubscribe = planner.subscribe((p) => {
      setPlan(p);
    });
    return unsubscribe;
  }, []);

  if (!plan || plan.status === 'idle') return null;

  const totalSteps = plan.steps.length;
  const completedSteps = plan.steps.filter((s) => s.status === 'completed').length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const handleAbort = () => {
    TaskPlanner.getInstance().abortPlan();
  };

  const handleDismiss = () => {
    // Hide by aborting or clearing
    TaskPlanner.getInstance().abortPlan();
    setPlan(null);
  };

  const accentColor =
    themeMood === 'magenta' ? 'text-pink-400 border-pink-500/40 bg-pink-950/30' :
    themeMood === 'cyan' ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' :
    themeMood === 'violet' ? 'text-purple-400 border-purple-500/40 bg-purple-950/30' :
    themeMood === 'emerald' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' :
    'text-amber-400 border-amber-500/40 bg-amber-950/30';

  const barColor =
    themeMood === 'magenta' ? 'bg-gradient-to-r from-pink-500 to-rose-400' :
    themeMood === 'cyan' ? 'bg-gradient-to-r from-cyan-500 to-blue-400' :
    themeMood === 'violet' ? 'bg-gradient-to-r from-purple-500 to-indigo-400' :
    themeMood === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
    'bg-gradient-to-r from-amber-500 to-orange-400';

  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm w-[92%] sm:w-88 animate-in slide-in-from-right-4 duration-300">
      <div className="relative rounded-2xl bg-slate-950/95 border border-slate-800 p-4 shadow-2xl backdrop-blur-xl text-white">
        {/* Glow Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${accentColor}`}>
              <BrainCircuit className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Step-by-Step Task Plan
              </div>
              <h4 className="text-xs font-semibold text-white truncate max-w-[200px]">
                {plan.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {plan.status === 'running' && (
              <button
                onClick={handleAbort}
                className="px-2 py-1 text-[10px] font-mono rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900/90 transition-colors flex items-center gap-1"
                title="Halt automated workflow"
              >
                <Ban className="w-3 h-3" />
                <span>Halt</span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reasoning Summary if provided */}
        {plan.reasoningSummary && (
          <p className="text-[11px] text-slate-300 mb-2.5 italic bg-white/5 p-2 rounded-lg border border-white/5">
            "{plan.reasoningSummary}"
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
            <span>
              {plan.status === 'completed' ? 'All Steps Finished' :
               plan.status === 'failed' ? 'Stopped on Error' :
               plan.status === 'aborted' ? 'Aborted' :
               `Executing Step ${plan.currentStepIndex + 1} of ${totalSteps}`}
            </span>
            <span className="font-semibold text-slate-200">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${barColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step Items List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
          {plan.steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-start gap-2 p-2 rounded-xl transition-colors ${
                step.status === 'running'
                  ? 'bg-slate-900 border border-slate-700/80'
                  : 'bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : step.status === 'running' ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : step.status === 'failed' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ) : step.status === 'skipped' ? (
                  <Circle className="w-3.5 h-3.5 text-slate-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-medium truncate ${
                      step.status === 'completed'
                        ? 'text-slate-300 line-through opacity-80'
                        : step.status === 'running'
                        ? 'text-white font-semibold'
                        : step.status === 'failed'
                        ? 'text-rose-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {idx + 1}. {step.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {step.toolName}
                  </span>
                </div>
                {step.error && (
                  <p className="text-[10px] text-rose-400 mt-0.5 truncate">
                    {step.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
