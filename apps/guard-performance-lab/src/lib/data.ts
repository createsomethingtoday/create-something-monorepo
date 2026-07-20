export const sessionBlocks = [
  ['10:00–10:03', 'Arrival + boundary', 'Greet him, show his half, explain loose-ball and water rules.', 'Comfort and questions'],
  ['10:03–10:15', 'Prepare', 'Easy movement, dynamic mobility, form finishes, comfortable handles.', 'Movement, pain, balance'],
  ['10:15–10:23', 'His game', 'He reviews one skill he chooses. Observe without correcting across the gym.', 'Choice, pace, imagination'],
  ['10:23–10:30', 'Reset', 'Water, five calm makes or finishes, then watch the final adult possessions.', 'Can he name an advantage?'],
  ['10:30–10:35', 'Connect', 'Ask what he does well, what gets crowded, and what he wants to understand.', 'Vocabulary and confidence'],
  ['10:35–10:43', 'Baseline', 'Both-hand handle, stop/start, inside-hand finish, pull-up, closeout attack.', 'Eyes, braking, touch'],
  ['10:43–10:55', 'Get downhill', 'Win shoulder-to-hip, then finish from balance.', 'Angle before speed'],
  ['10:55–11:10', 'Read the help', 'Finish, stop, or pass from the nail/low-man picture.', 'Scan before dribble two'],
  ['11:10–11:23', 'Misdirection', 'Go, hang then go, or reject/change lane against guided defense.', 'Move the defender first'],
  ['11:23–11:27', 'Constraint game', '1v1 from slot or wing, three-dribble maximum.', 'Transfer under pressure'],
  ['11:27–11:30', 'Receipt', 'Player names one read; coach names one strength and one next focus.', 'Explain the picture']
] as const;

export const glossary = [
  ['Advantage', 'A defender is late, turned, outnumbered, or responsible for two threats.', 'now'],
  ['Downhill', 'An angle and momentum toward the rim before the defense is set—not simply speed.', 'now'],
  ['Paint touch', 'The ballhandler enters the lane with control and can still finish, stop, or pass.', 'now'],
  ['Gap', 'The space between two defenders. A wide gap can be attacked.', 'now'],
  ['Slot', 'The upper lane between the middle and wing, often used to start offense.', 'now'],
  ['Nail', 'The middle of the free-throw line; an early help location.', 'now'],
  ['Low man', 'The deepest weak-side helper near the rim.', 'now'],
  ['Top foot', 'The defender’s foot nearer the sideline or higher side of the floor.', 'now'],
  ['Change of pace', 'Slow-to-fast, fast-to-slow, or pause-to-go so the defender cannot time the drive.', 'now'],
  ['Hang / hesitation', 'A legal pause that makes the defender stand up or wait.', 'now'],
  ['Freeze', 'Eyes, shoulders, or a pause hold a helper in place.', 'now'],
  ['Reject', 'Attack away from an expected screen because the defender leans toward it.', 'now'],
  ['Stunt', 'A short fake help step toward the ball, followed by recovery.', 'next'],
  ['Shrink', 'Off-ball defenders move toward the lane without fully committing.', 'next'],
  ['Second side', 'The side reached after the defense has already shifted once.', 'next'],
  ['One more', 'A quick extra pass from open to more open.', 'next'],
  ['Drop', 'The screen defender stays back near the lane.', 'next'],
  ['Snake', 'The ballhandler crosses back over the screen path to keep the trailer behind.', 'next'],
  ['Lift', 'Move from corner toward wing to improve a passing window.', 'later'],
  ['Drift', 'Move along the baseline toward the corner as a drive travels toward the paint.', 'later'],
  ['0.5 decision', 'Catch and decide quickly—shoot, drive, or pass—before the defense resets.', 'later'],
  ['Early / middle / late clock', 'Possession phases: create, attack the shift, then reach a simple action.', 'later']
] as const;

export const progressionPhases = [
  ['1', 'Baseline + language', 'Explains one live possession and repeats the cue both ways.'],
  ['2', 'First advantage', 'Makes the right category of choice in guided live reps.'],
  ['3', 'Ball-screen family', 'Calls coverage and gives a simple answer without over-dribbling.'],
  ['4', 'Second side + clock', 'Creates an advantage before the clock becomes an emergency.'],
  ['5', 'Complete guard', 'Helps a lineup function even when shots do not fall.']
] as const;

