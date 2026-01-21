/**
 * Agent SDK Mode: Content Policy Violations
 *
 * Agentic loop for flexible content policy enforcement beyond plagiarism.
 * Uses Claude's tool use with iterative evidence gathering.
 *
 * Philosophy:
 * - Fixed pipeline for plagiarism (bounded, predictable)
 * - Agent SDK for expansion (harassment, hate speech, DMCA, etc.)
 *
 * Canon: The tool recedes; judgment emerges through iteration.
 */

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from '@cloudflare/puppeteer';

// =============================================================================
// RETRY / BACKOFF (Anthropic overload resilience)
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAnthropicError(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  const msg = (error?.message || '').toLowerCase();
  // Common transient failures
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 529 || // overloaded
    msg.includes('overloaded') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('temporarily') ||
    msg.includes('rate limit')
  );
}

async function anthropicCreateWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<Anthropic.Message> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 750;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await anthropic.messages.create(params);
    } catch (error: any) {
      attempt += 1;
      const retryable = isRetryableAnthropicError(error);
      if (!retryable || attempt > maxRetries) {
        throw error;
      }

      const backoff = Math.min(8000, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const delay = backoff + jitter;

      console.log(`[Agent] Anthropic request failed (attempt ${attempt}/${maxRetries}) - retrying in ${delay}ms`, {
        status: error?.status,
        message: error?.message
      });

      await sleep(delay);
    }
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface Env {
  DB: D1Database;
  SCREENSHOTS: R2Bucket;
  AI: any;
  BROWSER: any;
  ANTHROPIC_API_KEY: string;
}

interface ContentPolicyCase {
  id: string;
  policyType: 'plagiarism' | 'harassment' | 'hate_speech' | 'dmca' | 'nsfw' | 'spam';
  reporterEmail: string;
  targetUrl: string;
  complaintText: string;
  context?: string; // Additional context (e.g., original work URL for DMCA)
  createdAt: number;
}

interface AgentState {
  caseId: string;
  iteration: number;
  maxIterations: number;
  evidenceGathered: Evidence[];
  toolsUsed: string[];
  reasoning: string[];
  conclusion: PolicyViolation | null;
}

interface Evidence {
  type: 'screenshot' | 'html' | 'css' | 'js' | 'text_analysis' | 'comparison';
  source: string;
  data: any;
  timestamp: number;
}

interface PolicyViolation {
  decision: 'no_violation' | 'minor' | 'major';
  confidence: number;
  reasoning: string;
  recommendedAction: string;
  evidenceSummary: string[];
}

interface ToolResult {
  toolName: string;
  content: any;
}

// =============================================================================
// AVAILABLE TOOLS
// =============================================================================

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'capture_screenshot',
    description: 'Capture a screenshot of a URL using Browser Rendering. Returns base64 image data.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to screenshot'
        },
        label: {
          type: 'string',
          description: 'Label for this screenshot (e.g., "target_page", "comparison_original")'
        }
      },
      required: ['url', 'label']
    }
  },
  {
    name: 'fetch_html',
    description: 'Fetch the full HTML source of a URL. Useful for analyzing structure, content, metadata.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch HTML from'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_css_patterns',
    description: 'Extract CSS patterns from HTML: animations, transitions, grid/flex layouts. Returns structured comparison data.',
    input_schema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'The HTML source to analyze'
        }
      },
      required: ['html']
    }
  },
  {
    name: 'analyze_text_content',
    description: 'Extract and analyze text content from HTML for harassment, hate speech, or spam detection.',
    input_schema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'The HTML source to extract text from'
        },
        policyType: {
          type: 'string',
          enum: ['harassment', 'hate_speech', 'spam'],
          description: 'Type of policy violation to check for'
        }
      },
      required: ['html', 'policyType']
    }
  },
  {
    name: 'compare_visual_similarity',
    description: 'Use Workers AI vision model to compare two images for visual similarity.',
    input_schema: {
      type: 'object',
      properties: {
        image1Label: {
          type: 'string',
          description: 'Label of first image from capture_screenshot'
        },
        image2Label: {
          type: 'string',
          description: 'Label of second image from capture_screenshot'
        }
      },
      required: ['image1Label', 'image2Label']
    }
  },
  {
    name: 'conclude_investigation',
    description: 'Make final decision on content policy violation based on gathered evidence.',
    input_schema: {
      type: 'object',
      properties: {
        decision: {
          type: 'string',
          enum: ['no_violation', 'minor', 'major'],
          description: 'Final decision on violation severity'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence in decision (0-1)'
        },
        reasoning: {
          type: 'string',
          description: 'Detailed reasoning for this decision'
        },
        recommendedAction: {
          type: 'string',
          description: 'Recommended action (e.g., "No action", "Warning", "Content removal", "Account suspension")'
        },
        evidenceSummary: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of key evidence points supporting this decision'
        }
      },
      required: ['decision', 'confidence', 'reasoning', 'recommendedAction', 'evidenceSummary']
    }
  }
];

