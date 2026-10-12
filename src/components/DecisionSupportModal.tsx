import React, { useState, useMemo } from 'react';
import {
  DecisionAnalysisData,
  DecisionOption,
  UserPriorityWeights,
} from '../types/decision';
import { ThemeMood } from '../types/assistant';
import { DecisionEngine, DEFAULT_WEIGHTS } from '../services/decisionEngine';
import { TaskPlanner } from '../services/taskPlanner';
import {
  Scale,
  X,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Clock,
  DollarSign,
  Zap,
  Info,
  Layers,
} from 'lucide-react';

interface DecisionSupportModalProps {
  isOpen: boolean;
  decisionData: DecisionAnalysisData | null;
  themeMood: ThemeMood;
  onClose: () => void;
  onAnalyzeCustom?: (topic: string, preferences?: string) => Promise<void>;
  onSpeakSummary?: (text: string) => void;
}

export const DecisionSupportModal: React.FC<DecisionSupportModalProps> = ({
  isOpen,
  decisionData,
  themeMood,
  onClose,
  onAnalyzeCustom,
  onSpeakSummary,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'balancer' | 'risks' | 'action' | 'custom'>('matrix');
  const [weights, setWeights] = useState<UserPriorityWeights>(DEFAULT_WEIGHTS);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [customPrefInput, setCustomPrefInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const engine = useMemo(() => DecisionEngine.getInstance(), []);

  // Compute live scores based on user weights
  const scoredOptions = useMemo(() => {
    if (!decisionData?.options) return [];
    return engine.scoreOptions(decisionData.options, weights);
  }, [decisionData?.options, weights, engine]);

  // Selected option for detailed view or action plan
  const activeOption = useMemo(() => {
    if (!scoredOptions || scoredOptions.length === 0) return null;
    if (selectedOptionId) {
      const found = scoredOptions.find((o) => o.id === selectedOptionId);
      if (found) return found;
    }
    return scoredOptions[0];
  }, [scoredOptions, selectedOptionId]);

  if (!isOpen || !decisionData) return null;

  const handleWeightChange = (key: keyof UserPriorityWeights, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleExecuteActionPlan = async (option: DecisionOption) => {
    if (!option.actionPlan || option.actionPlan.length === 0) return;

    const rawSteps = option.actionPlan.map((s) => ({
      title: `${s.stepNumber}. ${s.title}`,
      toolName: s.toolsNeeded?.[0] || 'taskAutomation154',
      args: {
        taskName: s.title,
        description: s.description,
        estimatedEffort: s.estimatedEffort || 'standard',
        optionName: option.name,
      },
    }));

    setActionSuccessNotice(`Handed "${option.name}" roadmap over to Tamanna Task Planner!`);

    try {
      await TaskPlanner.getInstance().executePlan(
        `Action Plan: ${option.name} (${decisionData.topic})`,
        rawSteps,
        `Decision chosen: ${option.name}. Execution breakdown with objective milestone tracking.`
      );
    } catch (err: any) {
      console.warn('[DecisionModal] Task planning trigger handled:', err);
    }

    setTimeout(() => {
      setActionSuccessNotice(null);
      onClose();
    }, 1800);
  };

  const handleRunPreset = (presetTopic: string) => {
    const preset = engine.getPresetOrFallback(presetTopic);
    // Notify parent or simulate analysis update
    if (onAnalyzeCustom) {
      onAnalyzeCustom(presetTopic);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopicInput.trim()) return;

    setIsAnalyzing(true);
    try {
      if (onAnalyzeCustom) {
        await onAnalyzeCustom(customTopicInput.trim(), customPrefInput.trim());
      }
      setActiveTab('matrix');
      setCustomTopicInput('');
      setCustomPrefInput('');
    } catch (err) {
      console.warn('[DecisionModal] Custom analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl text-white overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-semibold">
                  Advanced Decision Support System
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
                  Objective · Non-Prescriptive
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-sm sm:max-w-lg">
                {decisionData.topic}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Objective & Neutrality Guarantee Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-900/90 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-[11px] sm:text-xs text-slate-300">
              <strong>Objective:</strong> {decisionData.mainObjective}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 font-mono bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>Final decision rests 100% with you</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-slate-800/60 bg-slate-950/60 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Option Matrix ({scoredOptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('balancer')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'balancer'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Priority Balancer</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'risks'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Risks & Consequences</span>
          </button>

          <button
            onClick={() => setActiveTab('action')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'action'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Action Roadmap</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'custom'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Dilemma</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {actionSuccessNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessNotice}</span>
            </div>
          )}

          {/* TAB 1: OPTION COMPARISON MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Recommendation Summary Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-white">Current Best Match Analysis</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Based on weights: Quality & Long-term priority
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {decisionData.recommendationReasoning ||
                    `Option "${scoredOptions[0]?.name}" leads with ${scoredOptions[0]?.score}% fit score under current preference settings.`}
                </p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scoredOptions.map((opt) => {
                  const isSelected = activeOption?.id === opt.id;
                  const isTopRank = opt.rank === 1;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`relative cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900/90 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                  isTopRank
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                #{opt.rank} Choice
                              </span>
                              {opt.matchHighlights?.[0] && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                                  {opt.matchHighlights[0]}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1">{opt.name}</h4>
                            {opt.tagline && (
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.tagline}</p>
                            )}
                          </div>

                          {/* Score Badge */}
                          <div className="flex flex-col items-end">
                            <div
                              className={`text-sm font-bold px-2 py-1 rounded-xl font-mono ${
                                opt.score >= 80
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : opt.score >= 65
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {opt.score}%
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5">Weighted Fit</span>
                          </div>
                        </div>

                        {/* Pros */}
                        <div className="mt-3 space-y-1">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                            Advantages:
                          </span>
                          {opt.pros.slice(0, 3).map((pro, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{pro}</span>
                            </div>
                          ))}
                        </div>

                        {/* Cons & Risks */}
                        <div className="mt-2.5 space-y-1">
                          <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                            Trade-Offs & Risks:
                          </span>
                          {opt.cons.slice(0, 2).map((con, cIdx) => (
                            <div key={cIdx} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                              <span className="text-rose-400 font-bold shrink-0">·</span>
                              <span>{con}</span>
                            </div>
                          ))}
                          {opt.risks.slice(0, 1).map((risk, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-1.5 text-[11px] text-amber-300/90">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                              <span>{risk}</span>
                            </div>
                          ))}
                        </div>

                        {/* Multi-Factor Mini Bars */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase font-mono">Cost:</span>
                            <div className="flex gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`h-1.5 flex-1 rounded-sm ${
                                    lvl <= opt.ratings.cost ? 'bg-amber-400' : 'bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase font-mono">Effort:</span>
                            <div className="flex gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`h-1.5 flex-1 rounded-sm ${
                                    lvl <= opt.ratings.effort ? 'bg-purple-400' : 'bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase font-mono">Long-Term:</span>
                            <div className="flex gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`h-1.5 flex-1 rounded-sm ${
                                    lvl <= opt.ratings.longTermValue ? 'bg-emerald-400' : 'bg-slate-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Risk Level:{' '}
                          <strong
                            className={`uppercase ${
                              opt.ratings.riskLevel === 'low'
                                ? 'text-emerald-400'
                                : opt.ratings.riskLevel === 'medium'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {opt.ratings.riskLevel}
                          </strong>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOptionId(opt.id);
                            setActiveTab('action');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Plan Steps</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Verified Facts vs Assumptions Verification Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                    Evidence & Verification Transparency
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="font-mono text-cyan-400 uppercase text-[10px] block mb-1">
                      Verified Technical Facts:
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {activeOption?.verifiedFacts?.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-cyan-400">✓</span>
                          <span>{fact}</span>
                        </li>
                      )) || <li>Official technical specifications and release documentations.</li>}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="font-mono text-amber-400 uppercase text-[10px] block mb-1">
                      Estimates & Working Assumptions:
                    </span>
                    <ul className="space-y-1 text-slate-400">
                      {activeOption?.estimatesAndAssumptions?.map((assump, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">~</span>
                          <span>{assump}</span>
                        </li>
                      )) || <li>Timelines and budget estimates based on industry benchmarks.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIORITY BALANCER */}
          {activeTab === 'balancer' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Personal Priority Weight Balancer
                    </h4>
                  </div>
                  <button
                    onClick={resetWeights}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Drag the sliders to reflect your unique situation. The scores and recommendation update in real time!
                </p>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Cost Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      Budget Sensitivity (Cost)
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{weights.cost} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.cost}
                    onChange={(e) => handleWeightChange('cost', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>Flexible budget</span>
                    <span>Cost is critical</span>
                  </div>
                </div>

                {/* Time Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Speed to Result (Time)
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{weights.time} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.time}
                    onChange={(e) => handleWeightChange('time', Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>Can take time</span>
                    <span>Urgent delivery</span>
                  </div>
                </div>

                {/* Effort Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      Low Manual Effort (Simplicity)
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{weights.effort} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.effort}
                    onChange={(e) => handleWeightChange('effort', Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>Ready for heavy work</span>
                    <span>Minimize hassle</span>
                  </div>
                </div>

                {/* Risk Avoidance Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Risk Avoidance (Safety)
                    </span>
                    <span className="font-mono text-rose-400 font-bold">{weights.riskAvoidance} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.riskAvoidance}
                    onChange={(e) => handleWeightChange('riskAvoidance', Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>High risk tolerance</span>
                    <span>Zero risk tolerance</span>
                  </div>
                </div>

                {/* Quality Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Quality & Polish Outcome
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{weights.quality} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.quality}
                    onChange={(e) => handleWeightChange('quality', Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>Good enough</span>
                    <span>Perfection required</span>
                  </div>
                </div>

                {/* Long-Term Value Slider */}
                <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Strategic Long-Term Value
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">{weights.longTermValue} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={weights.longTermValue}
                    onChange={(e) => handleWeightChange('longTermValue', Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>Short-term fix</span>
                    <span>Future-proof asset</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Recalculated Ranking */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider block">
                  Dynamic Recalculated Fit Ranking:
                </span>
                <div className="space-y-2">
                  {scoredOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-300">
                          {opt.rank}
                        </span>
                        <div>
                          <strong className="text-white text-xs">{opt.name}</strong>
                          <span className="text-[10px] text-slate-400 block">{opt.matchHighlights.join(' · ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${opt.score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs text-white w-9 text-right">{opt.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RISKS & CONSEQUENCES */}
          {activeTab === 'risks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scoredOptions.map((opt) => (
                  <div key={opt.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{opt.name}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                          opt.ratings.riskLevel === 'low'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : opt.ratings.riskLevel === 'medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {opt.ratings.riskLevel} Risk Profile
                      </span>
                    </div>

                    {/* Short Term */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-0.5">
                        Short-Term Impact (0-3 Months):
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">{opt.shortTermConsequence}</p>
                    </div>

                    {/* Long Term */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase block mb-0.5">
                        Long-Term Impact (1-3 Years):
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">{opt.longTermConsequence}</p>
                    </div>

                    {/* Risk Mitigations */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase">Key Watchpoints & Risks:</span>
                      {opt.risks.map((r, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Clarifying Questions & Missing Info */}
              {(decisionData.clarifyingQuestions || decisionData.missingInformation) && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Information Gaps & Clarifications to Consider
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {decisionData.missingInformation && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] font-mono text-amber-400 uppercase block mb-1">
                          Missing Information:
                        </span>
                        <ul className="space-y-1 text-slate-300 text-[11px]">
                          {decisionData.missingInformation.map((m, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-amber-400">?</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {decisionData.clarifyingQuestions && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-1">
                          Key Questions Before Deciding:
                        </span>
                        <ul className="space-y-1 text-slate-300 text-[11px]">
                          {decisionData.clarifyingQuestions.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-cyan-400">→</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTION ROADMAP */}
          {activeTab === 'action' && activeOption && (
            <div className="space-y-4">
              {/* Option Selector for Roadmap */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-300">Select option to view actionable roadmap:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {scoredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        activeOption.id === opt.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Steps List */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase">Implementation Roadmap</span>
                    <h4 className="text-sm font-bold text-white">{activeOption.name}</h4>
                  </div>
                  <button
                    onClick={() => handleExecuteActionPlan(activeOption)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Send to Tamanna Task Planner</span>
                  </button>
                </div>

                <div className="space-y-2.5 mt-2">
                  {activeOption.actionPlan?.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-white text-xs">{step.title}</strong>
                          {step.estimatedEffort && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {step.estimatedEffort}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-slate-400 text-xs">Standard validation steps available for this option.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NEW DILEMMA / PRESETS */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <form onSubmit={handleCustomSubmit} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Analyze Any Custom Decision with Tamanna
                  </h4>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    What dilemma or choices are you analyzing?
                  </label>
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder='e.g., "Buy vs Lease a Car", "Learn Rust vs Go", "Freelance vs Full-Time"'
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Your key priorities or constraints (Optional):
                  </label>
                  <input
                    type="text"
                    value={customPrefInput}
                    onChange={(e) => setCustomPrefInput(e.target.value)}
                    placeholder='e.g., "Tight budget under $500, need it working in 2 weeks"'
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing || !customTopicInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {isAnalyzing ? (
                    <span>Analyzing trade-offs...</span>
                  ) : (
                    <>
                      <Scale className="w-4 h-4" />
                      <span>Run Deep Decision Analysis</span>
                    </>
                  )}
                </button>
              </form>

              {/* Curated Popular Presets */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Or load a curated benchmark dilemma:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'React Native vs Flutter for Mobile App',
                    'Cloud SQL (PostgreSQL) vs Firestore (NoSQL)',
                    'Lean MVP vs Full Strategic Build',
                    'Freelancing vs Full-Time Software Job',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunPreset(preset)}
                      className="p-2.5 text-left rounded-xl bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                    >
                      <span>{preset}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-400 truncate max-w-sm">
            💡 Say <em>"Tamanna, compare options for..."</em> anytime during voice chat!
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
