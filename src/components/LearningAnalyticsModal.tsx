import React, { useState, useEffect } from 'react';
import {
  AdaptiveProfile,
  CommunicationStyle,
  FeedbackCategory,
  LearnedPreference,
  MistakeCorrection,
  PreferredLanguage,
  ResponseDetailLevel,
} from '../types/learning';
import { AdaptiveLearningEngine } from '../services/adaptiveLearningEngine';
import {
  X,
  Brain,
  Sparkles,
  BarChart3,
  Sliders,
  ShieldCheck,
  Trash2,
  Plus,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Info,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Globe,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface LearningAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTestPrompt?: (prompt: string) => void;
}

export const LearningAnalyticsModal: React.FC<LearningAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSendTestPrompt,
}) => {
  const [profile, setProfile] = useState<AdaptiveProfile>(AdaptiveLearningEngine.getInstance().getProfile());
  const [activeTab, setActiveTab] = useState<'analytics' | 'preferences' | 'memory' | 'guardrails' | 'architecture'>('analytics');

  // Custom preference form state
  const [newPrefKey, setNewPrefKey] = useState('');
  const [newPrefValue, setNewPrefValue] = useState('');
  const [newPrefCategory, setNewPrefCategory] = useState<'language' | 'verbosity' | 'tone' | 'topic_interest' | 'custom_rule'>('topic_interest');
  const [showAddPref, setShowAddPref] = useState(false);

  // Custom guardrail form state
  const [newQuery, setNewQuery] = useState('');
  const [newGuidance, setNewGuidance] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [showAddGuard, setShowAddGuard] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const engine = AdaptiveLearningEngine.getInstance();
    const unsub = engine.subscribe((p) => {
      setProfile(p);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const engine = AdaptiveLearningEngine.getInstance();

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLanguageChange = (lang: PreferredLanguage) => {
    engine.setLanguagePreference(lang);
    showToast(`Language set to ${lang.toUpperCase()}`);
  };

  const handleDetailChange = (detail: ResponseDetailLevel) => {
    engine.setDetailLevel(detail);
    showToast(`Response detail set to ${detail.toUpperCase()}`);
  };

  const handleStyleChange = (style: CommunicationStyle) => {
    engine.setCommunicationStyle(style);
    showToast(`Style set to ${style.replace('_', ' ').toUpperCase()}`);
  };

  const handleToggleConsent = () => {
    const next = !profile.enabled;
    engine.setEnabled(next);
    showToast(next ? 'Adaptive learning enabled' : 'Adaptive learning disabled');
  };

  const handleCreatePreference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefKey.trim() || !newPrefValue.trim()) return;
    engine.addOrUpdatePreference({
      key: `custom_${newPrefKey.trim().toLowerCase().replace(/\s+/g, '_')}`,
      label: newPrefKey.trim(),
      category: newPrefCategory,
      value: newPrefValue.trim(),
      confidence: 1.0,
      source: 'explicit_setting',
      scope: 'persistent',
      userApproved: true,
    });
    setNewPrefKey('');
    setNewPrefValue('');
    setShowAddPref(false);
    showToast('Preference added successfully');
  };

  const handleCreateGuardrail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim() || !newGuidance.trim()) return;
    engine.addMistakeCorrection({
      originalQuery: newQuery.trim(),
      faultyResponseSnippet: 'Manually defined guardrail',
      correctiveGuidance: newGuidance.trim(),
      detectedIssue: newIssue.trim() || 'Custom avoidance rule',
      status: 'prompt_guard_active',
    });
    setNewQuery('');
    setNewGuidance('');
    setNewIssue('');
    setShowAddGuard(false);
    showToast('Mistake guardrail activated');
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `tamanna_adaptive_profile_${Date.now()}.json`);
    dlAnchorElem.click();
    showToast('Profile exported to JSON');
  };

  const handleClearAll = () => {
    if (confirm('Clear all learning data, preferences, and mistake guardrails?')) {
      engine.clearLearningData('all');
      showToast('All learning data cleared');
    }
  };

  const feedbackTotal = profile.metrics.totalRatings;
  const helpfulCount = profile.metrics.helpfulCount;
  const satisfactionRate = feedbackTotal > 0 ? Math.round((helpfulCount / feedbackTotal) * 100) : 100;

  // Category counts
  const categoryCounts: Record<FeedbackCategory, number> = {
    accuracy: 0,
    language: 0,
    verbosity: 0,
    tone: 0,
    tool_use: 0,
    clarification: 0,
    other: 0,
  };
  (profile.feedbackHistory || []).forEach((f) => {
    if (categoryCounts[f.category] !== undefined) {
      categoryCounts[f.category]++;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 text-pink-400 border border-pink-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  SELF-LEARNING & ADAPTIVE INTELLIGENCE
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    profile.enabled
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {profile.enabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Continuous preference tuning, mistake detection & prompt guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-pink-950/90 border-b border-pink-500/40 px-4 py-1.5 text-xs text-pink-200 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              {notification}
            </span>
          </div>
        )}

        {/* Top Real Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-slate-900/60 border-b border-slate-800/60 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono block">SATISFACTION</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-emerald-400">{satisfactionRate}%</span>
              <span className="text-[10px] text-slate-500">helpful</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${satisfactionRate}%` }} />
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono block">TOTAL FEEDBACK</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-white">{feedbackTotal}</span>
              <span className="text-[10px] text-slate-500">recorded</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
              <span className="text-emerald-400">+{helpfulCount}</span>
              <span className="text-rose-400">-{profile.metrics.unhelpfulCount}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono block">MISTAKE GUARDS</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-pink-400">
                {profile.mistakeCorrections?.length || 0}
              </span>
              <span className="text-[10px] text-slate-500">active</span>
            </div>
            <span className="text-[9px] text-pink-300 font-mono mt-1 block">Prompt-level checks</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono block">ADAPTATIONS APPLIED</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-cyan-400">
                {profile.metrics.adaptationsAppliedCount}
              </span>
              <span className="text-[10px] text-slate-500">times</span>
            </div>
            <span className="text-[9px] text-cyan-300 font-mono mt-1 block">Live & text sessions</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-3 sm:px-4 py-2 border-b border-slate-800/80 bg-slate-900/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Personalization</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Learned Memory ({profile.learnedPreferences?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('guardrails')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'guardrails'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mistake Guards ({profile.mistakeCorrections?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Transparency</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: ANALYTICS & RECENT FEEDBACK */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              {/* Category Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Feedback Focus Area Breakdown</span>
                  <span className="text-[10px] font-mono text-slate-400">Real signals</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Accuracy / Facts</span>
                    <span className="text-sm font-bold text-rose-300">{categoryCounts.accuracy}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Language & Hindi</span>
                    <span className="text-sm font-bold text-amber-300">{categoryCounts.language}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Length & Detail</span>
                    <span className="text-sm font-bold text-cyan-300">{categoryCounts.verbosity}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Tone & Style</span>
                    <span className="text-sm font-bold text-purple-300">{categoryCounts.tone}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Tool Invocations</span>
                    <span className="text-sm font-bold text-emerald-300">{categoryCounts.tool_use}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">General</span>
                    <span className="text-sm font-bold text-slate-300">{categoryCounts.other}</span>
                  </div>
                </div>
              </div>

              {/* Feedback Stream */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Recent Feedback Signals ({profile.feedbackHistory?.length || 0})
                  </h4>
                  {profile.feedbackHistory && profile.feedbackHistory.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear feedback history?')) {
                          engine.clearLearningData('feedback_only');
                          showToast('Feedback history cleared');
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-200 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Feedback</span>
                    </button>
                  )}
                </div>

                {(!profile.feedbackHistory || profile.feedbackHistory.length === 0) ? (
                  <div className="py-8 text-center text-slate-500 space-y-1.5">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-medium text-slate-400">No feedback signals recorded yet</p>
                    <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                      Whenever Tamanna answers in live voice or chat, rate responses using the thumbs buttons to help her personalize to you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {profile.feedbackHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-xs ${
                          item.rating === 'helpful'
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                            : 'bg-rose-950/20 border-rose-800/40 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {item.rating === 'helpful' ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                <ThumbsUp className="w-3 h-3" /> Helpful
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                                <ThumbsDown className="w-3 h-3" /> Needs Improvement
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 capitalize">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {item.comment && (
                          <p className="text-xs text-white font-medium mt-1">
                            Note: "{item.comment}"
                          </p>
                        )}
                        {item.correctionText && (
                          <p className="text-[11px] text-emerald-300 mt-0.5">
                            Correction: {item.correctionText}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 truncate mt-1">
                          Prompt: "{item.promptText}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERSONALIZATION CONTROLS */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {/* Master Consent Switch */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Enable Adaptive Learning & Preferences
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Allows Tamanna to adapt language, length, and guardrails across turns.
                  </p>
                </div>
                <button
                  onClick={handleToggleConsent}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    profile.enabled ? 'bg-pink-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      profile.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Language Selection */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
                  Preferred Communication Language
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Applied to live voice speech and written responses.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'Auto Detect', desc: 'Matches what you speak' },
                    { id: 'hindi', label: 'हिन्दी (Hindi)', desc: 'Pure/natural Hindi voice' },
                    { id: 'hinglish', label: 'Hinglish', desc: 'Vibrant Hindi + English blend' },
                    { id: 'english', label: 'English Only', desc: 'Strictly English phrasing' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleLanguageChange(l.id as PreferredLanguage)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        profile.languagePreference === l.id
                          ? 'bg-pink-950/60 border-pink-500/60 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{l.label}</span>
                      <span className="text-[10px] text-slate-500">{l.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail Level */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
                  Response Detail & Length
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Control how brief or thorough Tamanna is when speaking.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'concise', label: 'Concise', desc: '1-2 punchy sentences' },
                    { id: 'balanced', label: 'Balanced', desc: '2-3 crisp sentences' },
                    { id: 'detailed', label: 'Detailed', desc: 'Step-by-step in depth' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleDetailChange(d.id as ResponseDetailLevel)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        profile.detailLevel === d.id
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{d.label}</span>
                      <span className="text-[10px] text-slate-500">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Communication Style */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
                  Communication Persona Style
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Customizes tone, witty banter, and level of teasing.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'flirty_sassy', label: 'Flirty & Sassy', desc: 'Signature Tamanna companion' },
                    { id: 'clever_witty', label: 'Clever & Witty', desc: 'Sharp jokes, humorous banter' },
                    { id: 'professional_smart', label: 'Professional & Smart', desc: 'Articulate, courteous, focused' },
                    { id: 'direct_concise', label: 'Direct & Concise', desc: 'Minimal chatter, action-first' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleStyleChange(s.id as CommunicationStyle)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        profile.communicationStyle === s.id
                          ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{s.label}</span>
                      <span className="text-[10px] text-slate-500">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Prompt Injection Preview */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
                  Live System Prompt Augmentation Preview
                </span>
                <p className="text-[11px] text-slate-400 mb-2">
                  These directives are injected into Gemini 3.8 Live sessions for your current profile:
                </p>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-pink-200 whitespace-pre-wrap leading-relaxed">
                  {engine.generateSystemInstructionAugment() || 'Adaptive learning is disabled.'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: LEARNED MEMORY & PREFERENCES */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Stored Preferences & Memory ({profile.learnedPreferences?.length || 0})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Review, toggle, or delete individual preferences Tamanna has remembered.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddPref(!showAddPref)}
                    className="px-2.5 py-1 text-xs bg-pink-600/30 text-pink-300 hover:bg-pink-600/50 border border-pink-500/40 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Preference</span>
                  </button>
                  {profile.learnedPreferences && profile.learnedPreferences.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear stored preferences?')) {
                          engine.clearLearningData('preferences_only');
                          showToast('Preferences cleared');
                        }
                      }}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Custom Preference Inline Form */}
              {showAddPref && (
                <form
                  onSubmit={handleCreatePreference}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-pink-500/40 space-y-3"
                >
                  <h5 className="text-xs font-bold text-white">Add Custom Learned Rule / Preference</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Preference Label / Key</label>
                      <input
                        type="text"
                        placeholder="e.g., Tech Stack Preference"
                        value={newPrefKey}
                        onChange={(e) => setNewPrefKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                      <select
                        value={newPrefCategory}
                        onChange={(e) => setNewPrefCategory(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="topic_interest">Topic Interest</option>
                        <option value="language">Language</option>
                        <option value="verbosity">Verbosity</option>
                        <option value="tone">Tone</option>
                        <option value="custom_rule">Custom Rule</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Value / Directive</label>
                    <input
                      type="text"
                      placeholder="e.g., Prefers React over Angular; always mention TypeScript"
                      value={newPrefValue}
                      onChange={(e) => setNewPrefValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPref(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-500 rounded-lg"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              )}

              {(!profile.learnedPreferences || profile.learnedPreferences.length === 0) ? (
                <div className="py-10 text-center text-slate-500 space-y-1.5">
                  <Brain className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No learned preferences yet</p>
                  <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                    Preferences are automatically extracted when you express recurring desires (e.g. "always explain in Hinglish", "keep it concise").
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.learnedPreferences.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{p.label}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-pink-400 uppercase font-mono">
                            {p.category}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Confidence: {Math.round(p.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium">"{p.value}"</p>
                        <span className="text-[10px] text-slate-500 block">
                          Source: {p.source.replace('_', ' ')} · Scope: {p.scope}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          engine.deletePreference(p.id);
                          showToast('Preference removed');
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Delete preference"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MISTAKE GUARDRAILS */}
          {activeTab === 'guardrails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Smart Mistake Guardrails ({profile.mistakeCorrections?.length || 0})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Proactive rules that prevent Tamanna from repeating known errors or misconceptions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddGuard(!showAddGuard)}
                    className="px-2.5 py-1 text-xs bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Guardrail</span>
                  </button>
                  {profile.mistakeCorrections && profile.mistakeCorrections.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear all mistake guardrails?')) {
                          engine.clearLearningData('mistakes_only');
                          showToast('Mistake guardrails cleared');
                        }
                      }}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Custom Guardrail Inline Form */}
              {showAddGuard && (
                <form
                  onSubmit={handleCreateGuardrail}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3"
                >
                  <h5 className="text-xs font-bold text-white">Create Proactive Mistake Guardrail</h5>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Query / Topic Trigger
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., iPhone 15 pricing in India"
                      value={newQuery}
                      onChange={(e) => setNewQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Corrective Guidance to Follow
                    </label>
                    <textarea
                      placeholder="e.g., The base price launched at ₹79,900, not ₹69,900. Do not state ₹69,900."
                      value={newGuidance}
                      onChange={(e) => setNewGuidance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white min-h-[50px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Detected Issue / Why this rule exists
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Avoided outdated launch speculation"
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGuard(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                    >
                      Activate Guardrail
                    </button>
                  </div>
                </form>
              )}

              {(!profile.mistakeCorrections || profile.mistakeCorrections.length === 0) ? (
                <div className="py-10 text-center text-slate-500 space-y-1.5">
                  <ShieldCheck className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No mistake guardrails active yet</p>
                  <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                    When you give "Needs Improvement" feedback with a correction note, Tamanna turns it into an automatic prompt guardrail.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {profile.mistakeCorrections.map((mc) => (
                    <div
                      key={mc.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-900/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Topic: "{mc.originalQuery}"
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-[10px] font-mono text-emerald-400 border border-emerald-800/50">
                            Prevented {mc.timesPrevented || 0}x
                          </span>
                          <button
                            onClick={() => {
                              engine.deleteMistakeCorrection(mc.id);
                              showToast('Guardrail deleted');
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete guardrail"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-200 font-medium">
                        Guidance: {mc.correctiveGuidance}
                      </p>
                      {mc.detectedIssue && (
                        <p className="text-[10px] text-slate-400">
                          Reason: {mc.detectedIssue}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM TRANSPARENCY & ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Architecture & Capability Transparency</span>
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                  In accordance with safety and ethical standards, Tamanna distinguishes between runtime prompt-level steering and foundation model weight re-training.
                </p>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-800/40 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Prompt Context Injection</span>
                      <span className="text-[11px] text-slate-300">
                        Status: <strong className="text-emerald-400">FULLY IMPLEMENTED</strong>. Dynamically updates Gemini 3.8 Live & Flash system prompts with language, length constraints, and user preferences.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-800/40 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Voice Cadence & Spoken Language Adaptation</span>
                      <span className="text-[11px] text-slate-300">
                        Status: <strong className="text-emerald-400">FULLY IMPLEMENTED</strong>. Live Gemini WebSocket session receives Hindi/Hinglish/English directives and concise/detailed controls.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-800/40 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Smart Mistake Detection & Guardrails</span>
                      <span className="text-[11px] text-slate-300">
                        Status: <strong className="text-emerald-400">FULLY IMPLEMENTED</strong>. Proactive matching triggers prevent repeated errors and track prevented occurrences.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-800/40 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Local Privacy & User Data Sovereignty</span>
                      <span className="text-[11px] text-slate-300">
                        Status: <strong className="text-emerald-400">FULLY IMPLEMENTED</strong>. All feedback and preferences are stored locally on your device with granular editing and one-click deletion.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-800/40 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Foundation Model Weight Backpropagation</span>
                      <span className="text-[11px] text-amber-200/80">
                        Status: <strong className="text-amber-400">REQUIRES ENTERPRISE CLUSTER</strong>. Direct neural weight gradient updates require offline TPU/GPU clusters. Dynamic prompt steering is used instead, providing instantaneous adaptation without risk of hallucination or model degradation.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Portability */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-white">Export or Reset Adaptive Profile</h5>
                  <p className="text-[11px] text-slate-400">Download your learned rules as JSON or reset to defaults.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset All</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
