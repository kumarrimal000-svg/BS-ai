import { AssistantState, BrowserActionItem, TeaseReaction, ThemeMood } from '../types/assistant';
import { AudioStreamer } from './AudioStreamer';
import { AudioRecorder } from './AudioRecorder';
import { ToolRegistry } from './toolRegistry';
import { AdaptiveLearningEngine } from './adaptiveLearningEngine';
import { VoiceSettingsService } from './voiceSettingsService';
import { MemoryManager } from './memoryManager';
import { TaskContextManager } from './taskContextManager';
import { ResearchEngine } from './researchEngine';
import { EmotionEngine } from './emotionEngine';
import { PersonalAssistantService } from './personalAssistantService';
import { BSCameraService } from './bsCameraService';
import { VoiceSettings } from '../types/voice';

export interface LiveSessionCallbacks {
  onStateChange: (state: AssistantState) => void;
  onToolExecuted: (action: BrowserActionItem) => void;
  onTranscript: (role: 'user' | 'assistant', text: string) => void;
  onReaction: (reaction: TeaseReaction) => void;
  onThemeChange: (mood: ThemeMood) => void;
  onError: (errorMsg: string) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer;
  private recorder: AudioRecorder;
  private state: AssistantState = 'disconnected';
  private callbacks: LiveSessionCallbacks;
  private selectedVoice: string = 'Aoede';
  private hasReceivedAudioThisTurn: boolean = false;
  private unsubscribeVoiceSettings?: () => void;
  private silenceTimer: any = null;
  private initialGreetingTimer: any = null;
  private proactiveCooldownUntil: number = 0;
  private proactiveNudgeCount: number = 0;

  constructor(callbacks: LiveSessionCallbacks, initialVoice: string = 'Aoede') {
    this.callbacks = callbacks;
    this.selectedVoice = initialVoice;

    // Load initial voice settings
    const voiceService = VoiceSettingsService.getInstance();
    const settings = voiceService.getSettings();

    // Separate AudioStreamer instance with speed and volume
    this.streamer = new AudioStreamer(24000, (isPlaying) => {
      if (this.state === 'disconnected' || this.state === 'connecting') return;
      if (isPlaying) {
        this.clearSilenceTimer();
        this.setState('speaking');
      } else {
        this.setState('listening');
        this.armSilenceDetection();
      }
    });
    this.streamer.setVolume(settings.volume);
    this.streamer.setPlaybackSpeed(settings.speed);
    this.streamer.setVoiceResponseEnabled(settings.voiceResponseEnabled);

    // AudioRecorder instance with smart audio filtering and speech interruption detection
    this.recorder = new AudioRecorder(
      (base64Chunk) => {
        this.sendAudioChunk(base64Chunk);
      },
      {
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        highpassFilter: settings.highpassFilter,
        micSensitivity: settings.micSensitivity,
        onSpeechDetected: () => {
          this.clearSilenceTimer();
          // Automatic voice interruption: if user speaks while Tamanna is speaking
          const currentSettings = VoiceSettingsService.getInstance().getSettings();
          if (currentSettings.autoInterruptOnSpeech && this.state === 'speaking') {
            console.log('[LiveSession] User speech detected during speech playback - auto interrupting');
            this.interrupt();
          }
        },
      }
    );

    // Subscribe to live voice settings changes
    this.unsubscribeVoiceSettings = voiceService.subscribe((newSettings) => {
      this.selectedVoice = newSettings.voice;
      this.streamer.setVolume(newSettings.volume);
      this.streamer.setPlaybackSpeed(newSettings.speed);
      this.streamer.setVoiceResponseEnabled(newSettings.voiceResponseEnabled);
      this.recorder.updateOptions({
        echoCancellation: newSettings.echoCancellation,
        noiseSuppression: newSettings.noiseSuppression,
        autoGainControl: newSettings.autoGainControl,
        highpassFilter: newSettings.highpassFilter,
        micSensitivity: newSettings.micSensitivity,
      });
    });
  }

  public setVoice(voice: string) {
    this.selectedVoice = voice;
  }

  private setState(newState: AssistantState) {
    if (this.state === newState) return;
    console.log(`[LiveSession] State: ${this.state} -> ${newState}`);
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  public getState(): AssistantState {
    return this.state;
  }

  public async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'listening' || this.state === 'speaking') {
      return;
    }

