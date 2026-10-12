import {
  ClarificationRequest,
  ContextEntities,
  ContextIntelligenceSettings,
  DetectedIntent,
  PendingAction,
  TaskActionStatus,
  TaskContextSnapshot,
  TrackedAction,
} from '../types/context';
import { MemoryManager } from './memoryManager';

const SETTINGS_STORAGE_KEY = 'tamanna_context_intelligence_settings_v1';

const DEFAULT_SETTINGS: ContextIntelligenceSettings = {
  developerPanelEnabled: false,
  smartConfirmationEnabled: true,
  situationalReasoningEnabled: true,
};

export class TaskContextManager {
  private static instance: TaskContextManager;

  // Active Task Context
  private currentTaskId: string = `task_${Date.now()}`;
  private currentTaskTitle: string | null = null;
  private currentStep: string | null = null;
  private stepIndex: number = 0;
  private latestUserInstruction: string = '';
  private detectedIntent: DetectedIntent = 'chit_chat';
  private intentConfidence: number = 0.95;

  private previousAction: TrackedAction | null = null;
  private pendingAction: PendingAction | null = null;
  private toolBeingUsed: string | null = null;
  private actionStatus: TaskActionStatus = 'idle';
  private lastError: string | null = null;
  private suggestedNextOption: string | null = null;

  private activeEntities: ContextEntities = {};
  private conversationSnippetList: Array<{ role: 'user' | 'assistant'; text: string; intent?: DetectedIntent; timestamp: number }> = [];

  private clarificationRequest: ClarificationRequest | null = null;
  private settings: ContextIntelligenceSettings = DEFAULT_SETTINGS;

