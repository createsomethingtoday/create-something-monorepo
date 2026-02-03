/**
 * Weight Tuning Script for Bayesian Evidence Weights
 * 
 * This script performs a grid search to find optimal evidence weights
 * for the Bayesian confidence calculation by testing against known cases.
 * 
 * Usage:
 *   npx tsx scripts/weight-tuning.ts
 * 
 * Requirements:
 *   - AIRTABLE_API_KEY environment variable
 *   - Worker must be deployed with /compute/confidence endpoint
 */

import Airtable from 'airtable';

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_URL = 'https://plagiarism-agent.createsomething.workers.dev';

// Current default weights (for baseline comparison)
const DEFAULT_WEIGHTS = {
  cssSimilarity: 0.25,
  jsSimilarity: 0.20,
  structuralSimilarity: 0.15,
  frameworkMatch: 0.15,
  animationMatch: 0.10,
  colorMatch: 0.05,
  pageRankDiff: 0.10
};

// Weight search space (each weight can take these values)
const WEIGHT_OPTIONS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];

// Verdict thresholds to test
const THRESHOLD_OPTIONS = {
  no_plagiarism: [0.3, 0.35, 0.4, 0.45],
  possible: [0.5, 0.55, 0.6, 0.65],
  definite: [0.7, 0.75, 0.8]
};

// Map Airtable decision values to normalized decisions
const DECISION_MAP: Record<string, 'major' | 'minor' | 'no_violation' | null> = {
  'Major violation': 'major',
  'Minor violation': 'minor',
  'No violation': 'no_violation',
  'Delisted template': 'major',
  'Notified Creator(s)': 'minor',
};

// =============================================================================
// TYPES
// =============================================================================

interface LabeledCase {
  recordId: string;
  humanDecision: 'major' | 'minor' | 'no_violation';
  offendingUrl: string;
  offendedUrl: string;
  offendingTemplateId?: string;
  offendedTemplateId?: string;
}

interface Evidence {
  cssSimilarity: number;
  jsSimilarity: number;
  structuralSimilarity: number;
  frameworkMatch: number;
  animationMatch: number;
  colorMatch: number;
  pageRankDiff: number;
}

interface WeightConfig {
  cssSimilarity: number;
  jsSimilarity: number;
  structuralSimilarity: number;
  frameworkMatch: number;
  animationMatch: number;
  colorMatch: number;
  pageRankDiff: number;
}

interface TuningResult {
  weights: WeightConfig;
  thresholds: { no_plagiarism: number; possible: number; definite: number };
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: { TP: number; FP: number; TN: number; FN: number };
}

// =============================================================================
// BAYESIAN CALCULATION (local copy for grid search)
// =============================================================================

function calculateBayesianConfidence(
  evidence: Evidence,
  weights: WeightConfig,
  thresholds: { cssSimilarity: number; jsSimilarity: number; structuralSimilarity: number; frameworkMatch: number; animationMatch: number; colorMatch: number; pageRankDiff: number },
  prior: number = 0.15
): { probability: number; verdict: string } {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [name, weight] of Object.entries(weights)) {
    const value = evidence[name as keyof Evidence] ?? 0;
    const threshold = thresholds[name as keyof typeof thresholds] ?? 0.5;
    
    const normalizedValue = Math.min(1, value / threshold);
    const contribution = weight * normalizedValue;
    
    totalWeight += weight;
    weightedSum += contribution;
  }
  
  const likelihood = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const logOdds = Math.log(prior / (1 - prior)) + 3 * (likelihood - 0.5);
  const probability = 1 / (1 + Math.exp(-logOdds));
  
  return { probability, verdict: 'calculated' };
}

function getVerdict(
  probability: number,
  verdictThresholds: { no_plagiarism: number; possible: number; definite: number }
): 'no_plagiarism' | 'possible' | 'likely' | 'definite' {
  if (probability < verdictThresholds.no_plagiarism) return 'no_plagiarism';
  if (probability < verdictThresholds.possible) return 'possible';
  if (probability < verdictThresholds.definite) return 'likely';
  return 'definite';
}

function verdictToDecision(verdict: string): 'major' | 'minor' | 'no_violation' {
  if (verdict === 'definite' || verdict === 'likely') return 'major';
  if (verdict === 'possible') return 'minor';
  return 'no_violation';
}

// =============================================================================
// AIRTABLE FETCH
// =============================================================================

