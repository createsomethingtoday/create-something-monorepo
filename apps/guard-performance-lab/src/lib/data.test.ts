import { describe, expect, it } from 'vitest';
import {
  accessHandoff,
  clockPhases,
  courtReadOrder,
  evidenceFlow,
  guardSchemeLibrary,
  introductionFlow,
  levelTransitions,
  roleMap,
  schemeReadMap,
  sessionOneBoundary
} from './data.js';

describe('Session 01 introduction map', () => {
  it('maps the full arrival, coached session, and evidence closeout', () => {
    expect(introductionFlow.map((step) => step.id)).toEqual(['arrive', 'prepare', 'train', 'receipt']);
    expect(introductionFlow[0]?.time).toBe('10:00');
    expect(introductionFlow[2]?.time).toBe('10:30');
    expect(introductionFlow[3]?.time).toBe('11:30');
  });

  it('assigns the system, player, coach, and Codex distinct jobs', () => {
    expect(roleMap.map((role) => role.owner)).toEqual(['System', 'Player', 'Coach', 'Codex']);
    expect(roleMap.find((role) => role.owner === 'Coach')?.boundary).toContain('context');
    expect(roleMap.find((role) => role.owner === 'Codex')?.boundary).toContain('source');
  });

  it('makes the current coach-instance and later player-binding handoff explicit', () => {
    expect(accessHandoff.map((step) => step.id)).toEqual(['now', 'later']);
    expect(accessHandoff[0]?.detail).toContain('coach');
    expect(accessHandoff[1]?.detail).toContain('legitimate');
    expect(accessHandoff[1]?.boundary).toContain('binding');
  });

  it('includes every expected level and preserves the college width correction', () => {
    expect(levelTransitions.map((level) => level.id)).toEqual(['youth', 'high-school', 'college', 'pro']);
    const college = levelTransitions.find((level) => level.id === 'college');
    expect(college?.court).toContain('94 × 50 ft');
    expect(college?.change).toContain('not wider');
    expect(college?.clock).toContain('30-second');
    expect(levelTransitions.every((level) => level.verify.length > 0)).toBe(true);
  });

  it('maps schemes and misdirection as pictures and choices rather than a scheme dump', () => {
    expect(schemeReadMap.map((item) => item.id)).toEqual(['first-defender', 'first-helper', 'ball-screen', 'misdirection', 'second-side']);
    expect(schemeReadMap.find((item) => item.id === 'misdirection')?.proof).toContain('defender');
    expect(sessionOneBoundary.include).toContain('one help read');
    expect(sessionOneBoundary.defer).toContain('full scheme library');
  });

  it('keeps Where the read lives to one progressive four-location order', () => {
    expect(courtReadOrder.map((read) => read.id)).toEqual(['ball', 'nail', 'low-man', 'second-side']);
    expect(courtReadOrder.filter((read) => read.session === 'now').map((read) => read.id)).toEqual(['ball', 'nail', 'low-man']);
    expect(courtReadOrder.filter((read) => read.session === 'next').map((read) => read.id)).toEqual(['second-side']);
  });

  it('provides a staged guard-literacy library across the major scheme families', () => {
    expect([...new Set(guardSchemeLibrary.map((scheme) => scheme.family))]).toEqual([
      'spacing', 'creation', 'coverage', 'continuation', 'pressure'
    ]);
    expect(guardSchemeLibrary.map((scheme) => scheme.id)).toEqual(expect.arrayContaining([
      'five-out', 'four-out-one-in', 'drag-screen', 'high-side-pnr', 'zoom-chicago', 'pistol-21', 'horns',
      'under-drop', 'switch', 'show-blitz', 'ice', 'reject-rescreen-snake', 'short-roll', 'spain-pnr',
      'gap-man', 'zone-shells', 'press-break'
    ]));
    expect(guardSchemeLibrary.filter((scheme) => scheme.phase === 'now')).toHaveLength(3);
    expect(guardSchemeLibrary.every((scheme) => scheme.picture && scheme.read && scheme.firstAnswer)).toBe(true);
  });

  it('includes possession clock orientation and a source-to-receipt evidence path', () => {
    expect(clockPhases.map((phase) => phase.id)).toEqual(['early', 'middle', 'late']);
    expect(evidenceFlow.map((step) => step.id)).toEqual(['locate', 'observe', 'infer', 'test', 'receipt']);
    expect(evidenceFlow.find((step) => step.id === 'infer')?.boundary).toContain('not a verdict');
  });
});
