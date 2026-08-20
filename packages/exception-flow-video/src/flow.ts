// The exception loop as data. When the flow changes, edit THIS file and re-render —
// the composition reads everything (labels, items, timings, the as-of stamp) from here.
// Verified against the live Airtable automations on 2026-08-20.

export const AS_OF = 'Flow as of August 20, 2026';

export const palette = {
  bg: '#0b0c0e',
  surface: '#14161a',
  surface2: '#1a1d23',
  border: '#262a32',
  borderStrong: '#343945',
  text: '#e8eaed',
  muted: '#9aa0ab',
  faint: '#6b7280',
  blue: '#146ef5',
  green: '#3fb950',
  red: '#f85149',
  amber: '#d29922',
};

export const FPS = 30;

// Scene boundaries in seconds. DUR is each scene's length.
export const scenes = {
  title: { start: 0, dur: 5 },
  arrive: { start: 5, dur: 11 },
  decide: { start: 16, dur: 16 },
  deny: { start: 32, dur: 8 },
  release: { start: 40, dur: 8 },
  brief: { start: 48, dur: 6 },
  roster: { start: 54, dur: 11 },
  close: { start: 65, dur: 8 },
};

export const TOTAL_SECONDS = 73;

export const copy = {
  title: 'The exception loop',
  subtitle: 'One resubmission, start to finish. Nobody pushes it along.',

  arriveHeading: 'A resubmission arrives',
  appName: 'Acme Embed',
  appVersion: 'v3 · App update',
  undecidedBadge: '3 exception items undecided — on a prior version',
  holdAutomation: '⚖️ Intake hold',
  holdExplain: 'Held in a single update. No testing round spent before the decisions land.',
  dmHold: 'DM to reviewer: held at intake — 3 items undecided, history on the record.',

  decideHeading: 'Each item is decided by name',
  decideExplain: 'Automation recommends on technical items twice a day; the partner lead recommends on business calls. The Director allows or denies. Every call is recorded per item.',
  items: [
    { technical: 'Runtime script loaded without integrity pinning', plain: 'The app loads code that can change after review', ruling: 'granted', rulingLabel: 'Exception granted' },
    { technical: 'Session token persisted in localStorage', plain: 'Sign-in stays saved in the browser', ruling: 'granted', rulingLabel: 'Exception granted' },
    { technical: 'Dev artifacts in the production bundle', plain: 'Test scaffolding shipped to customers', ruling: 'fix', rulingLabel: 'Fix required' },
  ],

  denyHeading: 'A denial finishes the story itself',
  denyChip: '❌ Rejected',
  denyEmail: 'Feedback emailed the same minute — technical findings plus the plain-English version.',
  denySweep: 'A daily sweep catches any denial whose rejection never went out.',

  releaseHeading: 'The last decision releases the app',
  releaseAutomation: '⚖️ Exception release',
  releaseChip: '🆕 Ready for Review',
  releaseExplain: 'All items decided → the version resumes on its own. The reviewer is DM’d.',

  briefHeading: 'Next time, the record answers first',
  briefDm: 'DM at intake: this app carries 2 approved exemptions — only recorded items are exempt. History on the record.',
  briefExplain: '“What do we compare this bundle against?” is answered before anyone asks.',

  rosterHeading: 'The automations that run it',
  rosterExplain: 'Nine live Airtable automations plus a twice-daily recommendation runner, verified August 20.',

  closeTakeaway: 'Decisions, recorded.',
  closeLine: 'Silence is no longer a state.',
};

// Real automation names from the 👛Marketplace Assets base — verbatim, all deployed.
export const automations = [
  { name: '⚖️ Intake hold — undecided exceptions on the app', role: 'Holds a resubmission at intake while any exception item is undecided.' },
  { name: '⚖️ Exception release — resume when all items decided', role: 'Flips the version back to Ready for Review the moment the last item lands.' },
  { name: '⚖️ Approval Gate + Partnership Shield', role: 'No approval while items are undecided; partner rejections send no creator email.' },
  { name: '⚖️ Exception Status → #app-review-exceptions', role: 'Posts every decision. A denial auto-flips the version to Rejected and emails feedback.' },
  { name: '⚖️ Exception Items → #app-review-exceptions', role: 'Every item’s request and ruling, posted per item with its owner.' },
  { name: '⚖️ Exception → 👛Asset auto-link', role: 'History attaches to the app itself, not just one version.' },
  { name: '⚖️ Prior-exemptions briefing → reviewer DM', role: 'Briefs the assigned reviewer at intake: what is exempt, where the history lives.' },
  { name: '⚖️ Denied exception w/o rejection — daily sweep', role: '9:00 AM Central safety net for any denial whose rejection never went out.' },
  { name: '⏸️ App On Hold → #app-review-exceptions', role: 'Every hold is visible in the channel, never silent.' },
  { name: '⚖️ Recommendation runner — twice daily', role: 'Writes advisory recommendations on technical items using Ruleset v1. It can never decide or approve.' },
];
