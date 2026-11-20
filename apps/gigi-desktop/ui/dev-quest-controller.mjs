import { OnboardingQuest } from '../web/quest.mjs';
import { ConnectedSetup } from '../web/connected-setup.mjs';
import { listFrom } from '../web/model.mjs';

const explain = (error) => String(error?.message || error || 'This step could not be checked.').slice(0, 700);
const localStorageOrNull = () => { try { return globalThis.localStorage; } catch { return null; } };

/** React's small lifecycle boundary around DEV's receipt-checked setup models.
 * This controller never treats a tutorial marker or an animation as a saved record.
 */
export function createDevQuestController({
  bridge, state, workspaceId = () => state.workspace?.workspaceId || state.workspace?.id,
  run = async (task) => task(), render = () => {}, onProfileReady = async () => {},
  openPage = async () => {}, navigateRecord = async () => {},
  openSetup = async () => {}, onAsk, newGig,
  storage = localStorageOrNull(), focus = () => {
    globalThis.requestAnimationFrame?.(() => globalThis.document?.querySelector(
      '.quest-error, #setup-heading, #quest-heading'
    )?.focus?.({ preventScroll: true }));
  }
}) {
  let quest = null;
  let error = '';
  let people = [];
  let peopleCursor = null;
  let peopleLoading = false;
  let peopleError = '';
  let animation = '';
  let epoch = 0;

  const connected = new ConnectedSetup(bridge, {
    storage,
    changed: render,
    onManual: async () => {
      if (quest?.state && quest.state.mode !== 'finished') {
        quest.resume(); render(); focus();
      } else {
        quest?.pause();
        if (newGig) await newGig();
        else await openPage('gigs', true);
      }
    },
    onExplore: async () => { quest?.pause(); await openPage('overview', true); },
    onFinish: async () => { quest?.pause(); await openPage('overview', true); },
    onAsk: async (prompt) => {
      // The setup surface deliberately owns the whole page. Leave it before
      // opening chat so the verified first-answer draft is visible and editable.
      connected.leave(); quest?.pause();
      if (onAsk) { await openPage('overview', true); await onAsk(prompt); }
      else await openSetup('built-in-chat');
    }
  });

  const perform = async (task) => {
    if (state.busy) return;
    error = '';
    try {
      await run(async () => {
        try { await task(); } catch (cause) { error = explain(cause); }
      });
    } finally { render(); focus(); }
  };

  const getQuest = () => {
    const id = workspaceId();
    if (!id) throw new Error('Create a private workspace first.');
    if (!quest || quest.workspaceId !== id) {
      quest = new OnboardingQuest(bridge, id, { storage });
      people = []; peopleCursor = null; peopleError = ''; epoch++;
    }
    return quest;
  };

  const controller = {
    connected,
    get model() { return quest; },
    get view() {
      const progress = quest?.state;
      const phase = !state.workspace || state.setupProfile ? 0 : progress?.phase || 0;
      const draft = phase === 0
        ? state.setupDraft || progress?.drafts?.workspace || {}
        : progress?.drafts?.[phase === 1 ? 'gig' : 'person'] || {};
      return {
        active: !state.workspace || !!state.setupProfile || !!quest?.open || connected.open,
        connected: !!(state.workspace && !state.setupProfile && !quest?.recoveryRequired && connected.open),
        phase, draft, profileName: progress?.profileName || '',
        gig: progress?.gig, person: progress?.person,
        crewLinked: !!progress?.crewLinked, skipped: !!progress?.skipped,
        error, animation, storageWarning: !!quest?.warning,
        recoveryRequired: !!quest?.recoveryRequired,
        resume: !!progress && (progress.mode === 'paused' || progress.mode === 'finished' && progress.skipped),
        connectedResume: !!connected.journey && !connected.open && connected.journey.state.mode !== 'finished',
        people, peopleCursor, peopleLoading, peopleError
      };
    },
    /** Call after the parent reads this workspace's profile, before opening a page. */
    async load(profile = null) {
      error = ''; animation = '';
      if (!state.workspace) { quest = null; connected.leave(); return; }
      const current = getQuest();
      try { await current.restore(); } catch (cause) { error = explain(cause); }
      if (!profile && !current.state) current.start();
      if (profile && !current.recoveryRequired && current.state?.phase === 0) current.profileReady(profile);
      connected.mount(state.workspace, {
        autoStart: !state.setupProfile && !current.recoveryRequired && current.open && current.state?.phase > 0
      });
      if (connected.open && !current.recoveryRequired) void connected.refresh();
    },
    draft(values) {
      if (!state.workspace || state.setupProfile) state.setupDraft = { ...state.setupDraft, ...values };
      quest?.draft(values);
    },
    createSpace(values = {}) {
      controller.draft(values);
      return perform(async () => {
        const ownerName = String(values.ownerName || '').trim();
        if (!ownerName || ownerName.length > 80) throw new Error('Add your name to keep going.');
        const name = String(values.name || `${ownerName}’s space`).trim().slice(0, 80);
        if (!state.workspace) state.workspace = await bridge.createWorkspace(name);
        const current = getQuest();
        if (!current.state) current.start(ownerName);
        current.draft(values);
        state.setupProfile = true;
        // No currency is inferred. Recover a previously submitted explicit choice exactly.
        const currency = current.pending.profile?.currency ?? values.currency;
        const profile = await current.saveProfile(ownerName, currency);
        state.currency = profile.fields?.Currency || null;
        state.currencyKnown = true;
        state.setupProfile = false; state.setupDraft = null;
        animation = 'workspace';
        await onProfileReady(profile);
        connected.mount(state.workspace, { autoStart: true });
        void connected.refresh();
      });
    },
    saveGig(title) {
      controller.draft({ title });
      return perform(async () => { await getQuest().saveGig(title); animation = 'gig'; });
    },
    savePerson(title) {
      controller.draft({ title });
      return perform(async () => { await getQuest().savePerson(title); animation = 'crew'; });
    },
    async loadPeople(more = false) {
      if (peopleLoading || state.busy) return;
      const id = workspaceId(), requestEpoch = epoch;
      peopleLoading = true; peopleError = ''; render();
      try {
        const result = await bridge.listRecords(id, 'contacts', more ? peopleCursor : undefined);
        if (id !== workspaceId() || epoch !== requestEpoch) return;
        const entries = listFrom(result).filter((record) => record?.id && typeof record.title === 'string');
        people = [...new Map([...(more ? people : []), ...entries].map((record) => [record.id, record])).values()];
        peopleCursor = result?.nextCursor || null;
      } catch (cause) { if (epoch === requestEpoch) peopleError = explain(cause); }
      finally { if (epoch === requestEpoch) { peopleLoading = false; render(); } }
    },
    choosePerson(id) {
      return perform(async () => {
        const current = getQuest(); current.requireState();
        if (!current.state.gig) throw new Error('Check your saved gig before choosing a person.');
        if (current.refs.person && current.refs.person !== id || current.pending.person) {
          throw new Error('Finish checking the saved person before choosing another.');
        }
        // The selection is only a reference. Re-read the exact local contact before linking.
        const person = await current.readRecord('person', id);
        if (!person) throw new Error('That person is no longer saved. Refresh the list before choosing again.');
        current.refs.person = person.id; current.state.person = person;
        current.state.phase = 2; current.state.skipped = false; current.persist();
        await current.retryLink(); animation = 'crew';
      });
    },
    action(action) {
      return perform(async () => {
        const current = getQuest();
        if (action === 'restore' || action === 'resume') {
          await current.restore();
          if (!current.state) current.start();
          if (action === 'resume') { connected.leave(); current.resume(); }
          if (state.setupProfile && current.refs.profile && !current.recoveryRequired) {
            const profile = await current.readRecord('profile', current.refs.profile);
            if (profile) { state.setupProfile = false; state.setupDraft = null; await onProfileReady(profile); }
          }
        } else if (action === 'retry-link') { await current.retryLink(); animation = 'crew'; }
        else if (action === 'skip-person') current.skipPerson();
        else if (action === 'finish') {
          current.finish();
          await navigateRecord('gigs', current.state.gig.id);
        } else if (action === 'pause') { current.pause(); await openPage('overview', true); }
        else if (action === 'calendar' || action === 'ai') {
          current.pause(); connected.leave();
          await openSetup(action === 'calendar' ? 'source-connections' : 'built-in-chat');
        }
      });
    },
    async guided(action) { await connected.action(action); render(); focus(); },
    async assistant(action) { await connected.assistantAction(action); render(); focus(); },
    async intent(intent) { await connected.intent(intent); render(); focus(); },
    selectCandidate(id) { connected.selectCandidate(id); render(); focus(); },
    candidateDraft(values) { connected.imports?.updateDraft(values); },
    reviewCandidate(values) {
      try { connected.imports.reviewCandidate(values); connected.error = ''; }
      catch (cause) { connected.error = explain(cause); }
      render(); focus();
    },
    leave() { connected.leave(); quest?.pause(); }
  };
  return controller;
}
