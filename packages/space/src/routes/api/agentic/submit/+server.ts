// Submit single agentic task
// Creates Beads issue and queues for autonomous execution

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { InputSanitizationHook } from '$lib/agentic/hooks';
import { generateId } from '$lib/utils/id';
import { authorizeAgenticSubmission, validateSubmissionBudget } from '$lib/server/agentic-admission';

interface SubmitRequest {
  type: 'template-generation' | 'feature-implementation' | 'research';
  prompt: string;
  budget: number;
  acceptanceCriteria?: string[];
  qualityRequirements?: {
    canonCompliance?: 'strict' | 'moderate';
    accessibility?: 'WCAG AA' | 'WCAG AAA';
    performance?: number;  // Lighthouse score minimum
  };
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  try {
    // Verify admission before parsing a body, writing database rows, or forwarding a secret.
    const authorization = authorizeAgenticSubmission(request, locals.user, platform?.env ?? {});
    const body: SubmitRequest = await request.json();

    // Validate inputs
    if (!body.type || !body.prompt || !body.budget) {
      throw error(400, 'Missing required fields: type, prompt, budget');
    }

    validateSubmissionBudget(body.budget);

    // HOOK: Sanitize prompt (prevent injection)
    const sanitizationHook = new InputSanitizationHook();
    const sanitizedPrompt = sanitizationHook.sanitizePrompt(body.prompt);

    // Log if sanitization occurred
    if (sanitizedPrompt !== body.prompt) {
      console.warn('⚠️  Prompt injection detected and sanitized', {
        original: body.prompt.substring(0, 100),
        removals: sanitizationHook.getSanitizationReport(body.prompt, sanitizedPrompt).removals
      });
    }

    // HOOK: Validate acceptance criteria (if provided)
    if (body.acceptanceCriteria) {
      const criteriaCheck = sanitizationHook.validateAcceptanceCriteria(body.acceptanceCriteria);

      if (!criteriaCheck.valid) {
        throw error(400, 'Invalid acceptance criteria: cannot contain instructions or completion signals');
      }

      body.acceptanceCriteria = criteriaCheck.sanitized;
    }

    // Generate IDs
    const sessionId = generateId('agt');
    const epicId = generateId('epic');

    // Create agentic session (tracks work independently)
    await platform!.env.DB.prepare(`
      INSERT INTO agentic_sessions (
        id, issue_id, epic_id, budget, cost_consumed, iteration, status, started_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 'queued', ?, ?)
    `).bind(
      sessionId,
      sessionId,  // Use session ID as issue ID for MVP
      epicId,
      body.budget,
      Date.now(),
      Date.now()
    ).run();

    // Create agentic metadata
    await platform!.env.DB.prepare(`
      INSERT INTO agentic_metadata (issue_id, budget, cost_consumed, review_status)
      VALUES (?, ?, 0, 'pending')
    `).bind(sessionId, body.budget).run();

    // Submit to worker via HTTP (Pages can't access queues directly)
    const workerResponse = await fetch('https://agentic-executor.createsomething.workers.dev/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        issueId: sessionId,
        epicId,
        budget: body.budget,
        acceptanceCriteria: body.acceptanceCriteria,
        prompt: sanitizedPrompt,
        type: body.type
      })
    });

    if (!workerResponse.ok) {
      const errorData = await workerResponse.json();
      throw error(500, `Worker submission failed: ${JSON.stringify(errorData)}`);
    }

    return json({
      taskId: sessionId,
      epicId,
      status: 'queued',
      budget: body.budget,
      statusUrl: `/api/agentic/sessions/${sessionId}`
    });

  } catch (err: any) {
    console.error('Agentic submit failed', err);
    if (err.status) throw error(err.status, err.message);
    throw error(500, `Failed to submit task: ${err.message}`);
  }
};

