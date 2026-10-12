export type DetectedIntent =
  | 'information_request'
  | 'command'
  | 'question'
  | 'follow_up'
  | 'correction'
  | 'confirmation'
  | 'cancellation'
  | 'chit_chat';

export type TaskActionStatus =
  | 'idle'
  | 'executing'
  | 'success'
  | 'failed'
  | 'cannot_perform'
  | 'clarification_needed';

export interface TrackedAction {
  toolName: string;
  args: Record<string, any>;
  result?: any;
  success: boolean;
  message?: string;
  error?: string;
  capabilityLimit?: string;
  timestamp: number;
}

export interface PendingAction {
  toolName: string;
  description: string;
  args?: Record<string, any>;
  source: 'auto_sequence' | 'user_follow_up' | 'suggested';
}

export interface ContextEntities {
  lastApp?: string;
  lastQuery?: string;
  lastMediaItem?: string;
  lastUrl?: string;
  lastTarget?: string;
  lastActionType?: string;
  lastResultSummary?: string;
}

export interface TaskContextSnapshot {
  currentTaskId: string;
  currentTaskTitle: string | null;
  currentStep: string | null;
  stepIndex: number;
  latestUserInstruction: string;
  detectedIntent: DetectedIntent;
  intentConfidence: number;
  previousAction: TrackedAction | null;
  pendingAction: PendingAction | null;
  toolBeingUsed: string | null;
  actionStatus: TaskActionStatus;
  lastError: string | null;
  suggestedNextOption: string | null;
  activeEntities: ContextEntities;
  conversationSnippet: string;
}

export interface ClarificationRequest {
  id: string;
  question: string;
  options?: string[];
  ambiguousInstruction: string;
  confidence: number;
  timestamp: number;
}

export interface ContextIntelligenceSettings {
  developerPanelEnabled: boolean;
  smartConfirmationEnabled: boolean;
  situationalReasoningEnabled: boolean;
}
