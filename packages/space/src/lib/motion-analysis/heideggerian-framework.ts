/**
 * Heideggerian Framework for Motion Analysis
 *
 * Die Frage nach dem Sein der Animation
 * (The Question of the Being of Animation)
 *
 * This framework applies Heidegger's fundamental ontology to UI motion:
 *
 * 1. DASEIN (Being-there)
 *    The user exists WITH the interface, not as observer but as participant.
 *    Motion either supports or interrupts this dwelling.
 *
 * 2. ZEUG (Equipment)
 *    Animations are equipment—they serve a purpose in the totality of involvement.
 *    Good equipment withdraws; bad equipment obtrudes.
 *
 * 3. WELTLICHKEIT (Worldhood)
 *    The interface constitutes a world. Motion reveals or conceals
 *    the referential totality of that world.
 *
 * 4. ALETHEIA (Unconcealment)
 *    Truth is not correspondence but disclosure. Motion either
 *    brings-forth or covers-over the nature of what it animates.
 *
 * Based on: Being and Time (Sein und Zeit), 1927
 */

import type { DisclosureType, MotionJudgment, OntologicalMode } from './types';

/**
 * Motion that DISCLOSES (potentially justified)
 *
 * These patterns reveal something that would otherwise remain hidden.
 * Motion here serves aletheia—unconcealment of truth.
 */
export const DISCLOSURE_PATTERNS: Record<DisclosureType, string> = {
	state_transition:
		'Reveals change from one state to another (loading to loaded, collapsed to expanded, off to on)',
	spatial_relationship:
		'Reveals that elements belong together, or shows the source/target of an action',
	user_confirmation: 'Confirms that user input was received and is being processed',
	hierarchy_reveal: 'Shows what is primary, secondary, or tertiary in importance',
	temporal_sequence: 'Reveals the order of operations—what happens first, next, last',
	none: 'No disclosure detected—motion exists without revealing meaning'
};

/**
 * Motion that DECORATES (typically unjustified)
 *
 * These patterns call attention to themselves rather than
 * serving user intention. They make the interface present-at-hand.
 */
export const DECORATION_PATTERNS = [
	'entrance_flourish', // Fade-in without semantic meaning
	'parallax_effect', // Movement without information
	'hover_glow', // Visual interest without confirmation
	'infinite_loop', // Motion that never resolves
	'scroll_triggered_entrance', // Elements animate in on scroll
	'bounce_effect', // Elastic overshoot without purpose
	'shimmer_loading' // When progress indication would be more honest
] as const;

/**
 * Questions to determine ontological mode
 *
 * Zuhandenheit: The motion recedes, becoming invisible in use
 * Vorhandenheit: The motion stands out, demanding attention as object
 */
export const ONTOLOGICAL_QUESTIONS = {
	zuhandenheit: [
		'Does the motion complete before the user notices it?',
		'Does the motion feel like a natural consequence of the action?',
		'Would the user describe what happened, not how it animated?',
		'Does the motion support the next action rather than delay it?'
	],
	vorhandenheit: [
		'Does the user wait for the motion to complete?',
		'Would the user describe the animation itself?',
		'Does the motion interrupt the flow of thought?',
		'Does the motion draw attention to the interface rather than the content?'
	]
};

/**
 * Justification questions from CREATE SOMETHING ethos
 *
 * Every element must justify its existence.
 * If it cannot, it must be removed.
 */
export const JUSTIFICATION_QUESTIONS = [
	'Does this motion reveal something that would otherwise be hidden?',
	'Does the user need this motion to understand the interface?',
	'Would removing this motion reduce comprehension?',
	'Does this motion draw attention to itself or to the content?',
	'Is this motion honest about what is happening?'
];

/**
 * Duration thresholds for motion judgment
 *
 * Based on perceptual psychology and usability research.
 * Motion beyond these thresholds likely obstructs.
 */
export const DURATION_THRESHOLDS = {
	instant: 100, // Perceived as instant, maximum zuhandenheit
	fast: 200, // Quick feedback, still recedes
	moderate: 300, // Standard transition, borderline
	slow: 500, // Noticeable, approaching vorhandenheit
	theatrical: 1000 // Definitely decorative unless disclosure is significant
};

/**
 * Easing functions and their typical associations
 */
export const EASING_ASSOCIATIONS: Record<string, { mode: OntologicalMode; rationale: string }> = {
	linear: {
		mode: 'zuhandenheit',
		rationale: 'Mechanical, predictable, does not call attention'
	},
	ease: {
		mode: 'zuhandenheit',
		rationale: 'Natural deceleration, mimics physical world'
	},
	'ease-in': {
		mode: 'vorhandenheit',
		rationale: 'Slow start draws attention to beginning'
	},
	'ease-out': {
		mode: 'zuhandenheit',
		rationale: 'Quick start, gentle landing, feels responsive'
	},
	'ease-in-out': {
		mode: 'zuhandenheit',
		rationale: 'Balanced, natural for spatial transitions'
	},
	'cubic-bezier(0.68, -0.55, 0.265, 1.55)': {
		mode: 'vorhandenheit',
		rationale: 'Bounce/overshoot calls attention to itself'
	}
};