  private listeners: Set<(snapshot: TaskContextSnapshot) => void> = new Set();
  private settingsListeners: Set<(settings: ContextIntelligenceSettings) => void> = new Set();
  private clarificationListeners: Set<(clarification: ClarificationRequest | null) => void> = new Set();

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): TaskContextManager {
    if (!TaskContextManager.instance) {
      TaskContextManager.instance = new TaskContextManager();
    }
    return TaskContextManager.instance;
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('[TaskContextManager] Error loading settings:', e);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[TaskContextManager] Error saving settings:', e);
    }
    this.notifySettings();
  }

  // --- Subscriptions ---

  public subscribe(listener: (snapshot: TaskContextSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeSettings(listener: (settings: ContextIntelligenceSettings) => void): () => void {
    this.settingsListeners.add(listener);
    listener({ ...this.settings });
    return () => {
      this.settingsListeners.delete(listener);
    };
  }

  public subscribeClarification(listener: (clarification: ClarificationRequest | null) => void): () => void {
    this.clarificationListeners.add(listener);
    listener(this.clarificationRequest);
    return () => {
      this.clarificationListeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch (err: any) {
        console.warn('[TaskContextManager] Listener error:', err?.message || err);
      }
    });
  }

  private notifySettings(): void {
    const copy = { ...this.settings };
    this.settingsListeners.forEach((l) => {
      try {
        l(copy);
      } catch (err: any) {
        console.warn('[TaskContextManager] Settings listener error:', err?.message || err);
      }
    });
  }

  private notifyClarification(): void {
    this.clarificationListeners.forEach((l) => {
      try {
        l(this.clarificationRequest);
      } catch (err: any) {
        console.warn('[TaskContextManager] Clarification listener error:', err?.message || err);
      }
    });
  }

  public getSnapshot(): TaskContextSnapshot {
    const recentTurns = this.conversationSnippetList.slice(-6);
    const conversationSnippet = recentTurns
      .map((t) => `${t.role === 'user' ? 'User' : 'Tamanna'}${t.intent ? ` (${t.intent})` : ''}: ${t.text}`)
      .join('\n');

    return {
      currentTaskId: this.currentTaskId,
      currentTaskTitle: this.currentTaskTitle,
      currentStep: this.currentStep,
      stepIndex: this.stepIndex,
      latestUserInstruction: this.latestUserInstruction,
      detectedIntent: this.detectedIntent,
      intentConfidence: this.intentConfidence,
      previousAction: this.previousAction ? { ...this.previousAction } : null,
      pendingAction: this.pendingAction ? { ...this.pendingAction } : null,
      toolBeingUsed: this.toolBeingUsed,
      actionStatus: this.actionStatus,
      lastError: this.lastError,
      suggestedNextOption: this.suggestedNextOption,
      activeEntities: { ...this.activeEntities },
      conversationSnippet,
    };
  }

  public getSettings(): ContextIntelligenceSettings {
    return { ...this.settings };
  }

  public setDeveloperPanelEnabled(enabled: boolean): void {
    this.settings.developerPanelEnabled = enabled;
    this.saveSettings();
  }

  public toggleSmartConfirmation(enabled: boolean): void {
    this.settings.smartConfirmationEnabled = enabled;
    this.saveSettings();
  }

  public toggleSituationalReasoning(enabled: boolean): void {
    this.settings.situationalReasoningEnabled = enabled;
    this.saveSettings();
  }

  // --- Intent Classification & Situational Analysis ---

  public classifyIntent(text: string): { intent: DetectedIntent; confidence: number } {
    const lower = (text || '').trim().toLowerCase();
    if (!lower) return { intent: 'chit_chat', confidence: 0.5 };

    // 1. Follow-up commands (e.g., "Ab ye karo", "Isko change karo", "Wahi dobara karo", "Ab isko chalao")
    if (
      lower.includes('ab ye') ||
      lower.includes('ab ye karo') ||
      lower.includes('ab isko') ||
      lower.includes('isko chalao') ||
      lower.includes('isko play') ||
      lower.includes('wahi dobara') ||
      lower.includes('wahi phir se') ||
      lower.includes('wapas karo') ||
      lower.includes('agle step') ||
      lower.includes('next step') ||
      lower.includes('continue karo') ||
      lower.includes('aage badho') ||
      lower.startsWith('aur ') ||
      lower.startsWith('then ') ||
      lower.startsWith('next ')
    ) {
      return { intent: 'follow_up', confidence: 0.94 };
    }

    // 2. Corrections (e.g., "Isko change karo", "Ye nahi", "Nahi pehle wala nahi", "Change it", "Replace")
    if (
      lower.includes('change karo') ||
      lower.includes('badal do') ||
      lower.includes('isko change') ||
      lower.includes('ye nahi') ||
      lower.includes('nahi dusra') ||
      lower.includes('wrong') ||
      lower.includes('incorrect') ||
      lower.includes('modify karo')
    ) {
      return { intent: 'correction', confidence: 0.92 };
    }

    // 3. Cancellations (e.g., "Pehle wala hata do", "Ruk jao", "Cancel", "Stop it", "Hata do", "Delete last")
    if (
      lower.includes('pehle wala hata do') ||
      lower.includes('hata do') ||
      lower.includes('delete kar') ||
      lower.includes('cancel') ||
      lower.includes('ruk jao') ||
      lower.includes('rok do') ||
      lower.includes('stop') ||
      lower.includes('abort') ||
      lower.includes('undo')
    ) {
      return { intent: 'cancellation', confidence: 0.95 };
    }

    // 4. Confirmations (e.g., "Haan", "Yes", "Theek hai", "Kar do", "Confirm", "Proceed", "Okay sure")
    if (
      lower === 'haan' ||
      lower === 'ha' ||
      lower === 'yes' ||
      lower === 'ok' ||
      lower === 'okay' ||
      lower === 'theek hai' ||
      lower === 'sahi hai' ||
      lower === 'kar do' ||
      lower === 'chalo karo' ||
      lower === 'proceed' ||
      lower === 'confirm'
    ) {
      return { intent: 'confirmation', confidence: 0.96 };
    }

    // 5. Questions vs Information Requests vs Commands
    const isQuestionForm =
      lower.endsWith('?') ||
      lower.startsWith('kya ') ||
      lower.startsWith('kaise ') ||
      lower.startsWith('kyun ') ||
      lower.startsWith('kab ') ||
      lower.startsWith('kahan ') ||
      lower.startsWith('kaun ') ||
      lower.startsWith('what ') ||
      lower.startsWith('how ') ||
      lower.startsWith('why ') ||
      lower.startsWith('who ') ||
      lower.startsWith('where ') ||
      lower.startsWith('when ') ||
      lower.includes('kya aap') ||
      lower.includes('kya tum') ||
      lower.includes('can you') ||
      lower.includes('is it');

    if (isQuestionForm) {
      // Check if asking for knowledge/status vs casual question
      if (
        lower.includes('weather') ||
        lower.includes('mausam') ||
        lower.includes('time') ||
        lower.includes('battery') ||
        lower.includes('news') ||
        lower.includes('meaning') ||
        lower.includes('definition')
      ) {
        return { intent: 'information_request', confidence: 0.9 };
      }
      return { intent: 'question', confidence: 0.88 };
    }

    // 6. Direct Commands (Action verbs: open, search, play, turn on/off, call, send, take photo, etc.)
    const commandWords = [
      'kholo', 'open', 'search', 'play', 'chalao', 'bhejo', 'send', 'call', 'lagaao',
      'band karo', 'chalu karo', 'turn on', 'turn off', 'create', 'banao', 'photo khicho',
      'record', 'download', 'set', 'brightness', 'wifi', 'bluetooth', 'calculate'
    ];
    if (commandWords.some((w) => lower.includes(w))) {
      return { intent: 'command', confidence: 0.92 };
    }

    // 7. Information Requests (Query-like without question mark)
    if (
      lower.includes('batao') ||
      lower.includes('dikhao') ||
      lower.includes('check karo') ||
      lower.includes('tell me') ||
      lower.includes('show me') ||
      lower.includes('temperature')
    ) {
      return { intent: 'information_request', confidence: 0.86 };
    }

    // Default to chit_chat
    return { intent: 'chit_chat', confidence: 0.75 };
  }

  /**
   * Resolves contextual pronouns like "isko", "pehle wala", "wahi dobara", "ab ye karo"
   * based on the tracked activeEntities and previousAction.
   */
  public resolveContextualReferents(text: string): {
    resolvedQuery: string;
    resolvedEntity: string | null;
    isFollowUp: boolean;
    referencedAction: string | null;
  } {
    const lower = text.toLowerCase();
    let resolved = text;
    let resolvedEntity: string | null = null;
    let referencedAction: string | null = null;
    let isFollowUp = false;

    // Check "isko chalao" / "isko play karo"
    if (lower.includes('isko chalao') || lower.includes('isko play karo') || lower.includes('play this') || lower.includes('play it')) {
      isFollowUp = true;
      referencedAction = 'playVideo';
      if (this.activeEntities.lastQuery) {
        resolvedEntity = this.activeEntities.lastQuery;
        resolved = `Play the video for "${this.activeEntities.lastQuery}"`;
      } else if (this.activeEntities.lastMediaItem) {
        resolvedEntity = this.activeEntities.lastMediaItem;
        resolved = `Play the media item "${this.activeEntities.lastMediaItem}"`;
      }
    }
    // Check "wahi dobara karo" / "repeat that"
    else if (lower.includes('wahi dobara') || lower.includes('repeat that') || lower.includes('fir se karo') || lower.includes('once again')) {
      isFollowUp = true;
      if (this.previousAction) {
        referencedAction = this.previousAction.toolName;
        resolvedEntity = JSON.stringify(this.previousAction.args);
        resolved = `Repeat the previous action: ${this.previousAction.toolName}`;
      }
    }
    // Check "pehle wala hata do" / "undo previous"
    else if (lower.includes('pehle wala hata do') || lower.includes('undo previous') || lower.includes('cancel previous')) {
      isFollowUp = true;
      referencedAction = 'undo';
      resolved = `Undo the previous action (${this.previousAction?.toolName || 'last operation'})`;
    }
    // Check "isko change karo"
    else if (lower.includes('isko change karo') || lower.includes('change this') || lower.includes('modify that')) {
      isFollowUp = true;
      referencedAction = 'modify';
      if (this.activeEntities.lastQuery) {
        resolvedEntity = this.activeEntities.lastQuery;
        resolved = `Change or modify the current item/query: "${this.activeEntities.lastQuery}"`;
      }
    }
    // Check "ab ye karo" / "next step"
    else if (lower.includes('ab ye karo') || lower.includes('now do this') || lower.includes('next karo')) {
      isFollowUp = true;
      if (this.pendingAction) {
        referencedAction = this.pendingAction.toolName;
        resolved = `Execute pending action: ${this.pendingAction.description}`;
      }
    }

    return {
      resolvedQuery: resolved,
      resolvedEntity,
      isFollowUp,
      referencedAction,
    };
  }

  // --- Recording User Utterance ---

  public recordUserUtterance(text: string): {
    intent: DetectedIntent;
    confidence: number;
    clarificationPrompt?: ClarificationRequest | null;
  } {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { intent: 'chit_chat', confidence: 0.5 };
    }

    const { intent, confidence } = this.classifyIntent(trimmed);
    this.latestUserInstruction = trimmed;
    this.detectedIntent = intent;
    this.intentConfidence = confidence;

    // Check if user is answering an active clarification request
    if (this.clarificationRequest) {
      console.log('[TaskContextManager] User answered clarification:', trimmed);
      this.clarificationRequest = null;
      this.notifyClarification();
    }

    // Add to conversation snippet list
    this.conversationSnippetList.push({
      role: 'user',
      text: trimmed,
      intent,
      timestamp: Date.now(),
    });
    if (this.conversationSnippetList.length > 20) {
      this.conversationSnippetList = this.conversationSnippetList.slice(-20);
    }

    // Check for ambiguity
    const clarification = this.checkAmbiguity(trimmed, intent);
    if (clarification) {
      this.clarificationRequest = clarification;
      this.actionStatus = 'clarification_needed';
      this.notifyClarification();
    }

    this.notify();
    return { intent, confidence, clarificationPrompt: clarification };
  }

  // --- Recording Assistant Response ---

  public recordAssistantResponse(text: string): void {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    this.conversationSnippetList.push({
      role: 'assistant',
      text: trimmed,
      timestamp: Date.now(),
    });
    if (this.conversationSnippetList.length > 20) {
      this.conversationSnippetList = this.conversationSnippetList.slice(-20);
    }
    this.notify();
  }

  // --- Tool Execution Lifecycle Tracking ---

  public recordToolStart(toolName: string, args: Record<string, any>): void {
    this.toolBeingUsed = toolName;
    this.actionStatus = 'executing';
    this.lastError = null;

    // Update current task / step based on tool
    this.updateTaskFromTool(toolName, args);

    this.notify();
  }

  public recordToolResult(
    toolName: string,
    args: Record<string, any>,
    success: boolean,
    result: any,
    error?: string,
    capabilityNote?: string
  ): void {
    const isPlaybackTool = toolName === 'playVideo' || toolName.includes('media_play_video');
    let capabilityLimit = capabilityNote;
    let actualStatus: TaskActionStatus = success ? 'success' : 'failed';

    // SPECIAL SITUATIONAL CHECK: Direct video playback in browser environment
    // If user asked to play a video and the tool only launched a YouTube search url,
    // explicitly register that search completed, but playback automation is limited.
    if (isPlaybackTool) {
      if (typeof window !== 'undefined' && !('androidBridge' in window)) {
        capabilityLimit = 'Web search URL opened; direct native in-app playback control is not supported by standard browser sandbox.';
      }
    }

    const tracked: TrackedAction = {
      toolName,
      args: { ...args },
      result,
      success,
      message: result?.message || result?.result || (success ? 'Success' : error || 'Failed'),
      error,
      capabilityLimit,
      timestamp: Date.now(),
    };

    this.previousAction = tracked;
    this.toolBeingUsed = null;
    this.actionStatus = capabilityLimit && !success ? 'cannot_perform' : actualStatus;
    this.lastError = error || null;

    // Extract useful entities for follow-up reference resolution
    this.extractEntities(toolName, args, result);

    // Provide error recovery suggestion if failed
    if (!success) {
      this.suggestedNextOption = this.computeRecoveryOption(toolName, error);
    } else {
      this.suggestedNextOption = this.computeNextLogicalStep(toolName, args);
    }

    this.notify();
  }

  // --- Ambiguity & Smart Confirmation Check ---

  public checkAmbiguity(text: string, intent: DetectedIntent): ClarificationRequest | null {
    if (!this.settings.smartConfirmationEnabled) return null;

    const lower = text.toLowerCase().trim();

    // High impact or destructive commands require clear parameters or confirmation
    if (
      lower.includes('delete all') ||
      lower.includes('sab delete') ||
      lower.includes('format') ||
      lower.includes('clear everything') ||
      lower.includes('factory reset')
    ) {
      return {
        id: `clarify_${Date.now()}`,
        question: 'Are you sure you want to delete all stored data? This cannot be undone.',
        options: ['Yes, proceed', 'No, cancel'],
        ambiguousInstruction: text,
        confidence: 0.98,
        timestamp: Date.now(),
      };
    }

    // Ambiguous email command without recipient or message
    if ((lower === 'send email' || lower === 'email bhejo' || lower === 'mail karo') && !lower.includes('to') && !lower.includes('ko')) {
      return {
        id: `clarify_${Date.now()}`,
        question: 'Whom would you like to email, and what should the subject or message be?',
        options: ['Provide recipient & message', 'Cancel'],
        ambiguousInstruction: text,
        confidence: 0.85,
        timestamp: Date.now(),
      };
    }

    // Ambiguous call without contact name
    if (lower === 'call karo' || lower === 'make a call' || lower === 'phone lagao') {
      return {
        id: `clarify_${Date.now()}`,
        question: 'Whom would you like me to call?',
        options: ['Search contacts', 'Cancel'],
        ambiguousInstruction: text,
        confidence: 0.9,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  public dismissClarification(): void {
    this.clarificationRequest = null;
    this.notifyClarification();
    this.notify();
  }

  // --- Entity Extraction & Task Progression ---

  private extractEntities(toolName: string, args: Record<string, any>, result: any): void {
    if (args?.appName) {
      this.activeEntities.lastApp = args.appName;
    }
    if (args?.query) {
      this.activeEntities.lastQuery = args.query;
      this.activeEntities.lastMediaItem = args.query;
    }
    if (args?.url || result?.data?.url) {
      this.activeEntities.lastUrl = args?.url || result?.data?.url;
    }
    if (args?.recipient || args?.contactName) {
      this.activeEntities.lastTarget = args.recipient || args.contactName;
    }
    this.activeEntities.lastActionType = toolName;
    this.activeEntities.lastResultSummary = result?.message || result?.result || 'Completed';
  }

  private updateTaskFromTool(toolName: string, args: Record<string, any>): void {
    this.stepIndex += 1;

    if (toolName === 'openApp' || toolName.includes('app_open')) {
      this.currentTaskTitle = `Open ${args?.appName || 'Application'}`;
      this.currentStep = `Launching ${args?.appName || 'App'}`;
    } else if (toolName === 'webSearch' || toolName.includes('web_search')) {
      this.currentTaskTitle = `Web Search: "${args?.query || ''}"`;
      this.currentStep = `Searching the web for "${args?.query || ''}"`;
    } else if (toolName === 'playVideo' || toolName.includes('play_video')) {
      this.currentTaskTitle = `Video: "${args?.query || ''}"`;
      this.currentStep = `Searching and requesting playback for "${args?.query || ''}"`;
    } else if (toolName === 'playMusic' || toolName.includes('play_music')) {
      this.currentTaskTitle = `Music: "${args?.track || args?.query || ''}"`;
      this.currentStep = `Starting music playback for "${args?.track || args?.query || ''}"`;
    } else {
      this.currentStep = `Executing ${toolName}`;
    }
  }

  private computeRecoveryOption(toolName: string, error?: string): string {
    if (toolName.includes('call') || toolName.includes('sendMessage')) {
      return 'Check contact permissions or try searching contacts first.';
    }
    if (toolName.includes('play') || toolName.includes('video')) {
      return 'Direct playback is unavailable. Open search result in browser directly instead.';
    }
    if (toolName.includes('wifi') || toolName.includes('bluetooth') || toolName.includes('Device')) {
      return 'Open Android Device Settings page to toggle manually.';
    }
    return 'Would you like to retry, search on Google, or try another option?';
  }

  private computeNextLogicalStep(toolName: string, args: Record<string, any>): string | null {
    if (toolName === 'openApp' && (args?.appName || '').toLowerCase().includes('youtube')) {
      return 'Ready to search videos or play songs.';
    }
    if (toolName === 'webSearch') {
      return 'Ready to open any search result link or refine query.';
    }
    return null;
  }

  // --- Context Augmentation for LLM & Prompt Integration ---

  public generateSituationalPromptAugment(): string {
    const snapshot = this.getSnapshot();

    const sections: string[] = [
      '### TAMANNA CONTEXT & SITUATIONAL INTELLIGENCE:',
      `- Detected Intent: ${snapshot.detectedIntent.toUpperCase()} (confidence: ${(snapshot.intentConfidence * 100).toFixed(0)}%)`,
    ];

    if (snapshot.currentTaskTitle) {
      sections.push(`- Current Task: "${snapshot.currentTaskTitle}" (Step ${snapshot.stepIndex}: ${snapshot.currentStep || 'active'})`);
    }

    if (snapshot.previousAction) {
      const act = snapshot.previousAction;
      sections.push(
        `- Previous Action: ${act.toolName} -> Status: ${act.success ? 'SUCCEEDED' : 'FAILED'}${
          act.message ? ` ("${act.message}")` : ''
        }${act.capabilityLimit ? ` [NOTE: ${act.capabilityLimit}]` : ''}`
      );
    }

    if (snapshot.activeEntities.lastQuery) {
      sections.push(`- Active Query / Item in Context: "${snapshot.activeEntities.lastQuery}"`);
    }

    if (snapshot.activeEntities.lastApp) {
      sections.push(`- Active App in Context: "${snapshot.activeEntities.lastApp}"`);
    }

    sections.push(
      `- STRICT TRUTHFULNESS & CAPABILITY BOUNDS:
  1. Follow-Up Resolution: When the user says "Ab ye karo", "Isko change karo", "Pehle wala hata do", or "Wahi dobara karo", directly link it to the previous action and active entities above!
  2. If an action cannot actually be performed (e.g., direct in-app video playback inside a restricted web iframe when only YouTube search opened), NEVER pretend success! Say: "Search ho gaya, lekin direct playback control available nahi hai."
  3. Error Recovery: If a tool fails, explain simply in 1 snappy sentence, do not pretend it worked, and suggest the next available option.`
    );

    return sections.join('\n');
  }

  public resetTaskContext(): void {
    this.currentTaskId = `task_${Date.now()}`;
    this.currentTaskTitle = null;
    this.currentStep = null;
    this.stepIndex = 0;
    this.latestUserInstruction = '';
    this.previousAction = null;
    this.pendingAction = null;
    this.toolBeingUsed = null;
    this.actionStatus = 'idle';
    this.lastError = null;
    this.suggestedNextOption = null;
    this.activeEntities = {};
    this.clarificationRequest = null;
    this.notify();
  }
}
