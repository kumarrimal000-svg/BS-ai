import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Bell,
  FileText,
  Search,
  Sparkles,
  Shield,
  X,
  Volume2,
  AlertCircle,
  Pin,
  CalendarCheck,
  Sunrise,
  Sunset,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Check,
  Filter,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventCategory,
  NoteCategory,
  PersonalAssistantSnapshot,
  ReminderRepeat,
  ScheduleConflict,
  TaskCategory,
  TaskPriority,
} from '../types/personalAssistant';
import { PersonalAssistantService } from '../services/personalAssistantService';

interface DailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: PersonalAssistantSnapshot;
  onAskTamannaPlan?: (timeOfDay: 'morning' | 'evening' | 'current') => void;
}

export const DailyPlannerModal: React.FC<DailyPlannerModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onAskTamannaPlan,
}) => {
  const [activeTab, setActiveTab] = useState<
    'plan' | 'tasks' | 'schedule' | 'reminders' | 'notes' | 'suggestions' | 'status'
  >('plan');

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('work');
  const [newTaskDue, setNewTaskDue] = useState('Today');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<TaskPriority | 'all'>('all');

  // Calendar Event form state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<CalendarEventCategory>('work');
  const [newEventDate, setNewEventDate] = useState('Today');
  const [newEventStartTime, setNewEventStartTime] = useState('11:00 AM');
  const [newEventEndTime, setNewEventEndTime] = useState('12:00 PM');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [eventConflictWarning, setEventConflictWarning] = useState<ScheduleConflict | null>(null);

  // Reminder form state
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('Today, 7:00 PM');
  const [newReminderRepeat, setNewReminderRepeat] = useState<ReminderRepeat>('none');

  // Note form state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>('ideas');
  const [noteSearch, setNoteSearch] = useState('');

  // Confirmation state for deletes
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'task' | 'event' | 'reminder' | 'note' | 'all';
    id?: string;
    title?: string;
  } | null>(null);

  if (!isOpen) return null;

  const assistant = PersonalAssistantService.getInstance();
  const dailyPlan = assistant.getDailyPlan();

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    assistant.createTask({
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      category: newTaskCategory,
      dueDate: newTaskDue,
    });
    setNewTaskTitle('');
  };

  const handleToggleTaskStatus = (id: string, currentStatus: string) => {
    if (currentStatus === 'completed') {
      assistant.updateTask(id, { status: 'pending' });
    } else {
      assistant.completeTask(id);
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const { event, conflict } = assistant.createCalendarEvent({
      title: newEventTitle.trim(),
      category: newEventCategory,
      date: newEventDate,
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      location: newEventLocation,
    });
    if (conflict.hasConflict) {
      setEventConflictWarning(conflict);
    } else {
      setEventConflictWarning(null);
    }
    setNewEventTitle('');
    setNewEventLocation('');
  };

  const handleCheckConflict = (start: string, end: string, date: string) => {
    const conflict = assistant.detectConflicts({ date, startTime: start, endTime: end });
    setEventConflictWarning(conflict.hasConflict ? conflict : null);
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    assistant.createReminder({
      title: newReminderTitle.trim(),
      timeText: newReminderTime.trim(),
      repeat: newReminderRepeat,
    });
    setNewReminderTitle('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() && !newNoteTitle.trim()) return;
    assistant.createNote({
      title: newNoteTitle.trim() || 'Untitled Note',
      content: newNoteContent.trim(),
      category: newNoteCategory,
    });
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleExecuteDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'task' && itemToDelete.id) {
      assistant.deleteTask(itemToDelete.id);
    } else if (itemToDelete.type === 'event' && itemToDelete.id) {
      assistant.deleteCalendarEvent(itemToDelete.id);
    } else if (itemToDelete.type === 'reminder' && itemToDelete.id) {
      assistant.cancelReminder(itemToDelete.id);
    } else if (itemToDelete.type === 'note' && itemToDelete.id) {
      assistant.deleteNote(itemToDelete.id);
    } else if (itemToDelete.type === 'all') {
      assistant.clearAllData();
    }
    setItemToDelete(null);
  };

  const tasks = snapshot?.tasks || [];
  const calendarEvents = snapshot?.calendarEvents || [];
  const reminders = snapshot?.reminders || [];
  const notes = snapshot?.notes || [];

  const filteredTasks = tasks.filter((t) => {
    if (!t) return false;
    if (taskFilter === 'pending' && t.status !== 'pending') return false;
    if (taskFilter === 'completed' && t.status !== 'completed') return false;
    if (taskPriorityFilter !== 'all' && t.priority !== taskPriorityFilter) return false;
    return true;
  });

  const filteredNotes = assistant.listNotes(noteSearch);
  const suggestions = assistant.getSmartSuggestions() || [];

  const priorityColors: Record<TaskPriority, { text: string; bg: string; border: string }> = {
    high: { text: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-500/30' },
    medium: { text: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-500/30' },
    low: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-500/30' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0d17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Personal Assistant & Daily Management
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Daily Planner
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Organize tasks, schedule events, smart reminders, conflict detection & proactive guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 border-b border-slate-800/60 bg-[#07080e]/60 overflow-x-auto gap-1.5 py-2">
          {[
            { id: 'plan', label: 'Daily Plan', icon: Calendar },
            { id: 'tasks', label: `Tasks (${tasks.filter((t) => t && t.status === 'pending').length})`, icon: CheckCircle2 },
            { id: 'schedule', label: `Schedule (${calendarEvents.length})`, icon: CalendarCheck },
            { id: 'reminders', label: `Reminders (${reminders.filter((r) => r && r.status === 'active').length})`, icon: Clock },
            { id: 'notes', label: `Notes (${notes.length})`, icon: FileText },
            { id: 'suggestions', label: `Suggestions (${suggestions.length})`, icon: Lightbulb },
            { id: 'status', label: 'Privacy & Control', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DAILY PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Quick Spoken Briefings Action Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/20 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sunrise className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Morning Task Briefing</h4>
                      <p className="text-xs text-slate-400">Top priorities, today's schedule & reminders</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAskTamannaPlan?.('morning')}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ask: &quot;Tamanna, aaj ka morning plan kya hai?&quot;</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/20 to-slate-900 border border-purple-500/20 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sunset className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Evening Review & Wind-down</h4>
                      <p className="text-xs text-slate-400">Celebrate completed tasks & prepare tomorrow</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAskTamannaPlan?.('evening')}
                    className="w-full py-2 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ask: &quot;Tamanna, mera evening review batao.&quot;</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Today's Agenda Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-pink-400 tracking-wider">
                    Today&apos;s Core Overview
                  </span>
                  <span className="text-xs font-mono text-slate-400">{dailyPlan.date}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{dailyPlan.summary}</p>
              </div>

              {/* Top Priorities Section */}
              <div>
                <h3 className="text-xs font-mono uppercase text-pink-400 tracking-wider mb-3">
                  Top Priority Focus Items
                </h3>
                {dailyPlan.topPriorities.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                    No urgent tasks pending. Everything is running smoothly!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dailyPlan.topPriorities.map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(task.id, task.status)}
                            className="text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <div>
                            <span className="text-sm font-semibold text-white">{task.title}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="text-rose-400 font-mono uppercase text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                                High Priority
                              </span>
                              <span>·</span>
                              <span>Category: {task.category}</span>
                              {task.dueDate && <span>· Due: {task.dueDate}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Schedule Overview */}
              {dailyPlan.calendarEvents.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase text-cyan-400 tracking-wider mb-3">
                    Scheduled Events ({dailyPlan.calendarEvents.length})
                  </h3>
                  <div className="space-y-2">
                    {dailyPlan.calendarEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-xs font-bold text-white">{evt.title}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {evt.startTime} - {evt.endTime} ({evt.category})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Task Creation Form */}
              <form
                onSubmit={handleCreateTask}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Create New Task</span>
                  <span className="text-[10px] text-slate-400">Or use voice: &quot;Tamanna, kal 3 kaam yaad dilana&quot;</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title (e.g. Prepare presentation, workout, review code)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="work">Work</option>
                      <option value="study">Study</option>
                      <option value="personal">Personal</option>
                      <option value="health">Health</option>
                      <option value="shopping">Shopping</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Due</label>
                    <input
                      type="text"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      placeholder="e.g. Today, Tomorrow"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </form>

              {/* Task Filter Bar */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <div className="flex gap-2">
                  {(['all', 'pending', 'completed'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTaskFilter(filter)}
                      className={`capitalize px-2.5 py-1 rounded-md text-xs transition-colors ${
                        taskFilter === filter
                          ? 'bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-slate-300"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="low">Low Only</option>
                  </select>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No matching tasks found.
                  </div>
                ) : (
                  filteredTasks.map((t) => {
                    const isDone = t.status === 'completed';
                    const pCol = priorityColors[t.priority] || priorityColors.medium;
                    return (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          isDone
                            ? 'bg-slate-900/30 border-slate-800/80 opacity-60'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(t.id, t.status)}
                            className={`transition-colors ${
                              isDone ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                            }`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <div>
                            <span
                              className={`text-sm font-semibold ${
                                isDone ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {t.title}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span
                                className={`font-mono uppercase text-[9px] px-1.5 py-0.2 rounded border ${pCol.text} ${pCol.bg} ${pCol.border}`}
                              >
                                {t.priority}
                              </span>
                              <span>·</span>
                              <span className="capitalize">{t.category}</span>
                              {t.dueDate && <span>· Due: {t.dueDate}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setItemToDelete({ type: 'task', id: t.id, title: t.title })}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE (CALENDAR) */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Event Creation Form */}
              <form
                onSubmit={handleCreateEvent}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Schedule Calendar Event</span>
                  <span className="text-[10px] text-cyan-400 font-mono">With Real-time Conflict Detection</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Event title (e.g. Design Sync, Study Session, Dentist)"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as CalendarEventCategory)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="work">Work Meeting</option>
                    <option value="study">Study Session</option>
                    <option value="personal">Personal Activity</option>
                    <option value="routine">Routine Habit</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Date</label>
                    <input
                      type="text"
                      value={newEventDate}
                      onChange={(e) => {
                        setNewEventDate(e.target.value);
                        handleCheckConflict(newEventStartTime, newEventEndTime, e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Start Time</label>
                    <input
                      type="text"
                      value={newEventStartTime}
                      onChange={(e) => {
                        setNewEventStartTime(e.target.value);
                        handleCheckConflict(e.target.value, newEventEndTime, newEventDate);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">End Time</label>
                    <input
                      type="text"
                      value={newEventEndTime}
                      onChange={(e) => {
                        setNewEventEndTime(e.target.value);
                        handleCheckConflict(newEventStartTime, e.target.value, newEventDate);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Conflict warning preview */}
                {eventConflictWarning && eventConflictWarning.hasConflict && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <strong>{eventConflictWarning.warningMessage}</strong>
                      {eventConflictWarning.suggestedAlternativeTime && (
                        <p className="text-[11px] text-amber-400/90 mt-0.5">
                          Suggested alternative slot: <strong>{eventConflictWarning.suggestedAlternativeTime}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Schedule</span>
                  </button>
                </div>
              </form>

              {/* Scheduled Events List */}
              <div className="space-y-2">
                {snapshot.calendarEvents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No scheduled events yet. Add one above or tell Tamanna by voice!
                  </div>
                ) : (
                  snapshot.calendarEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white">{evt.title}</span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="text-cyan-300 font-mono font-medium">
                              {evt.startTime} - {evt.endTime}
                            </span>
                            <span>·</span>
                            <span>{evt.date}</span>
                            <span>·</span>
                            <span className="capitalize">{evt.category}</span>
                            {evt.location && <span>· @ {evt.location}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setItemToDelete({ type: 'event', id: evt.id, title: evt.title })}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              {/* Reminder Form */}
              <form
                onSubmit={handleCreateReminder}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Set Smart Reminder</span>
                  <span className="text-[10px] text-slate-400">Voice: &quot;Tamanna, shaam 7 baje yaad dilana&quot;</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder="Reminder topic (e.g. Call parents, Take vitamins, Submit report)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Reminder</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Time / Trigger</label>
                    <input
                      type="text"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      placeholder="e.g. Today, 8:00 PM / in 30 minutes"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Repeat</label>
                    <select
                      value={newReminderRepeat}
                      onChange={(e) => setNewReminderRepeat(e.target.value as ReminderRepeat)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="none">One-time</option>
                      <option value="daily">Daily Repeat</option>
                      <option value="weekly">Weekly Repeat</option>
                    </select>
                  </div>
                </div>
              </form>

              {/* Reminders List */}
              <div className="space-y-2">
                {snapshot.reminders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No active reminders scheduled.
                  </div>
                ) : (
                  snapshot.reminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <div>
                          <span className="text-sm font-semibold text-white">{r.title}</span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="text-amber-300 font-mono">{r.dueDateTime}</span>
                            {r.repeat !== 'none' && (
                              <span className="text-pink-400 font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-pink-500/10 border border-pink-500/20">
                                {r.repeat}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setItemToDelete({ type: 'reminder', id: r.id, title: r.title })}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Note Creation Form */}
              <form
                onSubmit={handleCreateNote}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Create Personal Note</span>
                  <span className="text-[10px] text-slate-400">Stored securely in local storage</span>
                </div>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note Title (e.g. Project brainstorm, Gym routine)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Note content..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <div className="flex justify-between items-center">
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as NoteCategory)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="ideas">Ideas</option>
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="quick">Quick</option>
                    <option value="general">General</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Search notes by keyword or title..."
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Notes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredNotes.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-xs text-slate-500">
                    No notes found.
                  </div>
                ) : (
                  filteredNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">{n.title}</span>
                          <button
                            onClick={() => setItemToDelete({ type: 'note', id: n.id, title: n.title })}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-3">
                          {n.content}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="uppercase font-mono">{n.category}</span>
                        <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SMART SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Proactive Daily Optimization
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tamanna analyzes your pending tasks, schedule slots, and priorities to give you practical, reasoned advice without making unauthorized decisions.
                </p>
              </div>

              <div className="space-y-3">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-xl border flex flex-col gap-2 ${
                      sug.impact === 'high'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : sug.impact === 'medium'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{sug.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                          sug.impact === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {sug.impact} impact
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Reasoning:</strong> {sug.reasoning}
                    </p>
                    <p className="text-xs text-pink-300 font-medium">
                      💡 <strong>Recommended Action:</strong> {sug.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY & STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Memory & Privacy Control
                </h4>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-white block">Assistant Memory</span>
                    <span className="text-[11px] text-slate-400">Remember user preferences & task history</span>
                  </div>
                  <button
                    onClick={() => {
                      assistant.updateSettings({ memoryEnabled: !assistant.getSettings().memoryEnabled });
                    }}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      assistant.getSettings().memoryEnabled ? 'bg-pink-600 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow" />
                  </button>
                </div>
              </div>

              {/* Calendar connection status disclosure */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-semibold text-white block">Calendar Connection Transparency</span>
                <p>
                  External Google Workspace Calendar is not connected. All your tasks, reminders, and schedule events are kept 100% private in local browser storage.
                </p>
              </div>

              {/* Danger Zone: Clear Data */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-300 block">Clear All Daily Assistant Data</span>
                  <span className="text-[11px] text-rose-400/80">Deletes all saved tasks, reminders, notes, and schedule events</span>
                </div>
                <button
                  onClick={() => setItemToDelete({ type: 'all', title: 'ALL assistant data' })}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {itemToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Confirm Delete</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete {itemToDelete.title ? `"${itemToDelete.title}"` : 'this item'}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
