import { TaskPlan, TaskPlanStep } from '../types/assistant';
import { ToolRegistry } from './toolRegistry';

export class TaskPlanner {
  private static instance: TaskPlanner;
  private currentPlan: TaskPlan | null = null;
  private abortRequested: boolean = false;
  private listeners: Set<(plan: TaskPlan | null) => void> = new Set();

  private constructor() {}

  public static getInstance(): TaskPlanner {
    if (!TaskPlanner.instance) {
      TaskPlanner.instance = new TaskPlanner();
    }
    return TaskPlanner.instance;
  }

  public getCurrentPlan(): TaskPlan | null {
    return this.currentPlan;
  }

  public subscribe(listener: (plan: TaskPlan | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentPlan);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = this.currentPlan ? { ...this.currentPlan, steps: [...this.currentPlan.steps] } : null;
    this.listeners.forEach((l) => {
      try {
        l(copy);
      } catch (err: any) {
        console.warn('[TaskPlanner] Listener error handled:', err?.message || err);
      }
    });
  }

  public abortPlan(): void {
    if (this.currentPlan && this.currentPlan.status === 'running') {
      this.abortRequested = true;
      this.currentPlan.status = 'aborted';
      this.currentPlan.completedAt = Date.now();
      this.notify();
    }
  }

  public async executePlan(
    title: string,
    rawSteps: Array<{ title: string; toolName: string; args?: Record<string, any> }>,
    reasoningSummary?: string
  ): Promise<{ success: boolean; completedSteps: number; totalSteps: number; message: string; details: TaskPlan }> {
    if (!rawSteps || rawSteps.length === 0) {
      return {
        success: false,
        completedSteps: 0,
        totalSteps: 0,
        message: 'No steps provided in the task plan.',
        details: {
          id: `${Date.now()}`,
          title,
          steps: [],
          currentStepIndex: 0,
          status: 'failed',
          startedAt: Date.now(),
          completedAt: Date.now(),
        },
      };
    }

    this.abortRequested = false;

    const steps: TaskPlanStep[] = rawSteps.map((s, idx) => ({
      id: `step_${idx + 1}_${Date.now()}`,
      title: s.title || `Step ${idx + 1}: ${s.toolName}`,
      toolName: s.toolName,
      args: s.args || {},
      status: 'pending',
    }));

    const plan: TaskPlan = {
      id: `plan_${Date.now()}`,
      title,
      reasoningSummary,
      steps,
      currentStepIndex: 0,
      status: 'running',
      startedAt: Date.now(),
    };

    this.currentPlan = plan;
    this.notify();

    const registry = ToolRegistry.getInstance();
    let completedSteps = 0;
    let failedStepIndex = -1;

    for (let i = 0; i < plan.steps.length; i++) {
      if (this.abortRequested) {
        plan.status = 'aborted';
        plan.completedAt = Date.now();
        this.notify();
        return {
          success: false,
          completedSteps,
          totalSteps: plan.steps.length,
          message: `Task "${title}" was halted by user request at step ${i + 1}.`,
          details: plan,
        };
      }

      plan.currentStepIndex = i;
      const step = plan.steps[i];
      step.status = 'running';
      this.notify();

      // Artificial small micro-delay (300ms) for visible progression in HUD
      await new Promise((resolve) => setTimeout(resolve, 350));

      try {
        const res = await registry.executeTool(step.toolName, step.args);
        step.result = res;

        if (res && res.success !== false) {
          step.status = 'completed';
          completedSteps++;
        } else {
          step.status = 'failed';
          step.error = res?.message || 'Step execution reported failure';
          failedStepIndex = i;
          break;
        }
      } catch (err: any) {
        step.status = 'failed';
        step.error = err?.message || 'Execution exception';
        failedStepIndex = i;
        break;
      }

      this.notify();
    }

    plan.completedAt = Date.now();
    if (failedStepIndex !== -1) {
      plan.status = 'failed';
      // Mark remaining pending steps as skipped
      for (let j = failedStepIndex + 1; j < plan.steps.length; j++) {
        plan.steps[j].status = 'skipped';
      }
      this.notify();
      return {
        success: false,
        completedSteps,
        totalSteps: plan.steps.length,
        message: `Task "${title}" stopped at step ${failedStepIndex + 1} ("${plan.steps[failedStepIndex].title}"): ${plan.steps[failedStepIndex].error}`,
        details: plan,
      };
    }

    plan.status = 'completed';
    this.notify();

    return {
      success: true,
      completedSteps,
      totalSteps: plan.steps.length,
      message: `All ${plan.steps.length} steps in task "${title}" finished successfully!`,
      details: plan,
    };
  }
}
