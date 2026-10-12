export type ResearchMode =
  | 'quick_answer'
  | 'deep_research'
  | 'fact_check'
  | 'comparison'
  | 'current_info';

export type SourceType =
  | 'knowledge_base'
  | 'realtime_search'
  | 'verified_tool'
  | 'live_news'
  | 'internal_model';

export type ReliabilityLevel = 'verified' | 'high' | 'medium' | 'unverified';

export type FactCheckVerdict =
  | 'verified'
  | 'likely_true'
  | 'conflicting'
  | 'unverified'
  | 'false';

export interface ResearchSource {
  id: string;
  title: string;
  url?: string;
  sourceType: SourceType;
  reliability: ReliabilityLevel;
  snippet: string;
  timestamp?: number;
}

export interface SubQuestionBreakdown {
  question: string;
  answer: string;
  sources: string[];
}

export interface ComparisonPoint {
  itemA: string;
  itemB: string;
  criteria: string;
  comparison: string;
}

export interface FactCheckItem {
  claim: string;
  verdict: FactCheckVerdict;
  evidence: string[];
  uncertaintyReason?: string;
}

export interface ResearchReport {
  id: string;
  topic: string;
  mode: ResearchMode;
  directAnswer: string;
  summary: string;
  subQuestions: SubQuestionBreakdown[];
  keyFacts: string[];
  comparisons?: ComparisonPoint[];
  prosAndCons?: { pros: string[]; cons: string[] };
  factChecks?: FactCheckItem[];
  conclusion: string;
  confidence: 'high' | 'moderate' | 'uncertain';
  sources: ResearchSource[];
  isCurrentInfo: boolean;
  realtimeSearchUsed: boolean;
  verificationNote?: string;
  language: 'hindi' | 'hinglish' | 'english';
  createdAt: number;
}

export interface ResearchProgress {
  topic: string;
  step: 'idle' | 'analyzing' | 'gathering' | 'synthesizing' | 'completed' | 'failed';
  currentAction: string;
  percent: number;
}

export interface ResearchSettings {
  preferredLanguage: 'auto' | 'hinglish' | 'hindi' | 'english';
  factCheckingEnabled: boolean;
  requireSourceVerification: boolean;
  autoSaveSessionResearch: boolean;
}
