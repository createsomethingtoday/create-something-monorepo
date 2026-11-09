import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { B, Field, Choice, VStack } from './components.jsx';
import { QuestMotion } from '../web/quest-motion.mjs';
import { setupImportIntents } from '../web/setup-imports.mjs';
import { sourceView, sourceSignInNeeded } from '../web/setup-view.mjs';
import { sourceSessionBlocked, sourceCanBegin, pendingAccountForProvider, pendingConsentForProvider } from '../web/model.mjs';
import crate from '../web/onboarding/crate-cutout.png';
import vinyl from '../web/onboarding/vinyl-cutout.png';
import musician from '../web/onboarding/musician-cutout.png';
import './dev-quest.css';

const stamp = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not checked';
};
const submit = (handler) => (event) => {
  event.preventDefault(); event.stopPropagation();
  handler(Object.fromEntries(new FormData(event.currentTarget)));
};
function QuestButton({ children, className = '', ...props }) {
  return <B type="button" className={`dev-quest-button ${className}`} {...props}>{children}</B>;
}
function Help({ ctx, topic, children }) {
  return <QuestButton onClick={() => ctx.actions.run(() => ctx.bridge.call('help.open', { topic }))}>{children}</QuestButton>;
}

/** Decorative metaphor only. Saved-record text below is the completion evidence. */
function QuestScene({ phase = 0, linked = false, personSaved = false, skipped = false }) {
  const showPerson = phase > 1 && !skipped;
  return <div className={`quest-scene quest-collage quest-collage-phase-${phase}${showPerson ? ' quest-collage-with-person' : ''}${linked ? ' quest-collage-linked' : ''}`} aria-hidden="true">
    <div className="quest-collage-canvas">
      <span className="quest-paper-stamp" data-quest-part="helper">g.</span>
      <div className="quest-divider-set" data-quest-part="identity">
        <span className="quest-divider quest-divider-music">Music</span>
        <span className="quest-divider quest-divider-people">People</span>
        <span className="quest-divider quest-divider-gigs">Gigs</span>
      </div>
      <div className="quest-crate" data-quest-part="home">
        <img className="quest-crate-back" src={crate} width="1536" height="1024" alt="" decoding="async" />
        <img className="quest-crate-front" src={crate} width="1536" height="1024" alt="" decoding="async" />
      </div>
      {phase > 0 && <div className="quest-vinyl" data-quest-part="gig"><img src={vinyl} width="1536" height="1024" alt="" decoding="async" /></div>}
      {showPerson && <div className={`quest-musician${personSaved || linked ? '' : ' quest-musician-example'}`} data-quest-part="person"><img src={musician} width="1254" height="1254" alt="" decoding="async" /></div>}
      {linked && <svg className="quest-photo-connection" viewBox="0 0 560 340" focusable="false">
        <path data-quest-part="route" pathLength="100" d="M241 157c15 44 72 46 92 1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="241" cy="157" r="4" fill="currentColor" /><circle cx="333" cy="158" r="4" fill="currentColor" />
      </svg>}
    </div>
  </div>;
}

function QuestMap({ phase, names, completed, label }) {
  return <div className="quest-route">
    <span className="quest-wayfinder" data-current={phase} aria-hidden="true" />
    <ol className="quest-map" aria-label={label}>
      {names.map((name, index) => <li key={name} className={`quest-node${completed[index] ? ' quest-node-complete' : ''}`} data-quest-step={index} aria-current={index === phase ? 'step' : undefined}>
        <span className="quest-node-mark" aria-hidden="true">{completed[index] ? '✓' : index < 3 ? index + 1 : '→'}</span>
        <span>{name}</span><small>{completed[index] ? 'Done' : index === phase ? 'Your turn' : 'Later'}</small>
      </li>)}
    </ol>
  </div>;
}

