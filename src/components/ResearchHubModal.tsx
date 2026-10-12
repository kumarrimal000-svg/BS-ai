import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Globe,
  Layers,
  RotateCcw,
  Sliders,
  History,
  Scale,
  Check,
  Copy,
  Volume2,
  ArrowRight,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { ResearchEngine } from '../services/researchEngine';
import {
  ResearchMode,
  ResearchProgress,
  ResearchReport,
  ResearchSettings,
} from '../types/research';

interface ResearchHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoicePrompt?: (promptText: string) => void;
}

export const ResearchHubModal: React.FC<ResearchHubModalProps> = ({
  isOpen,
  onClose,
  onSendVoicePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'search' | 'history' | 'settings'>('dossier');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('deep_research');
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [progress, setProgress] = useState<ResearchProgress>({
    topic: '',
    step: 'idle',
    currentAction: 'Ready',
    percent: 0,
  });
  const [settings, setSettings] = useState<ResearchSettings>(ResearchEngine.getInstance().getSettings());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const engine = ResearchEngine.getInstance();
    const unsubReports = engine.subscribeReports(setReports);
    const unsubActive = engine.subscribeActiveReport(setActiveReport);
    const unsubProgress = engine.subscribeProgress(setProgress);
    const unsubSettings = engine.subscribeSettings(setSettings);

    return () => {
      unsubReports();
      unsubActive();
      unsubProgress();
      unsubSettings();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartResearch = async (topicToSearch?: string) => {
    const q = topicToSearch || searchQuery;
    if (!q.trim()) return;

    setActiveTab('dossier');
    try {
      await ResearchEngine.getInstance().conductResearch(q, selectedMode, {
        language: settings.preferredLanguage === 'auto' ? 'hinglish' : settings.preferredLanguage,
        triggerSearchTool: selectedMode === 'current_info',
      });
    } catch (err: any) {
      console.warn('[ResearchHubModal] Error conducting research:', err);
    }
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickResearchPrompts = [
    'AI assistants ke baare mein research karo',
    'React Native vs Flutter comparison',
    'Latest autonomous agent architectures',
    'Quantum computing basics & practical applications',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#090a14] border border-purple-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/30 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-400">
              <BookOpen className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
                <span>Knowledge & Research Intelligence</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  SYSTEM ACTIVE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Multisource synthesis · Fact verification · Truthful attribution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dossier')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'dossier'
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Research Dossier</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'search'
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Topic</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Session Memory ({reports.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Settings</span>
            </button>
          </div>

          {activeReport && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
              Active: <strong className="text-slate-300">{activeReport.topic}</strong>
            </span>
          )}
        </div>

        {/* Progress Stepper Banner (when research is running) */}
        {progress.step !== 'idle' && progress.step !== 'completed' && progress.step !== 'failed' && (
          <div className="bg-purple-950/40 border-b border-purple-500/40 px-5 py-2.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-300 font-bold uppercase">{progress.step}:</span>
              <span className="text-slate-300">{progress.currentAction}</span>
            </div>
            <span className="text-pink-400 font-bold">{progress.percent}%</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* TAB 1: DOSSIER */}
          {activeTab === 'dossier' && (
            <>
              {activeReport ? (
                <div className="space-y-4">
                  {/* Title & Attribution Header */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>{activeReport.topic}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-950/80 border border-pink-500/40 text-pink-300 font-semibold uppercase">
                          {activeReport.mode.replace('_', ' ')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>{activeReport.confidence.toUpperCase()} CONFIDENCE</span>
                        </span>
                        {activeReport.realtimeSearchUsed ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1 font-semibold">
                            <Globe className="w-3 h-3 text-cyan-400" />
                            <span>LIVE SEARCH</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-semibold">
                            VERIFIED KB
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {activeReport.summary}
                    </p>
                  </div>

                  {/* Direct Spoken Voice Answer Card */}
                  <div className="bg-gradient-to-r from-purple-950/50 via-slate-900/90 to-pink-950/50 border border-pink-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-pink-400 font-mono font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Direct Spoken Answer (Voice-First):</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onSendVoicePrompt && (
                          <button
                            onClick={() => onSendVoicePrompt(activeReport.directAnswer)}
                            className="text-[11px] text-pink-300 hover:text-white flex items-center gap-1 bg-pink-900/40 px-2 py-0.5 rounded border border-pink-700/50"
                            title="Play Spoken Response"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Voice</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopySummary(activeReport.directAnswer)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white italic leading-relaxed">
                      "{activeReport.directAnswer}"
                    </p>
                  </div>

                  {/* Key Verified Facts */}
                  {activeReport.keyFacts && activeReport.keyFacts.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        <span>Core Verified Findings & Facts:</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {activeReport.keyFacts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sub-Questions Decomposition Breakdown */}
                  {activeReport.subQuestions && activeReport.subQuestions.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>Deconstructed Research Questions:</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeReport.subQuestions.map((sq, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                            <span className="text-xs font-bold text-white block">
                              Q{idx + 1}: {sq.question}
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {sq.answer}
                            </p>
                            {sq.sources && sq.sources.length > 0 && (
                              <div className="text-[10px] font-mono text-slate-500 pt-1 flex items-center gap-1">
                                <span>Ref:</span>
                                <span className="text-slate-400">{sq.sources.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparative Matrix (if comparison available) */}
                  {activeReport.comparisons && activeReport.comparisons.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-indigo-400" />
                        <span>Comparative Analysis Matrix:</span>
                      </h4>
                      <div className="divide-y divide-slate-800 text-xs">
                        {activeReport.comparisons.map((c, idx) => (
                          <div key={idx} className="py-2.5 space-y-1">
                            <span className="font-semibold text-pink-300 text-[11px] uppercase font-mono block">
                              {c.criteria}:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                                <strong className="text-white block text-[11px] mb-0.5">{c.itemA}</strong>
                                <span className="text-[11px]">{c.comparison.split(';')[0]}</span>
                              </div>
                              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                                <strong className="text-white block text-[11px] mb-0.5">{c.itemB}</strong>
                                <span className="text-[11px]">{c.comparison.split(';')[1] || c.comparison}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pros & Cons */}
                  {activeReport.prosAndCons && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-950 border border-emerald-900/50 rounded-2xl p-3.5 space-y-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          Verified Advantages / Strengths:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {activeReport.prosAndCons.pros.map((p, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-950 border border-rose-900/50 rounded-2xl p-3.5 space-y-1.5">
                        <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block">
                          Trade-Offs & Limitations:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {activeReport.prosAndCons.cons.map((c, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Fact-Checking & Uncertainty Detection */}
                  {activeReport.factChecks && activeReport.factChecks.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Fact Checking & Conflict Analysis:</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        {activeReport.factChecks.map((fc, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">"{fc.claim}"</span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                                  fc.verdict === 'verified'
                                    ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                                    : fc.verdict === 'likely_true'
                                    ? 'bg-cyan-950 border border-cyan-600 text-cyan-300'
                                    : fc.verdict === 'conflicting'
                                    ? 'bg-amber-950 border border-amber-600 text-amber-300'
                                    : 'bg-rose-950 border border-rose-600 text-rose-300'
                                }`}
                              >
                                {fc.verdict.replace('_', ' ')}
                              </span>
                            </div>
                            <ul className="text-[11px] text-slate-300 pl-4 list-disc space-y-0.5">
                              {fc.evidence.map((ev, evIdx) => (
                                <li key={evIdx}>{ev}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Sources & References */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span>Sources & Attribution References:</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {activeReport.sources.length} sources
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeReport.sources.map((src) => (
                        <div key={src.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px] truncate">{src.title}</span>
                            {src.url && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-200 p-0.5"
                                title="Open Link"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">{src.snippet}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 pt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400">
                              {src.sourceType.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-emerald-400">● {src.reliability.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Research Safety & Truthfulness Guarantee Banner */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs text-slate-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11px] mb-0.5 font-mono uppercase">
                        Research Safety & Strict Truthfulness Policy:
                      </strong>
                      <span className="text-[11px] text-slate-400 leading-relaxed block">
                        {activeReport.verificationNote} No imaginary URLs, fabricated citations, or fake browsing capabilities are ever claimed.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-600 animate-pulse" />
                  <p className="text-slate-400 font-mono text-xs">
                    No active research report. Choose a topic below or run a new search.
                  </p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                  >
                    Launch New Research
                  </button>
                </div>
              )}
            </>
          )}

          {/* TAB 2: NEW TOPIC SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-300 block">
                  Enter Research Topic or Complex Question:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStartResearch();
                      }}
                      placeholder="e.g. AI assistants ke baare mein research karo, React vs Flutter..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 text-white text-xs placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleStartResearch()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Research Mode Selection */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">Research Mode:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {(
                    [
                      { id: 'deep_research', label: 'Deep Research', desc: 'Multi-question synthesis' },
                      { id: 'comparison', label: 'Comparison', desc: 'Trade-offs & matrix' },
                      { id: 'fact_check', label: 'Fact Check', desc: 'Truth & conflict scan' },
                      { id: 'current_info', label: 'Current Info', desc: 'Web & news search' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMode(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedMode === m.id
                          ? 'bg-purple-950/80 border-purple-500/80 text-purple-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <strong className="block text-[11px] text-white">{m.label}</strong>
                      <span className="text-[9px] text-slate-400">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Trigger Prompts */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono uppercase text-slate-400 block">
                  Quick Research Presets:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {quickResearchPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(p);
                        handleStartResearch(p);
                      }}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-white transition-colors text-left flex items-center justify-between"
                    >
                      <span className="line-clamp-1">{p}</span>
                      <ArrowRight className="w-3 h-3 text-pink-400 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SESSION MEMORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                    Current Session Research Memory
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Maintained for the active session to avoid redundant queries. Not permanently tracked.
                  </p>
                </div>
                {reports.length > 0 && (
                  <button
                    onClick={() => ResearchEngine.getInstance().clearSessionMemory()}
                    className="text-xs text-rose-400 hover:text-rose-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Session Cache</span>
                  </button>
                )}
              </div>

              {reports.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No research conducted in this session yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setActiveReport(r);
                        setActiveTab('dossier');
                      }}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <strong className="text-xs text-white block">{r.topic}</strong>
                        <p className="text-[11px] text-slate-400 line-clamp-1 italic">"{r.directAnswer}"</p>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                          <span className="text-purple-400 uppercase">{r.mode}</span>
                          <span>·</span>
                          <span>{r.sources.length} sources</span>
                          <span>·</span>
                          <span className="text-emerald-400 uppercase">{r.confidence}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-purple-400 shrink-0 ml-3" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS & POLICIES */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-slate-800 pb-2">
                Knowledge & Research Preferences
              </h3>

              {/* Preferred Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-300 block">
                  Preferred Explanation Language:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(['hinglish', 'hindi', 'english'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        ResearchEngine.getInstance().updateSettings({ preferredLanguage: l })
                      }
                      className={`py-2 px-3 rounded-xl border text-center uppercase font-bold transition-all ${
                        settings.preferredLanguage === l
                          ? 'bg-pink-950/80 border-pink-500 text-pink-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white block font-medium">Fact-Checking & Conflict Scan</span>
                    <span className="text-[10px] text-slate-500">Flag conflicting claims and state uncertainties</span>
                  </div>
                  <button
                    onClick={() =>
                      ResearchEngine.getInstance().updateSettings({
                        factCheckingEnabled: !settings.factCheckingEnabled,
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.factCheckingEnabled ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white block font-medium">Verified Sources Requirement</span>
                    <span className="text-[10px] text-slate-500">Reject hallucinated links or imaginary sources</span>
                  </div>
                  <button
                    onClick={() =>
                      ResearchEngine.getInstance().updateSettings({
                        requireSourceVerification: !settings.requireSourceVerification,
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.requireSourceVerification ? 'bg-purple-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>
              </div>

              {/* Architecture Guarantee */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-white block">Strict Research Safety Audit:</span>
                <p>
                  Tamanna will NEVER claim to have browsed a website or retrieved live data unless the corresponding search tool successfully responded. Unverified claims are explicitly flagged as uncertain.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
