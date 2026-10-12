import React from 'react';
import { CalendarCheck, Clock, ChevronRight, Bell } from 'lucide-react';
import { PersonalAssistantSnapshot } from '../types/personalAssistant';

interface DailyPlannerFloatingWidgetProps {
  snapshot: PersonalAssistantSnapshot;
  onOpenModal: () => void;
}

export const DailyPlannerFloatingWidget: React.FC<DailyPlannerFloatingWidgetProps> = ({
  snapshot,
  onOpenModal,
}) => {
  const tasks = snapshot?.tasks || [];
  const reminders = snapshot?.reminders || [];
  const triggeredQueue = snapshot?.triggeredRemindersQueue || [];

  const pendingTasks = tasks.filter((t) => t && t.status === 'pending');
  const highPriority = pendingTasks.filter((t) => t && t.priority === 'high');
  const nextReminder = reminders.find((r) => r && r.status === 'active');
  const hasTriggered = triggeredQueue.length > 0;

  return (
    <div className="fixed bottom-20 right-4 z-20 max-w-xs transition-all select-none">
      <div
        onClick={onOpenModal}
        className={`group cursor-pointer rounded-2xl border p-3 shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] ${
          hasTriggered
            ? 'bg-amber-950/80 border-amber-500/50 shadow-amber-500/10 animate-bounce'
            : 'bg-slate-900/85 border-slate-800 hover:border-pink-500/40 shadow-black/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                hasTriggered
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
              }`}
            >
              {hasTriggered ? <Bell className="w-4 h-4 animate-ping" /> : <CalendarCheck className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">Daily Planner</span>
                {highPriority.length > 0 && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {highPriority.length} Urgent
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {pendingTasks.length} pending · {Math.max(0, tasks.length - pendingTasks.length)} done
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-colors" />
        </div>

        {/* Next Reminder Preview */}
        {nextReminder && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">Next: {nextReminder.title} ({nextReminder.dueDateTime})</span>
          </div>
        )}
      </div>
    </div>
  );
};