// =============================================================================
// AGENT CONTROL (reduce tool spam, force convergence)
// =============================================================================

const REQUIRED_SCREENSHOT_LABELS = ['original', 'copy'] as const;
const REQUIRED_VISUAL_COMPARISONS = 1;
const FORCE_CONCLUDE_AT_ITERATION = 6;

function toolByName(name: string): Anthropic.Tool | null {
  const tool = TOOLS.find((t) => t.name === name);
  return tool ?? null;
}

function pickTools(names: string[]): Anthropic.Tool[] {
  return names.map(toolByName).filter(Boolean) as Anthropic.Tool[];
}

function getEvidenceCount(state: AgentState, type: Evidence['type']): number {
  return state.evidenceGathered.filter((e) => e.type === type).length;
}

function hasScreenshotLabel(state: AgentState, label: string): boolean {
  return state.evidenceGathered.some(
    (e) => e.type === 'screenshot' && e.data?.label === label
  );
}

function getConvergenceDirective(state: AgentState, contentCase: ContentPolicyCase): string {
  const missingOriginal = !hasScreenshotLabel(state, 'original');
  const missingCopy = !hasScreenshotLabel(state, 'copy');
  const comparisons = getEvidenceCount(state, 'comparison');
  const css = getEvidenceCount(state, 'css');

  if (missingOriginal) {
    return `Call capture_screenshot now with:\n- url: ${contentCase.context || contentCase.targetUrl}\n- label: "original"\n\nDo not do anything else.`;
  }
  if (missingCopy) {
    return `Call capture_screenshot now with:\n- url: ${contentCase.targetUrl}\n- label: "copy"\n\nDo not do anything else.`;
  }
  if (comparisons < REQUIRED_VISUAL_COMPARISONS) {
    return `Call compare_visual_similarity now with:\n- image1Label: "original"\n- image2Label: "copy"\n\nDo not do anything else.`;
  }
  if (css < 1 && state.iteration < FORCE_CONCLUDE_AT_ITERATION) {
    return `Gather minimal code evidence, then stop.\n\n1) Call fetch_html for BOTH URLs:\n- ${contentCase.context || '(missing original url)'}\n- ${contentCase.targetUrl}\n\n2) For EACH HTML response, call extract_css_patterns with the HTML.\n\nThen you must be ready to conclude next.`;
  }

  return `You have enough evidence. Call conclude_investigation now.\n\nReturn a decision (no_violation/minor/major) with confidence, reasoning, recommendedAction, and 3-6 bullet evidenceSummary items.`;
}