export const introductionFlow = [
  { id: 'arrive', time: '10:00', label: 'Arrive + boundary', detail: 'Coach greets the player, assigns the open half court, and names loose-ball, water, and adult-run boundaries.' },
  { id: 'prepare', time: '10:03–10:30', label: 'Player-owned preparation', detail: 'The player warms up, reviews a skill he chooses, resets, then watches one final adult possession for an advantage picture.' },
  { id: 'train', time: '10:30', label: 'Agent-guided training', detail: 'Connect, calibrate, create the first advantage, read one helper, add one misdirection counter, then test the choice live.' },
  { id: 'receipt', time: '11:30', label: 'Evidence closeout', detail: 'The player explains one read. The system records one observable strength, the player’s words, and one next focus.' }
] as const;

export const roleMap = [
  { owner: 'System', job: 'Own the interaction sequence, ask for context, preserve the safety stop, and prompt the receipt.', boundary: 'The program guides; it does not invent evidence or a player verdict.' },
  { owner: 'Player', job: 'Choose, try, explain, and complete only the optional profile context he wants to add.', boundary: 'His words and choices are evidence, not a test of personality.' },
  { owner: 'Coach', job: 'Keep the gym safe, supply requested live observations, demonstrate a picture, and constrain the rep.', boundary: 'The coach provides context as needed; the coach is not the product personality or constant narrator.' },
  { owner: 'Codex', job: 'Locate official rules, collegiate/pro sources, and relevant film; prepare comparisons; help review accumulated evidence.', boundary: 'Codex retains source provenance and separates observation from inference before anything is saved.' }
] as const;

export const accessHandoff = [
  { id: 'now', label: 'First introduction', detail: 'Player and coach work together through the coach’s authenticated Guard/Codex instance.', boundary: 'The player can explain, choose, and enter optional context with the coach present; no player credential is implied.' },
  { id: 'later', label: 'Player-owned access', detail: 'A legitimate player account is created and assigned only when the identity is available.', boundary: 'Exact subject-to-player binding is required before the player can open his own scoped workspace.' }
] as const;

export const levelTransitions = [
  {
    id: 'youth', level: 'Youth / middle school', court: 'Local facilities, markings, ball size, and basket context vary.', clock: 'League-specific; many competitions have no shot clock.',
    change: 'Build early eyes and balanced choices without pretending the current rule set is universal.',
    verify: 'Confirm league rules, ball size, basket height, court, and current team offense with the player.'
  },
  {
    id: 'high-school', level: 'NFHS high school', court: 'NFHS optimum court: 84 × 50 ft; some venues use a 94-foot floor.', clock: 'A 35-second shot clock is available by state-association adoption.',
    change: 'More transition distance and stronger help punish loose pickups and late scans.',
    verify: 'Confirm the player’s state association and competition level before treating any clock rule as active.'
  },
  {
    id: 'college', level: 'NCAA men / Division III included', court: '94 × 50 ft with a deeper men’s three-point arc.', clock: '30-second shot clock; possession phases arrive faster.',
    change: 'College is longer and the arc is deeper—not wider. Defender length, precise spacing, and the clock make late decisions disappear.',
    verify: 'Use the current NCAA men’s rulebook and court diagram for exact markings and reset situations.'
  },
  {
    id: 'pro', level: 'NBA / professional reference', court: 'NBA court: 94 × 50 ft with professional three-point markings.', clock: '24-second shot clock.',
    change: 'The reference value is decision compression: create, use, and move the advantage before elite length recovers.',
    verify: 'Use the current official NBA rulebook; professional film is a picture to study, not a comparison score for this player.'
  }
] as const;

export const levelSources = [
  { label: 'NCAA men’s playing rules', url: 'https://www.ncaa.org/championships/playing-rules/mens-basketball-playing-rules/' },
  { label: 'NFHS basketball resources', url: 'https://nfhs.org/sports/basketball/resources' },
  { label: 'NBA official rulebook', url: 'https://official.nba.com/rulebook/' }
] as const;

export const clockPhases = [
  { id: 'early', label: 'Early', college: '30–21', purpose: 'Advance, organize spacing, and create the first advantage without forcing the picture.' },
  { id: 'middle', label: 'Middle', college: '20–11', purpose: 'Use the shifted defense: second side, paint touch, closeout, or simple ball-screen answer.' },
  { id: 'late', label: 'Late', college: '10–0', purpose: 'Reach a dependable action with balance; do not spend the last seconds searching for a new idea.' }
] as const;

export const schemeReadMap = [
  { id: 'first-defender', label: 'First defender', picture: 'Square, turned, or behind?', choice: 'Move the chest, win shoulder-to-hip, or stop from balance.', proof: 'The player creates an angle without losing the ball or his base.' },
  { id: 'first-helper', label: 'First helper', picture: 'No help, nail help, or low-man help?', choice: 'Finish, stop/move it, or find the space the helper left.', proof: 'The scan happens before dribble two.' },
  { id: 'ball-screen', label: 'Ball-screen family', picture: 'Under, switch, show, trap, or drop?', choice: 'Name the coverage first; use one simple answer before adding a counter.', proof: 'The player explains the coverage and leaves the action balanced.' },
  { id: 'misdirection', label: 'Misdirection', picture: 'Which defender is leaning, waiting, or pre-rotating?', choice: 'Use pace, eyes, hang, reject, or a lane change to move the defender before attacking.', proof: 'The defender changes position before the player spends speed.' },
  { id: 'second-side', label: 'Second side', picture: 'Where did the defense shrink after the first advantage?', choice: 'Relocate, make one more pass, or attack the tilted closeout.', proof: 'The advantage survives after the ball leaves the first action.' }
] as const;

