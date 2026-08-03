import sourceStandard from './ltd-source-standard.webp';
import sourceStandardMobile from './ltd-source-standard-mobile.webp';
import learningSequence from './learn-learning-sequence.webp';
import learningSequenceMobile from './learn-learning-sequence-mobile.webp';
import pressureHandoff from './paper-pressure-handoff.svg';
import pressureHandoffMobile from './paper-pressure-handoff-mobile.svg';
import pressurePrototype from './space-pressure-prototype.webp';
import pressurePrototypeMobile from './space-pressure-prototype-mobile.webp';
import researchTrace from './io-research-trace.webp';
import researchTraceMobile from './io-research-trace-mobile.webp';

import type { PerformanceMediaStudy } from './types';
import type { PerformancePaperProperty } from './paper-studio';

export const paperCanonSheetMedia = {
  src: sourceStandard,
  mobileSrc: sourceStandardMobile,
  alt: 'A blank cotton paper standard secured to a precision rail with a cobalt source tab.',
  condition: 'source',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural',
  paperObjectVisible: true
} as const satisfies PerformanceMediaStudy;

export const paperResearchTraceMedia = {
  src: researchTrace,
  mobileSrc: researchTraceMobile,
  alt: 'Layered archival paper research records registered to a graphite trace and cobalt source tab.',
  condition: 'trace',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural',
  paperObjectVisible: true
} as const satisfies PerformanceMediaStudy;

export const paperPrototypeScoreMedia = {
  src: pressurePrototype,
  mobileSrc: pressurePrototypeMobile,
  alt: 'A stepped paper prototype held under a matte black compression rail with a cobalt calibration tab.',
  condition: 'score',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural',
  paperObjectVisible: true
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
  colorMode: 'natural',
  studioShot: 'agency'
} as const satisfies PerformanceMediaStudy;

export const paperLearningSequenceMedia = {
  src: learningSequence,
  mobileSrc: learningSequenceMobile,
  alt: 'A continuous accordion-fold paper sequence held by guide rails with a cobalt learning tab.',
  condition: 'sequence',
  material: 'paper',
  width: 1536,
  height: 1024,
  objectPosition: 'center',
  colorMode: 'natural',
  paperObjectVisible: true
} as const satisfies PerformanceMediaStudy;

export const performancePaperStudies = {
  ltd: paperCanonSheetMedia,
  io: paperResearchTraceMedia,
  space: paperPrototypeScoreMedia,
  agency: paperPressureHandoffMedia,
  learn: paperLearningSequenceMedia
} as const satisfies Record<PerformancePaperProperty, PerformanceMediaStudy>;
