/**
 * P3-Memory Phase
 * Vector similarity search and auto-verdict based on past findings
 */

import type { Finding, StoredFinding, Verdict } from '../types';

interface MemoryResult {
  findings: Finding[];
  resolvedCount: number;
  cacheHits: number;
}

/**
 * Run P3-Memory phase: check for similar past findings
 * If a finding has >98% similarity to a past FALSE_POSITIVE, auto-PASS it
 */
export async function runMemoryPhase(db: D1Database, findings: Finding[]): Promise<MemoryResult> {
  const result: Finding[] = [];
  let resolvedCount = 0;
  let cacheHits = 0;

  for (const finding of findings) {
    // Look up by fingerprint first (exact match)
    if (finding.fingerprint) {
      const stored = await findByFingerprint(db, finding.fingerprint);
      
      if (stored) {
        cacheHits++;
        
        if (stored.is_false_positive) {
          // Auto-PASS: this exact pattern was marked false positive before
          result.push({
            ...finding,
            verdict: 'PASS',
            reasoning: `Auto-resolved: Previously marked as false positive. ${stored.reasoning || ''}`,
            phase: 'P3-memory',
            isFalsePositive: true,
          });
          resolvedCount++;
          continue;
        }
      }
    }

    // Simple text similarity check (without full vector embeddings)
    // In production, this would use pgvector or Vectorize
    const similar = await findSimilarBySnippet(db, finding.ruleId, finding.snippet);
    
    if (similar && similar.similarity > 0.98 && similar.is_false_positive) {
      result.push({
        ...finding,
        verdict: 'PASS',
        reasoning: `Auto-resolved: 98%+ similarity to known false positive`,
        phase: 'P3-memory',
        isFalsePositive: true,
      });
      resolvedCount++;
      cacheHits++;
    } else {
      // No match - pass through to P4
      result.push(finding);
    }
  }

  return { findings: result, resolvedCount, cacheHits };
}

/**
 * Find stored finding by exact fingerprint
 */
async function findByFingerprint(db: D1Database, fingerprint: string): Promise<StoredFinding | null> {
  try {
    const result = await db.prepare(
      'SELECT * FROM findings WHERE fingerprint = ?'
    ).bind(fingerprint).first<StoredFinding>();
    return result || null;
  } catch {
    // Table might not exist yet
    return null;
  }
}

/**
 * Find similar findings by snippet (simple text similarity)
 * In production, this would use vector embeddings
 */
async function findSimilarBySnippet(
  db: D1Database,
  ruleId: string,
  snippet: string
): Promise<{ finding: StoredFinding; similarity: number; is_false_positive: boolean } | null> {
  try {
    // Get recent findings for this rule
    const results = await db.prepare(`
      SELECT * FROM findings 
      WHERE rule_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `).bind(ruleId).all<StoredFinding>();

    if (!results.results || results.results.length === 0) {
      return null;
    }

    // Simple Jaccard similarity on tokens
    const snippetTokens = new Set(snippet.toLowerCase().split(/\s+/));
    
    let bestMatch: { finding: StoredFinding; similarity: number; is_false_positive: boolean } | null = null;
    
    for (const stored of results.results) {
      const storedTokens = new Set(stored.snippet.toLowerCase().split(/\s+/));
      
      // Jaccard similarity
      const intersection = new Set([...snippetTokens].filter(t => storedTokens.has(t)));
      const union = new Set([...snippetTokens, ...storedTokens]);
      const similarity = intersection.size / union.size;
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          finding: stored,
          similarity,
          is_false_positive: Boolean(stored.is_false_positive),
        };
      }
    }

    return bestMatch;
  } catch {
    return null;
  }
}

/**
 * Store a finding in the database (for future similarity matching)
 */
export async function storeFinding(db: D1Database, finding: Finding): Promise<void> {
  const fingerprint = finding.fingerprint || finding.id || generateSimpleHash(finding);
  
  try {
    await db.prepare(`
      INSERT INTO findings (id, fingerprint, rule_id, snippet, verdict, is_false_positive, reasoning, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(fingerprint) DO UPDATE SET
        verdict = ?,
        reasoning = ?,
        updated_at = datetime('now')
    `).bind(
      fingerprint,
      fingerprint,
      finding.ruleId,
      finding.snippet,
      finding.verdict || 'INVESTIGATE',
      finding.isFalsePositive ? 1 : 0,
      finding.reasoning || null,
      finding.verdict || 'INVESTIGATE',
      finding.reasoning || null
    ).run();
  } catch (err) {
    console.error('Failed to store finding:', err);
  }
}

function generateSimpleHash(finding: Finding): string {
  const content = `${finding.ruleId}:${finding.filePath}:${finding.line}:${finding.snippet.substring(0, 50)}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