function LocalMission({ ctx, view }) {
  const quest = ctx.devQuest, busy = ctx.state.busy || view.recoveryRequired;
  const { phase, draft, person, crewLinked } = view;
  if (phase === 0) return <>
    <p className="quest-kicker">Step 1 of 3 · Your space</p>
    <h1 id="quest-heading" tabIndex={-1}>{ctx.state.setupProfile ? 'Finish your space.' : 'What’s your name?'}</h1>
    <p className="quest-description">{ctx.state.setupProfile ? 'Your space is ready. Add your name to keep going.' : 'We’ll make a space just for you.'}</p>
    <form id="workspace-form" className="quest-form" onSubmit={submit((values) => quest.createSpace(values))}>
      <VStack gap={4}>
        <Field id="owner-name" name="ownerName" label="Your name" required maxLength={80} autoComplete="name" placeholder="e.g. Danny" value={draft.ownerName || view.profileName} onChange={(ownerName) => quest.draft({ ownerName })} disabled={busy} />
        <QuestButton type="submit" primary className="quest-primary" disabled={busy}>{ctx.state.busy ? 'Making your space…' : 'Let’s go →'}</QuestButton>
      </VStack>
    </form>
  </>;
  if (phase === 1) return <>
    <p className="quest-kicker">Step 2 of 3 · Your gig</p><h1 id="quest-heading" tabIndex={-1}>Name your first gig.</h1>
    <p className="quest-description">A show, session or rehearsal. Give it a name to start.</p>
    <form id="quest-gig-form" className="quest-form" onSubmit={submit(({ title }) => quest.saveGig(title))}>
      <VStack gap={4}>
        <Field id="quest-title" name="title" label="Gig name" required maxLength={120} autoComplete="off" placeholder="e.g. Friday night at The Echo" value={draft.title || ''} onChange={(title) => quest.draft({ title })} disabled={busy} />
        <QuestButton type="submit" primary className="quest-primary" disabled={busy}>{ctx.state.busy ? 'Saving your gig…' : 'Add gig →'}</QuestButton>
      </VStack>
    </form>
  </>;
  if (phase === 2) return <>
    <p className="quest-kicker">Step 3 of 3 · Your people</p><h1 id="quest-heading" tabIndex={-1}>Who’s helping?</h1>
    <p className="quest-description">{person ? 'The person is already saved. Retry the link to connect them to your gig.' : 'A bandmate, booker or collaborator. What’s their name?'}</p>
    {person ? <>
      <div className="quest-saved-person"><span className="quest-help">Saved person</span><strong>{person.title}</strong></div>
      <QuestButton primary className="quest-primary" disabled={busy} onClick={() => quest.action('retry-link')}>{ctx.state.busy ? 'Linking person…' : 'Retry link to gig →'}</QuestButton>
    </> : <>
      <form id="quest-person-form" className="quest-form" onSubmit={submit(({ title }) => quest.savePerson(title))}>
        <VStack gap={4}>
          <Field id="quest-title" name="title" label="Person’s name" required maxLength={80} autoComplete="off" placeholder="e.g. Alex" value={draft.title || ''} onChange={(title) => quest.draft({ title })} disabled={busy} />
          <QuestButton type="submit" primary className="quest-primary" disabled={busy}>{ctx.state.busy ? 'Saving and linking…' : 'Add to my gig →'}</QuestButton>
        </VStack>
      </form>
      <details className="quest-existing"><summary>Choose someone already saved</summary>
        <p className="guided-help">GiGi checks the saved person and reads back the gig link before marking this step done.</p>
        <QuestButton disabled={busy || view.peopleLoading} onClick={() => quest.loadPeople()}>{view.peopleLoading ? 'Checking saved people…' : 'Show saved people'}</QuestButton>
        {view.peopleError && <p className="quest-error" role="alert">{view.peopleError}</p>}
        <div className="guided-candidates">{view.people.map((record) => <QuestButton key={record.id} disabled={busy || view.peopleLoading} onClick={() => quest.choosePerson(record.id)}>{record.title}</QuestButton>)}</div>
        {view.peopleCursor && <QuestButton disabled={busy || view.peopleLoading} onClick={() => quest.loadPeople(true)}>More saved people</QuestButton>}
      </details>
    </>}
    <QuestButton variant="ghost" className="quest-skip" disabled={busy} onClick={() => quest.action('skip-person')}>I’ll {person ? 'finish the link' : 'add someone'} later</QuestButton>
  </>;
  return <>
    <p className="quest-kicker">{crewLinked ? 'All 3 done' : 'Ready to explore'}</p><h1 id="quest-heading" tabIndex={-1}>You’re ready to explore.</h1>
    <p className="quest-description">{crewLinked ? 'You created a space and a gig, then linked a person to it.' : 'Your space and gig are saved. You can bring your crew in later.'} You can add more whenever you like.</p>
    <QuestButton primary className="quest-primary" disabled={busy} onClick={() => quest.action('finish')}>Start using GiGi →</QuestButton>
    <details className="quest-sidequests"><summary>Try more later</summary>
      <QuestButton className="quest-sidequest" disabled={busy} onClick={() => quest.action('calendar')}>Bring in your calendar</QuestButton><p className="guided-help">Open source setup · separate consent required</p>
      <QuestButton className="quest-sidequest" disabled={busy} onClick={() => quest.action('ai')}>Meet Ask GiGi</QuestButton><p className="guided-help">Open AI setup</p>
    </details>
  </>;
}

