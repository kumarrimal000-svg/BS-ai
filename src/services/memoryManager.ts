import {
  MemoryCategory,
  MemorySearchResult,
  MemorySettings,
  PersonalizationProfile,
  ProjectMemoryItem,
  StructuredMemoryItem,
} from '../types/memory';
import { ConversationMemory } from './conversationMemory';

const STORAGE_KEY_MEMORIES = 'tamanna_structured_memories_v2';
const STORAGE_KEY_PROJECTS = 'tamanna_project_memories_v2';
const STORAGE_KEY_SETTINGS = 'tamanna_memory_settings_v2';
const STORAGE_KEY_PROFILE = 'tamanna_personalization_profile_v2';

const DEFAULT_SETTINGS: MemorySettings = {
  memoryEnabled: true,
  temporaryMode: false,
  confirmBeforeSaving: false,
  notifyOnMemorySave: true,
  storageBackend: 'localStorage',
};

const DEFAULT_PROFILE: PersonalizationProfile = {
  preferredLanguage: 'auto',
  preferredResponseStyle: 'flirty_sassy',
  frequentlyUsedTools: [],
  activeProjects: ['Tamanna AI Assistant'],
  learningTopics: ['Gemini Multimodal Live', 'Real-time Web Audio'],
  uiPreferences: {
    themeMood: 'magenta',
    voice: 'Aoede',
    speed: 1.0,
  },
};

