const VERSION = 1;
const MAX_BYTES = 8192;
const currencies = new Set(['USD', 'CAD', 'EUR', 'GBP']);
const modes = new Set(['active', 'paused', 'finished']);
const kinds = ['profile', 'gig', 'person'];
const entities = { profile: 'profile', gig: 'gigs', person: 'contacts' };
const limits = { profile: 80, gig: 120, person: 80 };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const bytes = value => new TextEncoder().encode(value).length;
const missing = error => /^record not found\.?$/i.test(String(error?.message ?? error));
const emptyDrafts = () => ({ workspace: {}, gig: { title: '' }, person: { title: '' } });
const emptyRefs = () => ({ profile: null, gig: null, person: null });
const emptyPending = () => ({ profile: null, gig: null, person: null });
const keyFor = workspaceId => `gigi:quest:v1:${workspaceId}`;

function titleFor(value, kind) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title || title.length > limits[kind]) throw new Error(`Enter a ${kind === 'profile' ? 'name' : kind === 'gig' ? 'gig title' : 'person’s name'} of ${limits[kind]} characters or less.`);
  return title;
}

function cleanDrafts(value) {
  const result = emptyDrafts();
  for (const key of ['name', 'ownerName', 'currency']) {
    if (typeof value?.workspace?.[key] === 'string') result.workspace[key] = value.workspace[key].slice(0, 80);
  }
  for (const kind of ['gig', 'person']) if (typeof value?.[kind]?.title === 'string') result[kind].title = value[kind].title.slice(0, limits[kind]);
  return result;
}

function decode(text, workspaceId) {
  if (typeof text !== 'string' || bytes(text) > MAX_BYTES) throw new Error('Invalid quest marker');
  const value = JSON.parse(text);
  if (!plain(value) || value.version !== VERSION || value.workspaceId !== workspaceId || !Number.isInteger(value.phase) || value.phase < 0 || value.phase > 3 || !modes.has(value.mode) || typeof value.profileName !== 'string' || value.profileName.length > 80 || typeof value.crewLinked !== 'boolean' || typeof value.skipped !== 'boolean' || !plain(value.refs) || !plain(value.pending) || !plain(value.drafts)) throw new Error('Invalid quest marker');
  for (const kind of kinds) {
    if (value.refs[kind] !== null && !identifier(value.refs[kind])) throw new Error('Invalid quest reference');
    const pending = value.pending[kind];
    if (pending !== null && (!plain(pending) || !identifier(pending.id) || !identifier(pending.key) || typeof pending.title !== 'string' || pending.title !== titleFor(pending.title, kind) || kind === 'profile' && pending.currency !== undefined && !currencies.has(pending.currency))) throw new Error('Invalid pending quest save');
  }
  return value;
}

function newId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new Error('GiGi could not prepare a safe local record ID. Restart the development app and try again.');
  const data = globalThis.crypto.getRandomValues(new Uint8Array(16));
  data[6] = (data[6] & 15) | 64; data[8] = (data[8] & 63) | 128;
  const hex = [...data].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Local tutorial progress points at SQLite records; it never establishes their existence. */
export class OnboardingQuest {
  constructor(bridge, workspaceId, options = {}) {
    if (!identifier(workspaceId)) throw new Error('A workspace is required for onboarding.');
    this.bridge = bridge;
    this.workspaceId = workspaceId;
    this.state = null;
    this.warning = false;
    this.refs = emptyRefs();
    this.pending = emptyPending();
    this.recoveryRequired = false;
    try { this.storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage; }
    catch { this.storage = null; this.warning = true; }
  }

  get open() { return this.state !== null && this.state.mode === 'active'; }

  start(profileName = '') {
    if (this.state) return this.state;
    this.state = { version: VERSION, workspaceId: this.workspaceId, phase: 0, profileName: String(profileName).slice(0, 80), drafts: emptyDrafts(), gig: null, person: null, crewLinked: false, skipped: false, mode: 'active' };
    this.persist();
    return this.state;
  }

  profileReady(profile) {
    this.requireState();
    this.state.profileName = titleFor(profile?.title || this.state.profileName, 'profile');
    if (identifier(profile?.id)) this.refs.profile = profile.id;
    this.pending.profile = null;
    this.state.phase = Math.max(1, this.state.phase);
    this.persist();
    return profile;
  }