function AssistantStage({ ctx }) {
  const q = ctx.devQuest, c = q.connected.assistant, ready = c.workspaceVerified, s = c.status, job = c.login, busy = !!c.busy;
  const waiting = job && ['starting', 'pending', 'verifying', 'cancelling', 'unknown'].includes(job.state);
  const toolsMissing = s?.reason === 'gigi_tools_unavailable';
  const status = {
    starting: 'Starting secure sign-in…', pending: 'Finish sign-in in your browser. GiGi will check when you return.',
    verifying: 'Checking the signed-in account…', cancelling: 'Waiting for cancellation confirmation…',
    unknown: 'Sign-in needs a status check. Continue this attempt before starting another.',
    cancelled: 'Sign-in stopped. Your existing account stays signed in.',
    completed: 'Sign-in finished. Workspace access is checked separately.', expired: 'Sign-in expired. Check your account before trying again.', failed: 'Sign-in did not finish. Check your account and try again.'
  };
  const action = (name, label, primary = false) => <QuestButton primary={primary} disabled={busy} onClick={() => q.assistant(name)}>{label}</QuestButton>;
  const command = c.provider === 'claude' ? c.external?.claudeCommand : c.external?.codexCommand;
  return <>
    <p className="quest-kicker">Step 1 · Your assistant</p><h1 id="setup-heading" tabIndex={-1}>{ready ? 'GiGi found your workspace.' : 'Let’s connect GiGi.'}</h1>
    <p className="quest-description">{ready ? `Codex can read ${s.workspace.name}. Let’s bring in something useful.` : toolsMissing ? 'Codex is signed in, but GiGi’s workspace tools are unavailable. Check again or ask the GiGi operator to check this app.' : 'Use your ChatGPT account through Codex on this Mac. GiGi checks the workspace before you ask about your records.'}</p>
    {ready ? <QuestButton primary onClick={() => q.guided('sources')}>Choose a source →</QuestButton> : waiting ? action('read-login', 'Check sign-in', true) : toolsMissing ? action('refresh', 'Check workspace tools', true) : s?.available && !s.authenticated ? action('login', 'Sign in with ChatGPT →', true) : s && !s.available ? <Help ctx={ctx} topic="codex-setup">Get Codex on this Mac ↗</Help> : action('refresh', busy ? 'Checking your workspace…' : 'Check Ask GiGi →', true)}
    <p className="guided-fact">{ready ? `✓ Workspace access checked · ${stamp(s.checkedAt)}` : 'This check starts no conversation and changes no records.'}</p>
    {ready ? action('ask', 'Try a read-only first answer') : s && !s.available && !toolsMissing ? action('refresh', 'Check again after installing') : null}
    {job && <p role="status">{status[job.state] || 'Check sign-in status.'}</p>}
    {waiting && <div className="dev-quest-actions">{job.state === 'pending' && action('open-login', 'Open sign-in again')}{action('cancel-login', 'Cancel sign-in')}</div>}
    <details className="guided-advanced"><summary>Other ways to connect</summary>
      <p>The built-in assistant needs Codex installed and signed in. {ready ? 'A first assistant answer is a separate check.' : 'You can keep working manually while setting it up.'}</p>
      <Help ctx={ctx} topic="codex-setup">Codex setup guide ↗</Help>
      <h2>External assistant sessions</h2><p>Use these commands only if you want GiGi in a separate Codex or Claude Code session. Preparation does not install or verify the connector.</p>
      <div className="dev-quest-actions">{action('prepare-codex', 'Prepare for Codex')}{action('prepare-claude', 'Prepare for Claude Code')}</div>
      {command && <><pre className="config">{command}</pre>{action('copy-command', 'Copy the full command')}<pre className="config prompt">{c.external.starterPrompt}</pre>{action('copy-prompt', 'Copy verification prompt')}</>}
    </details>
  </>;
}