const INITIAL_MEMORIES: StructuredMemoryItem[] = [
  {
    id: 'mem-seed-1',
    category: 'user_preferences',
    title: 'Communication Preference',
    content: 'Prefers lively conversational banter in Hinglish/English with crisp, direct answers.',
    tags: ['persona', 'language'],
    importance: 'high',
    source: 'manual',
    isPinned: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mem-seed-2',
    category: 'important_info',
    title: 'Assistant Identity',
    content: 'Tamanna is an intelligent, razor-witty female companion with 246 real tools.',
    tags: ['identity', 'persona'],
    importance: 'critical',
    source: 'manual',
    isPinned: true,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];

const INITIAL_PROJECTS: ProjectMemoryItem[] = [
  {
    id: 'proj-seed-1',
    projectName: 'Tamanna AI Assistant',
    goal: 'Build an ultra-responsive, multilingual voice AI companion with 246 tools and self-learning intelligence.',
    currentProgress: 95,
    completedTasks: [
      'Gemini Multimodal Live WebSocket audio streaming',
      'Futuristic reactive neon orb visualizer',
      'Central 246 tool execution registry',
      'Self-learning and adaptive feedback analytics',
      'Advanced Voice Intelligence & hardware microphone diagnostics',
    ],
    pendingTasks: [
      'Cloud backend sync for cross-device memory persistence',
    ],
    importantDecisions: [
      'Direct client-side Web Audio clocking for zero latency',
      'Privacy-first local memory management with explicit user controls',
    ],
    nextStep: 'Empower user with advanced structured memory and project tracking.',
    tags: ['ai', 'voice', 'react'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
  },
];

export class MemoryManager {
  private static instance: MemoryManager;
  private memories: StructuredMemoryItem[] = [];
  private projects: ProjectMemoryItem[] = [];
  private settings: MemorySettings = { ...DEFAULT_SETTINGS };
  private profile: PersonalizationProfile = { ...DEFAULT_PROFILE };
  private listeners: Set<() => void> = new Set();
  private notificationListeners: Set<(item: StructuredMemoryItem | ProjectMemoryItem, action: 'saved' | 'updated') => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (rawSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
      }

      const rawProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (rawProfile) {
        this.profile = { ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) };
      }

      const rawMemories = localStorage.getItem(STORAGE_KEY_MEMORIES);
      if (rawMemories) {
        const parsed = JSON.parse(rawMemories);
        if (Array.isArray(parsed)) {
          this.memories = parsed;
        }
      } else {
        this.memories = [...INITIAL_MEMORIES];
        this.saveMemories();
      }

      const rawProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (rawProjects) {
        const parsed = JSON.parse(rawProjects);
        if (Array.isArray(parsed)) {
          this.projects = parsed;
        }
      } else {
        this.projects = [...INITIAL_PROJECTS];
        this.saveProjects();
      }
    } catch (e) {
      console.warn('[MemoryManager] Error loading from storage:', e);
      this.memories = [...INITIAL_MEMORIES];
      this.projects = [...INITIAL_PROJECTS];
    }
  }

  private saveMemories(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('[MemoryManager] Error saving memories:', e);
    }
  }

  private saveProjects(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('[MemoryManager] Error saving projects:', e);
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[MemoryManager] Error saving settings:', e);
    }
  }

  private saveProfile(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('[MemoryManager] Error saving profile:', e);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.warn('[MemoryManager] Listener notification error:', e);
      }
    }
  }

  private notifyNotification(item: StructuredMemoryItem | ProjectMemoryItem, action: 'saved' | 'updated'): void {
    for (const listener of this.notificationListeners) {
      try {
        listener(item, action);
      } catch (e) {
        console.warn('[MemoryManager] Notification error:', e);
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onNotification(listener: (item: StructuredMemoryItem | ProjectMemoryItem, action: 'saved' | 'updated') => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  // Settings & Status
  public getSettings(): MemorySettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<MemorySettings>): MemorySettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.notify();
    return this.getSettings();
  }

  public isMemoryActive(): boolean {
    return this.settings.memoryEnabled && !this.settings.temporaryMode;
  }

  // Memory CRUD
  public getAllMemories(): StructuredMemoryItem[] {
    return [...this.memories];
  }

  public getRecentMemories(count: number = 3): StructuredMemoryItem[] {
    return [...this.memories]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, count);
  }

  public getMemoriesByCategory(category: MemoryCategory): StructuredMemoryItem[] {
    return this.memories.filter((m) => m.category === category);
  }

  public addMemory(
    category: MemoryCategory,
    title: string,
    content: string,
    options?: {
      tags?: string[];
      importance?: 'normal' | 'high' | 'critical';
      source?: 'voice' | 'manual' | 'tool';
      isPinned?: boolean;
    }
  ): StructuredMemoryItem {
    if (!this.settings.memoryEnabled || this.settings.temporaryMode) {
      throw new Error('Memory system is currently disabled or in temporary conversation mode.');
    }

    const newItem: StructuredMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      title: title.trim(),
      content: content.trim(),
      tags: options?.tags || [],
      importance: options?.importance || 'normal',
      source: options?.source || 'manual',
      isPinned: options?.isPinned || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.memories.unshift(newItem);
    this.saveMemories();
    this.notify();
    this.notifyNotification(newItem, 'saved');

    // Backward compatibility sync with ConversationMemory
    try {
      ConversationMemory.getInstance().addMemory(
        category === 'projects' ? 'work' : category === 'user_preferences' ? 'preference' : 'personal',
        newItem.title,
        newItem.content
      );
    } catch {}

    return newItem;
  }

  public updateMemory(id: string, partial: Partial<Omit<StructuredMemoryItem, 'id' | 'createdAt'>>): boolean {
    const idx = this.memories.findIndex((m) => m.id === id);
    if (idx === -1) return false;

    this.memories[idx] = {
      ...this.memories[idx],
      ...partial,
      updatedAt: Date.now(),
    };

    this.saveMemories();
    this.notify();
    this.notifyNotification(this.memories[idx], 'updated');
    return true;
  }

  public deleteMemory(id: string): boolean {
    const prevLen = this.memories.length;
    this.memories = this.memories.filter((m) => m.id !== id);
    if (this.memories.length !== prevLen) {
      this.saveMemories();
      this.notify();
      return true;
    }
    return false;
  }

  public togglePin(id: string): boolean {
    const item = this.memories.find((m) => m.id === id);
    if (!item) return false;
    item.isPinned = !item.isPinned;
    item.updatedAt = Date.now();
    this.saveMemories();
    this.notify();
    return true;
  }

  public clearAllMemories(): void {
    this.memories = [];
    this.saveMemories();
    this.notify();
  }

  public searchMemories(query: string, category?: MemoryCategory): MemorySearchResult {
    const q = query.toLowerCase().trim();
    if (!q) {
      const filteredMemories = category
        ? this.memories.filter((m) => m.category === category)
        : this.memories;
      return {
        memories: filteredMemories,
        projects: !category || category === 'projects' ? this.projects : [],
      };
    }

    const matchedMemories = this.memories.filter((m) => {
      if (category && m.category !== category) return false;
      return (
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });

    const matchedProjects = (!category || category === 'projects')
      ? this.projects.filter((p) => {
          return (
            p.projectName.toLowerCase().includes(q) ||
            p.goal.toLowerCase().includes(q) ||
            p.nextStep.toLowerCase().includes(q) ||
            p.completedTasks.some((t) => t.toLowerCase().includes(q)) ||
            p.pendingTasks.some((t) => t.toLowerCase().includes(q))
          );
        })
      : [];

    return {
      memories: matchedMemories,
      projects: matchedProjects,
    };
  }

  // Projects CRUD
  public getAllProjects(): ProjectMemoryItem[] {
    return [...this.projects];
  }

  public getProject(idOrName: string): ProjectMemoryItem | undefined {
    const query = idOrName.toLowerCase().trim();
    return this.projects.find(
      (p) => p.id === idOrName || p.projectName.toLowerCase() === query
    );
  }

  public saveProject(
    projectData: Partial<ProjectMemoryItem> & { projectName: string }
  ): ProjectMemoryItem {
    if (!this.settings.memoryEnabled || this.settings.temporaryMode) {
      throw new Error('Memory system is currently disabled or in temporary conversation mode.');
    }

    const existingIdx = this.projects.findIndex(
      (p) =>
        (projectData.id && p.id === projectData.id) ||
        p.projectName.toLowerCase() === projectData.projectName.toLowerCase().trim()
    );

    let result: ProjectMemoryItem;

    if (existingIdx >= 0) {
      const existing = this.projects[existingIdx];
      result = {
        ...existing,
        ...projectData,
        completedTasks: projectData.completedTasks || existing.completedTasks,
        pendingTasks: projectData.pendingTasks || existing.pendingTasks,
        importantDecisions: projectData.importantDecisions || existing.importantDecisions,
        updatedAt: Date.now(),
      };
      this.projects[existingIdx] = result;
      this.notifyNotification(result, 'updated');
    } else {
      result = {
        id: projectData.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectName: projectData.projectName.trim(),
        goal: projectData.goal?.trim() || '',
        currentProgress: typeof projectData.currentProgress === 'number' ? projectData.currentProgress : 0,
        completedTasks: projectData.completedTasks || [],
        pendingTasks: projectData.pendingTasks || [],
        importantDecisions: projectData.importantDecisions || [],
        nextStep: projectData.nextStep?.trim() || '',
        tags: projectData.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.projects.unshift(result);
      this.notifyNotification(result, 'saved');
    }

    this.saveProjects();
    this.notify();
    return result;
  }

  public deleteProject(id: string): boolean {
    const prevLen = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.projects.length !== prevLen) {
      this.saveProjects();
      this.notify();
      return true;
    }
    return false;
  }

  // Personalization
  public recordToolUsage(toolName: string): void {
    if (!this.isMemoryActive()) return;
    const existing = this.profile.frequentlyUsedTools.find((t) => t.toolName === toolName);
    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      this.profile.frequentlyUsedTools.push({
        toolName,
        count: 1,
        lastUsed: Date.now(),
      });
    }
    // Sort descending by count
    this.profile.frequentlyUsedTools.sort((a, b) => b.count - a.count);
    this.saveProfile();
    this.notify();
  }

  public addLearningTopic(topic: string): void {
    if (!this.isMemoryActive()) return;
    const trimmed = topic.trim();
    if (!trimmed || this.profile.learningTopics.includes(trimmed)) return;
    this.profile.learningTopics.push(trimmed);
    this.saveProfile();
    this.notify();
  }

  public removeLearningTopic(topic: string): void {
    this.profile.learningTopics = this.profile.learningTopics.filter((t) => t !== topic);
    this.saveProfile();
    this.notify();
  }

  public getPersonalizationProfile(): PersonalizationProfile {
    return { ...this.profile };
  }

  public updatePersonalizationProfile(partial: Partial<PersonalizationProfile>): void {
    this.profile = { ...this.profile, ...partial };
    this.saveProfile();
    this.notify();
  }

  /**
   * Generates structured memory context block to inject into the Gemini Live session systemInstruction.
   * If memory is disabled or in temporary conversation mode, returns empty string.
   */
  public generateLiveContextAugment(): string {
    if (!this.isMemoryActive()) {
      return `[TEMPORARY CONVERSATION MODE ACTIVE]:
Do not access or save any long-term memories or personal facts in this session. Treat this session as completely ephemeral.`;
    }

    const lines: string[] = ['[VERIFIED SAVED USER MEMORIES & CONTEXT]:'];
    lines.push('Tamanna: You have direct access to the user\'s legitimate, user-controlled memory database below.');
    lines.push('Rules:');
    lines.push('1. Naturally use this context when answering questions (e.g. projects, personal preferences).');
    lines.push('2. Do NOT regurgitate or read out this entire memory list unprompted.');
    lines.push('3. When user says "Remember that...", call `saveUserMemory` or `saveProjectMemory` and confirm briefly: "Got it. I\'ll save that as a project detail."');
    lines.push('4. When user asks "What do you remember about my project?", retrieve from the Project section below.');
    lines.push('5. Never claim to remember something that is not in this verified list.');

    // Pinned and top memories
    const topMemories = this.memories.slice(0, 15);
    if (topMemories.length > 0) {
      lines.push('\n-- Structured Memories --');
      for (const m of topMemories) {
        lines.push(`• [${m.category.toUpperCase()}] ${m.title}: "${m.content}"`);
      }
    }

    // Projects
    if (this.projects.length > 0) {
      lines.push('\n-- Active Projects --');
      for (const p of this.projects) {
        lines.push(`• Project: "${p.projectName}" | Progress: ${p.currentProgress}% | Goal: ${p.goal}`);
        if (p.nextStep) lines.push(`  Next Step: ${p.nextStep}`);
        if (p.completedTasks.length > 0) lines.push(`  Completed: ${p.completedTasks.join(', ')}`);
        if (p.pendingTasks.length > 0) lines.push(`  Pending: ${p.pendingTasks.join(', ')}`);
        if (p.importantDecisions.length > 0) lines.push(`  Decisions: ${p.importantDecisions.join(', ')}`);
      }
    }

    // Frequent tools
    const topTools = this.profile.frequentlyUsedTools.slice(0, 5);
    if (topTools.length > 0) {
      lines.push(`\n-- Frequently Used Tools --\n${topTools.map((t) => t.toolName).join(', ')}`);
    }

    return lines.join('\n');
  }

  // Export / Import
  public exportJSON(): string {
    return JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        settings: this.settings,
        memories: this.memories,
        projects: this.projects,
        profile: this.profile,
      },
      null,
      2
    );
  }

  public importJSON(jsonString: string): { importedMemories: number; importedProjects: number } {
    const data = JSON.parse(jsonString);
    let importedMemories = 0;
    let importedProjects = 0;

    if (Array.isArray(data.memories)) {
      this.memories = data.memories;
      this.saveMemories();
      importedMemories = data.memories.length;
    }
    if (Array.isArray(data.projects)) {
      this.projects = data.projects;
      this.saveProjects();
      importedProjects = data.projects.length;
    }
    if (data.settings) {
      this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      this.saveSettings();
    }
    if (data.profile) {
      this.profile = { ...DEFAULT_PROFILE, ...data.profile };
      this.saveProfile();
    }

    this.notify();
    return { importedMemories, importedProjects };
  }
}
