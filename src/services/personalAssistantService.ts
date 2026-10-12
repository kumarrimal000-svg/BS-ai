import {
  CalendarEvent,
  CalendarEventCategory,
  CalendarStatus,
  DailyPlan,
  LastActiveItemContext,
  NoteCategory,
  PersonalAssistantListener,
  PersonalAssistantSettings,
  PersonalAssistantSnapshot,
  PersonalNote,
  PersonalReminder,
  PersonalTask,
  ReminderCategory,
  ReminderRepeat,
  ReminderStatus,
  ScheduleConflict,
  SmartSuggestion,
  TaskCategory,
  TaskPriority,
} from '../types/personalAssistant';

const TASKS_STORAGE_KEY = 'tamanna_personal_tasks_v1';
const REMINDERS_STORAGE_KEY = 'tamanna_personal_reminders_v1';
const NOTES_STORAGE_KEY = 'tamanna_personal_notes_v1';
const EVENTS_STORAGE_KEY = 'tamanna_calendar_events_v1';
const SETTINGS_STORAGE_KEY = 'tamanna_assistant_settings_v1';

const DEFAULT_SETTINGS: PersonalAssistantSettings = {
  memoryEnabled: true,
  allowTaskMemory: true,
  allowPreferenceMemory: true,
  neverSaveSensitiveData: true,
  notificationsEnabled: true,
  voiceAlertsEnabled: true,
};

export class PersonalAssistantService {
  private static instance: PersonalAssistantService | null = null;
  private tasks: PersonalTask[] = [];
  private reminders: PersonalReminder[] = [];
  private notes: PersonalNote[] = [];
  private events: CalendarEvent[] = [];
  private settings: PersonalAssistantSettings = { ...DEFAULT_SETTINGS };
  private lastActiveItem: LastActiveItemContext | null = null;
  private listeners: Set<PersonalAssistantListener> = new Set();
  private reminderTimer: number | null = null;
  private triggeredQueue: PersonalReminder[] = [];
  private audioCtx: AudioContext | null = null;

  private constructor() {
    this.loadFromStorage();
    this.startReminderMonitor();
  }

  public static getInstance(): PersonalAssistantService {
    if (!PersonalAssistantService.instance) {
      PersonalAssistantService.instance = new PersonalAssistantService();
    }
    return PersonalAssistantService.instance;
  }