export const courtReadOrder = [
  { id: 'ball', location: 'On-ball defender', question: 'Is the chest square, turned, or behind?', session: 'now' },
  { id: 'nail', location: 'Nail', question: 'Did the early helper step into the driving line?', session: 'now' },
  { id: 'low-man', location: 'Low man', question: 'Did the rim helper commit or stay home?', session: 'now' },
  { id: 'second-side', location: 'Second side', question: 'Where is the next advantage after the defense shifts?', session: 'next' }
] as const;

export const guardSchemeLibrary = [
  { id: 'five-out', family: 'spacing', label: '5-out pass / cut / fill', picture: 'The lane is empty and all five players begin outside.', read: 'Which gap is open after the pass or cut?', firstAnswer: 'Cut with purpose, fill behind, and attack a wide gap without holding the ball.', phase: 'now' },
  { id: 'four-out-one-in', family: 'spacing', label: '4-out / 1-in', picture: 'Four perimeter spots surround one post, dunker, or short-corner player.', read: 'Is the inside player sealing, screening, or clearing a driving lane?', firstAnswer: 'Keep the weak side spaced and enter, drive, or reverse according to the post defender.', phase: 'next' },
  { id: 'delay', family: 'spacing', label: 'Delay / five-out hub', picture: 'A trailing big holds the ball above the floor while guards cut or screen away.', read: 'Did the defender top-lock, trail, or switch the off-ball action?', firstAnswer: 'Back cut a top-lock, curl a trailer, or flow into the next handoff.', phase: 'later' },

  { id: 'drag-screen', family: 'creation', label: 'Drag / double drag', picture: 'A transition ball screen arrives before the defense is fully matched.', read: 'Is the lane open, is the big back, or is a second screener changing the coverage?', firstAnswer: 'Turn the corner early, reject empty space, or move it before the defense loads.', phase: 'next' },
  { id: 'high-side-pnr', family: 'creation', label: 'High + side ball screen', picture: 'A screener creates an angle in the slot, middle, or wing.', read: 'Under, drop, switch, show, blitz, or ice?', firstAnswer: 'Call the coverage and use one answer: shoot/replace, pocket, reject, snake, or retreat.', phase: 'next' },
  { id: 'empty-corner-pnr', family: 'creation', label: 'Empty-corner ball screen', picture: 'The ball-side corner is cleared before the screen.', read: 'Can the low man reach the roller without leaving a long weak-side pass?', firstAnswer: 'Attack the two-player game, then find the weak side if the low man commits.', phase: 'later' },
  { id: 'zoom-chicago', family: 'creation', label: 'Zoom / Chicago action', picture: 'A pindown flows directly into a dribble handoff.', read: 'Is the receiver chased, top-locked, switched, or met at the handoff?', firstAnswer: 'Curl, back cut, keep it, or turn the corner based on the defender’s route.', phase: 'next' },
  { id: 'pistol-21', family: 'creation', label: 'Pistol / 21', picture: 'The guard advances to a wing exchange, handoff, or quick side screen.', read: 'Did the wing defender jump the exchange or did the big defender stay back?', firstAnswer: 'Use the early exchange, reject it, or flow directly into the side action.', phase: 'later' },
  { id: 'horns', family: 'creation', label: 'Horns', picture: 'Two players begin at the elbows with the guard centered above them.', read: 'Which elbow action creates the cleaner side or mismatch?', firstAnswer: 'Choose a side, use the screen angle, and recognize the weak-side counter.', phase: 'later' },

  { id: 'under-drop', family: 'coverage', label: 'Under + drop', picture: 'The on-ball defender goes below while the screen defender protects the lane.', read: 'Is there space to shoot, re-screen, or reach the pocket before the big engages?', firstAnswer: 'Stop behind, re-screen, or enter the pocket without driving into the drop.', phase: 'now' },
  { id: 'switch', family: 'coverage', label: 'Switch', picture: 'Defenders exchange assignments at the screen or handoff.', read: 'Is the advantage size, speed, seal position, or a slip before the switch connects?', firstAnswer: 'Attack the mismatch early, hit the seal, or slip the switching gap.', phase: 'next' },
  { id: 'show-blitz', family: 'coverage', label: 'Show / hedge / blitz', picture: 'The screen defender steps to the ball; a blitz sends two defenders to it.', read: 'Can the guard split, retreat, or release the ball before the trap closes?', firstAnswer: 'Protect the ball, create a passing angle, and find the short roll or next receiver.', phase: 'next' },
  { id: 'ice', family: 'coverage', label: 'Ice / down', picture: 'The on-ball defender sends a side ball screen toward the baseline and away from the screen.', read: 'Is the baseline lane open, is the big waiting, or can the screen be flipped?', firstAnswer: 'Reject with balance, flip the angle, or move it before the sideline becomes a trap.', phase: 'later' },

  { id: 'reject-rescreen-snake', family: 'continuation', label: 'Reject / re-screen / snake', picture: 'The first ball-screen route is taken away or the defender trails.', read: 'Which side of the screener keeps the defender behind and preserves the middle?', firstAnswer: 'Reject the lean, re-screen the under, or snake back across the screen path.', phase: 'next' },
  { id: 'short-roll', family: 'continuation', label: 'Short roll / 4-on-3', picture: 'Two defenders commit to the ball and the screener receives below them.', read: 'Which defender tags first: nail, low man, or corner?', firstAnswer: 'Deliver the release pass, relocate, and let the short roller play the numbers.', phase: 'later' },
  { id: 'spain-pnr', family: 'continuation', label: 'Spain ball screen', picture: 'A third offensive player back-screens the roller’s defender during pick-and-roll.', read: 'Did the defense switch the back screen, stay with shooters, or lose the roller?', firstAnswer: 'Keep the dribble alive long enough to identify roller, popper, or open perimeter release.', phase: 'later' },

  { id: 'gap-man', family: 'pressure', label: 'Gap / pack man defense', picture: 'On-ball pressure is supported by defenders sitting in driving gaps.', read: 'Which helper has two responsibilities and which closeout can be tilted?', firstAnswer: 'Move the defense first, touch the paint under control, then find the space it vacated.', phase: 'now' },
  { id: 'zone-shells', family: 'pressure', label: '2-3 / 3-2 / 1-3-1 zone', picture: 'Defenders guard areas and shift with the ball instead of matching one player everywhere.', read: 'Where are the high-post, short-corner, baseline, and overload gaps?', firstAnswer: 'Pass-fake, shift one line, enter a gap, and play behind or between defenders.', phase: 'next' },
  { id: 'press-break', family: 'pressure', label: '2-2-1 / 1-2-1-1 pressure', picture: 'The defense uses full-court lines, sideline traps, and an interceptor behind the ball.', read: 'Where is the middle release, reverse, and player behind the trapping line?', firstAnswer: 'Stay out of dead corners, pass before the second defender arrives, and attack after escape.', phase: 'next' }
] as const;

