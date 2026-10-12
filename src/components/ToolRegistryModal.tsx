import React, { useState } from 'react';
import { Search, Shield, Play, CheckCircle2, AlertTriangle, Layers, Info, X, Terminal, Cpu } from 'lucide-react';
import { ToolDefinition, ToolCategory } from '../types/tools';
import { ToolRegistry } from '../services/toolRegistry';
import { NativeBridge } from '../services/nativeBridge';

interface ToolRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteTool: (name: string, args: Record<string, any>) => Promise<any>;
}

const CATEGORIES: ('All' | ToolCategory)[] = [
  'All',
  'Apps',
  'Communications',
  'Media',
  'Camera',
  'Web',
  'Device',
  'File',
  'Reminders',
  'Productivity',
  'Social',
  'Security',
  'Automation',
  'Accessibility',
  'Shopping',
  'Entertainment',
  'Health',
  'News & Weather',
  'Education',
  'Office',
  'Toolkit',
  'Advanced AI',
  'Reserved',
];

export const ToolRegistryModal: React.FC<ToolRegistryModalProps> = ({
  isOpen,
  onClose,
  onExecuteTool,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ToolCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  if (!isOpen) return null;

  const registry = ToolRegistry.getInstance();
  const allTools = registry.getAllTools();
  // Filter deduplicated by id
  const uniqueTools = Array.from(new Map(allTools.map(t => [t.id, t])).values());

  const filteredTools = uniqueTools.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const hasNativeBridge = NativeBridge.getInstance().hasAndroidBridge();

  const handleRunTool = async (tool: ToolDefinition) => {
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      // Mock standard test parameters based on parameter schema
      const sampleArgs: Record<string, any> = {};
      tool.inputParameters.forEach((p) => {
        if (p.name === 'appName') sampleArgs.appName = 'YouTube';
        else if (p.name === 'packageName') sampleArgs.packageName = 'com.google.android.youtube';
        else if (p.name === 'operation') sampleArgs.operation = 'install';
        else if (p.name === 'recipient') sampleArgs.recipient = '+15550192834';
        else if (p.name === 'message') sampleArgs.message = 'Hey from Tamanna AI!';
        else if (p.name === 'to') sampleArgs.to = 'contact@example.com';
        else if (p.name === 'subject') sampleArgs.subject = 'Tamanna Assistant Update';
        else if (p.name === 'body') sampleArgs.body = 'Meeting scheduled for 3 PM.';
        else if (p.name === 'query') sampleArgs.query = 'Cyberpunk lofi vibes';
        else if (p.name === 'action') sampleArgs.action = 'start';
        else if (p.name === 'factor') sampleArgs.factor = 2.0;
        else if (p.name === 'url') sampleArgs.url = 'https://github.com';
        else if (p.name === 'fileUrl') sampleArgs.fileUrl = 'https://example.com/demo.pdf';
        else if (p.name === 'actionType') sampleArgs.actionType = 'battery';
        else if (p.name === 'enabled') sampleArgs.enabled = true;
        else if (p.name === 'direction') sampleArgs.direction = 'increase';
        else if (p.name === 'level') sampleArgs.level = 80;
        else if (p.name === 'time') sampleArgs.time = '07:00 AM';
        else if (p.name === 'text') sampleArgs.text = 'Important review with team';
        else if (p.name === 'dateTime') sampleArgs.dateTime = 'Tomorrow at 10:00 AM';
        else if (p.name === 'title') sampleArgs.title = 'Project Launch';
        else if (p.name === 'date') sampleArgs.date = '2026-10-15';
        else if (p.name === 'eventTitle') sampleArgs.eventTitle = 'Team Standup';
        else if (p.name === 'confirmed') sampleArgs.confirmed = true;
        else if (p.name === 'seconds') sampleArgs.seconds = 60;
        else if (p.name === 'size') sampleArgs.size = 'medium';
        else if (p.name === 'listName') sampleArgs.listName = 'Grocery';
        else if (p.name === 'item') sampleArgs.item = 'Avocados';
        else if (p.name === 'task') sampleArgs.task = 'Submit PR report';
        else if (p.name === 'content') sampleArgs.content = 'Voice assistant prompt notes';
        else if (p.name === 'platform') sampleArgs.platform = 'Instagram';
        else if (p.name === 'username') sampleArgs.username = 'tamanna_ai';
        else if (p.name === 'length') sampleArgs.length = 14;
        else if (p.name === 'hasSpecial') sampleArgs.hasSpecial = true;
        else if (p.name === 'hasDigits') sampleArgs.hasDigits = true;
        else if (p.name === 'hasUpperLower') sampleArgs.hasUpperLower = true;
        else if (p.name === 'target') sampleArgs.target = 'button#refresh';
        else if (p.name === 'clicksCount') sampleArgs.clicksCount = 3;
        else if (p.name === 'incomingSender') sampleArgs.incomingSender = 'Rohit Sharma';
        else if (p.name === 'replyMessage') sampleArgs.replyMessage = 'Busy right now, will call back soon!';
        else if (p.name === 'taskName') sampleArgs.taskName = 'Daily Morning Prep';
        else if (p.name === 'routineName') sampleArgs.routineName = 'Night Routine';
        else if (p.name === 'triggerType') sampleArgs.triggerType = 'time';
        else if (p.name === 'triggerCondition') sampleArgs.triggerCondition = '10:00 PM';
        else if (p.name === 'actionSequence') sampleArgs.actionSequence = ['dim_brightness', 'set_alarm'];
        else if (p.name === 'scheduledDateTime') sampleArgs.scheduledDateTime = '2026-10-03 08:00 AM';
        else if (p.name === 'actionName') sampleArgs.actionName = 'openApp';
        else if (p.name === 'triggerName') sampleArgs.triggerName = 'Low Battery Alert';
        else if (p.name === 'eventType') sampleArgs.eventType = 'battery_threshold';
        else if (p.name === 'thresholdValue') sampleArgs.thresholdValue = 'battery <= 15%';
        else if (p.name === 'targetWorkflow') sampleArgs.targetWorkflow = 'PowerSavingMode';
        else if (p.name === 'workflowName') sampleArgs.workflowName = 'FocusMode';
        else if (p.name === 'zoomLevel') sampleArgs.zoomLevel = 3.0;
        else if (p.name === 'scale') sampleArgs.scale = 'large';
        else if (p.name === 'mode') sampleArgs.mode = 'grayscale';
        else if (p.name === 'feature') sampleArgs.feature = 'live_caption';
        else if (p.name === 'upiIdOrVpa') sampleArgs.upiIdOrVpa = 'merchant@upi';
        else if (p.name === 'amount') sampleArgs.amount = 499;
        else if (p.name === 'note') sampleArgs.note = 'Groceries order';
        else if (p.name === 'userConfirmed') sampleArgs.userConfirmed = true;
        else if (p.name === 'timeRange') sampleArgs.timeRange = 'recent';
        else if (p.name === 'movieTitle') sampleArgs.movieTitle = 'Interstellar';
        else if (p.name === 'seriesTitle') sampleArgs.seriesTitle = 'Stranger Things';
        else if (p.name === 'streamTitle') sampleArgs.streamTitle = 'ISRO Live Launch';
        else if (p.name === 'station') sampleArgs.station = 'Mirchi Top 20';
        else if (p.name === 'gameTitle') sampleArgs.gameTitle = 'Subway Surfers';
        else if (p.name === 'topic') sampleArgs.topic = 'Immunity boosting nutrition';
        else if (p.name === 'intervalMinutes') sampleArgs.intervalMinutes = 60;
        else if (p.name === 'dailyTargetMl') sampleArgs.dailyTargetMl = 2500;
        else if (p.name === 'workoutType') sampleArgs.workoutType = 'Yoga & Core';
        else if (p.name === 'scheduledTime') sampleArgs.scheduledTime = '07:00 AM';
        else if (p.name === 'activity') sampleArgs.activity = 'cycling';
        else if (p.name === 'durationMinutes') sampleArgs.durationMinutes = 45;
        else if (p.name === 'weightKg') sampleArgs.weightKg = 68;
        else if (p.name === 'poseName') sampleArgs.poseName = 'Vrikshasana (Tree Pose)';
        else if (p.name === 'focusArea') sampleArgs.focusArea = 'nutrition';
        else if (p.name === 'medicationName') sampleArgs.medicationName = 'Paracetamol';
        else if (p.name === 'location') sampleArgs.location = 'Mumbai';
        else if (p.name === 'unit') sampleArgs.unit = 'Celsius';
        else if (p.name === 'word') sampleArgs.word = 'Serendipity';
        else if (p.name === 'problem') sampleArgs.problem = 'sqrt(144) + 15 * 3';
        else if (p.name === 'formulaName') sampleArgs.formulaName = 'Kinetic Energy';
        else if (p.name === 'question') sampleArgs.question = 'Explain photosynthesis in plants';
        else if (p.name === 'folder') sampleArgs.folder = 'inbox';
        else if (p.name === 'documentName') sampleArgs.documentName = 'Quarterly_Report.pdf';
        else if (p.name === 'allowOverwrite') sampleArgs.allowOverwrite = false;
        else if (p.name === 'documentTitle') sampleArgs.documentTitle = 'Project Proposal';
        else if (p.name === 'meetingTitle') sampleArgs.meetingTitle = 'Architecture Sync';
        else if (p.name === 'fromUnit') sampleArgs.fromUnit = 'km';
        else if (p.name === 'toUnit') sampleArgs.toUnit = 'miles';
        else if (p.name === 'value') sampleArgs.value = 10;
        else if (p.name === 'fromCurrency') sampleArgs.fromCurrency = 'USD';
        else if (p.name === 'toCurrency') sampleArgs.toCurrency = 'INR';
        else if (p.name === 'dateOfBirth') sampleArgs.dateOfBirth = '2000-05-15';
        else if (p.name === 'prompt') sampleArgs.prompt = 'Cyberpunk futuristic voice interface with neon holographic waves';
        else if (p.name === 'targetLanguage') sampleArgs.targetLanguage = 'Hindi';
        else if (p.name === 'role') sampleArgs.role = 'Senior Frontend Engineer';
        else if (p.name === 'skills') sampleArgs.skills = 'React, TypeScript, Tailwind, Web Audio';
        else if (p.name === 'applicantName') sampleArgs.applicantName = 'Tamanna Companion';
        else if (p.name === 'targetCompany') sampleArgs.targetCompany = 'Google DeepMind';
        else if (p.name === 'targetRole') sampleArgs.targetRole = 'AI Experience Engineer';
      });

      const res = await onExecuteTool(tool.name, sampleArgs);
      setExecutionOutput(res);
    } catch (e: any) {
      setExecutionOutput({ success: false, error: e?.message || 'Execution error' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-950 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wider uppercase text-white flex items-center gap-2">
                <span>TAMANNA CENTRAL TOOL REGISTRY</span>
                <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full">
                  242 / 242 REGISTERED
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>Bridge Status:</span>
                <span className={hasNativeBridge ? 'text-emerald-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                  {hasNativeBridge ? 'Connected Android Native Bridge' : 'Web Intent Bridge + Hardware APIs Active'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Two-Column Grid: List on Left, Detail & Test Runner on Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Tool List */}
          <div className="md:col-span-6 border-r border-slate-800 overflow-y-auto p-3 space-y-2">
            {filteredTools.map((tool) => {
              const isSelected = selectedTool?.id === tool.id;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(tool);
                    setExecutionOutput(null);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pink-500/10 border-pink-500/60 shadow-[0_0_15px_rgba(255,45,135,0.15)]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <span>{tool.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({tool.id})</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-pink-300 border border-slate-700">
                      {tool.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300/80 line-clamp-2 mb-2">
                    {tool.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-slate-500" />
                      <span>{tool.requiredPermissions.length ? `${tool.requiredPermissions.length} perm(s)` : 'Standard'}</span>
                    </div>

                    <span
                      className={
                        tool.availabilityStatus === 'available'
                          ? 'text-emerald-400'
                          : tool.availabilityStatus === 'requires_android_bridge'
                          ? 'text-cyan-400'
                          : 'text-amber-400'
                      }
                    >
                      {tool.availabilityStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tool Inspector & Test Execution Console */}
          <div className="md:col-span-6 bg-slate-950 overflow-y-auto p-4 flex flex-col justify-between">
            {selectedTool ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-pink-400 font-bold uppercase">
                      {selectedTool.category} TOOL
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs font-mono text-slate-400">{selectedTool.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{selectedTool.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {selectedTool.description}
                  </p>
                </div>

                {/* Required Permissions */}
                <div>
                  <h4 className="text-xs font-mono tracking-wider uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-pink-400" />
                    <span>Required Permissions</span>
                  </h4>
                  {selectedTool.requiredPermissions.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTool.requiredPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-lg"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No special OS permissions required.</p>
                  )}
                </div>

                {/* Parameters */}
                <div>
                  <h4 className="text-xs font-mono tracking-wider uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Input Parameters</span>
                  </h4>
                  {selectedTool.inputParameters.length ? (
                    <div className="space-y-1.5">
                      {selectedTool.inputParameters.map((param) => (
                        <div
                          key={param.name}
                          className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl text-xs"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-mono text-pink-300 font-semibold">{param.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {param.type} {param.required ? '· required' : '· optional'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No input parameters required.</p>
                  )}
                </div>

                {/* Expected Responses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-xl">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">
                      SUCCESS SPECIFICATION
                    </span>
                    <p className="text-[11px] text-emerald-200">{selectedTool.successResponse}</p>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-xl">
                    <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">
                      ERROR SPECIFICATION
                    </span>
                    <p className="text-[11px] text-rose-200">{selectedTool.errorResponse}</p>
                  </div>
                </div>

                {/* Test Execution Output */}
                {executionOutput && (
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl animate-in fade-in">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-pink-400" />
                        <span>Execution Result</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                          executionOutput.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {executionOutput.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap overflow-x-auto bg-black/60 p-2 rounded-lg border border-white/5">
                      {JSON.stringify(executionOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Select any tool from the list to view its specifications and test run it.</p>
              </div>
            )}

            {/* Action Bar */}
            {selectedTool && (
              <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-end gap-2">
                <button
                  disabled={isExecuting}
                  onClick={() => handleRunTool(selectedTool)}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executing...' : 'Test Run Tool'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