async function fetchLabeledCases(): Promise<LabeledCase[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || 'appr9Ws3qU2ivrGbC';
  const tableId = process.env.AIRTABLE_TABLE_ID || 'tblKcOdBV5c7L2sro';

  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY environment variable required');
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const cases: LabeledCase[] = [];

  console.log('Fetching labeled cases from Airtable...');

  await new Promise<void>((resolve, reject) => {
    base(tableId)
      .select({
        filterByFormula: "OR({Decision} != '', {Outcome} != '')",
        fields: [
          'Decision',
          'Outcome',
          'Preview URL of Offending Template',
          'Preview URL of Offended Template',
        ],
        maxRecords: 100,
      })
      .eachPage(
        (records, fetchNextPage) => {
          for (const record of records) {
            const decision = record.get('Decision') as string | undefined;
            const outcome = record.get('Outcome') as string | undefined;
            const humanDecision = DECISION_MAP[decision || ''] || DECISION_MAP[outcome || ''] || null;

            if (humanDecision) {
              cases.push({
                recordId: record.id,
                humanDecision,
                offendingUrl: record.get('Preview URL of Offending Template') as string || '',
                offendedUrl: record.get('Preview URL of Offended Template') as string || '',
              });
            }
          }
          fetchNextPage();
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
  });

  // Filter to cases with both URLs
  const validCases = cases.filter(c => c.offendingUrl && c.offendedUrl);
  console.log(`Found ${validCases.length} labeled cases with URLs`);
  return validCases;
}

// =============================================================================
// FETCH EVIDENCE FROM WORKER
// =============================================================================

async function fetchEvidenceForCase(
  offendingUrl: string,
  offendedUrl: string
): Promise<Evidence | null> {
  try {
    // First, we need template IDs from URLs
    // Try to scan both templates to get their IDs
    const [offendingScan, offendedScan] = await Promise.all([
      fetch(`${WORKER_URL}/scan/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: offendingUrl }),
      }),
      fetch(`${WORKER_URL}/scan/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: offendedUrl }),
      }),
    ]);

    const offendingResult = await offendingScan.json() as any;
    const offendedResult = await offendedScan.json() as any;

    // Extract template IDs from URLs (simplified)
    const offendingId = extractTemplateId(offendingUrl);
    const offendedId = extractTemplateId(offendedUrl);

    if (!offendingId || !offendedId) {
      return null;
    }

    // Fetch confidence which contains evidence
    const confidenceResponse = await fetch(`${WORKER_URL}/compute/confidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        urlA: offendingUrl,
        urlB: offendedUrl
      }),
    });

    if (!confidenceResponse.ok) {
      return null;
    }

    const confidence = await confidenceResponse.json() as any;
    
    if (confidence.excluded) {
      return null; // Skip excluded pairs
    }

    return {
      cssSimilarity: confidence.evidence?.cssSimilarity ?? 0,
      jsSimilarity: confidence.evidence?.jsSimilarity ?? 0,
      structuralSimilarity: confidence.evidence?.structuralSimilarity ?? 0,
      frameworkMatch: confidence.evidence?.frameworkMatch ?? 0,
      animationMatch: confidence.evidence?.animationMatch ?? 0,
      colorMatch: confidence.evidence?.colorMatch ?? 0,
      pageRankDiff: confidence.evidence?.pageRankDiff ?? 0,
    };

  } catch (error) {
    return null;
  }
}

function extractTemplateId(url: string): string | null {
  // Extract template ID from webflow.io URL
  const match = url.match(/https?:\/\/([^.]+)\.webflow\.io/);
  return match ? match[1] : null;
}

// =============================================================================
// GRID SEARCH
// =============================================================================

function evaluateWeights(
  cases: Array<{ humanDecision: string; evidence: Evidence }>,
  weights: WeightConfig,
  verdictThresholds: { no_plagiarism: number; possible: number; definite: number }
): { accuracy: number; precision: number; recall: number; f1: number; confusionMatrix: { TP: number; FP: number; TN: number; FN: number } } {
  const defaultThresholds = {
    cssSimilarity: 0.7,
    jsSimilarity: 0.6,
    structuralSimilarity: 0.7,
    frameworkMatch: 0.8,
    animationMatch: 0.5,
    colorMatch: 0.8,
    pageRankDiff: 0.3
  };

  let TP = 0, FP = 0, TN = 0, FN = 0;

  for (const { humanDecision, evidence } of cases) {
    const { probability } = calculateBayesianConfidence(evidence, weights, defaultThresholds);
    const verdict = getVerdict(probability, verdictThresholds);
    const predictedDecision = verdictToDecision(verdict);

    // Binary: major = positive
    const actualPositive = humanDecision === 'major';
    const predictedPositive = predictedDecision === 'major';

    if (actualPositive && predictedPositive) TP++;
    else if (!actualPositive && predictedPositive) FP++;
    else if (!actualPositive && !predictedPositive) TN++;
    else FN++;
  }

  const precision = TP / (TP + FP) || 0;
  const recall = TP / (TP + FN) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;
  const accuracy = (TP + TN) / cases.length || 0;

  return { accuracy, precision, recall, f1, confusionMatrix: { TP, FP, TN, FN } };
}

function* generateWeightCombinations(): Generator<WeightConfig> {
  // Simplified: test variations of main weights only
  const cssOptions = [0.20, 0.25, 0.30];
  const jsOptions = [0.15, 0.20, 0.25];
  const structuralOptions = [0.10, 0.15, 0.20];
  
  for (const css of cssOptions) {
    for (const js of jsOptions) {
      for (const structural of structuralOptions) {
        // Distribute remaining weight among other factors
        const remaining = 1 - css - js - structural;
        if (remaining < 0.2) continue; // Need at least 20% for other factors
        
        yield {
          cssSimilarity: css,
          jsSimilarity: js,
          structuralSimilarity: structural,
          frameworkMatch: remaining * 0.4,
          animationMatch: remaining * 0.25,
          colorMatch: remaining * 0.1,
          pageRankDiff: remaining * 0.25
        };
      }
    }
  }
}

function* generateThresholdCombinations(): Generator<{ no_plagiarism: number; possible: number; definite: number }> {
  for (const np of THRESHOLD_OPTIONS.no_plagiarism) {
    for (const p of THRESHOLD_OPTIONS.possible) {
      for (const d of THRESHOLD_OPTIONS.definite) {
        if (np < p && p < d) {
          yield { no_plagiarism: np, possible: p, definite: d };
        }
      }
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WEIGHT TUNING: Bayesian Evidence Weights');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Fetch labeled cases
  const labeledCases = await fetchLabeledCases();

  if (labeledCases.length === 0) {
    console.log('No labeled cases found. Exiting.');
    return;
  }

  // 2. Fetch evidence for each case
  console.log('Fetching evidence for each case (this may take a while)...');
  const casesWithEvidence: Array<{ humanDecision: string; evidence: Evidence }> = [];

  for (const lc of labeledCases.slice(0, 20)) { // Limit for speed
    console.log(`  Processing ${lc.recordId}...`);
    const evidence = await fetchEvidenceForCase(lc.offendingUrl, lc.offendedUrl);
    if (evidence) {
      casesWithEvidence.push({ humanDecision: lc.humanDecision, evidence });
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limiting
  }

  console.log(`Got evidence for ${casesWithEvidence.length} cases`);
  console.log('');

  if (casesWithEvidence.length < 5) {
    console.log('Not enough cases with evidence. Need at least 5.');
    return;
  }

  // 3. Evaluate baseline (default weights)
  console.log('Evaluating baseline (default weights)...');
  const baselineThresholds = { no_plagiarism: 0.4, possible: 0.65, definite: 0.75 };
  const baseline = evaluateWeights(casesWithEvidence, DEFAULT_WEIGHTS, baselineThresholds);
  console.log(`  Baseline F1: ${(baseline.f1 * 100).toFixed(1)}%`);
  console.log(`  Precision: ${(baseline.precision * 100).toFixed(1)}%, Recall: ${(baseline.recall * 100).toFixed(1)}%`);
  console.log('');

  // 4. Grid search
  console.log('Running grid search...');
  let bestResult: TuningResult | null = null;
  let combinations = 0;

  for (const weights of generateWeightCombinations()) {
    for (const thresholds of generateThresholdCombinations()) {
      combinations++;
      const result = evaluateWeights(casesWithEvidence, weights, thresholds);
      
      if (!bestResult || result.f1 > bestResult.f1) {
        bestResult = { weights, thresholds, ...result };
      }
    }
  }

  console.log(`Evaluated ${combinations} combinations`);
  console.log('');

  // 5. Report best result
  if (bestResult) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  OPTIMAL CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('WEIGHTS:');
    for (const [key, value] of Object.entries(bestResult.weights)) {
      console.log(`  ${key}: ${(value * 100).toFixed(0)}%`);
    }
    console.log('');
    console.log('THRESHOLDS:');
    console.log(`  no_plagiarism: ${bestResult.thresholds.no_plagiarism}`);
    console.log(`  possible: ${bestResult.thresholds.possible}`);
    console.log(`  definite: ${bestResult.thresholds.definite}`);
    console.log('');
    console.log('METRICS:');
    console.log(`  F1 Score:  ${(bestResult.f1 * 100).toFixed(1)}%`);
    console.log(`  Precision: ${(bestResult.precision * 100).toFixed(1)}%`);
    console.log(`  Recall:    ${(bestResult.recall * 100).toFixed(1)}%`);
    console.log(`  Accuracy:  ${(bestResult.accuracy * 100).toFixed(1)}%`);
    console.log('');
    console.log('CONFUSION MATRIX:');
    console.log(`  TP: ${bestResult.confusionMatrix.TP}, FP: ${bestResult.confusionMatrix.FP}`);
    console.log(`  FN: ${bestResult.confusionMatrix.FN}, TN: ${bestResult.confusionMatrix.TN}`);
    console.log('');
    
    // Show improvement over baseline
    const improvement = ((bestResult.f1 - baseline.f1) / baseline.f1 * 100);
    console.log(`IMPROVEMENT: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% F1 over baseline`);
  }
}

main().catch(console.error);
