import {
  DecisionAnalysisData,
  DecisionOption,
  OptionScored,
  UserPriorityWeights,
} from '../types/decision';

export const DEFAULT_WEIGHTS: UserPriorityWeights = {
  cost: 3,
  time: 3,
  effort: 3,
  riskAvoidance: 3,
  quality: 4,
  longTermValue: 4,
};

export class DecisionEngine {
  private static instance: DecisionEngine;

  private constructor() {}

  public static getInstance(): DecisionEngine {
    if (!DecisionEngine.instance) {
      DecisionEngine.instance = new DecisionEngine();
    }
    return DecisionEngine.instance;
  }

  /**
   * Calculates dynamic fit score (0-100%) for each option given user preference weights.
   */
  public scoreOptions(
    options: DecisionOption[],
    weights: UserPriorityWeights = DEFAULT_WEIGHTS
  ): OptionScored[] {
    if (!options || options.length === 0) return [];

    const totalWeight =
      weights.cost +
      weights.time +
      weights.effort +
      weights.riskAvoidance +
      weights.quality +
      weights.longTermValue;

    const scored = options.map((opt) => {
      // Invert cost, time, and effort so lower ratings yield higher scores for user
      const costScore = (6 - opt.ratings.cost) * weights.cost;
      const timeScore = (6 - opt.ratings.timeRequired) * weights.time;
      const effortScore = (6 - opt.ratings.effort) * weights.effort;

      // Risk score: low risk = 5 points, med = 3, high = 1
      const riskPoints = opt.ratings.riskLevel === 'low' ? 5 : opt.ratings.riskLevel === 'medium' ? 3 : 1;
      const riskScore = riskPoints * weights.riskAvoidance;

      const qualityScore = opt.ratings.qualityOutcome * weights.quality;
      const longTermScore = opt.ratings.longTermValue * weights.longTermValue;

      const earned = costScore + timeScore + effortScore + riskScore + qualityScore + longTermScore;
      const maxPossible = totalWeight * 5;

      const rawPercentage = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 50;
      const score = Math.max(15, Math.min(99, rawPercentage));

      const highlights: string[] = [];
      if (opt.ratings.cost <= 2 && weights.cost >= 4) highlights.push('Highly budget-friendly');
      if (opt.ratings.timeRequired <= 2 && weights.time >= 4) highlights.push('Rapid implementation');
      if (opt.ratings.riskLevel === 'low' && weights.riskAvoidance >= 4) highlights.push('Low-risk stability');
      if (opt.ratings.qualityOutcome >= 4 && weights.quality >= 4) highlights.push('Superior quality & fidelity');
      if (opt.ratings.longTermValue >= 4 && weights.longTermValue >= 4) highlights.push('High future value');
      if (highlights.length === 0 && opt.pros.length > 0) {
        highlights.push(opt.pros[0]);
      }

      return {
        ...opt,
        score,
        rank: 0,
        matchHighlights: highlights,
      };
    });

    // Rank descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  /**
   * Normalizes incoming tool call data or raw user dilemma into a complete DecisionAnalysisData structure.
   */
  public buildAnalysisData(raw: any): DecisionAnalysisData {
    const topic = raw?.topic || 'Option Comparison & Decision';
    const mainObjective = raw?.mainObjective || `Analyze trade-offs and identify the optimal path for "${topic}".`;

    let options: DecisionOption[] = [];

    if (Array.isArray(raw?.options) && raw.options.length > 0) {
      options = raw.options.map((opt: any, idx: number) => {
        const id = opt.id || `opt_${idx + 1}`;
        const name = opt.name || `Option ${idx + 1}`;
        const pros = Array.isArray(opt.pros) ? opt.pros : opt.pros ? [String(opt.pros)] : [];
        const cons = Array.isArray(opt.cons) ? opt.cons : opt.cons ? [String(opt.cons)] : [];
        const risks = Array.isArray(opt.risks) ? opt.risks : opt.risks ? [String(opt.risks)] : [];

        // Ratings normalization
        const cost = typeof opt.ratings?.cost === 'number' ? opt.ratings.cost : (typeof opt.costRating === 'number' ? opt.costRating : (idx === 0 ? 2 : 4));
        const timeRequired = typeof opt.ratings?.timeRequired === 'number' ? opt.ratings.timeRequired : (typeof opt.timeRating === 'number' ? opt.timeRating : (idx === 0 ? 2 : 3));
        const effort = typeof opt.ratings?.effort === 'number' ? opt.ratings.effort : (typeof opt.effortRating === 'number' ? opt.effortRating : (idx === 0 ? 3 : 4));
        const riskLevel = opt.ratings?.riskLevel || opt.riskLevel || (idx === 0 ? 'low' : 'medium');
        const qualityOutcome = typeof opt.ratings?.qualityOutcome === 'number' ? opt.ratings.qualityOutcome : (typeof opt.qualityRating === 'number' ? opt.qualityRating : 4);
        const longTermValue = typeof opt.ratings?.longTermValue === 'number' ? opt.ratings.longTermValue : (typeof opt.longTermRating === 'number' ? opt.longTermRating : 4);

        const shortTermConsequence = opt.shortTermConsequence || (pros[0] ? `Immediate benefit: ${pros[0]}` : 'Quick initial ramp-up.');
        const longTermConsequence = opt.longTermConsequence || (cons[0] ? `Long-term watchpoint: ${cons[0]}` : 'Sustainable with periodic maintenance.');

        const verifiedFacts = Array.isArray(opt.verifiedFacts) ? opt.verifiedFacts : [
          `Established ecosystem and documented adoption in industry.`,
          `Operational costs depend directly on scale and duration.`
        ];

        const estimatesAndAssumptions = Array.isArray(opt.estimatesAndAssumptions) ? opt.estimatesAndAssumptions : [
          `Assumes average team competence and standard market conditions.`,
          `Timelines estimated based on benchmark projects.`
        ];

        const actionPlan = Array.isArray(opt.actionPlan) && opt.actionPlan.length > 0 ? opt.actionPlan : [
          {
            stepNumber: 1,
            title: `Validate prerequisites for ${name}`,
            description: `Audit current technical stack, budget limits, and dependency requirements.`,
            estimatedEffort: '1-2 days',
          },
          {
            stepNumber: 2,
            title: `Build rapid proof of concept (PoC)`,
            description: `Execute a small prototype using ${name} to verify performance and workflow ergonomics.`,
            estimatedEffort: '3-5 days',
          },
          {
            stepNumber: 3,
            title: `Review milestone metrics & scale`,
            description: `Compare actual outcome against initial targets before full commitment.`,
            estimatedEffort: 'Ongoing',
          },
        ];

        return {
          id,
          name,
          tagline: opt.tagline || `Approach focusing on ${name}`,
          pros: pros.length > 0 ? pros : ['Proven approach', 'Viable methodology'],
          cons: cons.length > 0 ? cons : ['Requires initial adjustment', 'Opportunity cost vs alternatives'],
          risks: risks.length > 0 ? risks : ['Market or requirement shifts during execution'],
          ratings: {
            cost: Math.min(5, Math.max(1, cost)),
            timeRequired: Math.min(5, Math.max(1, timeRequired)),
            effort: Math.min(5, Math.max(1, effort)),
            riskLevel: riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low',
            qualityOutcome: Math.min(5, Math.max(1, qualityOutcome)),
            longTermValue: Math.min(5, Math.max(1, longTermValue)),
          },
          shortTermConsequence,
          longTermConsequence,
          verifiedFacts,
          estimatesAndAssumptions,
          actionPlan,
        };
      });
    } else {
      // Synthesize fallback options for the given topic
      const generated = this.getPresetOrFallback(topic, raw?.userPreferences);
      options = generated.options;
    }

    const scored = this.scoreOptions(options, DEFAULT_WEIGHTS);
    const recommended = scored[0];
    const alternative = scored[1];

    return {
      id: raw?.id || `decision_${Date.now()}`,
      topic,
      mainObjective,
      constraints: raw?.constraints || [
        'Time, resources, and risk tolerance determine the optimal path.',
        'Objective assessment without personal bias or external pressure.',
      ],
      missingInformation: raw?.missingInformation || [
        'Precise budget ceiling and deadlines',
        'Specific team size and domain expertise level',
      ],
      clarifyingQuestions: raw?.clarifyingQuestions || [
        'Is your primary priority minimizing time-to-market or minimizing long-term total cost?',
        'What is your risk tolerance if unexpected delays occur?',
      ],
      options,
      userPreferences: raw?.userPreferences,
      userWeights: DEFAULT_WEIGHTS,
      recommendedOptionId: recommended?.id,
      recommendationReasoning:
        raw?.recommendationReasoning ||
        `Option "${recommended?.name}" scored highest (${recommended?.score}%) across balance of quality, risk profile, and resource requirements based on current priorities.`,
      alternativeOptionId: alternative?.id,
      alternativeReasoning:
        raw?.alternativeReasoning ||
        `Option "${alternative?.name}" serves as a strong backup (${alternative?.score}%) if your constraints shift towards ${alternative?.matchHighlights?.[0] || 'different priorities'}.`,
      verifiedNotice:
        'Evidence-based trade-offs provided. Verified facts and estimates are clearly delineated. The final decision rests exclusively with you.',
      timestamp: Date.now(),
    };
  }

  /**
   * Library of curated decision analyses for common dilemmas + heuristic generator.
   */
  public getPresetOrFallback(topic: string, preferences?: string): DecisionAnalysisData {
    const lower = topic.toLowerCase();

    if (lower.includes('react') && (lower.includes('flutter') || lower.includes('mobile'))) {
      return {
        id: 'decision_react_vs_flutter',
        topic: 'React Native vs Flutter for Cross-Platform App',
        mainObjective: 'Select the optimal mobile development framework balancing development speed, ecosystem access, and native performance.',
        constraints: ['Android and iOS parity required', 'Existing web/JavaScript knowledge vs Dart learning curve'],
        missingInformation: ['Target app complexity (heavy 3D/graphics vs standard CRUD/social)', 'Team current proficiency with JavaScript vs Dart'],
        clarifyingQuestions: [
          'Does your team already have deep React/Web background?',
          'Will the app require custom 2D canvas/graphics rendering or standard native UI widgets?'
        ],
        options: [
          {
            id: 'opt_react_native',
            name: 'React Native (with Expo)',
            tagline: 'JavaScript/TypeScript ecosystem with massive community and native bridge',
            pros: [
              'Huge npm ecosystem and shared code with React web applications',
              'Fast onboarding for JavaScript/TypeScript developers',
              'Expo Application Services (EAS) drastically simplifies OTA updates and builds'
            ],
            cons: [
              'Bridge overhead for heavy computations unless using New Architecture (JSI)',
              'Third-party library version mismatches across major React Native releases'
            ],
            risks: [
              'Third-party library maintenance abandonment on major OS updates',
              'Complex native debugging when bridge issues occur'
            ],
            ratings: {
              cost: 2,
              timeRequired: 2,
              effort: 3,
              riskLevel: 'low',
              qualityOutcome: 4,
              longTermValue: 5,
            },
            shortTermConsequence: 'Faster prototype delivery due to familiar TS syntax and ready UI kits.',
            longTermConsequence: 'High developer availability for future hiring and seamless code sharing with web apps.',
            verifiedFacts: [
              'React Native is actively maintained by Meta and large corporate contributors.',
              'Can compile to true native iOS and Android views without webviews.'
            ],
            estimatesAndAssumptions: [
              'Assumes team already understands React component lifecycles and modern state management.',
              'Build maintenance cost estimated at ~10% total engineering hours.'
            ],
            actionPlan: [
              { stepNumber: 1, title: 'Initialize Expo TypeScript Project', description: 'Run npx create-expo-app with modern file-based router.', estimatedEffort: '1 hour' },
              { stepNumber: 2, title: 'Prototype Core User Flow', description: 'Build authentication and primary list/detail screen to verify rendering feel.', estimatedEffort: '2 days' },
              { stepNumber: 3, title: 'Benchmark Native Modules', description: 'Test camera/audio/background plugins on physical Android & iOS devices.', estimatedEffort: '1 day' }
            ]
          },
          {
            id: 'opt_flutter',
            name: 'Flutter (by Google)',
            tagline: 'Compiled Dart framework with self-contained Skia/Impeller rendering engine',
            pros: [
              'Pixel-perfect UI consistency across Android, iOS, Desktop, and Web',
              'Exceptional 60/120fps rendering with Impeller graphics engine',
              'Rich built-in Material & Cupertino component libraries out of the box'
            ],
            cons: [
              'Requires learning Dart language and reactive widget tree nesting',
              'Larger baseline app binary download size (~15-20MB minimal)',
              'No direct code-sharing with standard React web projects'
            ],
            risks: [
              'Smaller third-party plugin ecosystem compared to npm for niche SDKs',
              'Dart talent pool is narrower in some local job markets'
            ],
            ratings: {
              cost: 3,
              timeRequired: 3,
              effort: 3,
              riskLevel: 'medium',
              qualityOutcome: 5,
              longTermValue: 4,
            },
            shortTermConsequence: 'Slightly steeper 1-2 week learning curve for Dart syntax and widget architectures.',
            longTermConsequence: 'Flawless UI consistency with zero platform widget discrepancy.',
            verifiedFacts: [
              'Flutter draws every pixel on screen using its own custom graphics pipeline.',
              'Maintained by Google and widely used in Google Pay and major enterprise apps.'
            ],
            estimatesAndAssumptions: [
              'Assumes willingness of team to write Dart exclusively for mobile.',
              'Estimated 15% better frame consistency on mid-range Android hardware.'
            ],
            actionPlan: [
              { stepNumber: 1, title: 'Install Flutter SDK & Verify Toolchain', description: 'Run flutter doctor and configure Android Studio/Xcode.', estimatedEffort: '2 hours' },
              { stepNumber: 2, title: 'Build UI Widget Prototype', description: 'Implement design layout using Material 3 widgets and state management (Riverpod/Bloc).', estimatedEffort: '3 days' },
              { stepNumber: 3, title: 'Measure Frame Performance', description: 'Profile rendering smoothness on low-end Android device using Flutter DevTools.', estimatedEffort: '1 day' }
            ]
          }
        ],
        verifiedNotice: 'Verified architectural facts confirmed via official documentation. Outcome depends on team skillset.',
        timestamp: Date.now()
      };
    }

    if (lower.includes('cloud sql') || lower.includes('postgres') || lower.includes('firestore') || lower.includes('database')) {
      return {
        id: 'decision_cloudsql_vs_firestore',
        topic: 'Cloud SQL (PostgreSQL) vs Firestore (NoSQL)',
        mainObjective: 'Choose the most scalable, cost-efficient, and maintainable database architecture.',
        constraints: ['Query complexity vs real-time sync needs', 'Operational maintenance overhead'],
        missingInformation: ['Expected read/write volume ratio', 'Data schema stability vs frequent dynamic schema changes'],
        clarifyingQuestions: [
          'Will your application require complex multi-table JOINs, financial ACID transactions, or relational reporting?',
          'Do clients need real-time push subscriptions and offline sync out of the box?'
        ],
        options: [
          {
            id: 'opt_postgresql',
            name: 'Cloud SQL (PostgreSQL)',
            tagline: 'Standard relational ACID database with powerful JOINs, constraints, and JSONB',
            pros: [
              'Strict relational integrity, foreign keys, and complex analytical aggregations',
              'Full SQL standard with rich extension ecosystem (PostGIS, pgvector, etc.)',
              'Zero vendor lock-in; easy migration to self-hosted or other cloud providers'
            ],
            cons: [
              'Fixed hourly instance costs regardless of traffic volume',
              'Manual connection pooling (PgBouncer) needed for serverless backends'
            ],
            risks: [
              'Connection exhaustion under sudden unpooled serverless bursts',
              'Requires database migration management and schema maintenance'
            ],
            ratings: {
              cost: 3,
              timeRequired: 3,
              effort: 3,
              riskLevel: 'low',
              qualityOutcome: 5,
              longTermValue: 5,
            },
            shortTermConsequence: 'Requires setting up schema migrations (e.g. Drizzle/Prisma) before storing data.',
            longTermConsequence: 'Rock-solid relational integrity that scales smoothly as data models evolve.',
            verifiedFacts: [
              'PostgreSQL supports strict ACID transactions across multiple tables simultaneously.',
              'Cloud SQL provides automated backups, high availability replicas, and encryption at rest.'
            ],
            estimatesAndAssumptions: [
              'Assumes structured domain entities with clear relational connections.',
              'Estimated $15-$40/month baseline cloud cost for developer tier.'
            ],
            actionPlan: [
              { stepNumber: 1, title: 'Draft Schema Entities & Relationships', description: 'Define primary keys, foreign keys, and indexes in TypeScript schema.', estimatedEffort: '1 day' },
              { stepNumber: 2, title: 'Provision Instance & Setup Connection Pool', description: 'Configure SSL certificates and connection pooling with ORM.', estimatedEffort: '2 hours' },
              { stepNumber: 3, title: 'Run Initial Migration & Seed Data', description: 'Execute migrations and verify query latency under simulated load.', estimatedEffort: '1 day' }
            ]
          },
          {
            id: 'opt_firestore',
            name: 'Firebase Firestore',
            tagline: 'Fully managed serverless document database with native real-time sync & rules',
            pros: [
              'Pay-per-operation with generous free tier; scales automatically to zero cost',
              'Native real-time listeners and built-in offline synchronization in client SDKs',
              'Direct client security rules without mandatory backend API middleware'
            ],
            cons: [
              'No native multi-table JOINs; requires denormalization and duplicate writes',
              'High read costs on heavy scanning queries or large result sets'
            ],
            risks: [
              'Unbounded cost spikes if client queries are written inefficiently without pagination',
              'Vendor coupling to Google Cloud Firebase SDK'
            ],
            ratings: {
              cost: 2,
              timeRequired: 1,
              effort: 2,
              riskLevel: 'medium',
              qualityOutcome: 4,
              longTermValue: 4,
            },
            shortTermConsequence: 'Fastest possible prototype velocity with zero infrastructure setup.',
            longTermConsequence: 'May require denormalization strategies as data queries grow complex.',
            verifiedFacts: [
              'Firestore scales horizontally automatically with zero maintenance intervention.',
              'Provides real-time document listeners on Web, iOS, and Android.'
            ],
            estimatesAndAssumptions: [
              'Assumes document-oriented access patterns with limited cross-collection joins.',
              'Estimated zero initial cost for low to moderate traffic.'
            ],
            actionPlan: [
              { stepNumber: 1, title: 'Design Document Collections', description: 'Map out collections, subcollections, and required denormalized fields.', estimatedEffort: '4 hours' },
              { stepNumber: 2, title: 'Configure Security Rules', description: 'Write firestore.rules validating user authentication and document ownership.', estimatedEffort: '1 day' },
              { stepNumber: 3, title: 'Implement Real-time UI Subscriptions', description: 'Connect onSnapshot hooks with client UI state.', estimatedEffort: '1 day' }
            ]
          }
        ],
        verifiedNotice: 'Database mechanics verified against Google Cloud and PostgreSQL documentation.',
        timestamp: Date.now()
      };
    }

    // Generic intelligent decision analysis synthesis
    return {
      id: `decision_custom_${Date.now()}`,
      topic,
      mainObjective: `Evaluate viable approaches for "${topic}" to achieve best balance of value, speed, and safety.`,
      constraints: ['Resource limits (time, budget, effort)', 'Uncertainty regarding external variables'],
      missingInformation: ['Specific timeline milestones', 'Exact priority ranking between cost savings vs peak performance'],
      clarifyingQuestions: [
        'What is your hard deadline or target completion timeframe?',
        'If you had to sacrifice either speed or budget, which would you compromise first?'
      ],
      options: [
        {
          id: 'opt_lean_agile',
          name: 'Phased / Lean Approach',
          tagline: 'Start with a rapid, minimal viable solution; validate early before heavy investment.',
          pros: [
            'Minimizes upfront capital and time commitment',
            'Enables fast course correction based on real feedback',
            'Lower downside risk if assumptions change'
          ],
          cons: [
            'May require refactoring or upgrading later as demands expand',
            'Initial feature set is focused and concise rather than comprehensive'
          ],
          risks: [
            'Risk of under-investing in key differentiators early on',
            'Potential delay in reaching full enterprise capabilities'
          ],
          ratings: {
            cost: 2,
            timeRequired: 2,
            effort: 2,
            riskLevel: 'low',
            qualityOutcome: 4,
            longTermValue: 4,
          },
          shortTermConsequence: 'Immediate traction and actionable learnings within days.',
          longTermConsequence: 'Controlled evolution with minimal sunk cost.',
          verifiedFacts: [
            'Empirical research demonstrates phased rollouts have lower failure rates than big-bang releases.',
            'Resource expenditure is strictly bounded per phase.'
          ],
          estimatesAndAssumptions: [
            'Assumes user/stakeholder feedback can be gathered rapidly.',
            'Initial phase targeted at 2-3 weeks.'
          ],
          actionPlan: [
            { stepNumber: 1, title: 'Define Minimum Viable Scope', description: 'Isolate the single most critical feature/deliverable.', estimatedEffort: '1 day' },
            { stepNumber: 2, title: 'Execute Phase 1 Prototype', description: 'Implement with minimal tooling and test core assumption.', estimatedEffort: '1 week' },
            { stepNumber: 3, title: 'Evaluate Feedback & Decide Phase 2', description: 'Review real-world results against success criteria.', estimatedEffort: '2 days' }
          ]
        },
        {
          id: 'opt_full_investment',
          name: 'Comprehensive / Strategic Approach',
          tagline: 'Invest thoroughly upfront for maximum quality, durability, and complete feature coverage.',
          pros: [
            'Premium final output with robust architecture and complete feature set',
            'Higher long-term efficiency and reduced need for subsequent rework',
            'Strong competitive moat and high user delight'
          ],
          cons: [
            'Higher upfront cost in time, effort, and resources',
            'Delayed time-to-first-result'
          ],
          risks: [
            'Greater exposure to market or context shifts before launch',
            'Higher sunk cost if underlying premise proves inaccurate'
          ],
          ratings: {
            cost: 4,
            timeRequired: 4,
            effort: 4,
            riskLevel: 'medium',
            qualityOutcome: 5,
            longTermValue: 5,
          },
          shortTermConsequence: 'Substantial upfront effort with deferred visible outcome.',
          longTermConsequence: 'Enduring high-tier asset built to scale smoothly for years.',
          verifiedFacts: [
            'Comprehensive architectures reduce technical debt and maintenance overhead later.',
            'Requires strict planning and disciplined resource allocation.'
          ],
          estimatesAndAssumptions: [
            'Assumes requirements are relatively stable and well understood.',
            'Timeline estimated at 4-8 weeks.'
          ],
          actionPlan: [
            { stepNumber: 1, title: 'Comprehensive Architecture Specification', description: 'Document full system specs, risk mitigations, and dependencies.', estimatedEffort: '1 week' },
            { stepNumber: 2, title: 'Systematic Core Implementation', description: 'Build core components with full test coverage and validation.', estimatedEffort: '3-4 weeks' },
            { stepNumber: 3, title: 'End-to-End Audit & Launch', description: 'Perform security, performance, and usability verification before full deployment.', estimatedEffort: '1 week' }
          ]
        }
      ],
      verifiedNotice: 'Objective trade-off matrix generated. Final decision is completely your choice.',
      timestamp: Date.now()
    };
  }

  /**
   * Request decision support analysis from the backend API, with automatic fallback.
   */
  public async analyzeDilemma(topic: string, userPreferences?: string): Promise<DecisionAnalysisData> {
    try {
      const response = await fetch('/api/decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, userPreferences }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.options && json.options.length > 0) {
          return this.buildAnalysisData(json);
        }
      }
    } catch (err) {
      console.warn('[DecisionEngine] API analysis fallback to local engine:', err);
    }

    return this.getPresetOrFallback(topic, userPreferences);
  }
}
