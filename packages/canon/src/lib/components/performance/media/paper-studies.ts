import canonSheet from './paper-canon-sheet.svg';
import canonSheetMobile from './paper-canon-sheet-mobile.svg';
import learningSequence from './paper-learning-sequence.svg';
import learningSequenceMobile from './paper-learning-sequence-mobile.svg';
import pressureHandoff from './paper-pressure-handoff.svg';
import pressureHandoffMobile from './paper-pressure-handoff-mobile.svg';
import prototypeScore from './paper-prototype-score.svg';
import prototypeScoreMobile from './paper-prototype-score-mobile.svg';
import researchTrace from './paper-research-trace.svg';
import researchTraceMobile from './paper-research-trace-mobile.svg';

import type { PerformanceMediaStudy } from './types';

export type PerformancePaperProperty = 'ltd' | 'io' | 'space' | 'agency' | 'learn';

export const paperCanonSheetMedia = {
  src: canonSheet,
  mobileSrc: canonSheetMobile,
  alt: 'A folded paper standard with a measured spine, margin rules, and a registered source mark.',
  condition: 'source',
  material: 'paper',
  width: 1600,
  height: 1000,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperResearchTraceMedia = {
  src: researchTrace,
  mobileSrc: researchTraceMobile,
  alt: 'Layered paper research records connected by a blue provenance trace and precise citation marks.',
  condition: 'trace',
  material: 'paper',
  width: 1600,
  height: 1000,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperPrototypeScoreMedia = {
  src: prototypeScore,
  mobileSrc: prototypeScoreMobile,
  alt: 'A folded paper prototype held open by scored test lines, registration points, and a pressure mark.',
  condition: 'score',
  material: 'paper',
  width: 1600,
  height: 1000,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperPressureHandoffMedia = {
  src: pressureHandoff,
  mobileSrc: pressureHandoffMobile,
  alt: 'A tactile paper field with a controlled fold, separated measurement rail, and stamped handoff zone.',
  condition: 'pressure',
  material: 'paper',
  width: 1600,
  height: 1000,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const paperLearningSequenceMedia = {
  src: learningSequence,
  mobileSrc: learningSequenceMobile,
  alt: 'An accordion-fold paper workbook progressing through measured lessons toward an attached proof mark.',
  condition: 'sequence',
  material: 'paper',
  width: 1600,
  height: 1000,
  objectPosition: 'center',
  colorMode: 'natural'
} as const satisfies PerformanceMediaStudy;

export const performancePaperStudies = {
  ltd: paperCanonSheetMedia,
  io: paperResearchTraceMedia,
  space: paperPrototypeScoreMedia,
  agency: paperPressureHandoffMedia,
  learn: paperLearningSequenceMedia
} as const satisfies Record<PerformancePaperProperty, PerformanceMediaStudy>;
