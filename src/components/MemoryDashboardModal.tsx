import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Search,
  Plus,
  Trash2,
  Edit3,
  Pin,
  Shield,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Briefcase,
  Heart,
  Repeat,
  Sliders,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  AlertTriangle,
  Layers,
  ArrowRight,
  Target,
  ListTodo,
  Milestone,
  HelpCircle,
  EyeOff,
} from 'lucide-react';
import {
  MemoryCategory,
  MEMORY_CATEGORY_LABELS,
  ProjectMemoryItem,
  StructuredMemoryItem,
} from '../types/memory';
import { MemoryManager } from '../services/memoryManager';

interface MemoryDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt?: (text: string) => void;
}

export const MemoryDashboardModal: React.FC<MemoryDashboardModalProps> = ({
  isOpen,
  onClose,
  onSendPrompt,
}) => {
  const [manager] = useState(() => MemoryManager.getInstance());
  const [settings, setSettings] = useState(() => manager.getSettings());
  const [profile, setProfile] = useState(() => manager.getPersonalizationProfile());
  const [memories, setMemories] = useState<StructuredMemoryItem[]>(() => manager.getAllMemories());
  const [projects, setProjects] = useState<ProjectMemoryItem[]>(() => manager.getAllProjects());

  // UI state
  const [activeTab, setActiveTab] = useState<'memories' | 'projects' | 'personalization' | 'privacy'>('memories');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add / Edit Memory Modal form state
  const [isEditingMemory, setIsEditingMemory] = useState<boolean>(false);
  const [memoryForm, setMemoryForm] = useState<{
    id?: string;
    category: MemoryCategory;
    title: string;
    content: string;
    tags: string;
    importance: 'normal' | 'high' | 'critical';
  }>({
    category: 'important_info',
    title: '',
    content: '',
    tags: '',
    importance: 'normal',
  });

  // Add / Edit Project Modal form state
  const [isEditingProject, setIsEditingProject] = useState<boolean>(false);
  const [projectForm, setProjectForm] = useState<{
    id?: string;
    projectName: string;
    goal: string;
    currentProgress: number;
    completedTasks: string;
    pendingTasks: string;
    importantDecisions: string;
    nextStep: string;
  }>({
    projectName: '',
    goal: '',
    currentProgress: 0,
    completedTasks: '',
    pendingTasks: '',
    importantDecisions: '',
    nextStep: '',
  });

  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Sync with MemoryManager updates
  useEffect(() => {
    if (!isOpen) return;
    const unsub = manager.subscribe(() => {
      setSettings(manager.getSettings());
      setProfile(manager.getPersonalizationProfile());
      setMemories(manager.getAllMemories());
      setProjects(manager.getAllProjects());
    });
    return unsub;
  }, [isOpen, manager]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.projectName.toLowerCase().includes(q) ||
      p.goal.toLowerCase().includes(q) ||
      p.nextStep.toLowerCase().includes(q)
    );
  });

  // Handlers for Memory
  const handleSaveMemoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryForm.title.trim() || !memoryForm.content.trim()) return;

    const tagsArray = memoryForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (memoryForm.id) {
      manager.updateMemory(memoryForm.id, {
        category: memoryForm.category,
        title: memoryForm.title,
        content: memoryForm.content,
        tags: tagsArray,
        importance: memoryForm.importance,
      });
      showNotification(`Updated memory: "${memoryForm.title}"`);
    } else {
      manager.addMemory(memoryForm.category, memoryForm.title, memoryForm.content, {
        tags: tagsArray,
        importance: memoryForm.importance,
        source: 'manual',
      });
      showNotification(`Saved new memory: "${memoryForm.title}"`);
    }

    setIsEditingMemory(false);
    setMemoryForm({
      category: 'important_info',
      title: '',
      content: '',
      tags: '',
      importance: 'normal',
    });
  };

  const handleEditMemory = (m: StructuredMemoryItem) => {
    setMemoryForm({
      id: m.id,
      category: m.category,
      title: m.title,
      content: m.content,
      tags: m.tags ? m.tags.join(', ') : '',
      importance: m.importance || 'normal',
    });
    setIsEditingMemory(true);
  };

  const handleDeleteMemory = (id: string, title: string) => {
    manager.deleteMemory(id);
    showNotification(`Deleted memory: "${title}"`);
  };

  const handleTogglePin = (id: string) => {
    manager.togglePin(id);
  };

  // Handlers for Projects
  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.projectName.trim()) return;

    const completed = projectForm.completedTasks
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const pending = projectForm.pendingTasks
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const decisions = projectForm.importantDecisions
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    manager.saveProject({
      id: projectForm.id,
      projectName: projectForm.projectName,
      goal: projectForm.goal,
      currentProgress: Math.min(100, Math.max(0, projectForm.currentProgress)),
      completedTasks: completed,
      pendingTasks: pending,
      importantDecisions: decisions,
      nextStep: projectForm.nextStep,
    });

    showNotification(`Saved project: "${projectForm.projectName}"`);
    setIsEditingProject(false);
    setProjectForm({
      projectName: '',
      goal: '',
      currentProgress: 0,
      completedTasks: '',
      pendingTasks: '',
      importantDecisions: '',
      nextStep: '',
    });
  };

  const handleEditProject = (p: ProjectMemoryItem) => {
    setProjectForm({
      id: p.id,
      projectName: p.projectName,
      goal: p.goal,
      currentProgress: p.currentProgress,
      completedTasks: p.completedTasks.join('\n'),
      pendingTasks: p.pendingTasks.join('\n'),
      importantDecisions: p.importantDecisions.join('\n'),
      nextStep: p.nextStep,
    });
    setIsEditingProject(true);
  };

  const handleDeleteProject = (id: string, name: string) => {
    manager.deleteProject(id);
    showNotification(`Deleted project: "${name}"`);
  };

  const handleToggleMemoryEnabled = () => {
    const updated = manager.updateSettings({ memoryEnabled: !settings.memoryEnabled });
    setSettings(updated);
    showNotification(`Memory system is now ${updated.memoryEnabled ? 'Enabled' : 'Paused'}.`);
  };

  const handleToggleTemporaryMode = () => {
    const updated = manager.updateSettings({ temporaryMode: !settings.temporaryMode });
    setSettings(updated);
    showNotification(
      updated.temporaryMode
        ? 'Temporary Conversation Mode activated. No memories will be saved or read.'
        : 'Normal Memory Mode restored.'
    );
  };

  const handleExportJSON = () => {
    const data = manager.exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamanna-memory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported memory backup to JSON file.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = manager.importJSON(text);
        showNotification(`Imported ${res.importedMemories} memories and ${res.importedProjects} projects!`);
      } catch (err: any) {
        showNotification('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-[#0d101d] to-[#080911] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-inner">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  ADVANCED MEMORY & PERSONALIZATION
                </h2>
                {settings.temporaryMode ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                    <EyeOff className="w-3 h-3" />
                    Temporary Mode
                  </span>
                ) : settings.memoryEnabled ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Memory Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Memory Paused
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                User preferences, project tracking, smart personalization & privacy control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Temporary Mode Warning Banner */}
        {settings.temporaryMode && (
          <div className="px-5 py-2.5 bg-purple-950/80 border-b border-purple-500/40 text-xs text-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Incognito Active:</strong> Tamanna is in temporary mode. No conversation turns or new facts will be saved to memory, and existing memories are hidden.
              </span>
            </div>
            <button
              onClick={handleToggleTemporaryMode}
              className="text-[11px] underline text-purple-300 hover:text-white font-medium"
            >
              Resume Memory
            </button>
          </div>
        )}

        {/* Notification Toast */}
        {notificationMsg && (
          <div className="px-5 py-2 bg-pink-500/20 border-b border-pink-500/40 text-xs text-pink-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-950/40 border-b border-slate-800 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px]">SAVED MEMORIES</span>
              <span className="text-white font-bold text-sm">{memories.length}</span>
            </div>
            <Sparkles className="w-4 h-4 text-pink-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px]">ACTIVE PROJECTS</span>
              <span className="text-white font-bold text-sm">{projects.length}</span>
            </div>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px]">LEARNING TOPICS</span>
              <span className="text-white font-bold text-sm">{profile.learningTopics.length}</span>
            </div>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px]">STORAGE ENGINE</span>
              <span className="text-emerald-400 font-bold text-[11px]">Local Browser (Ready)</span>
            </div>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/60 justify-between items-center overflow-x-auto">
          <div className="flex">
            <button
              onClick={() => setActiveTab('memories')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'memories'
                  ? 'border-pink-500 text-pink-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              All Memories ({memories.length})
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'projects'
                  ? 'border-cyan-500 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Projects ({projects.length})
            </button>

            <button
              onClick={() => setActiveTab('personalization')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'personalization'
                  ? 'border-purple-500 text-purple-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Personalization
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy & Controls
            </button>
          </div>
        </div>

        {/* Tab 1: Memories Feed */}
        {activeTab === 'memories' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search memories, tags, facts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500 placeholder-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setMemoryForm({
                      category: selectedCategory === 'all' ? 'important_info' : selectedCategory,
                      title: '',
                      content: '',
                      tags: '',
                      importance: 'normal',
                    });
                    setIsEditingMemory(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs shadow-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Memory
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg border transition-all whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-pink-500/20 border-pink-500 text-white font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Categories ({memories.length})
              </button>

              {(Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).map((cat) => {
                const count = memories.filter((m) => m.category === cat).length;
                const info = MEMORY_CATEGORY_LABELS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-slate-800 border-slate-600 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                    <span>{info.title}</span>
                    <span className="text-[10px] text-slate-500">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Memories List */}
            {filteredMemories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No Memories Found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No memories matched "${searchQuery}".`
                    : 'Ask Tamanna: "Remember that..." or click Add Memory above to record important preferences.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMemories.map((m) => {
                  const catInfo = MEMORY_CATEGORY_LABELS[m.category] || MEMORY_CATEGORY_LABELS.important_info;
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border bg-slate-900/70 transition-all flex flex-col justify-between ${
                        m.isPinned
                          ? 'border-pink-500/60 shadow-md shadow-pink-500/5 ring-1 ring-pink-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Memory Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold"
                              style={{
                                backgroundColor: `${catInfo.color}20`,
                                color: catInfo.color,
                                border: `1px solid ${catInfo.color}40`,
                              }}
                            >
                              {catInfo.title}
                            </span>
                            {m.importance === 'critical' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                CRITICAL
                              </span>
                            )}
                            {m.importance === 'high' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                HIGH
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              onClick={() => handleTogglePin(m.id)}
                              className={`p-1 rounded hover:text-white transition-colors ${
                                m.isPinned ? 'text-pink-400' : 'text-slate-500'
                              }`}
                              title={m.isPinned ? 'Unpin memory' : 'Pin memory'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEditMemory(m)}
                              className="p-1 rounded hover:text-white transition-colors"
                              title="Edit memory"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMemory(m.id, m.title)}
                              className="p-1 rounded hover:text-rose-400 transition-colors"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title and Content */}
                        <h4 className="font-bold text-xs text-white mb-1">{m.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed break-words">{m.content}</p>
                      </div>

                      {/* Footer tags and date */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.tags &&
                            m.tags.map((t, idx) => (
                              <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">
                                #{t}
                              </span>
                            ))}
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          {new Date(m.updatedAt || m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Projects Hub */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ongoing Projects & Milestones
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tamanna remembers project goals, current progress, pending tasks, and next steps.
                </p>
              </div>
              <button
                onClick={() => {
                  setProjectForm({
                    projectName: '',
                    goal: '',
                    currentProgress: 0,
                    completedTasks: '',
                    pendingTasks: '',
                    importantDecisions: '',
                    nextStep: '',
                  });
                  setIsEditingProject(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No Projects Found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tell Tamanna in voice: "Remember that my project is called [Name]" or click Add Project above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{p.projectName}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {p.currentProgress}% Complete
                          </span>
                        </div>
                        {p.goal && <p className="text-xs text-slate-300 mt-1">{p.goal}</p>}
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => handleEditProject(p)}
                          className="p-1 rounded hover:text-white transition-colors"
                          title="Edit project"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.id, p.projectName)}
                          className="p-1 rounded hover:text-rose-400 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Milestone Progress</span>
                        <span className="text-cyan-400 font-bold">{p.currentProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${p.currentProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Step Banner */}
                    {p.nextStep && (
                      <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2 text-xs text-cyan-200">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[10px] uppercase text-cyan-400 block font-mono">
                            IMMEDIATE NEXT STEP
                          </span>
                          <span>{p.nextStep}</span>
                        </div>
                      </div>
                    )}

                    {/* Tasks Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Completed */}
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed ({p.completedTasks.length})
                        </span>
                        {p.completedTasks.length === 0 ? (
                          <span className="text-slate-600 text-[11px] block">No tasks finished yet.</span>
                        ) : (
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {p.completedTasks.map((t, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-500">✓</span>
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Pending */}
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 font-mono uppercase">
                          <ListTodo className="w-3 h-3" />
                          Pending ({p.pendingTasks.length})
                        </span>
                        {p.pendingTasks.length === 0 ? (
                          <span className="text-slate-600 text-[11px] block">All tasks completed!</span>
                        ) : (
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {p.pendingTasks.map((t, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-amber-500">•</span>
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Decisions */}
                    {p.importantDecisions.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs">
                        <span className="text-[10px] font-bold text-purple-400 block font-mono uppercase mb-1">
                          Key Decisions & Architecture Notes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {p.importantDecisions.map((d, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/30 text-[11px]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Smart Personalization */}
        {activeTab === 'personalization' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Personalization Signals & Live Inferences
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Context Active</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Tamanna automatically aligns her responses to your legitimate preferences without claiming unsupported facts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block">Spoken Language Mode</span>
                  <span className="text-white font-bold capitalize mt-0.5 block">{profile.preferredLanguage}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Hindi & English blended naturally.</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block">Response Style</span>
                  <span className="text-white font-bold capitalize mt-0.5 block">
                    {profile.preferredResponseStyle.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Witty, playful, and sharp cadence.</span>
                </div>
              </div>
            </div>

            {/* Learning Topics */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Active Learning Topics
              </span>
              <p className="text-slate-400">
                Subjects you are currently studying or exploring. Tamanna emphasizes these during explanations.
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.learningTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[11px]"
                  >
                    <span>{topic}</span>
                    <button
                      onClick={() => manager.removeLearningTopic(topic)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Frequently Used Tools */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Repeat className="w-4 h-4 text-amber-400" />
                Frequently Used Tools (Auto-Learned)
              </span>
              <p className="text-slate-400">
                Tamanna tracks your most frequent workflows to execute them with minimum delay.
              </p>

              {profile.frequentlyUsedTools.length === 0 ? (
                <div className="p-3 text-center text-slate-500 font-mono text-[11px]">
                  No tool usage tracked yet. Execute any of Tamanna's 246 tools to see rankings.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {profile.frequentlyUsedTools.slice(0, 6).map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-mono text-[11px] text-slate-300 truncate">{t.toolName}</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {t.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Privacy & Controls */}
        {activeTab === 'privacy' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Memory On/Off Switch */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs">Master Memory System</div>
                <div className="text-[11px] text-slate-400">
                  When enabled, Tamanna references saved preferences and remembers new facts you ask to save.
                </div>
              </div>
              <button
                onClick={handleToggleMemoryEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.memoryEnabled ? 'bg-pink-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.memoryEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Temporary Conversation Mode (Incognito) */}
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-purple-200 text-xs flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-purple-400" />
                  Temporary Conversation Mode (Incognito)
                </div>
                <div className="text-[11px] text-purple-300/80">
                  Completely disables memory lookup and saving for this session. Ephemeral, zero-trace conversation.
                </div>
              </div>
              <button
                onClick={handleToggleTemporaryMode}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.temporaryMode ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.temporaryMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Privacy Transparency Report */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Privacy & Data Architecture Transparency
              </span>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    <strong>User-Controlled Storage:</strong> All memories are stored securely in your browser's local sandbox ({memories.length} records).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    <strong>No Secret Data Harvest:</strong> Tamanna only saves information when explicitly instructed (e.g., "Remember that...") or when manually entered here.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    <strong>Backend Separation:</strong> Storage is currently managed locally through a clean MemoryManager service architecture, ready for secure cloud backend synchronization.
                  </span>
                </li>
              </ul>
            </div>

            {/* Backup & Restore */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="font-bold text-white text-xs">Backup & Portability</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON Backup
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Import Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Clear All Memories */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
              <div>
                <div className="font-bold text-rose-300 text-xs">Clear All Memories</div>
                <div className="text-[11px] text-slate-400">
                  Permanently deletes all {memories.length} structured memories from your browser.
                </div>
              </div>
              <button
                onClick={() => setConfirmClearOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/80 bg-slate-950/80">
          <div className="text-[11px] text-slate-500 font-mono">
            {memories.length} memories · {projects.length} projects · Memory {settings.memoryEnabled ? 'Active' : 'Off'}
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Add / Edit Memory Dialog Modal */}
      {isEditingMemory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-pink-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {memoryForm.id ? 'Edit Memory' : 'Add New Memory'}
              </h3>
              <button
                onClick={() => setIsEditingMemory(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemoryForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={memoryForm.category}
                  onChange={(e) => setMemoryForm({ ...memoryForm, category: e.target.value as MemoryCategory })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {(Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {MEMORY_CATEGORY_LABELS[cat].title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Title / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Favorite Language, Project Goal, Meeting Rule"
                  value={memoryForm.title}
                  onChange={(e) => setMemoryForm({ ...memoryForm, title: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Memory Content</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain what Tamanna should remember..."
                  value={memoryForm.content}
                  onChange={(e) => setMemoryForm({ ...memoryForm, content: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Importance</label>
                  <select
                    value={memoryForm.importance}
                    onChange={(e) => setMemoryForm({ ...memoryForm, importance: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. persona, work, urgent"
                    value={memoryForm.tags}
                    onChange={(e) => setMemoryForm({ ...memoryForm, tags: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingMemory(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-medium shadow-md"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Project Dialog Modal */}
      {isEditingProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {projectForm.id ? 'Edit Project Details' : 'Add New Project'}
              </h3>
              <button
                onClick={() => setIsEditingProject(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tamanna AI Assistant"
                  value={projectForm.projectName}
                  onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary Goal</label>
                <input
                  type="text"
                  placeholder="What is the objective of this project?"
                  value={projectForm.goal}
                  onChange={(e) => setProjectForm({ ...projectForm, goal: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Current Progress</span>
                  <span className="font-mono text-cyan-400 font-bold">{projectForm.currentProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={projectForm.currentProgress}
                  onChange={(e) => setProjectForm({ ...projectForm, currentProgress: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Immediate Next Step</label>
                <input
                  type="text"
                  placeholder="What needs to happen next?"
                  value={projectForm.nextStep}
                  onChange={(e) => setProjectForm({ ...projectForm, nextStep: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Completed Tasks (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Task 1&#10;Task 2"
                    value={projectForm.completedTasks}
                    onChange={(e) => setProjectForm({ ...projectForm, completedTasks: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Pending Tasks (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Next milestone&#10;Fix issue"
                    value={projectForm.pendingTasks}
                    onChange={(e) => setProjectForm({ ...projectForm, pendingTasks: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Important Decisions / Architecture Notes (1 per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Decision: Used React 19&#10;Decision: Offline local storage"
                  value={projectForm.importantDecisions}
                  onChange={(e) => setProjectForm({ ...projectForm, importantDecisions: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProject(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Clear All Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Clear All Memories?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all {memories.length} saved memories and personal preferences from this device. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  manager.clearAllMemories();
                  setConfirmClearOpen(false);
                  showNotification('All memories cleared.');
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
