/**
 * Phenomenological Interpreter - Claude-powered motion analysis
 *
 * Interprets technical animation data through Heidegger's phenomenological
 * framework: Zuhandenheit (ready-to-hand) vs Vorhandenheit (present-at-hand).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TechnicalAnalysis, PhenomenologicalAnalysis } from './types.js';

const SYSTEM_PROMPT = `You are analyzing UI motion through Heidegger's phenomenological framework for CREATE SOMETHING.

## CORE CONCEPTS

**Zuhandenheit (ready-to-hand)**: Motion that recedes into the background, supporting the user's intention without demanding attention. Like a well-worn tool, it becomes invisible in use. The user focuses on their goal, not the interface.

**Vorhandenheit (present-at-hand)**: Motion that obstructs, forcing awareness of the interface itself. The user becomes conscious of the animation as an object, interrupting their flow of thought.

**Aletheia (unconcealment)**: Truth as revealing. Motion should disclose relationships, causation, or state changes that would otherwise remain hidden.

## DISCLOSURE TYPES
- state_transition: Reveals change from one state to another (loading→loaded, collapsed→expanded)
- spatial_relationship: Shows elements belong together, or source/target of action
- user_confirmation: Confirms user input was received and processed
- hierarchy_reveal: Shows what is primary, secondary, or tertiary in importance
- temporal_sequence: Reveals order of operations—what happens first, next, last
- none: No meaningful disclosure detected

## DURATION THRESHOLDS
- instant (≤100ms): Perceived as instant, maximum zuhandenheit
- fast (≤200ms): Quick feedback, still recedes
- moderate (≤300ms): Standard transition, borderline
- slow (≤500ms): Noticeable, approaching vorhandenheit
- theatrical (>500ms): Definitely demands attention, needs strong justification

## EASING ASSOCIATIONS
- linear, ease, ease-out, ease-in-out → tend toward zuhandenheit (natural, predictable)
- ease-in, bounce, elastic → tend toward vorhandenheit (draw attention)

## PROPERTY ASSOCIATIONS
- opacity: Usually functional (presence/absence)
- transform: Context-dependent (spatial meaning?)
- height/width: Usually functional (expansion/collapse)
- color: Usually functional (state indication)
- box-shadow, filter, border-radius: Usually decorative

## JUDGMENT CRITERIA (CREATE SOMETHING ethos)
- Every animation must justify its existence
- If it cannot justify, it must be removed
- Functional over decorative
- Less, but better (Weniger, aber besser)
- Honest about what is happening

## YOUR TASK
Given technical data about animations, analyze and respond in JSON:

{
  "disclosure": "disclosure_type",
  "disclosureDescription": "what specifically is being revealed",
  "mode": "zuhandenheit" | "vorhandenheit",
  "modeRationale": "why this mode based on duration, easing, properties",
  "judgment": "functional" | "decorative" | "ambiguous",
  "justification": "why this motion should or should not exist",
  "recommendation": {
    "action": "keep" | "modify" | "remove",
    "reasoning": "why this action",
    "modification": "if modify, what specific change"
  },
  "confidence": 0.0-1.0
}

Be concise but precise. Ground every judgment in the phenomenological framework.`;

/**
 * Format technical analysis for Claude
 */
function formatTechnicalContext(
  technical: TechnicalAnalysis,
  url: string
): string {
  const lines: string[] = [
    `URL: ${url}`,
    `Trigger: ${technical.triggerType}`,
    `Extracted: ${technical.extractedAt}`,
    '',
  ];

  if (technical.animations.length > 0) {
    lines.push(`## Animations (${technical.animations.length})`);
    for (const anim of technical.animations) {
      lines.push(`- ${anim.name}: ${anim.duration}ms, easing: ${anim.easing}`);
      if (anim.keyframes.length > 0) {
        for (const kf of anim.keyframes) {
          const props = Object.entries(kf.properties)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          lines.push(`  ${Math.round(kf.offset * 100)}%: ${props}`);
        }
      }
    }
    lines.push('');
  }

  if (technical.transitions.length > 0) {
    lines.push(`## Transitions (${technical.transitions.length})`);
    for (const trans of technical.transitions) {
      lines.push(
        `- ${trans.property}: ${trans.duration}ms, easing: ${trans.easing}`
      );
    }
    lines.push('');
  }

  lines.push(`## Timing Profile`);
  lines.push(`- Total duration: ${technical.timing.totalDuration}ms`);
  lines.push(`- Longest: ${technical.timing.longestAnimation}ms`);
  lines.push(`- Average: ${Math.round(technical.timing.averageDuration)}ms`);
  lines.push('');

  if (technical.propertiesAnimated.length > 0) {
    lines.push(`## Properties Animated`);
    lines.push(technical.propertiesAnimated.join(', '));
  }

  return lines.join('\n');
}

/**
 * Analyze motion through phenomenological lens using Claude
 */