function SourceStage({ ctx }) {
  const q = ctx.devQuest, c = q.connected, s = c.imports.state, source = s.source, provider = s.provider || 'gmail';
  const busy = !!(c.imports.busy || c.connecting), ready = source?.state === 'connected' && !!source.connectedAccountId;
  const sourceName = provider === 'gmail' ? 'Gmail' : 'Google Calendar';
  const pending = pendingAccountForProvider(source, provider), consent = pendingConsentForProvider(source, c.attempts, provider);
  let name = 'source-refresh', label = busy ? 'Checking connection…' : 'Check source status →';
  if (ready) { name = 'preview'; label = `Preview ${s.intent === 'contacts' ? 'people' : s.intent === 'gigs' ? 'upcoming dates' : 'follow-ups'} →`; }
  else if (source && !sourceSessionBlocked(source) && sourceSignInNeeded({ [provider]: source })) { name = 'source-signin'; label = 'Sign in to GiGi sources →'; }
  else if (pending) { name = 'source-verify'; label = 'Check connection →'; }
  else if (source && sourceCanBegin(source)) { name = 'source-connect'; label = `Connect ${sourceName} →`; }
  return <>
    <p className="quest-kicker">Step 2 · Your accounts</p><h1 id="setup-heading" tabIndex={-1}>{ready ? 'Your source is connected.' : 'Where should we start?'}</h1>
    <p className="quest-description">{ready ? 'Next, preview a small page. You’ll review it before anything is saved.' : 'Choose one useful result. Sign-in happens securely in your browser.'}</p>
    <div className="guided-intents" aria-label="First result">{setupImportIntents.map((intent) => <QuestButton key={intent.id} aria-pressed={s.intent === intent.id} disabled={busy} onClick={() => q.intent(intent.id)}>{intent.id === 'contacts' ? 'People · Gmail · past year' : intent.id === 'gigs' ? 'Calendar · next 3 months' : 'Follow-ups · Gmail · past month'}</QuestButton>)}</div>
    <p className="guided-fact">{ready ? `✓ ${sourceName} verified${source.accountLabel?.value ? ` · ${source.accountLabel.value}` : ''}` : source?.state === 'pending' ? 'Waiting for source consent.' : source?.detail ? sourceView(source).description : 'Check the connection for this workspace.'}</p>
    <QuestButton primary disabled={busy} onClick={() => q.guided(name)}>{label}</QuestButton>
    {consent && !ready && <QuestButton disabled={busy} onClick={() => q.guided('source-open')}>Open the same sign-in page</QuestButton>}
    {source && <QuestButton disabled={busy} onClick={() => q.guided('source-refresh')}>Check status again</QuestButton>}
    <p className="guided-help">Connecting grants source access. Preview reads a bounded page. Import saves only the records you approve.</p>
    {s.sourceMismatch && <p className="quest-error" role="alert">The source account changed. Start a fresh preview for the current account.</p>}
  </>;
}

