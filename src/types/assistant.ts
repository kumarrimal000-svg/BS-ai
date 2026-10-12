export type AssistantState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export type ThemeMood = 'magenta' | 'cyan' | 'violet' | 'emerald' | 'amber';

export type TeaseReaction = 'smirk' | 'wink' | 'heart' | 'sparkle' | 'giggle' | 'pout' | 'tease' | null;

export interface BrowserActionItem {
  id: string;
  name: string;
  url: string;
  siteName: string;
  description?: string;
  timestamp: number;
}

export interface TranscriptSnippet {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface LiveVoiceOption {
  id: string;
  name: string;
  description: string;
  gender: string;
}

export interface TaskPlanStep {
  id: string;
  title: string;
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  result?: any;
}

export interface TaskPlan {
  id: string;
  title: string;
  reasoningSummary?: string;
  steps: TaskPlanStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'aborted';
  startedAt: number;
  completedAt?: number;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolInvocations?: Array<{ name: string; args?: any; success: boolean }>;
  timestamp: number;
}

export interface ClarificationPrompt {
  id: string;
  question: string;
  options?: string[];
  targetTool?: string;
  missingParam?: string;
  timestamp: number;
}

export interface SavedMemoryItem {
  id: string;
  category: 'personal' | 'work' | 'preference' | 'instruction';
  label: string;
  content: string;
  timestamp: number;
}

