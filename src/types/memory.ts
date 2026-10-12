export type MemoryCategory =
  | 'user_preferences'
  | 'important_info'
  | 'projects'
  | 'learning'
  | 'frequent_requests'
  | 'assistant_settings';

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, { title: string; desc: string; icon: string; color: string }> = {
  user_preferences: {
    title: 'User Preferences',
    desc: 'Speaking style, language, favorite topics, and personal preferences',
    icon: 'Heart',
    color: '#ec4899',
  },
  important_info: {
    title: 'Important Information',
    desc: 'Key facts, reminders, contact notes, and important references',
    icon: 'ShieldAlert',
    color: '#8b5cf6',
  },
  projects: {
    title: 'Projects',
    desc: 'Ongoing projects, goals, tasks, decisions, and next steps',
    icon: 'Briefcase',
    color: '#06b6d4',
  },
  learning: {
    title: 'Learning',
    desc: 'Topics you are studying, skills, research, and technical concepts',
    icon: 'BookOpen',
    color: '#10b981',
  },
  frequent_requests: {
    title: 'Frequently Used Requests',
    desc: 'Recurring routines, favorite workflows, and repeated prompts',
    icon: 'Repeat',
    color: '#f59e0b',
  },
  assistant_settings: {
    title: 'Assistant Settings',
    desc: 'Configured tone, persona dynamics, and assistant behavior rules',
    icon: 'Sliders',
    color: '#a855f7',
  },
};

export interface StructuredMemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags?: string[];
  importance?: 'normal' | 'high' | 'critical';
  source?: 'voice' | 'manual' | 'tool';
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMemoryItem {
  id: string;
  projectName: string;
  goal: string;
  currentProgress: number; // 0 to 100
  completedTasks: string[];
  pendingTasks: string[];
  importantDecisions: string[];
  nextStep: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemorySettings {
  memoryEnabled: boolean;
  temporaryMode: boolean; // Incognito / ephemeral mode - no memories read or written
  confirmBeforeSaving: boolean;
  notifyOnMemorySave: boolean;
  storageBackend: 'localStorage' | 'backendPending';
}

export interface ToolUsageStat {
  toolName: string;
  count: number;
  lastUsed: number;
}

export interface PersonalizationProfile {
  preferredLanguage: string;
  preferredResponseStyle: string;
  frequentlyUsedTools: ToolUsageStat[];
  activeProjects: string[];
  learningTopics: string[];
  uiPreferences: {
    themeMood: string;
    voice: string;
    speed: number;
  };
}

export interface MemorySearchResult {
  memories: StructuredMemoryItem[];
  projects: ProjectMemoryItem[];
}
