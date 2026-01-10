// Submit convoy (batch of parallel tasks)
// Creates multiple Beads issues and distributes budget

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { InputSanitizationHook } from '$lib/agentic/hooks';

interface ConvoyRequest {
  name: string;
  tasks: Array<{
    title: string;
    description: string;
    labels?: string[];
    acceptanceCriteria?: string[];
  }>;
  budget: number;  // Total budget for entire convoy
  budgetDistribution?: 'equal' | 'weighted';  // How to split budget
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body: ConvoyRequest = await request.json();

    // Validate inputs
    if (!body.name || !body.tasks || body.tasks.length === 0 || !body.budget) {
      throw error(400, 'Missing required fields: name, tasks, budget');
    }

    if (body.budget <= 0 || body.budget > 500) {
      throw error(400, 'Convoy budget must be between $0.01 and $500');
    }

    if (body.tasks.length > 20) {
      throw error(400, 'Maximum 20 tasks per convoy');
    }

    // Generate IDs
    const convoyId = generateId('convoy');
    const epicId = generateId('epic');

    // Calculate per-task budget
    const perTaskBudget = body.budget / body.tasks.length;

    if (perTaskBudget < 0.10) {
      throw error(400, `Per-task budget too low: $${perTaskBudget.toFixed(4)}. Minimum $0.10 per task.`);
    }

    // Create convoy
    await platform!.env.DB.prepare(`
      INSERT INTO convoys (id, name, epic_id, budget, cost_consumed, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).bind(convoyId, body.name, epicId, body.budget, Date.now()).run();

    // Create Beads issues and queue them
    const sanitizationHook = new InputSanitizationHook();
    const issueIds: string[] = [];

    for (let i = 0; i < body.tasks.length; i++) {
      const task = body.tasks[i];

      // Sanitize task description
      const sanitizedDesc = sanitizationHook.sanitizePrompt(task.description);

      // Validate acceptance criteria
      let acceptanceCriteria = task.acceptanceCriteria;
      if (acceptanceCriteria) {
        const criteriaCheck = sanitizationHook.validateAcceptanceCriteria(acceptanceCriteria);
        if (!criteriaCheck.valid) {
          throw error(400, `Task ${i + 1}: Invalid acceptance criteria`);
        }
        acceptanceCriteria = criteriaCheck.sanitized;
      }

      // Generate issue ID
      const issueId = generateId('agt');
      issueIds.push(issueId);

      // Create Beads issue
      const labels = ['agentic', 'convoy', `convoy:${convoyId}`, ...(task.labels || [])];

      await platform!.env.DB.prepare(`
        INSERT INTO issues (
          id, title, description, labels, status, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        issueId,
        `[Convoy: ${body.name}] ${task.title}`,
        sanitizedDesc,
        JSON.stringify(labels),
        'pending',
        JSON.stringify({
          convoyId,
          budget: perTaskBudget,
          acceptanceCriteria
        }),
        Date.now()
      ).run();

      // Create agentic metadata
      await platform!.env.DB.prepare(`
        INSERT INTO agentic_metadata (issue_id, budget, cost_consumed, review_status)
        VALUES (?, ?, 0, 'pending')
      `).bind(issueId, perTaskBudget).run();

      // Link to convoy
      await platform!.env.DB.prepare(`
        INSERT INTO convoy_tasks (convoy_id, issue_id, status)
        VALUES (?, ?, 'pending')
      `).bind(convoyId, issueId).run();

      // Queue for execution
      await platform!.env.AGENTIC_QUEUE.send({
        issueId,
        epicId,
        convoyId,
        budget: perTaskBudget,
        acceptanceCriteria
      });
    }

    return json({
      convoyId,
      epicId,
      tasks: issueIds,
      totalBudget: body.budget,
      perTaskBudget,
      status: 'queued',
      statusUrl: `/convoys/${convoyId}`
    });

  } catch (err: any) {
    console.error('Convoy submit failed', err);
    if (err.status) throw err;
    throw error(500, `Failed to submit convoy: ${err.message}`);
  }
};

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
}