function getAllowedToolsForState(state: AgentState, contentCase: ContentPolicyCase): Anthropic.Tool[] {
  const comparisons = getEvidenceCount(state, 'comparison');
  const css = getEvidenceCount(state, 'css');

  // Force conclude once we have minimal evidence or we've reached the deadline.
  if (state.iteration >= FORCE_CONCLUDE_AT_ITERATION && comparisons >= 1) {
    return pickTools(['conclude_investigation']);
  }

  // Stage 1: capture required screenshots (exact labels)
  if (!hasScreenshotLabel(state, 'original') || !hasScreenshotLabel(state, 'copy')) {
    return pickTools(['capture_screenshot']);
  }

  // Stage 2: run one visual comparison
  if (comparisons < REQUIRED_VISUAL_COMPARISONS) {
    return pickTools(['compare_visual_similarity']);
  }

  // Stage 3: minimal code signal (HTML + CSS patterns), then conclude
  if (css < 1 && state.iteration < FORCE_CONCLUDE_AT_ITERATION) {
    return pickTools(['fetch_html', 'extract_css_patterns']);
  }

  // Stage 4: conclude
  return pickTools(['conclude_investigation']);
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function executeToolCall(
  toolName: string,
  toolInput: any,
  state: AgentState,
  env: Env
): Promise<ToolResult> {
  console.log(`[Agent] Executing tool: ${toolName}`, toolInput);

  try {
    switch (toolName) {
      case 'capture_screenshot':
        return await captureScreenshot(toolInput.url, toolInput.label, state, env);

      case 'fetch_html':
        return await fetchHtml(toolInput.url, state);

      case 'extract_css_patterns':
        return await extractCssPatterns(toolInput.html, state);

      case 'analyze_text_content':
        return await analyzeTextContent(toolInput.html, toolInput.policyType, env);

      case 'compare_visual_similarity':
        return await compareVisualSimilarity(toolInput.image1Label, toolInput.image2Label, state, env);

      case 'conclude_investigation':
        // Special case: this tool signals end of investigation
        state.conclusion = {
          decision: toolInput.decision,
          confidence: toolInput.confidence,
          reasoning: toolInput.reasoning,
          recommendedAction: toolInput.recommendedAction,
          evidenceSummary: toolInput.evidenceSummary
        };
        return {
          toolName: 'conclude_investigation',
          content: 'Investigation concluded. Final decision recorded.'
        };

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    console.error(`[Agent] Tool execution error (${toolName}):`, error.message);
    return {
      toolName,
      content: `Error: ${error.message}`
    };
  }
}

async function captureScreenshot(
  url: string,
  label: string,
  state: AgentState,
  env: Env
): Promise<ToolResult> {
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    await browser.close();

    // Store screenshot in R2
    const screenshotKey = `${state.caseId}/${label}.jpg`;
    await env.SCREENSHOTS.put(screenshotKey, screenshot);

    // Store in agent state
    state.evidenceGathered.push({
      type: 'screenshot',
      source: url,
      data: { label, key: screenshotKey, size: screenshot.byteLength },
      timestamp: Date.now()
    });

    return {
      toolName: 'capture_screenshot',
      content: `Screenshot captured: ${label} (${(screenshot.byteLength / 1024).toFixed(2)} KB). Stored at ${screenshotKey}`
    };
  } catch (error: any) {
    await browser.close();
    throw error;
  }
}

async function fetchHtml(url: string, state: AgentState): Promise<ToolResult> {
  const response = await fetch(url);
  const html = await response.text();

  // Store in agent state (truncated)
  state.evidenceGathered.push({
    type: 'html',
    source: url,
    data: { length: html.length, snippet: html.substring(0, 2000) },
    timestamp: Date.now()
  });

  return {
    toolName: 'fetch_html',
    content: html.substring(0, 50000) // Limit to 50KB to avoid token overflow
  };
}

async function extractCssPatterns(html: string, state: AgentState): Promise<ToolResult> {
  const patterns = {
    animations: html.match(/@keyframes\s+[\w-]+\s*\{[^}]+\}/g) || [],
    transitions: html.match(/transition:\s*[^;]+;/g) || [],
    gridLayouts: html.match(/display:\s*grid[^}]*\}/g) || [],
    flexLayouts: html.match(/display:\s*flex[^}]*\}/g) || []
  };

  state.evidenceGathered.push({
    type: 'css',
    source: 'extract_css_patterns',
    data: patterns,
    timestamp: Date.now()
  });

  return {
    toolName: 'extract_css_patterns',
    content: JSON.stringify(patterns, null, 2)
  };
}

async function analyzeTextContent(
  html: string,
  policyType: string,
  env: Env
): Promise<ToolResult> {
  // Extract text from HTML (strip tags)
  const textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Use Workers AI for text classification
  const inputs = {
    text: textContent.substring(0, 5000) // Limit to 5000 chars
  };

  try {
    const result = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', inputs);

    return {
      toolName: 'analyze_text_content',
      content: JSON.stringify({
        policyType,
        textSample: textContent.substring(0, 500),
        classification: result,
        wordCount: textContent.split(/\s+/).length
      }, null, 2)
    };
  } catch (error: any) {
    return {
      toolName: 'analyze_text_content',
      content: `Text extraction completed. Word count: ${textContent.split(/\s+/).length}. Sample: ${textContent.substring(0, 500)}`
    };
  }
}