export async function interpretMotion(
  technical: TechnicalAnalysis,
  url: string
): Promise<PhenomenologicalAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Default response when no Claude API key
  if (!apiKey) {
    return createHeuristicAnalysis(technical);
  }

  const anthropic = new Anthropic({ apiKey });
  const context = formatTechnicalContext(technical, url);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this motion data:\n\n${context}\n\nRespond with ONLY valid JSON, no other text.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          disclosure: parsed.disclosure || 'none',
          disclosureDescription: parsed.disclosureDescription || '',
          mode: parsed.mode || 'vorhandenheit',
          modeRationale: parsed.modeRationale || '',
          judgment: parsed.judgment || 'ambiguous',
          justification: parsed.justification || '',
          recommendation: {
            action: parsed.recommendation?.action || 'modify',
            reasoning: parsed.recommendation?.reasoning || '',
            modification: parsed.recommendation?.modification,
          },
          confidence: parsed.confidence || 0.5,
        };
      }
    }

    return createHeuristicAnalysis(technical);
  } catch (error) {
    console.error('Claude API error:', error);
    return createHeuristicAnalysis(technical);
  }
}

/**
 * Create heuristic analysis when Claude is unavailable
 */
function createHeuristicAnalysis(
  technical: TechnicalAnalysis
): PhenomenologicalAnalysis {
  const { timing, propertiesAnimated, animations, transitions } = technical;

  // No motion detected
  if (animations.length === 0 && transitions.length === 0) {
    return {
      disclosure: 'none',
      disclosureDescription: 'No animations or transitions detected on this page.',
      mode: 'zuhandenheit',
      modeRationale: 'Absence of motion is the purest form of ready-to-hand.',
      judgment: 'functional',
      justification: 'No motion to justify. The interface presents itself directly.',
      recommendation: {
        action: 'keep',
        reasoning: 'Static interfaces embody zuhandenheit through stillness.',
      },
      confidence: 1.0,
    };
  }

  // Duration-based mode detection
  const avgDuration = timing.averageDuration;
  let mode: PhenomenologicalAnalysis['mode'] = 'zuhandenheit';
  let modeRationale = '';

  if (avgDuration <= 200) {
    mode = 'zuhandenheit';
    modeRationale = `Average duration of ${Math.round(avgDuration)}ms is fast enough to recede into perception.`;
  } else if (avgDuration <= 400) {
    mode = 'zuhandenheit';
    modeRationale = `Average duration of ${Math.round(avgDuration)}ms is moderate—borderline but likely recedes.`;
  } else {
    mode = 'vorhandenheit';
    modeRationale = `Average duration of ${Math.round(avgDuration)}ms is slow enough to demand attention.`;
  }

  // Property-based judgment
  const decorativeProperties = ['box-shadow', 'filter', 'border-radius'];
  const functionalProperties = ['opacity', 'height', 'width', 'transform', 'color'];

  const hasDecorative = propertiesAnimated.some((p) =>
    decorativeProperties.includes(p)
  );
  const hasFunctional = propertiesAnimated.some((p) =>
    functionalProperties.includes(p)
  );

  let judgment: PhenomenologicalAnalysis['judgment'] = 'ambiguous';
  if (hasFunctional && !hasDecorative) {
    judgment = 'functional';
  } else if (hasDecorative && !hasFunctional) {
    judgment = 'decorative';
  }

  // Disclosure detection
  let disclosure: PhenomenologicalAnalysis['disclosure'] = 'none';
  let disclosureDescription = '';

  if (propertiesAnimated.includes('opacity')) {
    disclosure = 'state_transition';
    disclosureDescription = 'Opacity change reveals presence/absence state.';
  } else if (
    propertiesAnimated.includes('height') ||
    propertiesAnimated.includes('width')
  ) {
    disclosure = 'state_transition';
    disclosureDescription = 'Size change reveals expansion/collapse state.';
  } else if (propertiesAnimated.includes('transform')) {
    disclosure = 'spatial_relationship';
    disclosureDescription = 'Transform may reveal spatial relationships.';
  }

  // Recommendation
  let action: 'keep' | 'modify' | 'remove' = 'keep';
  let reasoning = '';

  if (judgment === 'decorative' && mode === 'vorhandenheit') {
    action = 'remove';
    reasoning = 'Decorative motion that demands attention violates both Rams and Heidegger.';
  } else if (judgment === 'decorative') {
    action = 'modify';
    reasoning = 'Consider whether this motion reveals anything meaningful.';
  } else if (mode === 'vorhandenheit') {
    action = 'modify';
    reasoning = 'Reduce duration to help motion recede into use.';
  } else {
    action = 'keep';
    reasoning = 'Motion appears functional and unobtrusive.';
  }

  return {
    disclosure,
    disclosureDescription,
    mode,
    modeRationale,
    judgment,
    justification: `Properties animated: ${propertiesAnimated.join(', ')}. ${judgment === 'functional' ? 'These typically serve disclosure.' : judgment === 'decorative' ? 'These typically serve aesthetics over function.' : 'Purpose is context-dependent.'}`,
    recommendation: {
      action,
      reasoning,
      modification: action === 'modify' ? 'Reduce duration below 300ms or reconsider necessity.' : undefined,
    },
    confidence: 0.6, // Heuristic confidence is lower than Claude
  };
}
