import { json } from "@sveltejs/kit";
const TONE_GUIDELINES = {
  methodology: {
    description: "Speak from the Canon - philosophical but practical",
    principles: [
      "Less, but better",
      "Tools that recede into use (Zuhandenheit)",
      "The whole determines the parts",
      "Understanding precedes creation"
    ],
    voice: "Thoughtful, substantive, never salesy. Share insight, not pitch."
  },
  helpful: {
    description: "Direct practical help",
    voice: "Clear, useful, generous with knowledge. No fluff."
  },
  appreciative: {
    description: "Acknowledge good work or thinking",
    voice: "Genuine recognition. Specific about what resonated."
  },
  promotional: {
    description: "Share CREATE SOMETHING work",
    voice: "Let the work speak. Context over hype."
  }
};
const POST = async ({ platform, request }) => {
  const db = platform.env.DB;
  const body = await request.json();
  const { signal_id, tone = "methodology", action_type = "reply" } = body;
  if (!signal_id) {
    return json({ error: "Missing required field: signal_id" }, { status: 400 });
  }
  try {
    const signal = await db.prepare(`
			SELECT * FROM community_signals WHERE id = ?
		`).bind(signal_id).first();
    if (!signal) {
      return json({ error: "Signal not found" }, { status: 404 });
    }
    const relationship = signal.author_handle ? await db.prepare(`
			SELECT * FROM community_relationships 
			WHERE platform = ? AND (person_handle = ? OR person_id = ?)
		`).bind(signal.platform, signal.author_handle, signal.author_handle).first() : null;
    const recentInteractions = signal.author_handle ? await db.prepare(`
			SELECT content, signal_type, detected_at 
			FROM community_signals 
			WHERE author_handle = ? AND platform = ?
			ORDER BY detected_at DESC
			LIMIT 5
		`).bind(signal.author_handle, signal.platform).all() : null;
    const context = {
      signal: {
        type: signal.signal_type,
        content: signal.content,
        author: signal.author_name || signal.author_handle,
        platform: signal.platform,
        context: signal.context
      },
      relationship: relationship ? {
        warmth: relationship.warmth_score,
        lead_potential: relationship.lead_potential,
        interactions: relationship.interactions_count,
        notes: relationship.notes
      } : null,
      recent_history: recentInteractions?.results || [],
      tone_guidance: TONE_GUIDELINES[tone] || TONE_GUIDELINES.methodology,
      action_type,
      methodology_context: {
        brand: "CREATE SOMETHING",
        philosophy: "Design methodology that serves understanding before creation",
        voice: "Substantive, thoughtful, never salesy",
        key_offerings: [
          "Vertical web templates",
          "Agent development tools (Ground, Plagiarism Agent)",
          "Agency services for complex web projects"
        ]
      }
    };
    return json({
      signal_id,
      context,
      draft_template: generateDraftTemplate(signal, tone, action_type),
      instructions: `
Use the context above to craft a response that:
1. Addresses the specific signal content
2. Maintains the ${tone} tone as described
3. Feels human and thoughtful, not automated
4. Is appropriately brief for ${signal.platform}
5. Advances the relationship naturally

After generating the draft, POST to /api/community/queue to add it for review.
			`.trim()
    });
  } catch (error) {
    console.error("Failed to prepare draft context:", error);
    return json({ error: "Failed to prepare draft context" }, { status: 500 });
  }
};
function generateDraftTemplate(signal, tone, action_type) {
  const templates = {
    reply: {
      mention: `[Acknowledge the mention] [Add value or insight] [Optional: soft invitation to continue]`,
      question: `[Direct answer] [Supporting context from methodology] [Optional: offer to go deeper]`,
      praise: `[Genuine thanks] [Acknowledge what resonated] [Share related thinking]`,
      opportunity: `[Interest expression] [Relevant experience/capability] [Clear next step]`
    },
    comment: {
      methodology: `[Substantive insight that adds to the discussion] [Connect to broader principle]`,
      helpful: `[Specific, actionable input] [Why this matters]`,
      appreciative: `[What specifically resonated] [How it connects to your work/thinking]`
    },
    share: {
      methodology: `[Brief context on why this matters] [The link/content] [Your angle on it]`,
      promotional: `[What it is] [Why now] [The link]`
    }
  };
  return templates[action_type]?.[signal.signal_type] || templates[action_type]?.[tone] || `[Respond thoughtfully to: "${signal.content.slice(0, 100)}..."]`;
}
export {
  POST
};