async function compareVisualSimilarity(
  image1Label: string,
  image2Label: string,
  state: AgentState,
  env: Env
): Promise<ToolResult> {
  // Find screenshots in evidence
  const evidence1 = state.evidenceGathered.find(
    e => e.type === 'screenshot' && e.data.label === image1Label
  );
  const evidence2 = state.evidenceGathered.find(
    e => e.type === 'screenshot' && e.data.label === image2Label
  );

  if (!evidence1 || !evidence2) {
    throw new Error(`Screenshots not found: ${image1Label}, ${image2Label}`);
  }

  // Fetch from R2
  const [img1Obj, img2Obj] = await Promise.all([
    env.SCREENSHOTS.get(evidence1.data.key),
    env.SCREENSHOTS.get(evidence2.data.key)
  ]);

  if (!img1Obj || !img2Obj) {
    throw new Error('Failed to retrieve screenshots from R2');
  }

  const [img1Buffer, img2Buffer] = await Promise.all([
    img1Obj.arrayBuffer(),
    img2Obj.arrayBuffer()
  ]);

  // Use Llama 3.2 Vision
  const prompt = `Compare these two website screenshots. Identify:
1. Visual similarity (layout, design, color scheme)
2. Content similarity (text, images, structure)
3. Overall assessment of copying or coincidence

Provide a similarity score (0-100) and reasoning.`;

  const inputs = {
    prompt,
    image: [
      Array.from(new Uint8Array(img1Buffer)),
      Array.from(new Uint8Array(img2Buffer))
    ]
  };

  try {
    const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', inputs);

    state.evidenceGathered.push({
      type: 'comparison',
      source: `${image1Label} vs ${image2Label}`,
      data: result,
      timestamp: Date.now()
    });

    return {
      toolName: 'compare_visual_similarity',
      content: JSON.stringify(result, null, 2)
    };
  } catch (error: any) {
    return {
      toolName: 'compare_visual_similarity',
      content: `Vision model error: ${error.message}. Manual review recommended.`
    };
  }
}

// =============================================================================
// AGENTIC LOOP
// =============================================================================