function CandidateProposal({ ctx }) {
  const q = ctx.devQuest, imports = q.connected.imports, p = imports.state.proposal, busy = !!imports.busy;
  const contact = p.entity === 'contacts', gig = p.entity === 'gigs', noun = contact ? 'person' : gig ? 'gig' : 'task';
  if (p.phase === 'draft') return <form id="setup-candidate-form" className="quest-form" onSubmit={submit((values) => q.reviewCandidate(values))}>
    <h2>Review this {noun}</h2><VStack gap={4}>
      <Field id="setup-title" name="title" label={contact ? 'Name' : 'Title'} maxLength={500} required value={p.title} onChange={(title) => q.candidateDraft({ title })} disabled={busy} />
      {contact ? <><Field id="setup-email" name="email" label="Email" type="email" required maxLength={320} value={p.email} onChange={(email) => q.candidateDraft({ email })} disabled={busy} /><p className="guided-help">The email must match the sender. GiGi reuses an exact existing email and keeps your saved edits.</p></> : <>
        <Field id="setup-date" name="date" label={gig ? 'Date or ISO range (optional)' : 'Due date (optional)'} type={gig ? 'text' : 'date'} value={p.date} onChange={(date) => q.candidateDraft({ date })} disabled={busy} />
        {gig ? <><Choice id="setup-kind" name="workKind" label="Work kind" required value={p.workKind} onChange={(workKind) => q.candidateDraft({ workKind })} options={ [['', 'Choose a kind'], ...['Performance', 'Crew / work', 'Other', 'unclassified'].map((kind) => [kind, kind === 'unclassified' ? 'Leave unclassified' : kind])] } disabled={busy} /><p className="guided-help">A calendar commitment is not automatically a performance.</p></> : <p className="guided-help">The email date is not assumed to be your deadline.</p>}
      </>}
      <QuestButton type="submit" primary className="quest-primary" disabled={busy}>Review {noun} →</QuestButton>
    </VStack>
  </form>;
  return <section className="guided-review">
    <h2>{p.phase === 'submitted' ? 'Check this save' : 'Ready to save?'}</h2>
    <dl><dt>{contact ? 'Name' : 'Title'}</dt><dd>{p.title}</dd>{contact ? <><dt>Email</dt><dd>{p.email}</dd></> : <><dt>{gig ? 'Date' : 'Due date'}</dt><dd>{p.date || 'Not set'}</dd>{gig && <><dt>Work kind</dt><dd>{p.workKind === 'unclassified' ? 'Unclassified' : p.workKind}</dd></>}</>}</dl>
    {p.phase === 'submitted' && <p role="status">GiGi has not confirmed this result. Check or retry the exact save before starting another.</p>}
    <QuestButton primary disabled={busy} onClick={() => q.guided('save-result')}>{p.phase === 'submitted' ? 'Recover or retry exact save' : 'Approve and save →'}</QuestButton>
    <QuestButton disabled={busy} onClick={() => q.guided(p.phase === 'submitted' ? 'recover-result' : 'edit-result')}>{p.phase === 'submitted' ? 'Check save receipt' : 'Back to edit'}</QuestButton>
  </section>;
}

function SourceReview({ ctx }) {
  const q = ctx.devQuest, imports = q.connected.imports, s = imports.state, p = s.preview, r = s.receipt, busy = !!imports.busy;
  const next = r?.nextCursor || (!r && p?.nextCursor);
  const action = (name, label, primary = false) => <QuestButton disabled={busy} primary={primary} onClick={() => q.guided(name)}>{label}</QuestButton>;
  return <>
    {s.needsFreshPreview || s.sourceMismatch ? action('fresh-preview', 'Start a fresh preview →', !s.wins.length) : !p && !r ? action('preview', 'Preview a source page →', true) : null}
    {p && !r && <section className="guided-review"><h2>Preview before importing</h2><p>{p.scannedCount} checked · {p.selectedCount} in range · {p.existingCount} already saved.</p>
      {p.records?.length ? <><ul className="guided-preview-list">{p.records.map((record, index) => <li key={record.id || index}><strong>{record.title}</strong>{record.fields?.Date && <small>{record.fields.Date}</small>}</li>)}</ul>{action('import-reviewed', 'Import this reviewed page →', true)}</> : <p>No matching records in this page. More may be available.</p>}
      {action('discard-preview', 'Discard preview')}
    </section>}
    {r && <section className="guided-receipt" role="status"><h2>{['committing', 'cancelling'].includes(r.state) ? 'Import is still running' : 'Source records saved'}</h2>
      <p>{r.createdCount || 0} saved · {r.existingCount || 0} existing · {r.failedCount || 0} failed.</p>
      <p>{r.state === 'partial' ? 'Some records need review. Saved records remain.' : r.state === 'cancelled' ? 'Import stopped. Records already saved remain.' : 'Choose a source record below to make it useful in your collection.'}</p>
      {action('check-import', 'Check import receipt')}{['committing', 'cancelling'].includes(r.state) && action('discard-preview', 'Stop import')}
    </section>}
    {s.importInput && !r && <><p role="status">An import was submitted. Check its receipt before starting another.</p>{action('check-import', 'Check import result →', true)}</>}
    {!!s.candidates.length && <section className="guided-candidates"><h2>Choose a record to use</h2>{s.candidates.map((record) => <QuestButton key={record.id} disabled={busy} onClick={() => q.selectCandidate(record.id)}>{record.title} · {record.fields?.Date || 'Open and review details'}</QuestButton>)}</section>}
    {next && action('next-preview', 'Preview the next page')}
    <details className="guided-coverage"><summary>Date range and coverage</summary><p>{s.selection?.from?.slice(0, 10) || 'Start'} to {s.selection?.to?.slice(0, 10) || 'end'}. Dates filter each page we check. {next ? 'More pages remain. Continue when you want to read more.' : p?.coverage === 'complete' ? 'This scan reached its end.' : 'This small scan does not establish complete date coverage.'}</p></details>
  </>;
}

