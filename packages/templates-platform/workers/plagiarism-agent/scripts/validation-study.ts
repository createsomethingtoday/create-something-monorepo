/**
 * Validation Study: Plagiarism Detection Accuracy
 * 
 * This script measures the precision/recall of vector similarity
 * for plagiarism detection by comparing agent decisions against
 * human-labeled cases from Airtable.
 * 
 * Usage:
 *   npx tsx scripts/validation-study.ts
 * 
 * Requirements:
 *   - AIRTABLE_API_KEY environment variable
 *   - AIRTABLE_BASE_ID environment variable
 *   - AIRTABLE_TABLE_ID environment variable
 */

import Airtable from 'airtable';

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_URL = 'https://plagiarism-agent.createsomething.workers.dev';

// Map Airtable decision values to normalized decisions
const DECISION_MAP: Record<string, 'major' | 'minor' | 'no_violation' | null> = {
  'Major violation': 'major',
  'Minor violation': 'minor',
  'No violation': 'no_violation',
  'Delisted template': 'major', // Outcome implies major
  'Notified Creator(s)': 'minor', // Outcome implies minor
};

// =============================================================================
// TYPES
// =============================================================================

interface AirtableCase {
  recordId: string;
  humanDecision: 'major' | 'minor' | 'no_violation' | null;
  humanExtent: string | null;
  humanTransformation: string | null;
  humanImportance: string | null;
  humanImpact: string | null;
  offendingUrl: string;
  offendedUrl: string;
  complaint: string;
  createdAt: string;
}

interface AgentResult {
  decision: 'major' | 'minor' | 'no_violation';
  confidence: number;
  vectorSimilarity?: {
    html_similarity: number;
    css_similarity: number;
    js_similarity: number;
    webflow_similarity: number;
    dom_similarity: number;
    overall: number;
    verdict: string;
  };
  reasoning?: string;
}

interface ValidationResult {
  recordId: string;
  humanDecision: string | null;
  agentDecision: string;
  agentConfidence: number;
  vectorOverall: number | null;
  vectorVerdict: string | null;
  match: boolean;
  category: 'TP' | 'FP' | 'TN' | 'FN' | 'SKIPPED';
}

// =============================================================================
// AIRTABLE FETCH
// =============================================================================

