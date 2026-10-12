import React, { useEffect, useState } from 'react';
import { ConversationTurn, SavedMemoryItem } from '../types/assistant';
import { ConversationMemory } from '../services/conversationMemory';
import { AdaptiveLearningEngine } from '../services/adaptiveLearningEngine';
import {
  X,
  Trash2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Clock,
  Sparkles,
  ShieldCheck,
  Edit2,
  Check,
  Plus,
  Bookmark,
  FileText,
} from 'lucide-react';

interface ConversationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt?: (prompt: string) => void;
  onOpenCorrectionModal?: (promptText: string, responseText: string, turnId?: string) => void;
}

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  isOpen,
  onClose,
  onSendPrompt,
  onOpenCorrectionModal,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'memories'>('history');
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [memories, setMemories] = useState<SavedMemoryItem[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'helpful' | 'unhelpful'>>({});

  // Editing state for turns
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editTurnText, setEditTurnText] = useState<string>('');

  // Memory creation and editing state
  const [showAddMemory, setShowAddMemory] = useState<boolean>(false);
  const [newMemLabel, setNewMemLabel] = useState<string>('');
  const [newMemContent, setNewMemContent] = useState<string>('');
  const [newMemCategory, setNewMemCategory] = useState<SavedMemoryItem['category']>('personal');

  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemLabel, setEditMemLabel] = useState<string>('');
  const [editMemContent, setEditMemContent] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const memory = ConversationMemory.getInstance();
    const unsubTurns = memory.subscribe((h) => setHistory(h));
    const unsubMems = memory.subscribeMemories((m) => setMemories(m));
    return () => {
      unsubTurns();
      unsubMems();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const memory = ConversationMemory.getInstance();

  const handleClearHistory = () => {
    if (confirm('Clear all stored conversation history on this device?')) {
      memory.clearHistory();
    }
  };

  const handleClearMemories = () => {
    if (confirm('Clear all saved long-term memories on this device?')) {
      memory.clearMemories();
    }
  };

  const handleFeedback = (turn: ConversationTurn, rating: 'helpful' | 'unhelpful') => {
    setFeedbackMap((prev) => ({ ...prev, [turn.id]: rating }));
    AdaptiveLearningEngine.getInstance().recordFeedback({
      turnId: turn.id,
      promptText: 'Turn from conversation history',
      responseText: turn.text,
      rating,
      category: 'other',
    });
  };

  const handleSaveTurnEdit = (id: string) => {
    if (!editTurnText.trim()) return;
    memory.editTurn(id, editTurnText);
    setEditingTurnId(null);
  };

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemLabel.trim() || !newMemContent.trim()) return;
    memory.addMemory(newMemCategory, newMemLabel, newMemContent);
    setNewMemLabel('');
    setNewMemContent('');
    setShowAddMemory(false);
  };

  const handleSaveMemoryEdit = (id: string) => {
    if (!editMemLabel.trim() || !editMemContent.trim()) return;
    memory.updateMemory(id, editMemLabel, editMemContent);
    setEditingMemoryId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-950/60 border border-pink-500/40 text-pink-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>CONVERSATION & MEMORY INTELLIGENCE</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Multi-turn context & user-controlled long-term memory
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-3 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent Turns ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'memories'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Memories ({memories.length})</span>
          </button>
        </div>

        {/* Privacy Banner */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Stored strictly on your device. You can view, edit, or delete any record anytime.</span>
          </div>
          {activeTab === 'history' && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-rose-400 hover:text-rose-200 text-[10px] flex items-center gap-1 shrink-0 ml-2"
              title="Clear all turns"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
          {activeTab === 'memories' && memories.length > 0 && (
            <button
              onClick={handleClearMemories}
              className="text-rose-400 hover:text-rose-200 text-[10px] flex items-center gap-1 shrink-0 ml-2"
              title="Clear all saved memories"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* TAB 1: CONVERSATION TURNS */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-400">No conversation history yet</p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Speak with Tamanna via microphone or send a prompt to begin.
                </p>
              </div>
            ) : (
              history.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    turn.role === 'user'
                      ? 'bg-slate-900/80 border-slate-700/60 ml-4 sm:ml-6 text-slate-200'
                      : 'bg-pink-950/20 border-pink-500/30 mr-4 sm:mr-6 text-pink-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {turn.role === 'user' ? 'You' : 'Tamanna'}
                    </span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTurnId(turn.id);
                          setEditTurnText(turn.text);
                        }}
                        className="hover:text-slate-200 p-0.5"
                        title="Edit turn"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => memory.deleteTurn(turn.id)}
                        className="hover:text-rose-400 p-0.5"
                        title="Delete turn"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {editingTurnId === turn.id ? (
                    <div className="mt-1 space-y-1.5">
                      <textarea
                        value={editTurnText}
                        onChange={(e) => setEditTurnText(e.target.value)}
                        className="w-full bg-slate-950 border border-pink-500/50 rounded-xl p-2 text-xs text-white"
                        rows={2}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingTurnId(null)}
                          className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveTurnEdit(turn.id)}
                          className="px-2.5 py-0.5 rounded text-[10px] bg-pink-600 text-white font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{turn.text}</p>
                  )}

                  {/* Tool Invocations Badge */}
                  {turn.toolInvocations && turn.toolInvocations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                      {turn.toolInvocations.map((ti, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            ti.success
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          ⚡ {ti.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Feedback Row for Assistant turns */}
                  {turn.role === 'assistant' && (
                    <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="italic">Helpful response?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFeedback(turn, 'helpful')}
                          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                            feedbackMap[turn.id] === 'helpful' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                          }`}
                          title="Helpful response"
                        >
                          <ThumbsUp className="w-3 h-3 inline mr-1" />
                          <span>Helpful</span>
                        </button>
                        <button
                          onClick={() => handleFeedback(turn, 'unhelpful')}
                          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                            feedbackMap[turn.id] === 'unhelpful' ? 'text-rose-400 font-semibold' : 'text-slate-400'
                          }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3 inline mr-1" />
                          <span>Improve</span>
                        </button>
                        {onOpenCorrectionModal && (
                          <button
                            onClick={() => {
                              onOpenCorrectionModal('', turn.text, turn.id);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-pink-400 hover:text-pink-300 transition-colors"
                            title="Tune behavior or add guardrail"
                          >
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            <span>Tune</span>
                          </button>
                        )}
                        {onSendPrompt && (
                          <button
                            onClick={() => {
                              onSendPrompt(`Could you rephrase that differently?`);
                              onClose();
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Try again"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: SAVED LONG-TERM MEMORIES */}
        {activeTab === 'memories' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-400 text-[11px]">
                Facts and personal context Tamanna uses across conversations:
              </span>
              <button
                onClick={() => setShowAddMemory(!showAddMemory)}
                className="px-2.5 py-1 rounded-lg bg-pink-600/30 text-pink-300 hover:bg-pink-600/50 border border-pink-500/40 text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Memory</span>
              </button>
            </div>

            {/* Add Memory Form */}
            {showAddMemory && (
              <form
                onSubmit={handleCreateMemory}
                className="p-3 rounded-2xl bg-slate-900 border border-pink-500/40 space-y-2.5 animate-in fade-in"
              >
                <h5 className="font-bold text-white text-xs">Remember New Personal Fact or Instruction</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                    <select
                      value={newMemCategory}
                      onChange={(e) => setNewMemCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="personal">Personal Info</option>
                      <option value="work">Work & Projects</option>
                      <option value="preference">Preference</option>
                      <option value="instruction">Instruction</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Topic / Label</label>
                    <input
                      type="text"
                      placeholder="e.g., Coding Framework"
                      value={newMemLabel}
                      onChange={(e) => setNewMemLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Memory Content</label>
                  <input
                    type="text"
                    placeholder="e.g., Prefers React with TypeScript and clean Tailwind CSS styling"
                    value={newMemContent}
                    onChange={(e) => setNewMemContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddMemory(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-medium"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            )}

            {memories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Bookmark className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-400">No saved memories yet</p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Save facts, projects, or instructions that you want Tamanna to recall anytime.
                </p>
              </div>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{m.label}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-pink-400 uppercase font-mono">
                        {m.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <button
                        onClick={() => {
                          setEditingMemoryId(m.id);
                          setEditMemLabel(m.label);
                          setEditMemContent(m.content);
                        }}
                        className="hover:text-white p-1"
                        title="Edit memory"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => memory.deleteMemory(m.id)}
                        className="hover:text-rose-400 p-1"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingMemoryId === m.id ? (
                    <div className="space-y-1.5 mt-1 pt-1 border-t border-slate-800">
                      <input
                        type="text"
                        value={editMemLabel}
                        onChange={(e) => setEditMemLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-pink-500/50 rounded-lg p-1.5 text-xs text-white"
                      />
                      <textarea
                        value={editMemContent}
                        onChange={(e) => setEditMemContent(e.target.value)}
                        className="w-full bg-slate-950 border border-pink-500/50 rounded-lg p-1.5 text-xs text-white"
                        rows={2}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingMemoryId(null)}
                          className="px-2 py-0.5 text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveMemoryEdit(m.id)}
                          className="px-3 py-0.5 bg-pink-600 text-white rounded font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-200 leading-relaxed font-medium">"{m.content}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