  draft(values) {
    if (!this.state || !plain(values)) return;
    const kind = ['workspace', 'gig', 'person'][this.state.phase];
    if (!kind) return;
    this.state.drafts = cleanDrafts({ ...this.state.drafts, [kind]: { ...this.state.drafts[kind], ...values } });
    this.persist();
  }

  async saveProfile(ownerName, currency) {
    this.requireState();
    if (currency !== undefined && currency !== '' && !currencies.has(currency)) throw new Error('Choose a supported currency: USD, CAD, EUR or GBP.');
    const profile = await this.saveRecord('profile', ownerName, currency ? { Currency: currency } : {});
    this.profileReady(profile);
    return profile;
  }

  async saveGig(value) {
    this.requireState();
    if (this.state.phase < 1) throw new Error('Finish your profile before adding a gig.');
    const record = await this.saveRecord('gig', value, {});
    this.state.gig = record;
    this.state.drafts.gig.title = record.title;
    this.state.phase = this.state.crewLinked || this.state.skipped ? 3 : 2;
    this.persist();
    return record;
  }

  async savePerson(value) {
    this.requireState();
    if (!this.state.gig) throw new Error('Check your saved gig before adding a person.');
    const record = await this.saveRecord('person', value, {});
    this.state.person = record;
    this.state.drafts.person.title = record.title;
    this.state.phase = 2;
    this.state.skipped = false;
    this.persist();
    await this.retryLink();
    return record;
  }

  async retryLink() {
    this.requireState();
    if (!this.refs.gig || !this.refs.person) throw new Error('Save a gig and a person before linking them.');
    const gig = await this.readRecord('gig', this.refs.gig);
    const person = await this.readRecord('person', this.refs.person);
    if (!gig || !person) throw new Error('The saved gig or person could not be found. Check onboarding status before retrying the link.');
    this.state.gig = gig; this.state.person = person;
    if (!this.hasCrewLink(gig)) {
      const receipt = await this.bridge.linkRecords(this.workspaceId, 'gigs', gig.id, 'contacts', person.id, 'Contacts');
      if (receipt?.linked !== true || receipt.workspaceId !== this.workspaceId || receipt.fromEntity !== 'gigs' || receipt.fromId !== gig.id || receipt.toEntity !== 'contacts' || receipt.toId !== person.id || receipt.role !== 'Contacts') throw new Error('GiGi could not confirm the person link. Check status, then retry the link.');
      const confirmed = await this.readRecord('gig', gig.id);
      if (!confirmed || !this.hasCrewLink(confirmed)) throw new Error('GiGi could not read back the person link. Check status, then retry the link.');
      this.state.gig = confirmed;
    }
    this.state.crewLinked = true;
    this.state.skipped = false;
    this.state.phase = 3;
    this.persist();
    return this.state.gig;
  }

  skipPerson() {
    this.requireState();
    if (!this.state.gig) throw new Error('Save your first gig before skipping the crew mission.');
    this.state.phase = 3;
    if (!this.state.crewLinked) this.state.skipped = true;
    this.persist();
  }

  pause() { if (this.state) { this.state.mode = 'paused'; this.persist(); } }
  resume() { if (this.state) { this.state.mode = 'active'; if(this.state.skipped && this.state.gig) { this.state.phase = 2; this.state.skipped = false; } this.persist(); } }
  finish() {
    this.requireState();
    if (this.state.phase !== 3) throw new Error('Finish your current mission or choose Explore freely.');
    this.state.mode = 'finished'; this.persist();
  }

