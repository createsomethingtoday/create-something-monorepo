import { glossary } from './data.js';

export type CourtPoint = readonly [x: number, z: number];
export type SceneTone = 'pressure' | 'signal' | 'growth' | 'gold' | 'ink';
export type ActorKind = 'guard' | 'teammate' | 'defender' | 'ball';
export type ActorTiming = 'linear' | 'burst' | 'hesitation' | 'quick' | 'return';

export interface SharedLanguageActor {
  id: string;
  kind: ActorKind;
  path: readonly CourtPoint[];
  timing?: ActorTiming;
  delay?: number;
  scale?: number;
  focus?: boolean;
}

export interface SharedLanguageZone {
  center: CourtPoint;
  size: CourtPoint;
  tone: SceneTone;
}

export interface SharedLanguageScene {
  term: string;
  meaning: string;
  caption: string;
  cue: string;
  durationMs: number;
  actors: readonly SharedLanguageActor[];
  zones: readonly SharedLanguageZone[];
}

const meanings = new Map<string, string>(glossary.map(([term, meaning]) => [term, meaning]));

function actor(
  id: string,
  kind: ActorKind,
  path: readonly CourtPoint[],
  timing: ActorTiming = 'linear',
  options: Pick<SharedLanguageActor, 'delay' | 'scale' | 'focus'> = {}
): SharedLanguageActor {
  return { id, kind, path, timing, ...options };
}

function zone(center: CourtPoint, size: CourtPoint, tone: SceneTone): SharedLanguageZone {
  return { center, size, tone };
}

function scene(
  term: string,
  config: Omit<SharedLanguageScene, 'term' | 'meaning'>
): SharedLanguageScene {
  const meaning = meanings.get(term);
  if (!meaning) throw new Error(`Shared-language scene references unknown term: ${term}`);
  return { term, meaning, ...config };
}