function ResultsStage({ ctx }) {
  const q = ctx.devQuest, imports = q.connected.imports, s = imports.state;
  return <>
    <p className="quest-kicker">Step 3 · First records</p><h1 id="setup-heading" tabIndex={-1}>{s.wins.length && !s.proposal ? 'Your collection is growing.' : 'Review what we found.'}</h1>
    {s.proposal ? <CandidateProposal ctx={ctx} /> : s.wins.length ? <>
      <p className="quest-description">Your first {s.intent === 'contacts' ? 'person' : s.intent === 'gigs' ? 'gig' : 'task'} is saved, with its source attached.</p>
      <div className="guided-wins" role="status"><h2>✓ Saved and checked</h2>{s.wins.map((win) => <QuestButton key={win.id} onClick={() => { q.leave(); ctx.actions.run(() => ctx.actions.navigateRecord(win.entity, win.id)); }}>{win.title} · {win.outcome === 'existing' ? 'Existing record reused' : 'Saved'} · {stamp(win.verifiedAt)}</QuestButton>)}</div>
      <QuestButton primary disabled={!!imports.busy} onClick={() => q.guided('ready')}>See what’s ready →</QuestButton>
      <details className="guided-more"><summary>Review more from this source</summary><SourceReview ctx={ctx} /></details>
    </> : <><p className="quest-description">{setupImportIntents.find((intent) => intent.id === s.intent)?.label || 'Your records'}. We check a few at a time, so you can start small.</p><SourceReview ctx={ctx} /></>}
  </>;
}

function PhoneSetup({ ctx }) {
  const q = ctx.devQuest;
  const prompt = `Use gigi_workspace_get and confirm workspace ${ctx.state.workspace.name} (${ctx.state.workspace.id}). Do not change any records.`;
  return <section className="guided-phone" id="phone-access"><h2>Take GiGi with you</h2><p className="guided-fact">Needs a phone test</p>
    <p>Use your assistant’s remote connection to this Mac. The provider supplies pairing and its QR code.</p>
    <ol className="setup-instructions"><li><strong>Open remote connection setup.</strong> Use the same provider account on your phone.<QuestButton onClick={() => q.guided('phone-codex')}>Open Codex phone setup ↗</QuestButton><Help ctx={ctx} topic="claude-remote">Claude Code remote guide ↗</Help></li>
      <li><strong>Keep this Mac available.</strong> It must stay awake, online and signed in with the GiGi-enabled session running.</li>
      <li><strong>Check the workspace from your phone.</strong> Turn off phone Wi-Fi, send the read-only prompt and confirm this exact workspace.<QuestButton onClick={() => q.guided('copy-phone-prompt')}>Copy phone test prompt</QuestButton><details><summary>View the prompt</summary><pre className="config">{prompt}</pre></details></li>
      <li><strong>If the Mac goes offline, reconnect and check first.</strong> Read the record before retrying a change.</li></ol>
    <p className="guided-help">A successful desktop check does not verify phone access. GiGi has no separate phone account or SMS service.</p>
  </section>;
}

function ConnectedMission({ ctx, step }) {
  const q = ctx.devQuest, c = q.connected, s = c.imports.state;
  if (step === 'assistant') return <AssistantStage ctx={ctx} />;
  if (step === 'source') return <SourceStage ctx={ctx} />;
  if (step === 'results') return <ResultsStage ctx={ctx} />;
  return <>
    <p className="quest-kicker">Your first results</p><h1 id="setup-heading" tabIndex={-1}>Your work is here.</h1>
    <p className="quest-description">{s.wins.length} verified {s.wins.length === 1 ? 'result' : 'results'} in this step. You can add more whenever you’re ready.</p>
    <QuestButton primary onClick={() => q.guided('finish')}>Open Today →</QuestButton>
    <div className="guided-next"><h2>Bring in another useful piece</h2>{setupImportIntents.filter((intent) => intent.id !== s.intent).map((intent) => <QuestButton key={intent.id} onClick={() => q.intent(intent.id)}>{intent.label} →</QuestButton>)}</div>
    <details className="guided-phone-disclosure"><summary>Use GiGi from your phone</summary><PhoneSetup ctx={ctx} /></details>
  </>;
}

