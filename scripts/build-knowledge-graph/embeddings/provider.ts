/**
 * Embedding Provider - Cloudflare Workers AI
 *
 * Uses Cloudflare's BGE embedding model via REST API.
 * No separate API key needed - uses existing Cloudflare auth.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import type { GraphNode } from '../types.js';

export interface EmbeddingOptions {
  /** Cloudflare account ID (from env or wrangler) */
  accountId?: string;

  /** Cloudflare API token (from env) */
  apiToken?: string;

  /** Model to use (default: @cf/baai/bge-base-en-v1.5) */
  model?: string;

  /** Max tokens per document (default: 512 for BGE) */
  maxTokensPerDoc?: number;

  /** Documents per API call (default: 20) */
  batchSize?: number;

  /** Delay between batches in ms (default: 1000) */
  batchDelayMs?: number;
}

export interface EmbeddingResult {
  /** Node ID */
  nodeId: string;

  /** Embedding vector (768 dimensions for bge-base) */
  embedding: number[];
}

/** Default Cloudflare embedding model */
export const CLOUDFLARE_MODEL = '@cf/baai/bge-base-en-v1.5';
export const CLOUDFLARE_DIMENSIONS = 768;

/**
 * Truncate text to approximate token limit
 * BGE models have 512 token limit
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}

/**
 * Prepare node content for embedding
 */
function prepareNodeText(node: GraphNode, maxTokens: number): string {
  const content = readFileSync(node.absolutePath, 'utf-8');
  const combined = `Title: ${node.title}\n\nPackage: ${node.package ?? 'root'}\n\nType: ${node.type}\n\n${content}`;
  return truncateToTokens(combined, maxTokens);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Cloudflare credentials from environment or wrangler config
 */
function getCloudflareCredentials(): { accountId: string; apiToken: string } {
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  let apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // Try to get account ID from wrangler whoami if not in env
  if (!accountId) {
    try {
      const whoami = execSync('wrangler whoami 2>/dev/null', { encoding: 'utf-8' });
      // Match first account ID from the table (format: │ Name │ id │)
      const match = whoami.match(/│\s+[\w\s]+\s+│\s+([a-f0-9]{32})\s+│/);
      if (match) {
        accountId = match[1];
        console.log(`✓ Using wrangler account: ${accountId.slice(0, 8)}...`);
      }
    } catch {
      // Ignore - will fail later with better error
    }
  }

  // Try to get OAuth token from wrangler config if not in env
  if (!apiToken) {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const wranglerConfigPath = `${homeDir}/Library/Preferences/.wrangler/config/default.toml`;
      const configContent = readFileSync(wranglerConfigPath, 'utf-8');
      const tokenMatch = configContent.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (tokenMatch) {
        apiToken = tokenMatch[1];
        console.log('✓ Using wrangler OAuth token');
      }
    } catch {
      // Ignore - will fail later with better error
    }
  }

  if (!accountId || !apiToken) {
    throw new Error(
      'Cloudflare credentials not found. Either:\n' +
      '  1. Run `wrangler login` to authenticate, or\n' +
      '  2. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.'
    );
  }

  return { accountId, apiToken };
}

/**
 * Call Cloudflare Workers AI embedding endpoint
 */
async function callCloudflareEmbeddings(
  texts: string[],
  accountId: string,
  apiToken: string,
  model: string
): Promise<number[][]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare AI error (${response.status}): ${error}`);
  }

  const result = await response.json() as {
    success: boolean;
    result: { data: number[][] };
    errors?: Array<{ message: string }>;
  };

  if (!result.success) {
    throw new Error(`Cloudflare AI failed: ${result.errors?.[0]?.message ?? 'Unknown error'}`);
  }

  return result.result.data;
}

/**
 * Generate embeddings for a batch of nodes using Cloudflare Workers AI
 */
export async function generateEmbeddings(
  nodes: GraphNode[],
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult[]> {
  const {
    model = CLOUDFLARE_MODEL,
    maxTokensPerDoc = 512, // BGE limit
    batchSize = 20,
    batchDelayMs = 1000,
  } = options;

  const { accountId, apiToken } = options.accountId && options.apiToken
    ? { accountId: options.accountId, apiToken: options.apiToken }
    : getCloudflareCredentials();

  const results: EmbeddingResult[] = [];
  const totalBatches = Math.ceil(nodes.length / batchSize);

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = nodes.slice(i, i + batchSize);
    const texts = batch.map(node => prepareNodeText(node, maxTokensPerDoc));

    const eta = batchNum === 1 ? '' : ` (ETA: ${Math.ceil((totalBatches - batchNum) * batchDelayMs / 60000)}m)`;
    console.log(`Embedding batch ${batchNum}/${totalBatches} (${batch.length} docs)...${eta}`);

    try {
      const embeddings = await callCloudflareEmbeddings(texts, accountId, apiToken, model);

      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j]) {
          results.push({
            nodeId: batch[j].id,
            embedding: embeddings[j],
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < nodes.length) {
        await sleep(batchDelayMs);
      }
    } catch (error) {
      console.error(`Failed to embed batch ${batchNum}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Generate embeddings for specific nodes (incremental update)
 */
export async function generateEmbeddingsForNodes(
  nodes: GraphNode[],
  options: EmbeddingOptions = {}
): Promise<Map<string, number[]>> {
  const results = await generateEmbeddings(nodes, options);
  const embeddingMap = new Map<string, number[]>();

  for (const result of results) {
    embeddingMap.set(result.nodeId, result.embedding);
  }

  return embeddingMap;
}