  /**
   * Loads saved tasks, reminders, notes, events, and settings from localStorage
   */
  private loadFromStorage(): void {
    try {
      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
      }

      const rawTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (rawTasks) {
        this.tasks = JSON.parse(rawTasks);
      } else {
        const now = Date.now();
        this.tasks = [
          {
            id: `task_${now}_1`,
            title: 'Review today’s key priorities with Tamanna',
            description: 'Check high priority tasks and upcoming schedules',
            priority: 'high',
            category: 'work',
            status: 'pending',
            dueDate: 'Today',
            createdAt: now - 3600000,
          },
          {
            id: `task_${now}_2`,
            title: 'Hydration and quick stretch break',
            description: 'Stay energetic and focused throughout the day',
            priority: 'medium',
            category: 'health',
            status: 'completed',
            dueDate: 'Today',
            createdAt: now - 7200000,
            completedAt: now - 1800000,
          },
        ];
        this.saveTasks();
      }

      const rawReminders = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (rawReminders) {
        this.reminders = JSON.parse(rawReminders);
      } else {
        const now = Date.now();
        this.reminders = [
          {
            id: `rem_${now}_1`,
            title: 'Evening daily review & wind-down',
            dueDateTime: 'Today, 8:00 PM',
            dueTimestamp: now + 3600000 * 4,
            repeat: 'daily',
            category: 'general',
            status: 'active',
            createdAt: now,
          },
        ];
        this.saveReminders();
      }

      const rawNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      if (rawNotes) {
        this.notes = JSON.parse(rawNotes);
      } else {
        const now = Date.now();
        this.notes = [
          {
            id: `note_${now}_1`,
            title: 'Daily Goals & Focus Note',
            content: 'Focus on 1 major milestone per session. Keep replies crisp and confident!',
            category: 'ideas',
            pinned: true,
            createdAt: now,
            updatedAt: now,
          },
        ];
        this.saveNotes();
      }

      const rawEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (rawEvents) {
        this.events = JSON.parse(rawEvents);
      } else {
        const now = Date.now();
        this.events = [
          {
            id: `evt_${now}_1`,
            title: 'Daily Planning & Priority Alignment',
            category: 'work',
            date: 'Today',
            startTime: '10:00 AM',
            endTime: '10:45 AM',
            startEpoch: now + 1800000,
            endEpoch: now + 4500000,
            location: 'Tamanna AI Studio',
            description: 'Align key tasks, review reminders, and establish morning focus.',
            createdAt: now,
          },
        ];
        this.saveEvents();
      }
    } catch (e) {
      console.warn('[PersonalAssistantService] Storage load fallback:', e);
    }
  }

  private saveTasks(): void {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('[PersonalAssistantService] Task save error:', e);
    }
  }

  private saveReminders(): void {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(this.reminders));
    } catch (e) {
      console.warn('[PersonalAssistantService] Reminder save error:', e);
    }
  }

  private saveNotes(): void {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.notes));
    } catch (e) {
      console.warn('[PersonalAssistantService] Notes save error:', e);
    }
  }

  private saveEvents(): void {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn('[PersonalAssistantService] Events save error:', e);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[PersonalAssistantService] Settings save error:', e);
    }
  }

  public updateSettings(partial: Partial<PersonalAssistantSettings>): PersonalAssistantSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.notify();
    return { ...this.settings };
  }

  public getSettings(): PersonalAssistantSettings {
    return { ...this.settings };
  }

  /**
   * Resets all assistant data (tasks, reminders, notes, events) with explicit user action
   */
  public clearAllData(): void {
    this.tasks = [];
    this.reminders = [];
    this.notes = [];
    this.events = [];
    this.lastActiveItem = null;
    this.saveTasks();
    this.saveReminders();
    this.saveNotes();
    this.saveEvents();
    this.notify();
  }

  // ==========================================
  // REAL-TIME REMINDER MONITOR & AUDIO CHIME
  // ==========================================

  private startReminderMonitor(): void {
    if (typeof window === 'undefined') return;

    this.reminderTimer = window.setInterval(() => {
      this.checkDueReminders();
    }, 15000); // Check every 15 seconds
  }

  private checkDueReminders(): void {
    const now = Date.now();
    let updated = false;

    for (const rem of this.reminders) {
      if (rem.status === 'active' && rem.dueTimestamp <= now) {
        rem.status = 'triggered';
        rem.lastTriggeredAt = now;
        this.triggeredQueue.push(rem);
        updated = true;

        // Play gentle in-app chime
        this.playReminderChime();

        // Send browser notification if supported and granted
        this.triggerBrowserNotification(rem);
      }
    }

    if (updated) {
      this.saveReminders();
      this.notify();
    }
  }

  public playReminderChime(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.6);
      }
    } catch {
      // Audio playback safely handled
    }
  }

  private triggerBrowserNotification(rem: PersonalReminder): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(`Tamanna Reminder: ${rem.title}`, {
          body: `Due: ${rem.dueDateTime}`,
          icon: '/favicon.ico',
        });
      } catch {}
    }
  }

  public async requestNotificationPermission(): Promise<'default' | 'granted' | 'denied' | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      this.notify();
      return result;
    } catch {
      return 'unsupported';
    }
  }

  public getNotificationPermission(): 'default' | 'granted' | 'denied' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public dismissTriggeredReminder(id: string): void {
    this.triggeredQueue = this.triggeredQueue.filter((r) => r.id !== id);
    const item = this.reminders.find((r) => r.id === id);
    if (item && item.status === 'triggered') {
      item.status = 'dismissed';
      this.saveReminders();
    }
    this.notify();
  }

  // ==========================================
  // SMART TASK MANAGEMENT
  // ==========================================

  public createTask(params: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    category?: TaskCategory;
    dueDate?: string;
  }): PersonalTask {
    const task: PersonalTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title.trim(),
      description: params.description?.trim(),
      priority: params.priority || 'medium',
      category: params.category || 'personal',
      status: 'pending',
      dueDate: params.dueDate || 'Today',
      createdAt: Date.now(),
    };

    this.tasks.unshift(task);
    this.saveTasks();
    this.setLastActive('task', task.id, task.title);
    this.notify();
    return task;
  }

  public updateTask(
    idOrQuery: string,
    updates: Partial<Omit<PersonalTask, 'id' | 'createdAt'>>
  ): PersonalTask | null {
    const target = this.findTask(idOrQuery);
    if (!target) return null;

    Object.assign(target, updates);
    if (updates.status === 'completed' && !target.completedAt) {
      target.completedAt = Date.now();
    }
    this.saveTasks();
    this.setLastActive('task', target.id, target.title);
    this.notify();
    return target;
  }

  public completeTask(idOrQuery?: string): PersonalTask | null {
    let target: PersonalTask | null = null;
    if (idOrQuery) {
      target = this.findTask(idOrQuery);
    } else if (this.lastActiveItem && this.lastActiveItem.type === 'task') {
      target = this.tasks.find((t) => t.id === this.lastActiveItem!.id) || null;
    }

    if (!target) {
      // Pick top pending task
      target = this.tasks.find((t) => t.status === 'pending') || null;
    }

    if (!target) return null;

    target.status = 'completed';
    target.completedAt = Date.now();
    this.saveTasks();
    this.setLastActive('task', target.id, target.title);
    this.notify();
    return target;
  }

  public deleteTask(idOrQuery: string): boolean {
    const target = this.findTask(idOrQuery);
    if (!target) return false;

    this.tasks = this.tasks.filter((t) => t.id !== target.id);
    if (this.lastActiveItem?.id === target.id) {
      this.lastActiveItem = null;
    }
    this.saveTasks();
    this.notify();
    return true;
  }

  public listTasks(filter?: {
    status?: 'all' | 'pending' | 'completed';
    priority?: TaskPriority | 'all';
    category?: TaskCategory | 'all';
  }): PersonalTask[] {
    return this.tasks.filter((t) => {
      if (filter?.status && filter.status !== 'all' && t.status !== filter.status) return false;
      if (filter?.priority && filter.priority !== 'all' && t.priority !== filter.priority) return false;
      if (filter?.category && filter.category !== 'all' && t.category !== filter.category) return false;
      return true;
    });
  }

  private findTask(query: string): PersonalTask | null {
    if (!query) return null;
    const lower = query.toLowerCase().trim();

    // 1. Direct ID match
    let match = this.tasks.find((t) => t.id === query);
    if (match) return match;

    // 2. Exact or substring title match
    match = this.tasks.find((t) => t.title.toLowerCase() === lower);
    if (match) return match;

    match = this.tasks.find((t) => t.title.toLowerCase().includes(lower));
    if (match) return match;

    // 3. Pronoun fallback ("isko", "this", "that") -> use lastActiveItem
    if (
      (lower === 'isko' || lower === 'this' || lower === 'it' || lower === 'last' || lower === 'ye') &&
      this.lastActiveItem &&
      this.lastActiveItem.type === 'task'
    ) {
      return this.tasks.find((t) => t.id === this.lastActiveItem!.id) || null;
    }

    return null;
  }

  // ==========================================
  // REMINDERS MANAGEMENT
  // ==========================================

  public createReminder(params: {
    title: string;
    timeText: string;
    repeat?: ReminderRepeat;
    category?: ReminderCategory;
  }): PersonalReminder {
    const dueTimestamp = this.parseTimeTextToTimestamp(params.timeText);
    const reminder: PersonalReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title.trim(),
      dueDateTime: params.timeText.trim(),
      dueTimestamp,
      repeat: params.repeat || 'none',
      category: params.category || 'general',
      status: 'active',
      createdAt: Date.now(),
    };

    this.reminders.unshift(reminder);
    this.saveReminders();
    this.setLastActive('reminder', reminder.id, reminder.title);
    this.notify();
    return reminder;
  }

  public updateReminder(
    idOrQuery: string,
    updates: { timeText?: string; title?: string }
  ): PersonalReminder | null {
    const target = this.findReminder(idOrQuery);
    if (!target) return null;

    if (updates.title) target.title = updates.title.trim();
    if (updates.timeText) {
      target.dueDateTime = updates.timeText.trim();
      target.dueTimestamp = this.parseTimeTextToTimestamp(updates.timeText);
      target.status = 'active'; // Reset if triggered earlier
    }

    this.saveReminders();
    this.setLastActive('reminder', target.id, target.title);
    this.notify();
    return target;
  }

  public cancelReminder(idOrQuery: string): boolean {
    const target = this.findReminder(idOrQuery);
    if (!target) return false;

    this.reminders = this.reminders.filter((r) => r.id !== target.id);
    this.triggeredQueue = this.triggeredQueue.filter((r) => r.id !== target.id);
    if (this.lastActiveItem?.id === target.id) {
      this.lastActiveItem = null;
    }
    this.saveReminders();
    this.notify();
    return true;
  }

  public listReminders(status?: ReminderStatus | 'all'): PersonalReminder[] {
    if (!status || status === 'all') return this.reminders;
    return this.reminders.filter((r) => r.status === status);
  }

  private findReminder(query: string): PersonalReminder | null {
    if (!query) return null;
    const lower = query.toLowerCase().trim();

    let match = this.reminders.find((r) => r.id === query);
    if (match) return match;

    match = this.reminders.find((r) => r.title.toLowerCase() === lower);
    if (match) return match;

    match = this.reminders.find((r) => r.title.toLowerCase().includes(lower));
    if (match) return match;

    if (
      (lower === 'isko' || lower === 'this' || lower === 'it' || lower === 'last' || lower === 'ye') &&
      this.lastActiveItem &&
      this.lastActiveItem.type === 'reminder'
    ) {
      return this.reminders.find((r) => r.id === this.lastActiveItem!.id) || null;
    }

    return null;
  }

  /**
   * Helper that parses natural language time strings (Hindi/Hinglish/English) into realistic timestamp
   */
  private parseTimeTextToTimestamp(timeStr: string): number {
    const now = Date.now();
    const lower = (timeStr || '').toLowerCase();

    // Minutes offset (e.g. "in 10 minutes", "10 minute baad", "5 mins")
    const minMatch = lower.match(/(\d+)\s*(?:min|minute|minutes|mint)/);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      return now + mins * 60 * 1000;
    }

    // Hours offset (e.g. "in 2 hours", "2 ghante baad")
    const hrMatch = lower.match(/(\d+)\s*(?:hr|hour|hours|ghante|ghanta)/);
    if (hrMatch) {
      const hrs = parseInt(hrMatch[1], 10);
      return now + hrs * 3600 * 1000;
    }

    // Specific time like "7 baje", "7:00 PM", "8 AM", "subah 8 baje", "shaam 7 baje", "raat 9 baje"
    const timeRegex = /(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/i;
    const match = lower.match(timeRegex);

    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] || '';

      const isEvening = lower.includes('shaam') || lower.includes('raat') || lower.includes('pm');
      const isMorning = lower.includes('subah') || lower.includes('dopahar') || lower.includes('am');

      if (isEvening && hours < 12) {
        hours += 12;
      } else if (isMorning && hours === 12) {
        hours = 0;
      }

      const target = new Date();
      if (lower.includes('kal') || lower.includes('tomorrow')) {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(hours, minutes, 0, 0);

      // If already passed today and no day mentioned, schedule for tomorrow
      if (target.getTime() <= now && !lower.includes('kal')) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    }

    // Default fallback: 1 hour from now
    return now + 3600 * 1000;
  }

  // ==========================================
  // NOTES MANAGEMENT
  // ==========================================

  public createNote(params: {
    title: string;
    content: string;
    category?: NoteCategory;
    tags?: string[];
    pinned?: boolean;
  }): PersonalNote {
    const note: PersonalNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title.trim() || 'Untitled Note',
      content: params.content.trim(),
      category: params.category || 'general',
      tags: params.tags || [],
      pinned: Boolean(params.pinned),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.notes.unshift(note);
    this.saveNotes();
    this.setLastActive('note', note.id, note.title);
    this.notify();
    return note;
  }

  public updateNote(
    idOrQuery: string,
    updates: Partial<Omit<PersonalNote, 'id' | 'createdAt'>>
  ): PersonalNote | null {
    const target = this.findNote(idOrQuery);
    if (!target) return null;

    Object.assign(target, updates, { updatedAt: Date.now() });
    this.saveNotes();
    this.setLastActive('note', target.id, target.title);
    this.notify();
    return target;
  }

  public deleteNote(idOrQuery: string): boolean {
    const target = this.findNote(idOrQuery);
    if (!target) return false;

    this.notes = this.notes.filter((n) => n.id !== target.id);
    if (this.lastActiveItem?.id === target.id) {
      this.lastActiveItem = null;
    }
    this.saveNotes();
    this.notify();
    return true;
  }

  public listNotes(query?: string): PersonalNote[] {
    if (!query) return this.notes;
    const lower = query.toLowerCase().trim();
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower) ||
        n.tags?.some((t) => t.toLowerCase().includes(lower))
    );
  }

  private findNote(query: string): PersonalNote | null {
    if (!query) return null;
    const lower = query.toLowerCase().trim();

    let match = this.notes.find((n) => n.id === query);
    if (match) return match;

    match = this.notes.find((n) => n.title.toLowerCase() === lower);
    if (match) return match;

    match = this.notes.find((n) => n.title.toLowerCase().includes(lower));
    if (match) return match;

    if (
      (lower === 'isko' || lower === 'this' || lower === 'it' || lower === 'last' || lower === 'ye') &&
      this.lastActiveItem &&
      this.lastActiveItem.type === 'note'
    ) {
      return this.notes.find((n) => n.id === this.lastActiveItem!.id) || null;
    }

    return null;
  }

  // ==========================================
  // CALENDAR & SCHEDULE MANAGEMENT
  // ==========================================

  public detectConflicts(event: {
    date: string;
    startTime: string;
    endTime: string;
    excludeId?: string;
  }): ScheduleConflict {
    const toMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const clean = timeStr.trim().toLowerCase();
      const isPm = clean.includes('pm') || clean.includes('shaam') || clean.includes('raat');
      const isAm = clean.includes('am') || clean.includes('subah');
      const numMatch = clean.match(/(\d+)(?::(\d+))?/);
      if (!numMatch) return 0;
      let h = parseInt(numMatch[1], 10);
      const m = numMatch[2] ? parseInt(numMatch[2], 10) : 0;
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      return h * 60 + m;
    };

    const targetDate = event.date.trim().toLowerCase();
    const reqStart = toMinutes(event.startTime);
    const reqEnd = Math.max(reqStart + 30, toMinutes(event.endTime));

    const sameDayEvents = this.events.filter((e) => {
      if (event.excludeId && e.id === event.excludeId) return false;
      return e.date.trim().toLowerCase() === targetDate;
    });

    for (const existing of sameDayEvents) {
      const existStart = toMinutes(existing.startTime);
      const existEnd = Math.max(existStart + 30, toMinutes(existing.endTime));

      // Overlap: reqStart < existEnd && reqEnd > existStart
      if (reqStart < existEnd && reqEnd > existStart) {
        const altHour = Math.floor(existEnd / 60);
        const altMin = existEnd % 60;
        const altTime = `${altHour > 12 ? altHour - 12 : altHour || 12}:${altMin.toString().padStart(2, '0')} ${altHour >= 12 ? 'PM' : 'AM'}`;
        return {
          hasConflict: true,
          conflictingEvent: existing,
          warningMessage: `Schedule conflict detected! This overlaps with "${existing.title}" (${existing.startTime} - ${existing.endTime}).`,
          suggestedAlternativeTime: altTime,
        };
      }
    }

    return { hasConflict: false };
  }

  public createCalendarEvent(params: {
    title: string;
    category?: CalendarEventCategory;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
  }): { event: CalendarEvent; conflict: ScheduleConflict } {
    const date = params.date?.trim() || 'Today';
    const startTime = params.startTime?.trim() || '11:00 AM';
    const endTime = params.endTime?.trim() || '12:00 PM';
    const conflict = this.detectConflicts({ date, startTime, endTime });

    const now = Date.now();
    const event: CalendarEvent = {
      id: `evt_${now}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title.trim(),
      category: params.category || 'work',
      date,
      startTime,
      endTime,
      startEpoch: now,
      endEpoch: now + 3600000,
      location: params.location?.trim() || '',
      description: params.description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    this.events.push(event);
    this.saveEvents();
    this.setLastActive('event', event.id, event.title);
    this.notify();
    return { event, conflict };
  }

  public updateCalendarEvent(
    idOrQuery: string,
    updates: Partial<CalendarEvent>
  ): { event: CalendarEvent | null; conflict: ScheduleConflict } {
    const target = this.findEvent(idOrQuery);
    if (!target) return { event: null, conflict: { hasConflict: false } };

    const date = updates.date || target.date;
    const startTime = updates.startTime || target.startTime;
    const endTime = updates.endTime || target.endTime;
    const conflict = this.detectConflicts({ date, startTime, endTime, excludeId: target.id });

    Object.assign(target, updates, { updatedAt: Date.now() });
    this.saveEvents();
    this.setLastActive('event', target.id, target.title);
    this.notify();
    return { event: target, conflict };
  }

  public deleteCalendarEvent(idOrQuery: string): boolean {
    const target = this.findEvent(idOrQuery);
    if (!target) return false;
    this.events = this.events.filter((e) => e.id !== target.id);
    if (this.lastActiveItem?.id === target.id) this.lastActiveItem = null;
    this.saveEvents();
    this.notify();
    return true;
  }

  public listCalendarEvents(filterDate?: string): CalendarEvent[] {
    if (!filterDate || filterDate === 'all') return [...this.events];
    const lower = filterDate.toLowerCase().trim();
    return this.events.filter((e) => e.date.toLowerCase().includes(lower));
  }

  private findEvent(query: string): CalendarEvent | null {
    if (!query) return null;
    const lower = query.toLowerCase().trim();
    let m = this.events.find((e) => e.id === query);
    if (m) return m;
    m = this.events.find((e) => e.title.toLowerCase() === lower);
    if (m) return m;
    m = this.events.find((e) => e.title.toLowerCase().includes(lower));
    if (m) return m;
    if ((lower === 'isko' || lower === 'this' || lower === 'it') && this.lastActiveItem?.type === 'event') {
      return this.events.find((e) => e.id === this.lastActiveItem!.id) || null;
    }
    return null;
  }

  // ==========================================
  // SMART SUGGESTIONS & PROACTIVE ADVICE
  // ==========================================

  public getSmartSuggestions(): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const pending = this.tasks.filter((t) => t.status === 'pending');
    const urgent = pending.filter((t) => t.priority === 'high');

    // 1. High priority tasks due today
    if (urgent.length > 0) {
      suggestions.push({
        id: `sug_urgent_${Date.now()}`,
        type: 'priority_action',
        title: `Focus on "${urgent[0].title}" First`,
        reasoning: 'High-priority task with urgent impact. Tackling it before lunch frees up mental bandwidth for the rest of your day.',
        recommendedAction: 'Schedule a 45-minute deep focus slot to complete this high-priority item.',
        impact: 'high',
        createdAt: Date.now(),
      });
    }

    // 2. Incomplete tasks carry-over
    const oldPending = pending.filter((t) => Date.now() - t.createdAt > 86400000);
    if (oldPending.length > 0) {
      suggestions.push({
        id: `sug_old_${Date.now()}`,
        type: 'incomplete_task',
        title: `Review Incomplete Task: "${oldPending[0].title}"`,
        reasoning: 'This task was created earlier and remains open. Breaking it into a smaller next-action or scheduling a reminder prevents bottlenecks.',
        recommendedAction: 'Set a specific time or reminder, or break it into smaller sub-tasks.',
        impact: 'medium',
        createdAt: Date.now(),
      });
    }

    // 3. Schedule conflict checks
    for (let i = 0; i < this.events.length; i++) {
      for (let j = i + 1; j < this.events.length; j++) {
        const e1 = this.events[i];
        const e2 = this.events[j];
        if (e1.date.toLowerCase() === e2.date.toLowerCase()) {
          const conflict = this.detectConflicts({
            date: e2.date,
            startTime: e2.startTime,
            endTime: e2.endTime,
            excludeId: e2.id,
          });
          if (conflict.hasConflict) {
            suggestions.push({
              id: `sug_conf_${e1.id}_${e2.id}`,
              type: 'conflict_warning',
              title: `Schedule Overlap: "${e1.title}" and "${e2.title}"`,
              reasoning: 'Both events overlap on the same date/time. Double-booking causes meeting stress and tardiness.',
              recommendedAction: `Consider moving "${e2.title}" to ${conflict.suggestedAlternativeTime || 'a later slot'}.`,
              impact: 'high',
              createdAt: Date.now(),
            });
            break;
          }
        }
      }
    }

    // 4. Balanced pacing
    if (this.events.length >= 3) {
      suggestions.push({
        id: `sug_break_${Date.now()}`,
        type: 'break_reminder',
        title: 'Schedule a 15-Minute Recovery Break',
        reasoning: 'You have multiple commitments scheduled today. A short walk or hydration pause between sessions restores focus.',
        recommendedAction: 'Add a calendar buffer or quick stretch reminder.',
        impact: 'low',
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // ==========================================
  // DAILY PLANNER & ASSISTANCE
  // ==========================================

  public getDailyPlan(timeOfDay: 'morning' | 'evening' | 'current' = 'current'): DailyPlan {
    const today = new Date().toISOString().slice(0, 10);
    const pendingTasks = this.tasks.filter((t) => t.status === 'pending');
    const completedTasks = this.tasks.filter((t) => t.status === 'completed');
    const topPriorities = pendingTasks.filter((t) => t.priority === 'high');
    const activeReminders = this.reminders.filter((r) => r.status === 'active');
    const activeNotes = this.notes.slice(0, 3);
    const calendarEvents = this.listCalendarEvents('Today');
    const suggestions = this.getSmartSuggestions();

    const isMorning = timeOfDay === 'morning' || (timeOfDay === 'current' && new Date().getHours() < 14);
    const isEvening = timeOfDay === 'evening' || (timeOfDay === 'current' && new Date().getHours() >= 18);

    let morningBriefing = '';
    if (isMorning) {
      morningBriefing = `Good morning! Aaj aapke paas ${pendingTasks.length} pending tasks hain, jisme se ${topPriorities.length} high priority hain: ${topPriorities.map((t) => `"${t.title}"`).join(', ') || 'Koi urgent task nahi hai'}. ${calendarEvents.length > 0 ? `Schedule mein ${calendarEvents.length} events hain (${calendarEvents[0]?.title} at ${calendarEvents[0]?.startTime}).` : ''} ${activeReminders.length > 0 ? `Next reminder: "${activeReminders[0]?.title}" (${activeReminders[0]?.dueDateTime}).` : ''}`;
    }

    let eveningReview = '';
    if (isEvening) {
      eveningReview = `Evening Review: Aaj aapne ${completedTasks.length} tasks complete kiye! ${pendingTasks.length} tasks bache hain jinhe kal carry forward kar sakte hain. Take rest and unwind!`;
    }

    const summary = `${pendingTasks.length} pending tasks, ${completedTasks.length} completed, ${activeReminders.length} active reminders, ${calendarEvents.length} events scheduled.`;

    return {
      date: today,
      topPriorities,
      scheduledReminders: activeReminders,
      pendingTasks,
      completedTasks,
      activeNotes,
      calendarEvents,
      suggestions,
      morningBriefing,
      eveningReview,
      summary,
    };
  }

  public getDailySummary(): string {
    const plan = this.getDailyPlan();
    const parts: string[] = [];

    parts.push(`Aaj ka schedule: ${plan.pendingTasks.length} pending tasks aur ${plan.completedTasks.length} completed.`);

    if (plan.topPriorities.length > 0) {
      parts.push(`Top Priorities: ${plan.topPriorities.map((t) => t.title).join(', ')}.`);
    }

    if (plan.calendarEvents.length > 0) {
      parts.push(`Calendar Events: ${plan.calendarEvents.map((e) => `"${e.title}" at ${e.startTime}`).join(', ')}.`);
    }

    if (plan.scheduledReminders.length > 0) {
      parts.push(`Upcoming Reminders: ${plan.scheduledReminders.map((r) => `"${r.title}" (${r.dueDateTime})`).join(', ')}.`);
    }

    if (plan.suggestions.length > 0) {
      parts.push(`Smart Tip: ${plan.suggestions[0]?.title} (${plan.suggestions[0]?.reasoning}).`);
    }

    return parts.join(' ');
  }

  // ==========================================
  // CALENDAR INTEGRATION STATUS
  // ==========================================

  public getCalendarStatus(): CalendarStatus {
    return {
      isExternalConnected: false,
      provider: 'none',
      localScheduleActive: true,
      totalEventsCount: this.events.length,
      statusMessage:
        'External Google/Device Calendar is not currently connected. All tasks and schedule events are securely maintained in your local Daily Planner.',
    };
  }

  // ==========================================
  // CONTEXT & GEMINI LIVE AUGMENT
  // ==========================================

  private setLastActive(type: 'task' | 'reminder' | 'note' | 'event', id: string, title: string): void {
    this.lastActiveItem = {
      type,
      id,
      title,
      timestamp: Date.now(),
    };
  }

  public getLastActiveItem(): LastActiveItemContext | null {
    return this.lastActiveItem;
  }

  /**
   * Generates dynamic prompt context injected into Gemini Live session
   */
  public generateLiveContextAugment(): string {
    const pendingTasks = this.tasks.filter((t) => t.status === 'pending');
    const activeReminders = this.reminders.filter((r) => r.status === 'active');
    const topPriorities = pendingTasks.filter((t) => t.priority === 'high');

    const lines: string[] = [
      '[PERSONAL ASSISTANT & DAILY MANAGEMENT CONTEXT]:',
      `- Pending Tasks (${pendingTasks.length}): ${pendingTasks.slice(0, 5).map((t) => `"${t.title}" [${t.priority}]`).join(', ') || 'None'}`,
      `- High Priorities: ${topPriorities.map((t) => t.title).join(', ') || 'None'}`,
      `- Active Reminders (${activeReminders.length}): ${activeReminders.slice(0, 3).map((r) => `"${r.title}" at ${r.dueDateTime}`).join(', ') || 'None'}`,
      `- Local Calendar Events (${this.events.length}): ${this.listCalendarEvents('Today').map((e) => `"${e.title}" (${e.startTime})`).join(', ') || 'None scheduled for today'}`,
      `- External Calendar Sync: Not connected to external Google Calendar. Transparently remind user when asked, but manage everything locally in the in-app planner.`,
    ];

    const suggestions = this.getSmartSuggestions();
    if (suggestions.length > 0) {
      lines.push(`- Smart Proactive Tip: ${suggestions[0].title} — ${suggestions[0].reasoning}`);
    }

    if (this.lastActiveItem) {
      lines.push(
        `- Follow-up Context: Last referenced ${this.lastActiveItem.type} was "${this.lastActiveItem.title}" (id: ${this.lastActiveItem.id}). If user says "isko", "it", or "this", resolve to this item!`
      );
    }

    return lines.join('\n');
  }

  // ==========================================
  // VOICE TOOL EXECUTION HANDLERS
  // ==========================================

  public handleManageTasks(args: any): any {
    const action = args?.action || 'list';
    const title = args?.title || '';
    const priority = args?.priority || 'medium';
    const category = args?.category || 'work';
    const deadline = args?.deadline || args?.dueDate || 'Today';
    const taskId = args?.taskId || '';

    if (action === 'create') {
      if (!title) {
        return {
          status: 'error',
          message: 'Task title is required to create a task.',
        };
      }
      const task = this.createTask({
        title,
        priority: priority as TaskPriority,
        category: category as TaskCategory,
        dueDate: deadline,
      });
      return {
        status: 'success',
        action: 'create',
        task,
        result: `Task created: "${task.title}" with [${task.priority}] priority. Done, sweetie! Maine task add kar diya hai.`,
      };
    }

    if (action === 'complete') {
      const task = this.completeTask(taskId || title);
      if (task) {
        return {
          status: 'success',
          action: 'complete',
          task,
          result: `Task marked as completed: "${task.title}". Wah! Ek kaam khatam hua!`,
        };
      }
      return {
        status: 'not_found',
        result: `Koi matching task nahi mila to complete.`,
      };
    }

    if (action === 'delete') {
      const success = this.deleteTask(taskId || title);
      return {
        status: success ? 'success' : 'not_found',
        action: 'delete',
        result: success ? `Task deleted successfully.` : `Task delete nahi ho saka, matching task nahi mila.`,
      };
    }

    if (action === 'update') {
      const task = this.updateTask(taskId || title, {
        priority: priority as TaskPriority,
        dueDate: deadline,
        category: category as TaskCategory,
      });
      return {
        status: task ? 'success' : 'not_found',
        action: 'update',
        task,
        result: task ? `Updated task "${task.title}".` : `Task update karne ke liye nahi mila.`,
      };
    }

    // Default: list
    const tasks = this.listTasks({ status: 'pending' });
    return {
      status: 'success',
      action: 'list',
      count: tasks.length,
      tasks,
      result: `You have ${tasks.length} pending tasks: ${tasks.map((t) => `"${t.title}" (${t.priority})`).join(', ') || 'Sab clear hai, enjoy karo!'}.`,
    };
  }

  public handleManageReminders(args: any): any {
    const action = args?.action || 'create';
    const title = args?.title || args?.text || '';
    const time = args?.time || args?.dateTime || 'in 1 hour';
    const repeat = args?.repeat || 'none';
    const reminderId = args?.reminderId || '';

    if (action === 'create') {
      if (!title) {
        return {
          status: 'error',
          message: 'Reminder title or topic is required.',
        };
      }
      const reminder = this.createReminder({
        title,
        timeText: time,
        repeat: repeat as ReminderRepeat,
      });
      return {
        status: 'success',
        action: 'create',
        reminder,
        result: `Reminder set: "${reminder.title}" for ${reminder.dueDateTime}. Main time par alert bacha dungi!`,
      };
    }

    if (action === 'cancel' || action === 'delete') {
      const success = this.cancelReminder(reminderId || title);
      return {
        status: success ? 'success' : 'not_found',
        action: 'cancel',
        result: success ? `Reminder dismissed/cancelled.` : `Matching reminder nahi mila.`,
      };
    }

    if (action === 'update') {
      const reminder = this.updateReminder(reminderId || title, { timeText: time });
      return {
        status: reminder ? 'success' : 'not_found',
        action: 'update',
        reminder,
        result: reminder ? `Reminder updated: "${reminder.title}" to ${reminder.dueDateTime}.` : `Reminder nahi mila update ke liye.`,
      };
    }

    // List
    const active = this.listReminders('active');
    return {
      status: 'success',
      action: 'list',
      reminders: active,
      result: `You have ${active.length} active reminders: ${active.map((r) => `"${r.title}" at ${r.dueDateTime}`).join(', ') || 'No active reminders.'}.`,
    };
  }

  public handleManageNotes(args: any): any {
    const action = args?.action || 'create';
    const title = args?.title || 'Note';
    const content = args?.content || '';
    const query = args?.query || '';
    const noteId = args?.noteId || '';

    if (action === 'create') {
      if (!content && !title) {
        return {
          status: 'error',
          message: 'Note content or title is required.',
        };
      }
      const note = this.createNote({
        title,
        content: content || title,
      });
      return {
        status: 'success',
        action: 'create',
        note,
        result: `Note saved: "${note.title}". Successfully stored in your local storage.`,
      };
    }

    if (action === 'search' || action === 'list') {
      const results = this.listNotes(query);
      return {
        status: 'success',
        action: 'list',
        notes: results,
        result: `Found ${results.length} notes: ${results.map((n) => `"${n.title}": ${n.content.slice(0, 40)}`).join(' | ') || 'No notes found.'}.`,
      };
    }

    if (action === 'delete') {
      const success = this.deleteNote(noteId || title);
      return {
        status: success ? 'success' : 'not_found',
        action: 'delete',
        result: success ? `Note deleted.` : `Note nahi mila.`,
      };
    }

    return {
      status: 'success',
      notes: this.notes,
    };
  }

  public handleGetDailyPlan(args: any): any {
    const timeOfDay = args?.timeOfDay || 'current';
    const plan = this.getDailyPlan(timeOfDay);
    return {
      status: 'success',
      plan,
      result: plan.morningBriefing || plan.eveningReview || plan.summary,
    };
  }

  public handleCheckCalendarStatus(): any {
    const status = this.getCalendarStatus();
    return {
      status: 'success',
      calendarConnected: status.isExternalConnected,
      message: status.statusMessage,
      localScheduleActive: status.localScheduleActive,
      result:
        'Calendar access is not currently connected to Google Calendar. However, your in-app Daily Planner is active and managing your local schedule.',
    };
  }

  public handleGetDailySummary(): any {
    const summary = this.getDailySummary();
    return {
      status: 'success',
      summary,
      result: summary,
    };
  }

  public handleManageSchedule(args: any): any {
    const action = args?.action || 'list';
    const title = args?.title || '';
    const date = args?.date || 'Today';
    const startTime = args?.startTime || '11:00 AM';
    const endTime = args?.endTime || '12:00 PM';
    const category = args?.category || 'work';
    const eventId = args?.eventId || '';

    if (action === 'create') {
      if (!title) {
        return {
          status: 'error',
          message: 'Event title is required to schedule an event.',
        };
      }
      const { event, conflict } = this.createCalendarEvent({
        title,
        date,
        startTime,
        endTime,
        category: category as CalendarEventCategory,
      });

      let resMsg = `Event scheduled: "${event.title}" on ${event.date} from ${event.startTime} to ${event.endTime}.`;
      if (conflict.hasConflict) {
        resMsg += ` Note: ${conflict.warningMessage} (Suggestion: Consider ${conflict.suggestedAlternativeTime}).`;
      }

      return {
        status: 'success',
        action: 'create',
        event,
        conflict,
        result: resMsg,
      };
    }

    if (action === 'delete') {
      const success = this.deleteCalendarEvent(eventId || title);
      return {
        status: success ? 'success' : 'not_found',
        action: 'delete',
        result: success ? `Event deleted from schedule.` : `Event nahi mila delete karne ke liye.`,
      };
    }

    if (action === 'check_conflicts') {
      const conflict = this.detectConflicts({ date, startTime, endTime, excludeId: eventId });
      return {
        status: 'success',
        hasConflict: conflict.hasConflict,
        conflict,
        result: conflict.hasConflict
          ? `${conflict.warningMessage} Alternative: ${conflict.suggestedAlternativeTime}.`
          : `No schedule conflict found for ${date} at ${startTime}. Slot is completely free!`,
      };
    }

    // Default list
    const events = this.listCalendarEvents(date === 'all' ? undefined : date);
    return {
      status: 'success',
      action: 'list',
      count: events.length,
      events,
      result: `Schedule for ${date}: ${events.map((e) => `"${e.title}" (${e.startTime} - ${e.endTime})`).join(', ') || 'Koi schedule event nahi hai, your calendar is free!'}.`,
    };
  }

  public handleGetSmartSuggestions(args?: any): any {
    const suggestions = this.getSmartSuggestions();
    return {
      status: 'success',
      suggestions,
      result: suggestions.map((s) => `• ${s.title}: ${s.reasoning} -> Action: ${s.recommendedAction}`).join('\n') || 'All tasks and schedule in perfect shape! Keep up the great pace.',
    };
  }

  // ==========================================
  // SUBSCRIPTION & SNAPSHOT
  // ==========================================

  public subscribe(listener: PersonalAssistantListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => {
      try {
        l(snap);
      } catch (err: any) {
        console.warn('[PersonalAssistantService] Listener error handled:', err?.message || err);
      }
    });
  }

  public getSnapshot(): PersonalAssistantSnapshot {
    return {
      tasks: [...this.tasks],
      reminders: [...this.reminders],
      notes: [...this.notes],
      calendarEvents: [...this.events],
      suggestions: this.getSmartSuggestions(),
      settings: { ...this.settings },
      lastActiveItem: this.lastActiveItem ? { ...this.lastActiveItem } : null,
      calendarStatus: this.getCalendarStatus(),
      notificationPermission: this.getNotificationPermission(),
      triggeredRemindersQueue: [...this.triggeredQueue],
    };
  }
}