async function fetchHumanLabeledCases(): Promise<AirtableCase[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || 'appr9Ws3qU2ivrGbC';
  const tableId = process.env.AIRTABLE_TABLE_ID || 'tblKcOdBV5c7L2sro';

  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY environment variable required');
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const cases: AirtableCase[] = [];

  console.log('Fetching human-labeled cases from Airtable...');

  await new Promise<void>((resolve, reject) => {
    base(tableId)
      .select({
        // Only fetch cases that have a human decision
        filterByFormula: "OR({Decision} != '', {Outcome} != '')",
        fields: [
          'Decision',
          'Outcome',
          '✏️ Extent of copied content',
          '✏️ Level of Transformation & Originality Added',
          '✏️ Importance of overall work',
          '✏️ Marketplace Impact & Intent',
          'Preview URL of Offending Template',
          'Preview URL of Offended Template',
          'Offense',
          'Date',
        ],
        maxRecords: 100, // Limit for validation study
      })
      .eachPage(
        (records, fetchNextPage) => {
          for (const record of records) {
            const decision = record.get('Decision') as string | undefined;
            const outcome = record.get('Outcome') as string | undefined;
            
            // Determine human decision from Decision or Outcome field
            let humanDecision = DECISION_MAP[decision || ''] || DECISION_MAP[outcome || ''] || null;

            cases.push({
              recordId: record.id,
              humanDecision,
              humanExtent: record.get('✏️ Extent of copied content') as string || null,
              humanTransformation: record.get('✏️ Level of Transformation & Originality Added') as string || null,
              humanImportance: record.get('✏️ Importance of overall work') as string || null,
              humanImpact: record.get('✏️ Marketplace Impact & Intent') as string || null,
              offendingUrl: record.get('Preview URL of Offending Template') as string || '',
              offendedUrl: record.get('Preview URL of Offended Template') as string || '',
              complaint: record.get('Offense') as string || '',
              createdAt: record.get('Date') as string || '',
            });
          }
          fetchNextPage();
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
  });

  console.log(`Found ${cases.length} human-labeled cases`);
  return cases;
}

// =============================================================================
// AGENT ANALYSIS
// =============================================================================

async function runAgentAnalysis(airtableCase: AirtableCase): Promise<AgentResult | null> {
  console.log(`  Analyzing ${airtableCase.recordId}...`);

  try {
    // Use the test-record endpoint in dry_run mode
    const response = await fetch(`${WORKER_URL}/test-record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId: airtableCase.recordId,
        fields: {
          'Preview URL of Offending Template': airtableCase.offendingUrl,
          'Preview URL of Offended Template': airtableCase.offendedUrl,
          'Offense': airtableCase.complaint,
          "Submitter's Email": 'validation-study@example.com',
        },
        dryRun: true, // Don't update Airtable, just analyze
      }),
    });

    if (!response.ok) {
      console.log(`    ⚠️ Agent returned ${response.status}`);
      return null;
    }

    const result = await response.json() as any;
    
    // Wait for processing (poll status)
    const caseId = result.caseId;
    if (!caseId) {
      console.log(`    ⚠️ No caseId returned`);
      return null;
    }

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    while (attempts < 30) {
      await sleep(2000);
      attempts++;

      const statusResponse = await fetch(`${WORKER_URL}/status/${caseId}`);
      if (!statusResponse.ok) continue;

      const status = await statusResponse.json() as any;
      
      if (status.status === 'completed') {
        return {
          decision: status.final_decision || status.tier3_decision || status.tier2_decision || 'no_violation',
          confidence: status.tier3_confidence || status.tier2_confidence || 0,
          vectorSimilarity: status.vector_similarity,
          reasoning: status.tier3_reasoning,
        };
      }

      if (status.status === 'error') {
        console.log(`    ⚠️ Agent error: ${status.error}`);
        return null;
      }
    }

    console.log(`    ⚠️ Timeout waiting for agent`);
    return null;

  } catch (error: any) {
    console.log(`    ⚠️ Error: ${error.message}`);
    return null;
  }
}

// =============================================================================
// ALTERNATIVE: Direct Vector Analysis Only
// =============================================================================

async function runVectorAnalysisOnly(airtableCase: AirtableCase): Promise<AgentResult | null> {
  // For faster validation, we skip the full agent pipeline
  // and just run vector similarity analysis directly via /api/compare
  
  try {
    const response = await fetch(`${WORKER_URL}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalUrl: airtableCase.offendedUrl,
        allegedCopyUrl: airtableCase.offendingUrl,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json() as any;
    const vectorSimilarity = result.vectorSimilarity;
    
    if (!vectorSimilarity) {
      return null;
    }
    
    // Infer decision from vector similarity
    const overall = vectorSimilarity.overall || 0;
    let decision: 'major' | 'minor' | 'no_violation';
    
    if (overall >= 0.95) {
      decision = 'major';
    } else if (overall >= 0.85) {
      decision = 'minor';
    } else {
      decision = 'no_violation';
    }

    return {
      decision,
      confidence: overall,
      vectorSimilarity,
    };

  } catch (error) {
    return null;
  }
}

// =============================================================================
// METRICS COMPUTATION
// =============================================================================

function computeMetrics(results: ValidationResult[]): {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  confusionMatrix: { TP: number; FP: number; TN: number; FN: number };
  thresholdAnalysis: Array<{ threshold: number; precision: number; recall: number; f1: number }>;
} {
  // For plagiarism detection, we consider "major" as positive
  const validResults = results.filter(r => r.category !== 'SKIPPED');
  
  const TP = validResults.filter(r => r.category === 'TP').length;
  const FP = validResults.filter(r => r.category === 'FP').length;
  const TN = validResults.filter(r => r.category === 'TN').length;
  const FN = validResults.filter(r => r.category === 'FN').length;

  const precision = TP / (TP + FP) || 0;
  const recall = TP / (TP + FN) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;
  const accuracy = (TP + TN) / validResults.length || 0;

  // Threshold analysis: what if we set different vector similarity thresholds?
  const thresholdAnalysis: Array<{ threshold: number; precision: number; recall: number; f1: number }> = [];
  
  for (let threshold = 0.80; threshold <= 0.99; threshold += 0.02) {
    const thresholdResults = results
      .filter(r => r.vectorOverall !== null)
      .map(r => {
        const predictedPositive = (r.vectorOverall || 0) >= threshold;
        const actualPositive = r.humanDecision === 'major';
        
        if (predictedPositive && actualPositive) return 'TP';
        if (predictedPositive && !actualPositive) return 'FP';
        if (!predictedPositive && !actualPositive) return 'TN';
        return 'FN';
      });

    const tTP = thresholdResults.filter(r => r === 'TP').length;
    const tFP = thresholdResults.filter(r => r === 'FP').length;
    const tFN = thresholdResults.filter(r => r === 'FN').length;

    const tPrecision = tTP / (tTP + tFP) || 0;
    const tRecall = tTP / (tTP + tFN) || 0;
    const tF1 = 2 * (tPrecision * tRecall) / (tPrecision + tRecall) || 0;

    thresholdAnalysis.push({
      threshold: Math.round(threshold * 100) / 100,
      precision: Math.round(tPrecision * 100) / 100,
      recall: Math.round(tRecall * 100) / 100,
      f1: Math.round(tF1 * 100) / 100,
    });
  }

  return {
    precision,
    recall,
    f1,
    accuracy,
    confusionMatrix: { TP, FP, TN, FN },
    thresholdAnalysis,
  };
}

function categorizeResult(humanDecision: string | null, agentDecision: string): 'TP' | 'FP' | 'TN' | 'FN' | 'SKIPPED' {
  if (!humanDecision) return 'SKIPPED';
  
  // Binary classification: major = positive, anything else = negative
  const humanPositive = humanDecision === 'major';
  const agentPositive = agentDecision === 'major';

  if (humanPositive && agentPositive) return 'TP';
  if (!humanPositive && agentPositive) return 'FP';
  if (!humanPositive && !agentPositive) return 'TN';
  return 'FN';
}

// =============================================================================
// UTILITIES
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  VALIDATION STUDY: Plagiarism Detection Accuracy');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Fetch human-labeled cases
  const cases = await fetchHumanLabeledCases();
  
  if (cases.length === 0) {
    console.log('No human-labeled cases found. Exiting.');
    return;
  }

  // Filter to cases with actual URLs
  const validCases = cases.filter(c => c.offendingUrl && c.offendedUrl);
  console.log(`${validCases.length} cases have both URLs`);

  // Filter to cases with human decisions
  const labeledCases = validCases.filter(c => c.humanDecision !== null);
  console.log(`${labeledCases.length} cases have human decisions`);
  console.log('');

  // 2. Run agent analysis on each case
  console.log('Running agent analysis on each case...');
  console.log('(This may take a while - ~60s per case)');
  console.log('');

  const results: ValidationResult[] = [];

  for (const airtableCase of labeledCases) {
    console.log(`Case ${airtableCase.recordId}:`);
    console.log(`  Human: ${airtableCase.humanDecision}`);
    
    const agentResult = await runVectorAnalysisOnly(airtableCase);
    
    if (!agentResult) {
      console.log(`  Agent: FAILED`);
      results.push({
        recordId: airtableCase.recordId,
        humanDecision: airtableCase.humanDecision,
        agentDecision: 'unknown',
        agentConfidence: 0,
        vectorOverall: null,
        vectorVerdict: null,
        match: false,
        category: 'SKIPPED',
      });
      continue;
    }

    const category = categorizeResult(airtableCase.humanDecision, agentResult.decision);
    const match = airtableCase.humanDecision === agentResult.decision;

    console.log(`  Agent: ${agentResult.decision} (confidence: ${(agentResult.confidence * 100).toFixed(1)}%)`);
    console.log(`  Vector: ${agentResult.vectorSimilarity?.overall?.toFixed(4) || 'N/A'}`);
    console.log(`  Match: ${match ? '✅' : '❌'} (${category})`);
    console.log('');

    results.push({
      recordId: airtableCase.recordId,
      humanDecision: airtableCase.humanDecision,
      agentDecision: agentResult.decision,
      agentConfidence: agentResult.confidence,
      vectorOverall: agentResult.vectorSimilarity?.overall || null,
      vectorVerdict: agentResult.vectorSimilarity?.verdict || null,
      match,
      category,
    });

    // Rate limiting
    await sleep(500);
  }

  // 3. Compute metrics
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const metrics = computeMetrics(results);

  console.log('CONFUSION MATRIX (major = positive):');
  console.log('┌─────────────────┬───────────────┬───────────────┐');
  console.log('│                 │ Actual Major  │ Actual Other  │');
  console.log('├─────────────────┼───────────────┼───────────────┤');
  console.log(`│ Predict Major   │ TP: ${String(metrics.confusionMatrix.TP).padStart(8)} │ FP: ${String(metrics.confusionMatrix.FP).padStart(8)} │`);
  console.log(`│ Predict Other   │ FN: ${String(metrics.confusionMatrix.FN).padStart(8)} │ TN: ${String(metrics.confusionMatrix.TN).padStart(8)} │`);
  console.log('└─────────────────┴───────────────┴───────────────┘');
  console.log('');

  console.log('METRICS:');
  console.log(`  Precision: ${(metrics.precision * 100).toFixed(1)}% (of cases flagged major, how many were correct)`);
  console.log(`  Recall:    ${(metrics.recall * 100).toFixed(1)}% (of actual major cases, how many did we catch)`);
  console.log(`  F1 Score:  ${(metrics.f1 * 100).toFixed(1)}% (harmonic mean of precision & recall)`);
  console.log(`  Accuracy:  ${(metrics.accuracy * 100).toFixed(1)}% (overall correctness)`);
  console.log('');

  console.log('THRESHOLD ANALYSIS (vector similarity → major):');
  console.log('┌───────────┬───────────┬───────────┬───────────┐');
  console.log('│ Threshold │ Precision │ Recall    │ F1 Score  │');
  console.log('├───────────┼───────────┼───────────┼───────────┤');
  for (const t of metrics.thresholdAnalysis) {
    console.log(`│ ${(t.threshold * 100).toFixed(0).padStart(7)}% │ ${(t.precision * 100).toFixed(0).padStart(8)}% │ ${(t.recall * 100).toFixed(0).padStart(8)}% │ ${(t.f1 * 100).toFixed(0).padStart(8)}% │`);
  }
  console.log('└───────────┴───────────┴───────────┴───────────┘');
  console.log('');

  // Find optimal threshold
  const optimal = metrics.thresholdAnalysis.reduce((best, t) => t.f1 > best.f1 ? t : best);
  console.log(`OPTIMAL THRESHOLD: ${(optimal.threshold * 100).toFixed(0)}% (F1: ${(optimal.f1 * 100).toFixed(1)}%)`);
  console.log('');

  // 4. Export results
  console.log('DETAILED RESULTS:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