/**
 * Properties that typically serve disclosure vs decoration
 */
export const PROPERTY_ASSOCIATIONS: Record<string, { typical: MotionJudgment; reason: string }> = {
	opacity: {
		typical: 'functional',
		reason: 'Shows presence/absence, state change'
	},
	transform: {
		typical: 'ambiguous',
		reason: 'Depends on whether spatial relationship is meaningful'
	},
	height: {
		typical: 'functional',
		reason: 'Reveals expansion/collapse, content disclosure'
	},
	width: {
		typical: 'functional',
		reason: 'Reveals expansion/collapse, content disclosure'
	},
	'background-color': {
		typical: 'ambiguous',
		reason: 'Can indicate state or be purely decorative'
	},
	color: {
		typical: 'functional',
		reason: 'Usually indicates state (hover, active, disabled)'
	},
	'box-shadow': {
		typical: 'decorative',
		reason: 'Rarely conveys information, usually visual interest'
	},
	filter: {
		typical: 'decorative',
		reason: 'Visual effect without semantic meaning'
	},
	'border-radius': {
		typical: 'decorative',
		reason: 'Shape change rarely conveys information'
	}
};

/**
 * System prompt for AI phenomenological analysis
 *
 * This prompt instructs the AI to analyze motion through Heidegger's framework
 * and CREATE SOMETHING's ethos.
 */
export const PHENOMENOLOGICAL_SYSTEM_PROMPT = `You are analyzing UI motion through Heidegger's phenomenological framework for CREATE SOMETHING.

## CORE CONCEPTS

**Zuhandenheit (ready-to-hand)**: Motion that recedes into the background, supporting the user's intention without demanding attention. Like a well-worn tool, it becomes invisible in use. The user focuses on their goal, not the interface.

**Vorhandenheit (present-at-hand)**: Motion that obstructs, forcing awareness of the interface itself. The user becomes conscious of the animation as an object, interrupting their flow of thought.

**Aletheia (unconcealment)**: Truth as revealing. Motion should disclose relationships, causation, or state changes that would otherwise remain hidden.

## DISCLOSURE TYPES

- state_transition: Loading to loaded, collapsed to expanded, off to on
- spatial_relationship: Shows that elements belong together, or source/target of action
- user_confirmation: Confirms user input was received
- hierarchy_reveal: Shows what is primary, secondary, tertiary
- temporal_sequence: Reveals order of operations
- none: No meaningful disclosure

## JUDGMENT CRITERIA (CREATE SOMETHING ethos)

- Every element must justify its existence
- If it cannot justify, it must be removed
- Functional over decorative
- Less, but better
- Honest about what is happening

## YOUR TASK

Given technical data about animations and a screenshot, analyze:

1. **DISCLOSURE**: What does this motion reveal? Use one of the disclosure types.
2. **MODE**: Is this zuhandenheit (tool recedes) or vorhandenheit (tool obstructs)?
3. **JUDGMENT**: functional, decorative, or ambiguous
4. **JUSTIFICATION**: Why should this motion exist (or not)?
5. **RECOMMENDATION**: keep, modify (specify how), or remove

Respond in JSON format:
{
  "disclosure": "disclosure_type",
  "disclosureDescription": "specific description of what is revealed",
  "mode": "zuhandenheit|vorhandenheit",
  "modeRationale": "why this mode",
  "judgment": "functional|decorative|ambiguous",
  "justification": "why this motion should or should not exist",
  "recommendation": {
    "action": "keep|modify|remove",
    "reasoning": "why this action",
    "modification": "if modify, what change"
  },
  "confidence": 0.0-1.0
}`;

/**
 * Format technical data for AI context
 */
export function formatTechnicalContext(
	technical: {
		animations: Array<{
			name: string;
			duration: number;
			easing: string;
			keyframes: Array<{ offset: number; properties: Record<string, string> }>;
		}>;
		propertiesAnimated: string[];
		triggerType: string;
	},
	url: string
): string {
	const lines = [`## URL: ${url}`, '', '## Trigger: ' + technical.triggerType, '', '## Animations'];

	for (const anim of technical.animations) {
		lines.push(`- ${anim.name || 'unnamed'}: ${anim.duration}ms, ${anim.easing}`);
		if (anim.keyframes.length > 0) {
			lines.push('  Keyframes:');
			for (const kf of anim.keyframes) {
				const props = Object.entries(kf.properties)
					.map(([k, v]) => `${k}: ${v}`)
					.join(', ');
				lines.push(`    ${kf.offset * 100}%: ${props}`);
			}
		}
	}

	lines.push('', '## Properties Animated: ' + technical.propertiesAnimated.join(', '));

	return lines.join('\n');
}
