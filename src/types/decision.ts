export interface DecisionFactorRating {
  cost: number; // 1-5 (1 = inexpensive/free, 5 = costly)
  timeRequired: number; // 1-5 (1 = rapid/immediate, 5 = long/time-consuming)
  effort: number; // 1-5 (1 = easy/minimal, 5 = strenuous/high effort)
  riskLevel: 'low' | 'medium' | 'high';
  qualityOutcome: number; // 1-5 (1 = basic/satisfactory, 5 = top-tier/exceptional)
  longTermValue: number; // 1-5 (1 = temporary/fleeting, 5 = sustainable/durable)
}

export interface DecisionOptionActionStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedEffort?: string;
  toolsNeeded?: string[];
}

export interface DecisionOption {
  id: string;
  name: string;
  tagline?: string;
  pros: string[];
  cons: string[];
  risks: string[];
  ratings: DecisionFactorRating;
  shortTermConsequence: string;
  longTermConsequence: string;
  verifiedFacts?: string[];
  estimatesAndAssumptions?: string[];
  actionPlan?: DecisionOptionActionStep[];
}

export interface UserPriorityWeights {
  cost: number; // 1-5 (5 = budget is critical)
  time: number; // 1-5 (5 = speed is critical)
  effort: number; // 1-5 (5 = minimize manual effort)
  riskAvoidance: number; // 1-5 (5 = zero-risk tolerance)
  quality: number; // 1-5 (5 = maximum quality)
  longTermValue: number; // 1-5 (5 = strategic/future-proof)
}

export interface OptionScored extends DecisionOption {
  score: number; // 0 to 100%
  rank: number;
  matchHighlights: string[];
}

export interface DecisionAnalysisData {
  id: string;
  topic: string;
  mainObjective: string;
  constraints?: string[];
  missingInformation?: string[];
  clarifyingQuestions?: string[];
  options: DecisionOption[];
  userPreferences?: string;
  userWeights?: UserPriorityWeights;
  recommendedOptionId?: string;
  recommendationReasoning?: string;
  alternativeOptionId?: string;
  alternativeReasoning?: string;
  verifiedNotice?: string;
  timestamp: number;
}
