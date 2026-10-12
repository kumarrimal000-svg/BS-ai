import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState, BrowserActionItem, TeaseReaction, ThemeMood, ClarificationPrompt } from './types/assistant';
import { DecisionAnalysisData } from './types/decision';
import { LiveSession } from './services/LiveSession';
import { ToolRegistry } from './services/toolRegistry';
import { ConversationMemory } from './services/conversationMemory';
import { DecisionEngine } from './services/decisionEngine';
import { HUDHeader } from './components/HUDHeader';
import { FuturisticOrb } from './components/FuturisticOrb';
import { CentralMicButton } from './components/CentralMicButton';
import { ActionHUDCard } from './components/ActionHUDCard';
import { InAppBrowserModal } from './components/InAppBrowserModal';
import { VoiceTranscriptSubtitle } from './components/VoiceTranscriptSubtitle';
import { QuickPromptsDrawer } from './components/QuickPromptsDrawer';
import { CameraViewfinderModal } from './components/CameraViewfinderModal';
import { MusicPlayerHUD } from './components/MusicPlayerHUD';
import { ToolRegistryModal } from './components/ToolRegistryModal';
import { DeviceSettingsModal } from './components/DeviceSettingsModal';
import { TaskProgressHUD } from './components/TaskProgressHUD';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { ClarificationPromptHUD } from './components/ClarificationPromptHUD';
import { DecisionSupportCard } from './components/DecisionSupportCard';
import { DecisionSupportModal } from './components/DecisionSupportModal';
import { FeedbackModal } from './components/FeedbackModal';
import { LearningAnalyticsModal } from './components/LearningAnalyticsModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { MemoryDashboardModal } from './components/MemoryDashboardModal';
import { ContextDebugPanel } from './components/ContextDebugPanel';
import { ResearchHubModal } from './components/ResearchHubModal';
import { ResearchFloatingCard } from './components/ResearchFloatingCard';
import { EmotionHUDCard } from './components/EmotionHUDCard';
import { EmotionSentimentModal } from './components/EmotionSentimentModal';
import { DailyPlannerModal } from './components/DailyPlannerModal';
import { DailyPlannerFloatingWidget } from './components/DailyPlannerFloatingWidget';
import { AdaptiveLearningEngine } from './services/adaptiveLearningEngine';
import { VoiceSettingsService } from './services/voiceSettingsService';
import { MemoryManager } from './services/memoryManager';
import { TaskContextManager } from './services/taskContextManager';
import { ResearchEngine } from './services/researchEngine';
import { EmotionEngine } from './services/emotionEngine';
import { PersonalAssistantService } from './services/personalAssistantService';
import { ResearchReport } from './types/research';
import { EmotionStateSnapshot } from './types/emotion';
import { PersonalAssistantSnapshot } from './types/personalAssistant';
import { AlertCircle, X, Bookmark, CheckCircle2 } from 'lucide-react';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { QuickActionGrid } from './components/QuickActionGrid';
import { ToolsScreen } from './components/ToolsScreen';
import { UnifiedSettingsScreen } from './components/UnifiedSettingsScreen';
import { BSCameraScreen } from './components/BSCameraScreen';