export const evidenceFlow = [
  { id: 'locate', label: 'Locate', detail: 'Codex finds an official rule, stat line, or state-specific film source.', boundary: 'Keep the original source URL and level/jurisdiction.' },
  { id: 'observe', label: 'Observe', detail: 'Player and coach name only what can be seen or read.', boundary: 'Do not turn a clip or stat into a trait.' },
  { id: 'infer', label: 'Infer carefully', detail: 'The agent proposes one picture worth testing.', boundary: 'An inference is a testable idea, not a verdict, rank, or projection.' },
  { id: 'test', label: 'Test live', detail: 'The system places the picture into a constrained rep.', boundary: 'Use the smallest constraint that can reveal the decision.' },
  { id: 'receipt', label: 'Receipt', detail: 'Record what was seen, what changed, the player’s words, and one next focus.', boundary: 'The receipt belongs to the private player workspace.' }
] as const;

export const sessionOneBoundary = {
  include: 'shared language, one first-defender picture, one help read, one misdirection counter, live transfer, and one evidence receipt',
  defer: 'teaching the full scheme library, fixed player evaluation, recruiting comparison, long terminology quiz, and calendar-based mastery promises'
} as const;

export const programMap = {
  version: '0.5.0',
  thesis: 'See it early. Create an angle. Read the help. Leave balanced.',
  sequence: ['prepare', 'connect', 'baseline', 'advantage', 'help', 'misdirection', 'live', 'receipt'],
  introductionFlow,
  roleMap,
  accessHandoff,
  levelTransitions,
  levelSources,
  clockPhases,
  schemeReadMap,
  courtReadOrder,
  guardSchemeLibrary,
  evidenceFlow,
  sessionOneBoundary,
  safetyPolicy: 'Stop for a reported pain or safety signal. Record the report and handoff without diagnosis.',
  evidencePolicy: 'Separate sourced observation, coach context, and inference. Never rank, diagnose, or project a child.'
} as const;