export const sharedLanguageScenes: Record<string, SharedLanguageScene> = {
  Advantage: scene('Advantage', {
    caption: 'The orange guard gets a shoulder beyond the on-ball defender, forcing the helper to choose between the ball and the blue teammate.',
    cue: 'Beat one. Make two decide. Finish or find the open player.',
    durationMs: 3600,
    actors: [
      actor('guard', 'guard', [[17, -8], [10, 0], [4, 8], [4, 8]], 'burst', { focus: true }),
      actor('ball', 'ball', [[17, -8], [10, 0], [4, 8], [-12, 11]], 'burst'),
      actor('on-ball', 'defender', [[14, -5], [10, -1], [9, 3], [9, 3]], 'burst'),
      actor('helper', 'defender', [[-1, 10], [-1, 10], [4, 8], [4, 8]], 'burst'),
      actor('open-player', 'teammate', [[-12, 11]])
    ],
    zones: [zone([4, 8], [12, 12], 'pressure'), zone([-12, 11], [8, 8], 'growth')]
  }),
  Downhill: scene('Downhill', {
    caption: 'The guard wins an angle from the slot and carries forward momentum toward the rim before help is set.',
    cue: 'Win the shoulder. Carry the angle to the rim.',
    durationMs: 3000,
    actors: [
      actor('guard', 'guard', [[15, -9], [10, -1], [5, 8], [1, 16]], 'burst', { focus: true }),
      actor('ball', 'ball', [[15, -9], [10, -1], [5, 8], [1, 16]], 'burst'),
      actor('trailer', 'defender', [[12, -5], [9, 1], [7, 8]])
    ],
    zones: [zone([7, 7], [10, 24], 'pressure')]
  }),
  'Paint touch': scene('Paint touch', {
    caption: 'The guard enters the lane under control, stops in the paint, and keeps finish and pass options visible.',
    cue: 'Touch paint with balance and keep two answers.',
    durationMs: 3400,
    actors: [
      actor('guard', 'guard', [[18, -4], [10, 3], [5, 10], [5, 10]], 'hesitation', { focus: true }),
      actor('ball', 'ball', [[18, -4], [10, 3], [5, 10], [5, 10]], 'hesitation'),
      actor('low-helper', 'defender', [[-4, 15], [0, 13]]),
      actor('corner', 'teammate', [[-20, 18]])
    ],
    zones: [zone([0, 13], [12, 18], 'gold')]
  }),
  Gap: scene('Gap', {
    caption: 'Two defenders begin wide enough to expose the space between them, and the guard attacks that opening.',
    cue: 'See the daylight. Attack before it closes.',
    durationMs: 3200,
    actors: [
      actor('guard', 'guard', [[0, -11], [0, -2], [0, 8]], 'burst', { focus: true }),
      actor('ball', 'ball', [[0, -11], [0, -2], [0, 8]], 'burst'),
      actor('left-defense', 'defender', [[-9, 2], [-5, 5]]),
      actor('right-defense', 'defender', [[9, 2], [5, 5]])
    ],
    zones: [zone([0, 4], [10, 15], 'growth')]
  }),
  Slot: scene('Slot', {
    caption: 'The highlighted upper lane shows the slot, with the guard arriving between the middle and the wing.',
    cue: 'Name the slot, hold the width, start the action.',
    durationMs: 3200,
    actors: [
      actor('guard', 'guard', [[20, -1], [14, -5], [12, -5]], 'hesitation', { focus: true }),
      actor('ball', 'ball', [[20, -1], [14, -5], [12, -5]], 'hesitation'),
      actor('wing', 'teammate', [[20, 7]]),
      actor('top', 'teammate', [[0, -11]])
    ],
    zones: [zone([12, -5], [9, 11], 'signal')]
  }),
  Nail: scene('Nail', {
    caption: 'The middle helper steps to the center of the free-throw line as the guard approaches the lane.',
    cue: 'Find the nail before dribble two.',
    durationMs: 3300,
    actors: [
      actor('guard', 'guard', [[16, -7], [10, 0], [7, 7]], 'burst', { focus: true }),
      actor('ball', 'ball', [[16, -7], [10, 0], [7, 7]], 'burst'),
      actor('nail-helper', 'defender', [[-5, 4], [0, 4], [0, 4]], 'quick')
    ],
    zones: [zone([0, 4.5], [7, 5], 'signal')]
  }),
  'Low man': scene('Low man', {
    caption: 'The deepest weak-side defender leaves the baseline matchup and rotates toward the rim as the drive arrives.',
    cue: 'See the low man leave, then find the space.',
    durationMs: 3500,
    actors: [
      actor('guard', 'guard', [[17, -3], [10, 5], [6, 13]], 'burst', { focus: true }),
      actor('ball', 'ball', [[17, -3], [10, 5], [6, 13], [-18, 18]], 'quick', { delay: 0.35 }),
      actor('low-man', 'defender', [[-12, 17], [-3, 16], [0, 16]], 'quick'),
      actor('corner', 'teammate', [[-20, 19]])
    ],
    zones: [zone([-7, 16], [13, 9], 'signal')]
  }),
  'Top foot': scene('Top foot', {
    caption: 'The sideline-side foot is highlighted by the defender’s angle, and the guard attacks outside that foot.',
    cue: 'Read the high foot and take the open hip.',
    durationMs: 3100,
    actors: [
      actor('guard', 'guard', [[18, -5], [20, 3], [18, 10]], 'burst', { focus: true }),
      actor('ball', 'ball', [[18, -5], [20, 3], [18, 10]], 'burst'),
      actor('defender', 'defender', [[16, 0], [17, 2], [17, 4]], 'hesitation', { focus: true })
    ],
    zones: [zone([19, 4], [7, 16], 'gold')]
  }),
  'Change of pace': scene('Change of pace', {
    caption: 'The guard approaches slowly, pauses the defender’s timing, then accelerates through the open shoulder.',
    cue: 'Slow enough to move them, fast enough to leave.',
    durationMs: 3800,
    actors: [
      actor('guard', 'guard', [[16, -10], [14, -4], [13, -1], [7, 9]], 'hesitation', { focus: true }),
      actor('ball', 'ball', [[16, -10], [14, -4], [13, -1], [7, 9]], 'hesitation'),
      actor('defender', 'defender', [[12, 0], [13, 1], [11, 4]], 'hesitation')
    ],
    zones: [zone([10, 4], [9, 19], 'pressure')]
  }),
  'Hang / hesitation': scene('Hang / hesitation', {
    caption: 'The guard legally pauses with the ball alive, waits for the defender to rise, and then continues downhill.',
    cue: 'Hang with balance. Go when the defender stands.',
    durationMs: 4000,
    actors: [
      actor('guard', 'guard', [[15, -8], [12, -1], [12, -1], [6, 10]], 'hesitation', { focus: true }),
      actor('ball', 'ball', [[15, -8], [12, -1], [12, -1], [6, 10]], 'hesitation'),
      actor('defender', 'defender', [[10, 1], [10, 0], [11, -1], [9, 4]], 'hesitation')
    ],
    zones: [zone([12, -1], [7, 7], 'gold')]
  }),
  Freeze: scene('Freeze', {
    caption: 'The orange guard dribbles at the black helper, making that defender guard the ball before passing to the blue teammate.',
    cue: 'Dribble at the helper. Make them commit. Pass behind the help.',
    durationMs: 3600,
    actors: [
      actor('guard', 'guard', [[0, -10], [3, -5], [6, 0], [6, 0]], 'burst', { focus: true }),
      actor('ball', 'ball', [[0, -10], [3, -5], [6, 0], [17, 7]], 'burst'),
      actor('helper', 'defender', [[9, 1], [9, 1], [6, 0], [6, 0]], 'burst', { focus: true }),
      actor('teammate', 'teammate', [[17, 7]])
    ],
    zones: [zone([6, 0], [8, 8], 'pressure'), zone([17, 7], [8, 8], 'growth')]
  }),
  Reject: scene('Reject', {
    caption: 'The defender leans toward the screen, so the guard changes pace and attacks the open side away from it.',
    cue: 'Show the screen. Read the lean. Reject.',
    durationMs: 3300,
    actors: [
      actor('guard', 'guard', [[8, -7], [9, -3], [17, 7]], 'burst', { focus: true }),
      actor('ball', 'ball', [[8, -7], [9, -3], [17, 7]], 'burst'),
      actor('screener', 'teammate', [[2, -1]], 'linear', { scale: 1.2 }),
      actor('defender', 'defender', [[6, -3], [3, 0], [5, 2]])
    ],
    zones: [zone([16, 6], [9, 17], 'growth')]
  }),
  Stunt: scene('Stunt', {
    caption: 'The off-ball defender takes one short step toward the ball, then recovers to the original matchup.',
    cue: 'See the fake help, keep the pass available.',
    durationMs: 3000,
    actors: [
      actor('guard', 'guard', [[13, -3], [9, 4]], 'hesitation', { focus: true }),
      actor('ball', 'ball', [[13, -3], [9, 4]]),
      actor('stunt-defender', 'defender', [[-4, 8], [2, 7], [-4, 8]], 'return', { focus: true }),
      actor('wing', 'teammate', [[-13, 6]])
    ],
    zones: [zone([1, 7], [9, 8], 'signal')]
  }),
  Shrink: scene('Shrink', {
    caption: 'Both off-ball defenders step toward the lane without fully leaving their assignments as the guard drives.',
    cue: 'Feel the floor shrink, then move it again.',
    durationMs: 3400,
    actors: [
      actor('guard', 'guard', [[0, -9], [0, 7]], 'burst', { focus: true }),
      actor('ball', 'ball', [[0, -9], [0, 7]]),
      actor('left-help', 'defender', [[-17, 7], [-8, 8], [-17, 7]], 'return'),
      actor('right-help', 'defender', [[17, 7], [8, 8], [17, 7]], 'return'),
      actor('left-wing', 'teammate', [[-21, 4]]),
      actor('right-wing', 'teammate', [[21, 4]])
    ],
    zones: [zone([0, 8], [18, 13], 'signal')]
  }),
  'Second side': scene('Second side', {
    caption: 'The ball moves from the first action through the top and reaches the opposite side after the defense shifts.',
    cue: 'Shift them once. Arrive ready on the second side.',
    durationMs: 3800,
    actors: [
      actor('left-guard', 'guard', [[-17, 0]], 'linear', { focus: true }),
      actor('top', 'teammate', [[0, -10]]),
      actor('right-wing', 'teammate', [[17, 0]]),
      actor('ball', 'ball', [[-17, 0], [0, -10], [17, 0]], 'quick'),
      actor('defense', 'defender', [[-10, 4], [0, 2], [10, 4]])
    ],
    zones: [zone([15, 1], [12, 13], 'growth')]
  }),
  'One more': scene('One more', {
    caption: 'The first open teammate immediately sends the pass to a second teammate with an even cleaner window.',
    cue: 'Open is good. More open is better.',
    durationMs: 3000,
    actors: [
      actor('driver', 'guard', [[7, 8]], 'linear', { focus: true }),
      actor('first-open', 'teammate', [[-6, 1]]),
      actor('more-open', 'teammate', [[-19, 12]]),
      actor('ball', 'ball', [[7, 8], [-6, 1], [-19, 12]], 'quick'),
      actor('helper', 'defender', [[0, 9], [-4, 5], [-8, 8]])
    ],
    zones: [zone([-18, 12], [9, 10], 'growth')]
  }),
  Drop: scene('Drop', {
    caption: 'The screen defender retreats near the lane while the guard turns the corner with pull-up and pass windows.',
    cue: 'Put the trailer behind and read the dropping big.',
    durationMs: 3600,
    actors: [
      actor('guard', 'guard', [[13, -6], [7, 1], [5, 9]], 'burst', { focus: true }),
      actor('ball', 'ball', [[13, -6], [7, 1], [5, 9]], 'burst'),
      actor('screener', 'teammate', [[7, -1]], 'linear', { scale: 1.2 }),
      actor('trailer', 'defender', [[12, -2], [8, 3], [7, 7]]),
      actor('drop-big', 'defender', [[0, 13], [1, 11], [2, 10]], 'hesitation')
    ],
    zones: [zone([1, 11], [12, 11], 'signal')]
  }),
  Snake: scene('Snake', {
    caption: 'After using the screen, the guard crosses back over its path and keeps the trailing defender behind.',
    cue: 'Turn the corner, cross with purpose, keep the trailer.',
    durationMs: 3800,
    actors: [
      actor('guard', 'guard', [[13, -6], [7, 1], [-3, 7]], 'burst', { focus: true }),
      actor('ball', 'ball', [[13, -6], [7, 1], [-3, 7]], 'burst'),
      actor('screener', 'teammate', [[7, -1]], 'linear', { scale: 1.2 }),
      actor('trailer', 'defender', [[12, -2], [8, 3], [3, 6]]),
      actor('drop-big', 'defender', [[0, 13], [0, 11]])
    ],
    zones: [zone([0, 7], [16, 13], 'growth')]
  }),
  Lift: scene('Lift', {
    caption: 'As the guard drives, the corner teammate rises toward the wing to reopen a clean passing window.',
    cue: 'Drive creates the lift; lift restores the window.',
    durationMs: 3400,
    actors: [
      actor('guard', 'guard', [[15, -2], [8, 8]], 'burst', { focus: true }),
      actor('ball', 'ball', [[15, -2], [8, 8], [-17, 2]], 'quick', { delay: 0.35 }),
      actor('lift-player', 'teammate', [[-20, 18], [-17, 2]], 'quick', { focus: true }),
      actor('helper', 'defender', [[-5, 13], [1, 11]])
    ],
    zones: [zone([-18, 5], [9, 22], 'growth')]
  }),
  Drift: scene('Drift', {
    caption: 'The baseline teammate travels toward the corner in the same direction as the paint drive, staying visible behind help.',
    cue: 'Drive the paint. Drift behind the low man.',
    durationMs: 3500,
    actors: [
      actor('guard', 'guard', [[-15, -2], [-7, 9], [-3, 14]], 'burst', { focus: true }),
      actor('ball', 'ball', [[-15, -2], [-7, 9], [-3, 14], [19, 19]], 'quick', { delay: 0.4 }),
      actor('drift-player', 'teammate', [[8, 18], [19, 19]], 'quick', { focus: true }),
      actor('low-man', 'defender', [[7, 13], [1, 15]])
    ],
    zones: [zone([14, 18], [15, 8], 'growth')]
  }),
  '0.5 decision': scene('0.5 decision', {
    caption: 'The pass arrives and the guard immediately chooses the open drive before the closing defender can reset.',
    cue: 'Catch ready. Read once. Act now.',
    durationMs: 2400,
    actors: [
      actor('passer', 'teammate', [[-10, -2]]),
      actor('guard', 'guard', [[15, -1], [12, 5], [8, 11]], 'quick', { delay: 0.3, focus: true }),
      actor('ball', 'ball', [[-10, -2], [15, -1], [12, 5], [8, 11]], 'quick'),
      actor('closeout', 'defender', [[5, 2], [11, 0], [10, 5]], 'quick')
    ],
    zones: [zone([13, 1], [8, 9], 'gold')]
  }),
  'Early / middle / late clock': scene('Early / middle / late clock', {
    caption: 'The possession moves from early creation, through a middle-clock shift, to one simple late-clock action.',
    cue: 'Create early. Attack the shift. Simplify late.',
    durationMs: 4800,
    actors: [
      actor('guard', 'guard', [[0, -11], [14, -3], [7, 8], [0, 14]], 'linear', { focus: true }),
      actor('ball', 'ball', [[0, -11], [14, -3], [-12, 1], [0, 14]], 'quick'),
      actor('right-wing', 'teammate', [[18, -1]]),
      actor('left-wing', 'teammate', [[-18, 1]]),
      actor('defense', 'defender', [[7, -2], [11, 2], [1, 7], [0, 11]])
    ],
    zones: [
      zone([0, -9], [12, 7], 'signal'),
      zone([13, 1], [10, 11], 'gold'),
      zone([0, 14], [12, 10], 'pressure')
    ]
  })
};

export function getSharedLanguageScene(term: string): SharedLanguageScene {
  const scene = sharedLanguageScenes[term];
  if (!scene) throw new Error(`No animated shared-language scene for ${term}`);
  return scene;
}