    this.setState('connecting');

    try {
      // Initialize audio streamer context on user gesture
      await this.streamer.initialize();

      // Establish WebSocket connection with adaptive preferences and advanced voice intelligence
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      const engine = AdaptiveLearningEngine.getInstance();
      const profile = engine.getProfile();
      const adaptivePrompt = engine.generateSystemInstructionAugment();

      const voiceSettings = VoiceSettingsService.getInstance().getSettings();

      // Determine active language: prioritize explicit voice settings language if not auto, else profile
      const activeLanguage = voiceSettings.language !== 'auto'
        ? voiceSettings.language
        : profile.languagePreference;

      const params = new URLSearchParams({
        voice: this.selectedVoice || voiceSettings.voice,
        lang: activeLanguage,
        detail: profile.detailLevel,
        style: profile.communicationStyle,
        tone: voiceSettings.speakingTone,
        speed: String(voiceSettings.speed),
        pitch: String(voiceSettings.pitch || 1.0),
        personalityMode: voiceSettings.personalityMode || 'balanced',
        affection: voiceSettings.affectionLevel || 'natural',
        humor: voiceSettings.humorLevel || 'medium',
        playfulness: voiceSettings.playfulnessLevel || 'medium',
        responseStyle: voiceSettings.responseStyle || 'balanced',
        naturalExpr: String(voiceSettings.naturalExpressions ?? true),
        autoFollowUp: String(voiceSettings.autoFollowUp ?? true),
        proactive: String(voiceSettings.proactiveConversation ?? true),
      });

      if (profile.enabled && adaptivePrompt) {
        params.set('adaptivePrompt', adaptivePrompt);
      }

      const memoryMgr = MemoryManager.getInstance();
      const memoryContext = memoryMgr.generateLiveContextAugment();
      if (memoryContext) {
        params.set('memoryContext', memoryContext);
      }

      const contextMgr = TaskContextManager.getInstance();
      const contextAugment = contextMgr.generateSituationalPromptAugment();
      if (contextAugment) {
        params.set('contextAugment', contextAugment);
      }

      const emotionMgr = EmotionEngine.getInstance();
      const emotionAugment = emotionMgr.generateEmotionLiveAugment();
      if (emotionAugment) {
        params.set('emotionAugment', emotionAugment);
      }

      const dailyAssistantMgr = PersonalAssistantService.getInstance();
      const dailyContextAugment = dailyAssistantMgr.generateLiveContextAugment();
      if (dailyContextAugment) {
        params.set('dailyContextAugment', dailyContextAugment);
      }

      const cameraService = BSCameraService.getInstance();
      const cameraVisionAugment = cameraService.generateCameraVisionLiveAugment();
      if (cameraVisionAugment) {
        params.set('cameraVisionAugment', cameraVisionAugment);
      }

      const wsUrl = `${protocol}//${host}/api/live-ws?${params.toString()}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[LiveSession] WebSocket opened, waiting for Gemini session...');
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            console.log('[LiveSession] Gemini Live ready with voice:', msg.voice || this.selectedVoice);
            // Start recording user's microphone once session is ready
            await this.recorder.start();
            this.setState('listening');
            const vSettings = VoiceSettingsService.getInstance().getSettings();
            if (vSettings.proactiveConversation && vSettings.proactiveGreetings) {
              this.initialGreetingTimer = setTimeout(() => {
                if (this.state === 'listening' && this.ws?.readyState === WebSocket.OPEN && this.proactiveNudgeCount === 0) {
                  this.triggerProactiveInitiative('greeting');
                }
              }, 2800);
            } else {
              this.armSilenceDetection();
            }
          } else if (msg.type === 'audio' && msg.data) {
            this.hasReceivedAudioThisTurn = true;
            await this.streamer.addPCMChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            console.log('[LiveSession] Assistant interrupted by user');
            this.streamer.stop();
            this.setState('listening');
          } else if (msg.type === 'toolCall') {
            console.log('[LiveSession] Received toolCall:', msg.name, msg.args);
            await this.handleToolCall(msg.callId, msg.name, msg.args);
          } else if (msg.type === 'transcript') {
            this.callbacks.onTranscript(msg.role, msg.text);
            if (msg.role === 'user') {
              TaskContextManager.getInstance().recordUserUtterance(msg.text);
              const acoustic = this.recorder.getAcousticFeatures();
              EmotionEngine.getInstance().updateAcousticFeatures(acoustic);
              EmotionEngine.getInstance().analyzeUtterance(msg.text);
            } else if (msg.role === 'assistant') {
              TaskContextManager.getInstance().recordAssistantResponse(msg.text);
              EmotionEngine.getInstance().recordAssistantResponse(msg.text);
            }
          } else if (msg.type === 'error') {
            console.warn('[LiveSession] Server error:', msg.message);
            this.callbacks.onError(msg.message || 'Session error');
            this.disconnect();
          } else if (msg.type === 'closed') {
            this.disconnect();
          }
        } catch (err: any) {
          console.warn('[LiveSession] Failed to process message:', err?.message || err);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[LiveSession] WebSocket status event handled:', (e as any)?.message || 'live-ws event');
        this.callbacks.onError('Could not connect to live voice session. Check your internet connection.');
        this.disconnect();
      };

      this.ws.onclose = () => {
        console.log('[LiveSession] WebSocket closed');
        this.disconnect();
      };

    } catch (err: any) {
      console.warn('[LiveSession] Connection exception:', err?.message || err);
      this.callbacks.onError(err?.message || 'Failed to start session. Please allow microphone permissions.');
      this.disconnect();
    }
  }

  /**
   * Smoothly and immediately interrupts spoken voice output
   */
  public interrupt(): void {
    this.streamer.stop();
    if (this.state === 'speaking') {
      this.setState('listening');
    }
    // If WebSocket is open, send interruption notification to server if needed
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'clientInterrupt' }));
      } catch {
        // Safe dispatch
      }
    }
  }

  public disconnect(): void {
    if (this.state === 'disconnected') return;

    this.clearSilenceTimer();
    this.recorder.stop();
    this.streamer.stop();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.setState('disconnected');
  }

  private sendAudioChunk(base64Chunk: string): void {
    this.clearSilenceTimer();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      this.ws.send(JSON.stringify({
        type: 'audio',
        data: base64Chunk,
      }));
    }
  }

  /**
   * Sends a live camera frame to the LiveSession Gemini model for real-time visual recognition
   */
  public sendVideoFrame(base64Frame: string, mimeType: string = 'image/jpeg'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state !== 'disconnected') {
      this.ws.send(JSON.stringify({
        type: 'video',
        data: base64Frame,
        mimeType,
      }));
    }
  }

  /**
   * Executes client-side toolCall instantly and responds immediately to Gemini
   */
  private async handleToolCall(callId: string, name: string, args: any): Promise<void> {
    let resultPayload: any = { status: 'success' };
    const contextMgr = TaskContextManager.getInstance();
    contextMgr.recordToolStart(name, args || {});

    try {
      if (name === 'changeThemeMood') {
        const mood = (args?.mood || 'magenta').toLowerCase() as ThemeMood;
        const validMoods: ThemeMood[] = ['magenta', 'cyan', 'violet', 'emerald', 'amber'];
        const chosenMood = validMoods.includes(mood) ? mood : 'magenta';

        this.callbacks.onThemeChange(chosenMood);
        resultPayload = {
          status: 'success',
          mood: chosenMood,
          result: `Visual theme mood changed to ${chosenMood}.`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'showTeaseReaction') {
        const reaction = (args?.reaction || 'wink').toLowerCase() as TeaseReaction;
        this.callbacks.onReaction(reaction);
        resultPayload = {
          status: 'success',
          reaction,
          result: `Expressed reaction: ${reaction}.`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'performResearch') {
        const topic = args?.topic || 'General Topic';
        const mode = args?.mode || 'deep_research';
        const engine = ResearchEngine.getInstance();
        const report = await engine.conductResearch(topic, mode, {
          triggerSearchTool: mode === 'current_info',
        });
        const spokenResponse = engine.generateSpokenVoiceResponse(report);
        resultPayload = {
          status: 'success',
          topic: report.topic,
          directAnswer: report.directAnswer,
          summary: report.summary,
          keyFacts: report.keyFacts,
          sourcesCount: report.sources.length,
          spokenResponse,
          result: `Research completed for "${report.topic}". ${spokenResponse}`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'getResearchSummary') {
        const topic = (args?.topic || '').toLowerCase();
        const engine = ResearchEngine.getInstance();
        const reports = engine.getAllSessionReports();
        const found = reports.find((r) => r.topic.toLowerCase().includes(topic)) || engine.getActiveReport();
        if (found) {
          resultPayload = {
            status: 'success',
            topic: found.topic,
            directAnswer: found.directAnswer,
            summary: found.summary,
            result: `Retrieved active research findings for "${found.topic}": ${found.directAnswer}`,
          };
        } else {
          resultPayload = {
            status: 'not_found',
            result: `No prior research found for "${args?.topic || 'requested topic'}" in active session.`,
          };
        }
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'analyzeEmotionalTone') {
        const text = args?.text || '';
        const emotionEngine = EmotionEngine.getInstance();
        const acoustic = this.recorder.getAcousticFeatures();
        emotionEngine.updateAcousticFeatures(acoustic);
        const result = emotionEngine.analyzeUtterance(text);
        resultPayload = {
          status: 'success',
          primaryEmotion: result.primaryEmotion,
          secondaryEmotion: result.secondaryEmotion,
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          confidence: result.confidence,
          recommendedTone: result.recommendedTone,
          adaptationDirective: result.adaptationDirective,
          tentativeDisclaimer: result.tentativeDisclaimer,
          safetyRisk: result.safetyRisk,
          isEstimate: true,
          result: `Emotional tone estimated as "${result.primaryEmotion}" (${result.sentiment} sentiment, confidence: ${result.confidence}). Suggested adaptation: ${result.adaptationDirective}`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'adjustResponseTone') {
        const tone = args?.tone || 'natural_playful';
        const empathyLevel = args?.empathyLevel || 'balanced';
        const emotionEngine = EmotionEngine.getInstance();
        emotionEngine.saveSettings({ empathyLevel });
        resultPayload = {
          status: 'success',
          tone,
          empathyLevel,
          result: `Spoken cadence and empathy adjusted to "${tone}" with ${empathyLevel} empathy level.`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'getEmotionState') {
        const emotionEngine = EmotionEngine.getInstance();
        const snapshot = emotionEngine.getSnapshot();
        resultPayload = {
          status: 'success',
          activeEmotion: snapshot.activeEmotion,
          activeSentiment: snapshot.activeSentiment,
          confidence: snapshot.confidence,
          recommendedTone: snapshot.recommendedTone,
          adaptationDirective: snapshot.adaptationDirective,
          tentativeDisclaimer: snapshot.tentativeDisclaimer,
          result: `Current emotion estimate is "${snapshot.activeEmotion}" (${snapshot.activeSentiment}), recommended tone: "${snapshot.recommendedTone}".`,
        };
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'manageTasks') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleManageTasks(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Tasks',
          url: '',
          siteName: `Tasks (${args?.action || 'manage'})`,
          description: resultPayload.result || 'Managed daily tasks',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'manageReminders') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleManageReminders(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Reminders',
          url: '',
          siteName: `Reminders (${args?.action || 'manage'})`,
          description: resultPayload.result || 'Managed reminders',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'manageNotes') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleManageNotes(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Notes',
          url: '',
          siteName: `Notes (${args?.action || 'manage'})`,
          description: resultPayload.result || 'Managed notes',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'getDailyPlan') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleGetDailyPlan(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Daily Plan',
          url: '',
          siteName: 'Today\'s Agenda & Priorities',
          description: resultPayload.result || 'Generated daily plan',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'checkCalendarStatus') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleCheckCalendarStatus();
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Calendar Status',
          url: '',
          siteName: 'Calendar Integration Status',
          description: resultPayload.message || 'Checked calendar status',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'getDailySummary') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleGetDailySummary();
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Daily Summary',
          url: '',
          siteName: 'Daily Briefing & Summary',
          description: resultPayload.result || 'Daily summary generated',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'manageSchedule') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleManageSchedule(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Schedule',
          url: '',
          siteName: `Schedule (${args?.action || 'manage'})`,
          description: resultPayload.result || 'Managed calendar schedule',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else if (name === 'getSmartSuggestions') {
        const assistant = PersonalAssistantService.getInstance();
        resultPayload = assistant.handleGetSmartSuggestions(args);
        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name: 'Personal Assistant: Smart Suggestions',
          url: '',
          siteName: 'Proactive Daily Guidance',
          description: resultPayload.result || 'Generated practical suggestions',
          timestamp: Date.now(),
        };
        this.callbacks.onToolExecuted(actionItem);
        contextMgr.recordToolResult(name, args || {}, true, resultPayload);
      } else {
        // Execute through Tamanna's Central Tool Registry (All 246 tools)
        const registry = ToolRegistry.getInstance();
        const executionResult = await registry.executeTool(name, args || {});

        const actionItem: BrowserActionItem = {
          id: callId || `${Date.now()}`,
          name,
          url: executionResult?.data?.url || '',
          siteName: executionResult?.data?.track || executionResult?.data?.packageName || executionResult?.action || name,
          description: executionResult?.message || `Executed ${name}`,
          timestamp: Date.now(),
        };

        this.callbacks.onToolExecuted(actionItem);
        resultPayload = {
          ...executionResult,
          status: executionResult.success ? 'success' : 'failed',
          result: executionResult.message,
        };

        contextMgr.recordToolResult(
          name,
          args || {},
          Boolean(executionResult.success),
          resultPayload,
          executionResult.success ? undefined : executionResult.message
        );
      }
    } catch (err: any) {
      console.warn('[LiveSession] Error executing toolCall handled:', err?.message || err);
      resultPayload = {
        status: 'error',
        error: err?.message || 'Execution error',
      };
      contextMgr.recordToolResult(name, args || {}, false, resultPayload, err?.message || 'Execution error');
    } finally {
      // SEND TOOL RESPONSE INSTANTLY
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[LiveSession] Sending instant toolResponse back to Gemini for', name);
        this.ws.send(JSON.stringify({
          type: 'toolResponse',
          callId,
          name,
          result: resultPayload,
        }));
      }
    }
  }

  public sendTextMessage(text: string): void {
    this.clearSilenceTimer();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      TaskContextManager.getInstance().recordUserUtterance(text);
      EmotionEngine.getInstance().analyzeUtterance(text);
      this.callbacks.onTranscript('user', text);
      this.ws.send(JSON.stringify({
        type: 'text',
        text,
      }));
    }
  }

  /**
   * Clears any active silence detection and greeting timers
   */
  public clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.initialGreetingTimer) {
      clearTimeout(this.initialGreetingTimer);
      this.initialGreetingTimer = null;
    }
  }

  /**
   * Arms silence detection timer to allow Tamanna to proactively initiate speech
   */
  public armSilenceDetection(): void {
    this.clearSilenceTimer();
    if (this.state !== 'listening' || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const settings = VoiceSettingsService.getInstance().getSettings();
    if (!settings.proactiveConversation) return;

    const delayMs = Math.max(12000, (settings.proactiveSilenceSeconds || 20) * 1000);
    this.silenceTimer = setTimeout(() => {
      if (this.state === 'listening' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.triggerProactiveInitiative();
      }
    }, delayMs);
  }

  /**
   * Proactively initiates conversation based on time-of-day, past topics, or playful banter
   */
  public triggerProactiveInitiative(forcedTopic?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.state === 'speaking') return;

    const settings = VoiceSettingsService.getInstance().getSettings();
    if (!settings.proactiveConversation && !forcedTopic) return;

    const now = Date.now();
    if (!forcedTopic && now < this.proactiveCooldownUntil) return;
    this.proactiveCooldownUntil = now + 35000; // 35-second cooldown between proactive prompts

    const currentHour = new Date().getHours();
    let timePeriod: 'morning' | 'afternoon' | 'evening' | 'late_night' = 'morning';
    if (currentHour >= 5 && currentHour < 12) {
      timePeriod = 'morning';
    } else if (currentHour >= 12 && currentHour < 17) {
      timePeriod = 'afternoon';
    } else if (currentHour >= 17 && currentHour < 22) {
      timePeriod = 'evening';
    } else {
      timePeriod = 'late_night';
    }

    const memoryMgr = MemoryManager.getInstance();
    const recentMemories = memoryMgr.getRecentMemories(3);
    const recentTopic = recentMemories.length > 0 ? recentMemories[0].title : '';

    let proactivePrompt = '';
    if (forcedTopic) {
      proactivePrompt = `[PROACTIVE_INSTRUCTION: Tamanna, abhi user ne tumse baat shuru karne ko kaha hai: "${forcedTopic}". Natural, pyaare aur confident Hindi/Hinglish andaaz mein 1-2 sentence bolo aur aage sawal pucho.]`;
    } else if (this.proactiveNudgeCount === 0 && settings.proactiveGreetings) {
      if (timePeriod === 'morning') {
        proactivePrompt = '[PROACTIVE_INSTRUCTION: Tamanna, conversation start hui hai. Subah ka pyara greeting do: "Good morning! Aaj ka kya plan hai? Kuch soch rahe ho ya main bataun?" 1-2 sweet energetic lines.]';
      } else if (timePeriod === 'late_night') {
        proactivePrompt = '[PROACTIVE_INSTRUCTION: Tamanna, late night conversation start hui hai. Playfully pucho: "Itni raat ko jaag rahe ho, neend nahi aa rahi kya? Ya koi urgent kaam chal raha hai?" 1-2 caring teasing lines.]';
      } else {
        proactivePrompt = '[PROACTIVE_INSTRUCTION: Tamanna, user se warm, magnetic Hinglish mein baat shuru karo: "Namaste! Main Tamanna hoon... kaho, aaj kya khaas chal raha hai?" 1-2 crisp lines.]';
      }
    } else if (recentTopic && settings.proactiveTopicFollowUp && Math.random() > 0.5) {
      proactivePrompt = `[PROACTIVE_INSTRUCTION: Tamanna, user shant hai. Pichhli baat/project "${recentTopic}" ka friendly follow-up lo: "Waise jo tumne ${recentTopic} ke baare mein kaha tha, uska kya raha?" 1-2 natural lines.]`;
    } else if (settings.proactiveMoodCheck && Math.random() > 0.5) {
      proactivePrompt = '[PROACTIVE_INSTRUCTION: Tamanna, user ka mood check karo: "Arey, achanak chup kyu ho gaye? Sab theek to hai na? Kuch pareshan kar raha hai kya?" 1-2 soft empathetic lines.]';
    } else {
      const silencePrompts = [
        '[PROACTIVE_INSTRUCTION: Tamanna, user kuch der se chup hai. Playfully pucho: "Arey, achanak itni shanti kyu? Kuch soch rahe ho kya ya mere charm mein kho gaye?" 1-2 witty lines.]',
        '[PROACTIVE_INSTRUCTION: Tamanna, banter karo: "Arey yaar, bore ho rahe ho to batao, koi accha gana sunu ya koi mazedaar kissa sunau?" 1-2 lines.]',
        '[PROACTIVE_INSTRUCTION: Tamanna, natural conversation chalao: "Waise tumse baat karke accha lagta hai, batao aaj ka din kaisa jaa raha hai?" 1-2 lines.]',
      ];
      proactivePrompt = silencePrompts[Math.floor(Math.random() * silencePrompts.length)];
    }

    this.proactiveNudgeCount++;
    console.log('[LiveSession] Sent proactive initiative prompt to Gemini Live');
    this.ws.send(JSON.stringify({
      type: 'text',
      text: proactivePrompt,
    }));
  }

  /**
   * Real-time audio volume level for smooth animated visualizer
   */
  public getVolume(): number {
    if (this.state === 'speaking') {
      return this.streamer.getVolume();
    }
    if (this.state === 'listening') {
      return this.recorder.getVolume();
    }
    return 0;
  }

  /**
   * Real-time frequency data for waveform rendering
   */
  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (this.state === 'speaking') {
      return this.streamer.getFrequencyData();
    }
    if (this.state === 'listening') {
      return this.recorder.getFrequencyData();
    }
    return new Uint8Array(32);
  }

  public destroy(): void {
    if (this.unsubscribeVoiceSettings) {
      this.unsubscribeVoiceSettings();
    }
    this.disconnect();
    this.streamer.close();
  }
}