export async function runAgentInvestigation(
  contentCase: ContentPolicyCase,
  env: Env,
  maxIterations: number = 10
): Promise<PolicyViolation> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Initialize agent state
  const state: AgentState = {
    caseId: contentCase.id,
    iteration: 0,
    maxIterations,
    evidenceGathered: [],
    toolsUsed: [],
    reasoning: [],
    conclusion: null
  };

  // Initial system prompt
  const systemPrompt = `You are a content policy enforcement agent for a marketplace platform.

Your task: Investigate the reported content policy violation and make a decision.

**Case Details:**
- Policy Type: ${contentCase.policyType}
- Target URL: ${contentCase.targetUrl}
- Reporter: ${contentCase.reporterEmail}
- Complaint: ${contentCase.complaintText}
${contentCase.context ? `- Additional Context: ${contentCase.context}` : ''}

CRITICAL (plagiarism cases):
- Capture ONLY two screenshots with labels "original" (context/original URL) and "copy" (target URL)
- Run compare_visual_similarity exactly once ("original" vs "copy")
- Fetch HTML for both URLs and run extract_css_patterns on each
- Call conclude_investigation by iteration ${FORCE_CONCLUDE_AT_ITERATION} at the latest

**Your Process:**
1. Gather evidence using available tools (screenshots, HTML, text analysis, etc.)
2. Analyze evidence iteratively
3. When confident, call conclude_investigation with your decision

**Guidelines:**
- Be thorough but efficient (max ${maxIterations} iterations)
- For plagiarism: compare visual similarity AND code patterns
- For harassment/hate speech: analyze text content AND context
- For DMCA: verify original work claims AND visual/code similarity
- Confidence threshold: 0.7+ for minor violations, 0.85+ for major violations
- If uncertain after evidence gathering, flag for human review (confidence < 0.7)

**Available Tools:**
- capture_screenshot: Visual evidence
- fetch_html: Source code inspection
- extract_css_patterns: Code similarity analysis
- analyze_text_content: Text policy violations
- compare_visual_similarity: Visual comparison using AI
- conclude_investigation: Final decision (call when ready)

Begin investigation.`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Start the investigation for this content policy case.'
    }
  ];

  // Agentic loop
  while (state.iteration < maxIterations && !state.conclusion) {
    state.iteration++;
    console.log(`[Agent] Iteration ${state.iteration}/${maxIterations}`);

    try {
      // Add a short directive to prevent wandering.
      messages.push({
        role: 'user',
        content: getConvergenceDirective(state, contentCase)
      });

      const tools = getAllowedToolsForState(state, contentCase);

      const response = await anthropicCreateWithRetry(anthropic, {
        model: 'claude-sonnet-4-20250514',
        temperature: 0,
        // Lower token budget reduces load and latency in high-traffic windows
        max_tokens: 2500,
        system: systemPrompt,
        messages,
        tools
      });

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        console.log('[Agent] Claude ended turn without tool use. Requesting conclusion.');
        messages.push({
          role: 'assistant',
          content: response.content
        });
        messages.push({
          role: 'user',
          content: 'Please call conclude_investigation with your final decision based on the evidence gathered.'
        });
        continue;
      }

      // Process tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.MessageParam['content'] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolResult = await executeToolCall(
              block.name,
              block.input,
              state,
              env
            );

            state.toolsUsed.push(block.name);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: typeof toolResult.content === 'string'
                ? toolResult.content
                : JSON.stringify(toolResult.content)
            });

            // If this was conclude_investigation, exit loop
            if (block.name === 'conclude_investigation') {
              console.log('[Agent] Investigation concluded by agent');
              break;
            }
          } else if (block.type === 'text') {
            state.reasoning.push(block.text);
          }
        }

        // Add assistant response and tool results to message history
        messages.push({
          role: 'assistant',
          content: response.content
        });

        if (toolResults.length > 0) {
          messages.push({
            role: 'user',
            content: toolResults
          });
        }
      }
    } catch (error: any) {
      console.error(`[Agent] Iteration ${state.iteration} error:`, error.message);

      // Graceful degradation
      if (state.iteration >= 3 && state.evidenceGathered.length > 0) {
        console.log('[Agent] Error occurred after evidence gathering. Requesting conclusion with available evidence.');
        messages.push({
          role: 'user',
          content: `An error occurred: ${error.message}. Based on the evidence you've gathered so far, please call conclude_investigation with your best assessment.`
        });
      } else {
        // Early error - return inconclusive
        return {
          decision: 'no_violation',
          confidence: 0.3,
          reasoning: `Investigation failed due to error: ${error.message}`,
          recommendedAction: 'Flag for human review',
          evidenceSummary: ['Error during evidence gathering', `Tools attempted: ${state.toolsUsed.join(', ')}`]
        };
      }
    }
  }

  // Check if we have a conclusion
  if (state.conclusion) {
    console.log('[Agent] Final decision:', state.conclusion);
    return state.conclusion;
  }

  // Max iterations reached without conclusion
  console.log('[Agent] Max iterations reached without conclusion');
  return {
    decision: 'no_violation',
    confidence: 0.5,
    reasoning: `Investigation incomplete after ${maxIterations} iterations. Evidence gathered: ${state.evidenceGathered.length} items.`,
    recommendedAction: 'Flag for human review',
    evidenceSummary: [
      `Tools used: ${state.toolsUsed.join(', ')}`,
      `Evidence gathered: ${state.evidenceGathered.map(e => e.type).join(', ')}`
    ]
  };
}

// =============================================================================
// PERSISTENCE & RECOVERY
// =============================================================================

export async function saveAgentState(state: AgentState, env: Env): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO agent_sessions (case_id, iteration, evidence, tools_used, reasoning, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    state.caseId,
    state.iteration,
    JSON.stringify(state.evidenceGathered),
    JSON.stringify(state.toolsUsed),
    JSON.stringify(state.reasoning),
    Date.now()
  ).run();
}

export async function loadAgentState(caseId: string, env: Env): Promise<AgentState | null> {
  const result = await env.DB.prepare(`
    SELECT * FROM agent_sessions WHERE case_id = ? ORDER BY iteration DESC LIMIT 1
  `).bind(caseId).first();

  if (!result) return null;

  return {
    caseId,
    iteration: result.iteration as number,
    maxIterations: 10, // Default
    evidenceGathered: JSON.parse(result.evidence as string),
    toolsUsed: JSON.parse(result.tools_used as string),
    reasoning: JSON.parse(result.reasoning as string),
    conclusion: null
  };
}