  async restore() {
    let text;
    try {
      if (typeof this.storage?.getItem !== 'function') { this.warning = true; return null; }
      text = this.storage.getItem(keyFor(this.workspaceId));
    } catch { this.warning = true; return null; }
    if (text == null) return null;
    let value;
    try { value = decode(text, this.workspaceId); }
    catch { this.warning = true; return null; }
    this.state = { version: VERSION, workspaceId: this.workspaceId, phase: value.phase, profileName: value.profileName, drafts: cleanDrafts(value.drafts), gig: null, person: null, crewLinked: false, skipped: value.skipped, mode: value.mode };
    this.refs = { ...value.refs };
    this.pending = { ...value.pending };
    this.recoveryRequired = false;
    try {
      for (const kind of kinds) {
        const id = this.refs[kind] || this.pending[kind]?.id;
        if (!id) continue;
        const record = await this.readRecord(kind, id);
        if (!record) {
          this.refs[kind] = null;
          if (kind === 'profile') this.state.phase = 0;
          else if (kind === 'gig') this.state.phase = Math.min(this.state.phase, 1);
          else if (this.state.phase === 3 && !this.state.skipped) this.state.phase = 2;
          continue;
        }
        if (this.pending[kind]) this.checkPendingRecord(record, kind, this.pending[kind]);
        this.refs[kind] = id;
        this.pending[kind] = null;
        if (kind === 'profile') { this.state.profileName = record.title.slice(0, 80); this.state.phase = Math.max(1, this.state.phase); }
        else this.state[kind] = record;
      }
      if (this.state.gig && this.state.phase >= 1) {
        this.state.crewLinked = this.hasCrewLink(this.state.gig);
        if (this.state.crewLinked) { this.state.skipped = false; this.state.phase = 3; }
        else this.state.phase = this.state.skipped ? 3 : 2;
      }
      this.persist();
      return this.state;
    } catch (error) {
      this.recoveryRequired = true;
      this.state.phase = this.state.gig ? 2 : this.state.profileName ? 1 : 0;
      this.state.crewLinked = false;
      throw new Error(`GiGi could not check your saved onboarding records. Retry the status check before saving again. ${String(error?.message || error)}`);
    }
  }

  requireState() {
    if (!this.state) throw new Error('Start onboarding for this workspace first.');
    if (this.recoveryRequired) throw new Error('Retry the onboarding status check before saving records. Local records have not been replaced.');
  }

  async saveRecord(kind, value, fields) {
    this.requireState();
    const title = titleFor(value, kind);
    let pending = this.pending[kind];
    if (this.refs[kind]) {
      const current = await this.readRecord(kind, this.refs[kind]);
      if (!current) throw new Error('The saved onboarding record is missing. Check onboarding status before creating another.');
      if (current.title !== title || kind === 'profile' && current.fields?.Currency !== fields.Currency) throw new Error('This onboarding record is already saved. Open the saved record to change its details.');
      return current;
    }
    if (pending && (pending.title !== title || kind === 'profile' && pending.currency !== fields.Currency)) throw new Error('The previous save needs a status check. Retry its original name and currency before changing the details.');
    if (!pending) {
      pending = { id: newId(), key: newId(), title, ...(kind === 'profile' ? { currency: fields.Currency } : {}) };
      this.pending[kind] = pending;
      this.persist();
    }
    let record = await this.readRecord(kind, pending.id);
    if (!record) {
      await this.bridge.saveRecord(this.workspaceId, entities[kind], { id: pending.id, title: pending.title, fields, idempotencyKey: pending.key });
      record = await this.readRecord(kind, pending.id);
    }
    if (!record) throw new Error('GiGi could not read back the saved record. Retry this mission to check the same save.');
    this.checkPendingRecord(record, kind, pending);
    this.refs[kind] = record.id;
    this.pending[kind] = null;
    this.persist();
    return record;
  }

  async readRecord(kind, id) {
    let record;
    try { record = await this.bridge.getRecord(this.workspaceId, entities[kind], id, 'full'); }
    catch (error) { if (missing(error)) return null; throw error; }
    if (!record || record.id !== id || record.workspaceId !== this.workspaceId || record.entity !== entities[kind] || typeof record.title !== 'string') throw new Error('The onboarding record response could not be verified. Check status before retrying.');
    return record;
  }

  checkPendingRecord(record, kind, pending) {
    if (record.title !== pending.title || kind === 'profile' && record.fields?.Currency !== pending.currency) throw new Error('The saved onboarding record changed. Review the saved record before retrying; GiGi has not overwritten it.');
  }

  hasCrewLink(gig) {
    return Boolean(this.state?.person && gig?.relations?.some(link => link.fromEntity === 'gigs' && link.fromId === gig.id && link.toEntity === 'contacts' && link.toId === this.state.person.id && link.role === 'Contacts'));
  }

  persist() {
    if (!this.state) return;
    const value = { version: VERSION, workspaceId: this.workspaceId, phase: this.state.phase, profileName: this.state.profileName, drafts: cleanDrafts(this.state.drafts), refs: this.refs, pending: this.pending, crewLinked: this.state.crewLinked, skipped: this.state.skipped, mode: this.state.mode };
    try {
      const text = JSON.stringify(value);
      if (bytes(text) > MAX_BYTES || typeof this.storage?.setItem !== 'function') throw new Error('Quest storage unavailable');
      this.storage.setItem(keyFor(this.workspaceId), text);
    } catch { this.warning = true; }
  }
}