export default function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [themeMood, setThemeMood] = useState<ThemeMood>('magenta');
  const [selectedVoice, setSelectedVoice] = useState<string>(() =>
    VoiceSettingsService.getInstance().getSettings().voice
  );
  const [activeAction, setActiveAction] = useState<BrowserActionItem | null>(null);
  const [previewAction, setPreviewAction] = useState<BrowserActionItem | null>(null);
  const [reaction, setReaction] = useState<TeaseReaction>(null);
  const [lastTranscript, setLastTranscript] = useState<{ role: 'user' | 'assistant'; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<MobileTab>('home');

  // Modals & States for Tools & Intelligence
  const [isRegistryOpen, setIsRegistryOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState<boolean>(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState<boolean>(() =>
    TaskContextManager.getInstance().getSettings().developerPanelEnabled
  );
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [activeResearchReport, setActiveResearchReport] = useState<ResearchReport | null>(() =>
    ResearchEngine.getInstance().getActiveReport()
  );
  const [isEmotionModalOpen, setIsEmotionModalOpen] = useState<boolean>(false);
  const [emotionSnapshot, setEmotionSnapshot] = useState<EmotionStateSnapshot>(() =>
    EmotionEngine.getInstance().getSnapshot()
  );
  const [isDailyPlannerOpen, setIsDailyPlannerOpen] = useState<boolean>(false);
  const [assistantSnapshot, setAssistantSnapshot] = useState<PersonalAssistantSnapshot>(() =>
    PersonalAssistantService.getInstance().getSnapshot()
  );
  const [memoryToast, setMemoryToast] = useState<{ title: string; action: 'saved' | 'updated' } | null>(null);
  const [feedbackModalData, setFeedbackModalData] = useState<{
    isOpen: boolean;
    turnId?: string;
    promptText?: string;
    responseText?: string;
    initialRating?: 'helpful' | 'unhelpful';
  }>({ isOpen: false });
  const [clarificationPrompt, setClarificationPrompt] = useState<ClarificationPrompt | null>(null);
  const [decisionData, setDecisionData] = useState<DecisionAnalysisData | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'selfie' | 'video'>('photo');
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [mediaCommand, setMediaCommand] = useState<{ type: 'play' | 'pause' | 'next' | 'previous' | 'volume' | 'mute'; val?: any } | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);

  // Initialize and bind LiveSession and ToolRegistry callbacks
  useEffect(() => {
    const registry = ToolRegistry.getInstance();
    registry.setCallbacks({
      onMediaAction: (type, val) => {
        setMediaCommand({ type, val });
      },
      onCameraAction: (type) => {
        if (type === 'selfie') {
          setCameraMode('selfie');
          setIsCameraOpen(true);
        } else if (type === 'record_start') {
          setCameraMode('video');
          setIsCameraOpen(true);
        } else {
          setCurrentTab('bscamera');
        }
      },
      onBrowserAction: (type, val) => {
        if (val?.url) {
          setActiveAction({
            id: `${Date.now()}`,
            name: type,
            url: val.url,
            siteName: val.name || val.url,
            description: `Navigating to ${val.name || val.url}`,
            timestamp: Date.now(),
          });
        }
      },
      onDeviceAction: (type, val) => {
        if (type === 'brightness' && typeof val === 'number') {
          setBrightness(val);
        }
      },
      onContactAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: type,
          url: val?.recipient || val?.to || '',
          siteName: `Phone / SMS: ${val?.recipient || val?.to || 'Contact'}`,
          description: val?.message || val?.subject || 'Communication action initiated',
          timestamp: Date.now(),
        });
      },
      onAutomationAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Automation: ${type}`,
          url: '',
          siteName: val?.taskName || val?.routineName || val?.target || 'Automation Sequence',
          description: `Executing automated sequence [${type}]`,
          timestamp: Date.now(),
        });
      },
      onAccessibilityAction: (type) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Accessibility: ${type}`,
          url: '',
          siteName: `Accessibility Setting: ${type}`,
          description: `Configured system accessibility feature [${type}]`,
          timestamp: Date.now(),
        });
      },
      onShoppingAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Shopping: ${type}`,
          url: val?.url || '',
          siteName: val?.query || val?.platform || 'Shopping & Payments',
          description: val?.note || `Shopping action [${type}] initiated securely`,
          timestamp: Date.now(),
        });
      },
      onEntertainmentAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Entertainment: ${type}`,
          url: val?.url || '',
          siteName: val?.movieTitle || val?.seriesTitle || val?.streamTitle || val?.station || val?.gameTitle || 'Entertainment',
          description: val?.joke || `Entertainment ${type} initiated`,
          timestamp: Date.now(),
        });
      },
      onHealthAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Health: ${type}`,
          url: '',
          siteName: val?.topic || val?.workoutType || val?.poseName || val?.medicationName || 'Health & Fitness',
          description: val?.activity ? `${val.activity} (${val.durationMinutes} mins)` : `Health assistant [${type}] active`,
          timestamp: Date.now(),
        });
      },
      onNewsWeatherAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `News & Weather: ${type}`,
          url: val?.url || '',
          siteName: val?.location || val?.topic || val?.region || 'Weather & Headlines',
          description: val?.temperature ? `${val.temperature}°C in ${val.location}` : `Weather & news [${type}] report`,
          timestamp: Date.now(),
        });
      },
      onEducationAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Education: ${type}`,
          url: '',
          siteName: val?.word || val?.problem || val?.formulaName || val?.topic || 'Learning Assistant',
          description: val?.problem ? `Solved: ${val.problem}` : `Educational resource for ${val?.word || val?.topic || type}`,
          timestamp: Date.now(),
        });
      },
      onOfficeAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Office: ${type}`,
          url: '',
          siteName: val?.meetingTitle || val?.documentName || val?.recipient || 'Work & Productivity',
          description: val?.subject ? `Email: ${val.subject}` : `Document/Office task [${type}]`,
          timestamp: Date.now(),
        });
      },
      onToolkitAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Toolkit: ${type}`,
          url: '',
          siteName: val?.input || `${val?.amount || ''} ${val?.from || ''}` || 'Smart Utility Tool',
          description: val?.output ? `Result: ${val.output}` : `Utility calculation [${type}] complete`,
          timestamp: Date.now(),
        });
      },
      onAIAction: (type, val) => {
        setActiveAction({
          id: `${Date.now()}`,
          name: `Advanced AI: ${type}`,
          url: val?.url || '',
          siteName: val?.prompt ? `Image: "${val.prompt.slice(0, 30)}..."` : val?.role || 'Neural Intelligence',
          description: val?.message || `Generative AI [${type}] operation executed`,
          timestamp: Date.now(),
        });
      },
      onClarificationRequested: (val) => {
        setClarificationPrompt({
          id: `${Date.now()}`,
          question: val?.question || 'Could you please clarify your request?',
          options: val?.options || [],
          missingParam: val?.missingParam,
          targetTool: val?.targetTool,
          timestamp: Date.now(),
        });
      },
      onDecisionAction: (val) => {
        const engine = DecisionEngine.getInstance();
        const normalized = engine.buildAnalysisData(val);
        setDecisionData(normalized);
        ConversationMemory.getInstance().addTurn(
          'assistant',
          `[Decision Analysis]: Analyzed options for "${normalized.topic}". Recommended: ${normalized.options[0]?.name}. Final choice rests with you.`,
          [{ name: 'decisionSupportAnalysis', success: true }]
        );
      },
      onLearningAction: (type, val) => {
        ConversationMemory.getInstance().addTurn(
          'assistant',
          `[Adaptive Learning]: ${type === 'feedback_recorded' ? 'Recorded user feedback' : 'Updated personalization preference'}.`,
          [{ name: type, success: true }]
        );
      },
    });

    const session = new LiveSession(
      {
        onStateChange: (newState) => {
          setState(newState);
        },
        onToolExecuted: (action) => {
          setActiveAction(action);
          ConversationMemory.getInstance().addTurn('assistant', `[Action]: ${action.name} - ${action.description || 'Completed'}`, [
            { name: action.name, success: true }
          ]);
        },
        onTranscript: (role, text) => {
          setLastTranscript({ role, text });
          ConversationMemory.getInstance().addTurn(role, text);
          if (role === 'user') {
            AdaptiveLearningEngine.getInstance().checkMistakeRisks(text);
          }
          const turns = ConversationMemory.getInstance().getHistory();
          AdaptiveLearningEngine.getInstance().analyzeConversationForAdaptations(turns);
        },
        onReaction: (rx) => {
          setReaction(rx);
          setTimeout(() => setReaction(null), 4000);
        },
        onThemeChange: (mood) => {
          setThemeMood(mood);
        },
        onError: (err) => {
          setErrorMessage(err);
        },
      },
      selectedVoice
    );

    sessionRef.current = session;

    return () => {
      session.destroy();
      sessionRef.current = null;
    };
  }, []);

  // Sync selected voice from VoiceSettingsService
  useEffect(() => {
    const unsub = VoiceSettingsService.getInstance().subscribe((settings) => {
      setSelectedVoice(settings.voice);
      if (sessionRef.current) {
        sessionRef.current.setVoice(settings.voice);
      }
    });
    return unsub;
  }, []);

  // Listen for memory saved/updated notifications
  useEffect(() => {
    const unsub = MemoryManager.getInstance().onNotification((item, action) => {
      const title = (item as any).title || (item as any).projectName || 'Item';
      setMemoryToast({ title, action });
      setTimeout(() => setMemoryToast(null), 4000);
    });
    return unsub;
  }, []);

  // Sync context intelligence, research, and emotion subscriptions
  useEffect(() => {
    const unsubContext = TaskContextManager.getInstance().subscribeSettings((s) => {
      setIsContextPanelOpen(s.developerPanelEnabled);
    });
    const unsubResearch = ResearchEngine.getInstance().subscribeActiveReport(setActiveResearchReport);
    const unsubEmotion = EmotionEngine.getInstance().subscribe(setEmotionSnapshot);
    const unsubAssistant = PersonalAssistantService.getInstance().subscribe(setAssistantSnapshot);
    return () => {
      unsubContext();
      unsubResearch();
      unsubEmotion();
      unsubAssistant();
    };
  }, []);

  // Update voice if user changes selector while disconnected
  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    VoiceSettingsService.getInstance().updateSettings({ voice: voice as any });
    if (sessionRef.current) {
      sessionRef.current.setVoice(voice);
    }
  };

  const handleToggleSession = async () => {
    setErrorMessage(null);
    if (!sessionRef.current) return;

    if (state === 'disconnected') {
      await sessionRef.current.connect();
    } else {
      sessionRef.current.disconnect();
    }
  };

  const handleInterrupt = () => {
    if (sessionRef.current && state === 'speaking') {
      sessionRef.current.interrupt();
    }
  };

  const handleSendPrompt = (promptText: string) => {
    AdaptiveLearningEngine.getInstance().checkMistakeRisks(promptText);
    if (sessionRef.current) {
      if (state === 'disconnected') {
        sessionRef.current.connect().then(() => {
          setTimeout(() => {
            sessionRef.current?.sendTextMessage(promptText);
          }, 800);
        });
      } else {
        sessionRef.current.sendTextMessage(promptText);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getVolume = useCallback(() => {
    return sessionRef.current ? sessionRef.current.getVolume() : 0;
  }, []);

  const getFrequencyData = useCallback(() => {
    return sessionRef.current ? sessionRef.current.getFrequencyData() : new Uint8Array(32);
  }, []);

  const handleExecuteRegistryTool = async (name: string, args: Record<string, any>) => {
    return await ToolRegistry.getInstance().executeTool(name, args);
  };

  return (
    <div
      className="relative w-full h-full min-h-screen overflow-hidden bg-[#07080e] flex flex-col justify-between select-none transition-[filter] duration-300"
      style={{
        filter: `brightness(${typeof brightness === 'number' && !isNaN(brightness) ? Math.max(30, Math.min(150, brightness)) : 100}%)`,
      }}
    >
      {/* Dynamic Futuristic Ambient Neon Background Glow */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] opacity-35 transition-colors duration-1000"
        style={{
          backgroundColor:
            themeMood === 'magenta' ? '#ff2d87' :
            themeMood === 'cyan' ? '#00f0ff' :
            themeMood === 'violet' ? '#a855f7' :
            themeMood === 'emerald' ? '#00ff9d' : '#ffb703',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[140px] opacity-30 transition-colors duration-1000"
        style={{
          backgroundColor:
            themeMood === 'magenta' ? '#b5179e' :
            themeMood === 'cyan' ? '#0077b6' :
            themeMood === 'violet' ? '#6366f1' :
            themeMood === 'emerald' ? '#059669' : '#fb8500',
        }}
      />

      {/* Cyber Grid Overlay lines */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* 1. Mobile-First Unified Header */}
      <MobileHeader
        state={state}
        themeMood={themeMood}
        onOpenSettings={() => setCurrentTab('settings')}
      />

      {/* Step-by-Step Task Progress HUD */}
      <TaskProgressHUD themeMood={themeMood} />

      {/* Clarification Prompt HUD */}
      <ClarificationPromptHUD
        prompt={clarificationPrompt}
        themeMood={themeMood}
        onSelectOption={(option) => {
          setClarificationPrompt(null);
          handleSendPrompt(option);
        }}
        onDismiss={() => setClarificationPrompt(null)}
      />

      {/* Decision Support Analysis Floating Card */}
      <DecisionSupportCard
        decision={decisionData}
        themeMood={themeMood}
        onClose={() => setDecisionData(null)}
        onOpenModal={() => setIsDecisionModalOpen(true)}
      />

      {/* Advanced Interactive Decision Support System Modal */}
      <DecisionSupportModal
        isOpen={isDecisionModalOpen}
        decisionData={decisionData}
        themeMood={themeMood}
        onClose={() => setIsDecisionModalOpen(false)}
        onAnalyzeCustom={async (topic, preferences) => {
          const res = await DecisionEngine.getInstance().analyzeDilemma(topic, preferences);
          setDecisionData(res);
        }}
      />

      {/* Conversation Intelligence Memory Modal */}
      <ConversationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSendPrompt={handleSendPrompt}
        onOpenCorrectionModal={(promptText, responseText, turnId) => {
          setFeedbackModalData({
            isOpen: true,
            promptText,
            responseText,
            turnId,
            initialRating: 'unhelpful',
          });
        }}
      />

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="z-50 px-4 py-2 mx-auto mt-2 max-w-md w-[92%] bg-rose-950/90 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Memory Action Notification Toast (Privacy Transparency) */}
      {memoryToast && (
        <div className="z-50 px-4 py-2 mx-auto mt-2 max-w-md w-[92%] bg-purple-950/95 border border-purple-500/60 rounded-xl text-purple-200 text-xs flex items-center justify-between gap-2 shadow-lg shadow-purple-500/10 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 shrink-0 text-purple-400" />
            <span>
              <strong>{memoryToast.action === 'saved' ? 'Saved to Memory:' : 'Updated Memory:'}</strong> "{memoryToast.title}"
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMemoryOpen(true)}
              className="text-[11px] underline text-purple-300 hover:text-white"
            >
              View
            </button>
            <button
              onClick={() => setMemoryToast(null)}
              className="text-purple-400 hover:text-white p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Browser Action Toast Card */}
      <ActionHUDCard
        action={activeAction}
        themeMood={themeMood}
        onClose={() => setActiveAction(null)}
        onOpenPreview={(action) => setPreviewAction(action)}
      />

      {/* In-App Browser Slide-up Modal */}
      <InAppBrowserModal
        action={previewAction}
        onClose={() => setPreviewAction(null)}
      />

      {/* Camera Viewfinder Modal */}
      <CameraViewfinderModal
        isOpen={isCameraOpen}
        mode={cameraMode}
        onClose={() => setIsCameraOpen(false)}
      />

      {/* Central 50 Tools Registry Modal */}
      <ToolRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        onExecuteTool={handleExecuteRegistryTool}
      />

      {/* Device System Controller Modal */}
      <DeviceSettingsModal
        isOpen={isDeviceSettingsOpen}
        onClose={() => setIsDeviceSettingsOpen(false)}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        onOpenLearningHub={() => setIsLearningModalOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
        onOpenMemoryHub={() => setIsMemoryOpen(true)}
        onOpenContextPanel={() => setIsContextPanelOpen(true)}
        onOpenResearchHub={() => setIsResearchModalOpen(true)}
        onOpenEmotionHub={() => setIsEmotionModalOpen(true)}
      />

      {/* Situational Context & Task Debugger Panel */}
      <ContextDebugPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        onSimulateUtterance={handleSendPrompt}
      />

      {/* Floating Research Dossier Notification Card */}
      <ResearchFloatingCard
        report={activeResearchReport}
        themeMood={themeMood}
        onClose={() => setActiveResearchReport(null)}
        onOpenModal={() => setIsResearchModalOpen(true)}
      />

      {/* Advanced Knowledge & Research System Modal */}
      <ResearchHubModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        onSendVoicePrompt={handleSendPrompt}
      />

      {/* Advanced Emotion & Sentiment Understanding Modal */}
      <EmotionSentimentModal
        isOpen={isEmotionModalOpen}
        onClose={() => setIsEmotionModalOpen(false)}
        snapshot={emotionSnapshot}
        onSendTestPrompt={handleSendPrompt}
      />

      {/* Advanced Memory & Personalization Dashboard Modal */}
      <MemoryDashboardModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        onSendPrompt={handleSendPrompt}
      />

      {/* Advanced Voice Intelligence & Microphone Diagnostics Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        onSendTestPrompt={handleSendPrompt}
      />

      {/* Advanced Personal Assistant & Daily Management Modal */}
      <DailyPlannerModal
        isOpen={isDailyPlannerOpen}
        onClose={() => setIsDailyPlannerOpen(false)}
        snapshot={assistantSnapshot}
        onAskTamannaPlan={(timeOfDay) => {
          setIsDailyPlannerOpen(false);
          const prompt =
            timeOfDay === 'morning'
              ? 'Tamanna, aaj ka morning plan aur top priorities batao.'
              : timeOfDay === 'evening'
              ? 'Tamanna, mera evening task review aur tomorrow preparation batao.'
              : 'Tamanna, aaj mera plan kya hai?';
          handleSendPrompt(prompt);
        }}
      />

      {/* Daily Planner Floating Quick-Access Widget */}
      <DailyPlannerFloatingWidget
        snapshot={assistantSnapshot}
        onOpenModal={() => setIsDailyPlannerOpen(true)}
      />

      {/* Self-Learning & Adaptive Intelligence Modal */}
      <LearningAnalyticsModal
        isOpen={isLearningModalOpen}
        onClose={() => setIsLearningModalOpen(false)}
        onSendTestPrompt={handleSendPrompt}
      />

      {/* Feedback & Mistake Correction Modal */}
      <FeedbackModal
        isOpen={feedbackModalData.isOpen}
        turnId={feedbackModalData.turnId}
        promptText={feedbackModalData.promptText}
        responseText={feedbackModalData.responseText}
        initialRating={feedbackModalData.initialRating}
        onClose={() => setFeedbackModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Real Media Player HUD */}
      <MusicPlayerHUD
        externalCommand={mediaCommand}
      />

      {/* 2. Main Content Views based on Tab */}
      <div className="relative flex-1 w-full flex flex-col overflow-y-auto no-scrollbar z-10">
        {/* VIEW A: HOME SCREEN */}
        {currentTab === 'home' && (
          <div className="flex-1 flex flex-col justify-between items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
            {/* Holographic Avatar Core & Waveform */}
            <div className="w-full flex flex-col items-center justify-center my-auto">
              <FuturisticOrb
                state={state}
                themeMood={themeMood}
                reaction={reaction}
                getVolume={getVolume}
                getFrequencyData={getFrequencyData}
              />

              {/* Floating Voice Transcript Subtitles */}
              <VoiceTranscriptSubtitle
                lastTranscript={lastTranscript}
                state={state}
                onQuickFeedback={(rating, text) => {
                  AdaptiveLearningEngine.getInstance().recordFeedback({
                    rating,
                    category: 'other',
                    promptText: 'Spoken transcript',
                    responseText: text,
                  });
                }}
                onOpenCorrectionModal={(promptText, responseText) => {
                  setFeedbackModalData({
                    isOpen: true,
                    promptText,
                    responseText,
                    initialRating: 'unhelpful',
                  });
                }}
              />

              {/* Real-Time Emotion & Sentiment HUD Card when voice is active */}
              {state !== 'disconnected' && (
                <div className="w-full mt-2 z-20">
                  <EmotionHUDCard
                    snapshot={emotionSnapshot}
                    onOpenModal={() => setIsEmotionModalOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Central glowing mobile microphone button */}
            <div className="my-3">
              <CentralMicButton
                state={state}
                themeMood={themeMood}
                onToggleSession={handleToggleSession}
                onInterrupt={handleInterrupt}
                onTriggerProactive={() => {
                  sessionRef.current?.triggerProactiveInitiative();
                }}
              />
            </div>

            {/* Quick Prompts Drawer suggestions */}
            <div className="w-full mb-3">
              <QuickPromptsDrawer
                state={state}
                onSendPrompt={handleSendPrompt}
              />
            </div>

            {/* 6 Essential Mobile Quick Actions */}
            <div className="w-full">
              <QuickActionGrid
                onSelectAction={(actionKey) => {
                  if (actionKey === 'chat') {
                    if (state === 'disconnected') {
                      handleToggleSession();
                    }
                  } else if (actionKey === 'search') {
                    setIsResearchModalOpen(true);
                  } else if (actionKey === 'camera') {
                    setCurrentTab('bscamera');
                  } else if (actionKey === 'translate') {
                    handleSendPrompt('Tamanna, mujhe translation aur language assistant features batao.');
                  } else if (actionKey === 'notes') {
                    setIsDailyPlannerOpen(true);
                  } else if (actionKey === 'reminder') {
                    setIsDailyPlannerOpen(true);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW B: AI TOOLS SCREEN */}
        {currentTab === 'tools' && (
          <ToolsScreen
            onOpenRegistry={() => setIsRegistryOpen(true)}
            onOpenChat={() => {
              setCurrentTab('home');
              if (state === 'disconnected') handleToggleSession();
            }}
            onOpenSearch={() => setIsResearchModalOpen(true)}
            onOpenCamera={(mode) => {
              if (mode === 'selfie') {
                setCameraMode('selfie');
                setIsCameraOpen(true);
              } else if (mode === 'video') {
                setCameraMode('video');
                setIsCameraOpen(true);
              } else {
                setCurrentTab('bscamera');
              }
            }}
            onOpenPlanner={() => setIsDailyPlannerOpen(true)}
            onOpenMemory={() => setIsMemoryOpen(true)}
            onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
            onOpenDeviceSettings={() => setIsDeviceSettingsOpen(true)}
            onOpenDecisionSupport={() => {
              if (!decisionData) {
                setDecisionData(DecisionEngine.getInstance().getPresetOrFallback('React Native vs Flutter for Mobile App'));
              }
              setIsDecisionModalOpen(true);
            }}
            onSendVoicePrompt={(p) => {
              setCurrentTab('home');
              handleSendPrompt(p);
            }}
          />
        )}

        {/* VIEW C: SETTINGS SCREEN */}
        {currentTab === 'settings' && (
          <UnifiedSettingsScreen
            themeMood={themeMood}
            onThemeChange={setThemeMood}
            onOpenVoiceSettings={(tab) => setIsVoiceSettingsOpen(true)}
            onOpenMemoryHub={() => setIsMemoryOpen(true)}
            onOpenDeviceSettings={() => setIsDeviceSettingsOpen(true)}
            onOpenLearningAnalytics={() => setIsLearningModalOpen(true)}
            onOpenContextPanel={() => setIsContextPanelOpen(true)}
          />
        )}

        {/* VIEW D: BS CAMERA SCANNER & MULTIMODAL VISION SCREEN */}
        {currentTab === 'bscamera' && (
          <BSCameraScreen
            onBackToHome={() => setCurrentTab('home')}
            onSendVoicePrompt={(p) => {
              setCurrentTab('home');
              handleSendPrompt(p);
            }}
          />
        )}
      </div>

      {/* 3. Fixed Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        state={state}
        onTabChange={(tab) => {
          if (tab === 'history') {
            setIsHistoryOpen(true);
          } else if (tab === 'mic') {
            handleToggleSession();
          } else {
            setCurrentTab(tab);
          }
        }}
        onMicPress={() => {
          if (state === 'speaking') {
            handleInterrupt();
          } else {
            handleToggleSession();
          }
        }}
      />
    </div>
  );
}
