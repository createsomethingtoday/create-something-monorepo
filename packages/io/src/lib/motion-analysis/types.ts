/**
 * Motion Analysis Types
 *
 * Minimal types for the Motion Analyzer tool.
 */

export type TriggerType = 'load' | 'click' | 'hover' | 'scroll' | 'focus';

export interface TriggerConfig {
	type: TriggerType;
	selector?: string;
}

export interface AnimationData {
	name: string;
	duration: number;
	easing: string;
	delay: number;
	iterations: number;
	fillMode: string;
	keyframes: Array<{ offset: number; properties: Record<string, string> }>;
	targetSelector?: string;
}

export interface TransitionData {
	property: string;
	duration: number;
	easing: string;
	delay: number;
}

export interface TimingProfile {
	totalDuration: number;
	longestAnimation: number;
	averageDuration: number;
}

export interface ExtractionDebug {
	elementFound?: boolean;
	hoverTriggered?: boolean;
	animationsBeforeHover?: number;
	animationsAfterHover?: number;
	captureTime?: number;
}

export interface TechnicalAnalysis {
	animations: AnimationData[];
	transitions: TransitionData[];
	timing: TimingProfile;
	propertiesAnimated: string[];
	debug?: ExtractionDebug;
}

export type MotionJudgment = 'functional' | 'decorative' | 'ambiguous';

export interface PhenomenologicalAnalysis {
	disclosure: string;
	disclosureDescription: string;
	mode: 'zuhandenheit' | 'vorhandenheit';
	modeRationale: string;
	judgment: MotionJudgment;
	justification: string;
	recommendation: {
		action: 'keep' | 'modify' | 'remove';
		reasoning: string;
		modification?: string;
	};
	confidence: number;
}

export interface MotionAnalysisResult {
	success: boolean;
	technical: TechnicalAnalysis;
	phenomenological: PhenomenologicalAnalysis;
	metadata: {
		url: string;
		analyzedAt: string;
		duration: number;
	};
	error?: string;
}
