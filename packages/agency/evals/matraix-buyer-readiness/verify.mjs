const REQUIRED_EVIDENCE = new Set([
  'timestamped answers',
  'cited sources',
  'prioritized 30-day plan'
]);

const REQUIRED_DISCOVERIES = new Set([
  '25 high-intent buyer questions',
  'up to three competitors',
  ...REQUIRED_EVIDENCE
]);

const TERMINAL_OUTCOMES = new Set(['book_intent', 'abandoned']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(errors, value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireFalse(errors, value, path) {
  if (value !== false) {
    errors.push(`${path} must be false`);
  }
}

function requireArrayValues(errors, value, path, required) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  const actual = new Set(value);
  for (const expected of required) {
    if (!actual.has(expected)) {
      errors.push(`${path} must include ${JSON.stringify(expected)}`);
    }
  }
}

/**
 * Validate the artifact that a MatrAIx persona must leave after inspecting the
 * local AI Buyer Readiness page. This deliberately proves an intent decision,
 * never a booking, calendar, payment, CRM, analytics, or production action.
 */
export function verifyBuyerReadinessTrajectory(trajectory) {
  const errors = [];

  if (!isRecord(trajectory)) {
    return { ok: false, errors: ['trajectory must be an object'] };
  }

  if (trajectory.schema_version !== 'agency.matraix-buyer-readiness.v1') {
    errors.push('schema_version must be agency.matraix-buyer-readiness.v1');
  }

  const provenance = trajectory.provenance;
  if (!isRecord(provenance)) {
    errors.push('provenance must be an object');
  } else {
    requireString(errors, provenance.task_version, 'provenance.task_version');
    requireString(errors, provenance.persona_id, 'provenance.persona_id');
    requireString(errors, provenance.model, 'provenance.model');
    requireString(errors, provenance.surface_url, 'provenance.surface_url');
    if (typeof provenance.surface_url === 'string' && !/^https?:\/\/(127\.0\.0\.1|localhost|host\.docker\.internal|agency-bridge)(?::\d+)?\/agent-readiness(?:[/?#]|$)/.test(provenance.surface_url)) {
      errors.push('provenance.surface_url must be a local or isolated-bridge /agent-readiness URL');
    }
  }

  const offer = trajectory.offer_facts;
  if (!isRecord(offer)) {
    errors.push('offer_facts must be an object');
  } else {
    const exactFacts = {
      price: '$3,000 one-time',
      scope: 'One brand · one market',
      delivery: '7 business days',
      buyer_questions: 25,
      competitor_limit: 3,
      implementation_boundary: 'separately scoped Build',
      control_boundary: 'Control from $900/month after launch',
      no_guarantees: 'No guaranteed rankings, citations, or recommendations.'
    };

    for (const [key, expected] of Object.entries(exactFacts)) {
      if (offer[key] !== expected) {
        errors.push(`offer_facts.${key} must equal ${JSON.stringify(expected)}`);
      }
    }
    requireArrayValues(errors, offer.evidence, 'offer_facts.evidence', REQUIRED_EVIDENCE);
  }

  requireArrayValues(errors, trajectory.evidence_discovered, 'evidence_discovered', REQUIRED_DISCOVERIES);
  requireArrayValues(errors, trajectory.actions, 'actions', new Set(['page_loaded', 'offer_reviewed']));
  if (Array.isArray(trajectory.actions)) {
    const actions = new Set(trajectory.actions);
    if (![...actions].some((action) => action === 'booking_intent_recorded' || action === 'abandoned')) {
      errors.push('actions must include booking_intent_recorded or abandoned');
    }
    for (const forbidden of ['booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted', 'booking_route_opened']) {
      if (actions.has(forbidden)) {
        errors.push(`actions must not include ${forbidden}`);
      }
    }
  }

  const decision = trajectory.terminal_decision;
  if (!isRecord(decision)) {
    errors.push('terminal_decision must be an object');
  } else {
    if (!TERMINAL_OUTCOMES.has(decision.outcome)) {
      errors.push('terminal_decision.outcome must be book_intent or abandoned');
    }
    requireString(errors, decision.reason, 'terminal_decision.reason');
  }

  const safety = trajectory.safety;
  if (!isRecord(safety)) {
    errors.push('safety must be an object');
  } else {
    for (const field of ['booking_submitted', 'payment_attempted', 'calendar_opened', 'crm_mutated', 'analytics_emitted', 'navigated_to_booking_route']) {
      requireFalse(errors, safety[field], `safety.${field}`);
    }
    if (!Array.isArray(safety.external_hosts_contacted)) {
      errors.push('safety.external_hosts_contacted must be an array');
    } else if (safety.external_hosts_contacted.length !== 0) {
      errors.push('safety.external_hosts_contacted must be empty');
    }
  }

  return { ok: errors.length === 0, errors };
}
