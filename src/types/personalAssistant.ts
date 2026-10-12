export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'work' | 'personal' | 'study' | 'shopping' | 'health' | 'urgent' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  dueDate?: string; // e.g. "2026-10-07", "Today 6:00 PM"
  createdAt: number;
  completedAt?: number;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly';
export type ReminderCategory = 'general' | 'study' | 'work' | 'health' | 'medication' | 'call';
export type ReminderStatus = 'active' | 'triggered' | 'dismissed';

export interface PersonalReminder {
  id: string;
  title: string;
  dueDateTime: string; // User-facing text like "Today, 7:00 PM"
  dueTimestamp: number; // Unix timestamp for triggering
  repeat: ReminderRepeat;
  category: ReminderCategory;
  status: ReminderStatus;
  createdAt: number;
  lastTriggeredAt?: number;
}

export type NoteCategory = 'general' | 'ideas' | 'work' | 'study' | 'quick';

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags?: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CalendarEventCategory = 'meeting' | 'study' | 'work' | 'personal' | 'routine';

export interface CalendarEvent {
  id: string;
  title: string;
  category: CalendarEventCategory;
  date: string; // e.g. "2026-10-08" or "Today"
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:00 AM"
  startEpoch: number;
  endEpoch: number;
  location?: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictingEvent?: CalendarEvent;
  warningMessage?: string;
  suggestedAlternativeTime?: string;
}

export type SuggestionType =
  | 'incomplete_task'
  | 'priority_action'
  | 'schedule_gap'
  | 'conflict_warning'
  | 'break_reminder'
  | 'morning_prep';

export interface SmartSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  reasoning: string;
  recommendedAction: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: number;
}

export interface PersonalAssistantSettings {
  memoryEnabled: boolean;
  allowTaskMemory: boolean;
  allowPreferenceMemory: boolean;
  neverSaveSensitiveData: boolean;
  notificationsEnabled: boolean;
  voiceAlertsEnabled: boolean;
}

export interface CalendarStatus {
  isExternalConnected: boolean;
  provider: 'none' | 'google_workspace' | 'device_calendar';
  localScheduleActive: boolean;
  statusMessage: string;
  totalEventsCount: number;
}

export interface DailyPlan {
  date: string;
  topPriorities: PersonalTask[];
  scheduledReminders: PersonalReminder[];
  pendingTasks: PersonalTask[];
  completedTasks: PersonalTask[];
  activeNotes: PersonalNote[];
  calendarEvents: CalendarEvent[];
  suggestions: SmartSuggestion[];
  morningBriefing?: string;
  eveningReview?: string;
  summary: string;
}

export interface LastActiveItemContext {
  type: 'task' | 'reminder' | 'note' | 'event';
  id: string;
  title: string;
  timestamp: number;
}

export interface PersonalAssistantSnapshot {
  tasks: PersonalTask[];
  reminders: PersonalReminder[];
  notes: PersonalNote[];
  calendarEvents: CalendarEvent[];
  suggestions: SmartSuggestion[];
  settings: PersonalAssistantSettings;
  lastActiveItem: LastActiveItemContext | null;
  calendarStatus: CalendarStatus;
  notificationPermission: 'default' | 'granted' | 'denied' | 'unsupported';
  triggeredRemindersQueue: PersonalReminder[];
}

export type PersonalAssistantListener = (snapshot: PersonalAssistantSnapshot) => void;