export function DevQuest({ ctx }) {
  const host = useRef(null), motion = useRef(null);
  if (!motion.current) motion.current = new QuestMotion();
  const q = ctx.devQuest, view = q.view, c = q.connected;
  const connected = view.connected, step = connected ? c.journey.state.step : null;
  const phase = connected ? ['assistant', 'source', 'results', 'ready'].indexOf(step) : view.phase;
  const progress = connected ? c.imports.state : null, wins = progress?.wins || [];
  const linked = !connected && !!(view.person && view.crewLinked);
  const assistantReady = connected && !!c.assistant.workspaceVerified;
  const sourceReady = connected && progress.source?.state === 'connected' && !!progress.source.connectedAccountId;
  const busy = connected ? !!(c.assistant.busy || c.imports.busy || c.connecting) : !!ctx.state.busy;
  const completed = connected ? [assistantReady, sourceReady, wins.length > 0] : [phase > 0, !!view.gig, linked];
  const issue = connected ? c.error || (step === 'assistant' && c.assistant.error) || c.imports.error : view.error;
  useLayoutEffect(() => {
    motion.current.mount(host.current);
    return () => motion.current.beforeRender();
  }, [connected, phase, busy, linked, wins.at(-1)?.id]);
  useEffect(() => () => motion.current.leave(), []);
  const guide = connected
    ? step === 'assistant' ? 'Your assistant helps you work with your collection.' : step === 'source' ? 'Choose a source, then review its records.' : 'Useful records arrive one reviewed step at a time.'
    : ['Your gigs, in one place.', 'Every gig starts with a record.', view.person && !linked ? 'Your person is saved. Finish the link to your gig when you’re ready.' : 'Add one person. Watch them connect to your gig.', linked ? 'You did it. Your work and people are together.' : 'You did it. Your gig is ready. Add people whenever you like.'][phase];
  const status = [ctx.state.setupProfile ? 'Your workspace is saved. Finish your profile to continue.' : 'One small step at a time.', 'Nice. Your space is ready.', view.person && !linked ? 'Person saved. The gig link still needs to finish.' : 'Gig added. Let’s bring someone along.', view.skipped ? 'Gig added. You can add people later.' : linked ? 'Person added. You’re ready to go.' : 'Your saved work is ready to explore.'][phase];
  return <div ref={host} className="dev-quest-surface" data-quest-owned="true">
    <main className={`quest${connected ? ' setup-journey' : ''}`} data-quest-phase={phase} data-quest-route-ready={linked} data-quest-motion={connected ? wins.length ? 'gig' : '' : view.animation} data-quest-win={wins.at(-1)?.id || ''} aria-label={connected ? 'Connect and set up GiGi' : 'Set up GiGi'} aria-busy={busy}>
      <header className="quest-header"><span className="quest-brand">GiGi<span className="quest-brand-dot" aria-hidden="true" /></span><span className="quest-header-label">{connected ? 'A little setup. Useful first results.' : 'A little setup. A lot less to remember.'}</span>
        {connected || ctx.state.workspace && phase > 0 ? <QuestButton variant="ghost" className="quest-pause" disabled={!connected && busy} onClick={() => connected ? q.guided('pause') : q.action('pause')}>Explore freely</QuestButton> : null}
      </header>
      <div className="quest-progress"><strong>{connected ? 'Make GiGi useful for your music' : phase === 3 ? 'Ready to go' : 'Let’s make it yours'}</strong><span>{connected ? phase === 3 ? 'Ready to explore' : `Step ${phase + 1} of 3` : `${completed.filter(Boolean).length} of 3 done`}</span></div>
      <QuestMap phase={phase} names={connected ? ['Your assistant', 'Your accounts', 'First records', 'Ready'] : ['Your space', 'Your gig', 'Your people', 'Ready']} completed={completed} label={connected ? 'Connection setup steps' : 'Setup steps'} />
      <div className="quest-layout"><section className="quest-mission" aria-labelledby={connected ? 'setup-heading' : 'quest-heading'}>
        {!connected && <p className="quest-status" role="status" aria-live="polite">{status}</p>}
        {connected ? <ConnectedMission ctx={ctx} step={step} /> : <LocalMission ctx={ctx} view={view} />}
        {connected && phase > 0 && <QuestButton disabled={busy} onClick={() => q.guided('back')}>← Back a step</QuestButton>}
        {issue && <p className="quest-error" role="alert" tabIndex={-1}>{String(issue.message || issue)}</p>}
        {!connected && view.recoveryRequired && <QuestButton disabled={busy} onClick={() => q.action('restore')}>Check saved progress</QuestButton>}
        {!connected && view.storageWarning && <p className="quest-storage-warning" role="status">Your records are saved, but tutorial progress could not be remembered on this Mac. You can keep using GiGi.</p>}
        {connected && busy && <p className="guided-busy" role="status">Checking this step. You can still explore your local work.</p>}
      </section><aside className="quest-world" aria-label={connected ? 'Your music collection' : 'How your workspace comes together'}>
        <figure className="quest-illustration"><QuestScene phase={connected ? phase < 2 ? 1 : 2 : phase} linked={linked} personSaved={connected ? wins.some((win) => win.entity === 'contacts') : !!view.person} skipped={!connected && view.skipped} /><figcaption>{guide}</figcaption></figure>
        {connected ? <div className="quest-saved"><p className="quest-help quest-saved-label">{ctx.state.workspace.name}</p><p className="quest-help">{assistantReady ? 'Assistant workspace access checked' : 'Assistant not checked'}<br />{sourceReady ? 'Selected source verified' : 'Selected source not verified'}<br />{wins.length} verified {wins.length === 1 ? 'result' : 'results'} in this step</p></div> : (ctx.state.workspace || view.gig) && <div className="quest-saved" aria-label="Your saved workspace"><p className="quest-help quest-saved-label">✓ Saved on this Mac</p><h2>{ctx.state.workspace?.name || 'Your space'}</h2>{view.gig && <div className="quest-gig"><span className="quest-help">Saved gig</span><h3>{view.gig.title}</h3>{linked && <div className="quest-person"><span className="quest-help">Linked person</span><p className="quest-person-name">{view.person.title}<span className="quest-link-description">connected to {view.gig.title}</span></p></div>}</div>}</div>}
      </aside></div>
      <footer className="quest-footer"><span>{connected ? c.journey.warning ? 'Setup progress could not be remembered on this Mac. Local records stay available.' : 'Your records stay on this Mac. You approve imports and changes.' : ctx.state.workspace ? 'Your work stays saved. Connect apps whenever you’re ready.' : 'No sign-in needed. Your records stay on this Mac.'}</span>
        {connected ? <QuestButton onClick={() => q.guided('manual')}>Add a gig myself</QuestButton> : <QuestButton variant="ghost" className="quest-replay" disabled={busy} onClick={() => motion.current.replay(host.current)}>Replay illustration ↺</QuestButton>}
      </footer>
    </main>
  </div>;
}

/** Today uses this invitation without mounting any source or provider action. */
export function DevQuestResume({ ctx }) {
  const q = ctx.devQuest;
  if (!q || q.view.active) return null;
  const view = q.view;
  return <div className="dev-quest-surface dev-quest-resume">
    {view.resume && <section className="guided-invitation"><div><p className="quest-kicker">A little setup</p><h2>{view.gig ? 'Bring your people along.' : 'Your first gig is waiting.'}</h2><p>Your saved work stays here. Pick up the tutorial whenever you’re ready.</p></div><QuestButton primary disabled={ctx.state.busy} onClick={() => q.action('resume')}>Continue setup →</QuestButton></section>}
    {view.connectedResume && <section className="guided-invitation"><div><p className="quest-kicker">Your music, connected</p><h2>{q.connected.imports.state.wins.length ? 'Keep your collection growing.' : 'Connect, then see your first records.'}</h2><p>{q.connected.assistant.workspaceVerified ? 'Assistant workspace access checked.' : 'Connect your assistant.'} Choose Gmail or Calendar, then review what comes in.</p></div><QuestButton primary disabled={ctx.state.busy} onClick={() => q.guided('open')}>Continue connections →</QuestButton></section>}
  </div>;
}
