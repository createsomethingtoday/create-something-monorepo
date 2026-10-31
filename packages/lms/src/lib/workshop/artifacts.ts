export const artifactKey = 'pcn-workshop-artifacts-v1';
export const artifactObjects = [
  {
    id: 'starter',
    label: 'Starter crate',
    short: 'Starter',
    kind: 'crate',
    x: -3,
    z: -2,
    output: 'Project',
    next: 'Unpack the crate, then carry the project to GitHub.',
    recovery: 'Download the starter again; unpacking in this room changes only practice objects.',
    guide: 'starter'
  },
  {
    id: 'repository',
    label: 'GitHub station',
    short: 'GitHub',
    kind: 'repository',
    x: 3,
    z: -2,
    output: 'Private repository plan',
    next: 'Carry the project here, then take the repository plan to Codex.',
    recovery:
      'Bring a current project. Actual private repository creation and push happen in your GitHub account.',
    guide: 'repository'
  },
  {
    id: 'change',
    label: 'Codex workbench',
    short: 'Codex',
    kind: 'workbench',
    x: 3,
    z: 2,
    output: 'Proposed change',
    next: 'Review the practice change, approve its exact revision, then take it to the vault.',
    recovery:
      'Source changes cancel approval and make every downstream object stale. Review the new revision.',
    guide: 'repository'
  },
  {
    id: 'references',
    label: 'Infisical vault',
    short: 'Infisical',
    kind: 'vault',
    x: 0,
    z: -3,
    output: 'Configuration references',
    next: 'Bring an approved change. Carry named demo references to Cloudflare.',
    recovery:
      'These are reference names, never secret values. Actual secret projects and access require owner consent.',
    guide: 'account'
  },
  {
    id: 'target',
    label: 'Cloudflare launch pad',
    short: 'Cloudflare',
    kind: 'launch',
    x: 0,
    z: 3,
    output: 'Destination plan',
    next: 'Bring configuration references, review the practice destination, then carry it to the beacon.',
    recovery:
      'A changed destination invalidates the beacon. Real account selection and deployment stay in the official setup flow.',
    guide: 'deploy'
  },
  {
    id: 'result',
    label: 'Deployment beacon',
    short: 'Result',
    kind: 'beacon',
    x: -3,
    z: 2,
    output: 'Practice check receipt',
    next: 'Bring the reviewed destination plan to simulate a health check.',
    recovery:
      'A stale receipt is retained for inspection but cannot prove the current source or target. Rebuild the affected path.',
    guide: 'confirm'
  }
] as const;
export type ArtifactId = (typeof artifactObjects)[number]['id'];
export type Artifact = {
  revision: number;
  prepared: boolean;
  source: { id: ArtifactId; revision: number } | null;
};
export type ArtifactState = {
  epoch: string;
  version: number;
  selected: ArtifactId;
  nodes: Record<ArtifactId, Artifact>;
  approved: number | null;
  environment: 'preview' | 'production';
  carry: { id: ArtifactId; revision: number; token: string } | null;
  message: string;
};
export type ArtifactIntent =
  | { type: 'inspect'; id: ArtifactId }
  | { type: 'unpack' | 'revise' | 'approve' | 'cancel' }
  | { type: 'pick'; id: ArtifactId; token: string }
  | { type: 'place'; id: ArtifactId }
  | { type: 'environment'; value: 'preview' | 'production' }
  | { type: 'reset'; epoch: string };
const ids = artifactObjects.map((o) => o.id);
const known = (id: unknown): id is ArtifactId => ids.includes(id as ArtifactId);
const integer = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const stamp = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 80;
const predecessor = (id: ArtifactId) => ids[ids.indexOf(id) - 1];
export function initialArtifacts(epoch: string): ArtifactState {
  return {
    epoch,
    version: 0,
    selected: 'starter',
    nodes: Object.fromEntries(
      ids.map((id) => [id, { revision: 0, prepared: false, source: null }])
    ) as ArtifactState['nodes'],
    approved: null,
    environment: 'preview',
    carry: null,
    message: 'Tap the starter crate to begin. All objects are practice.'
  };
}
export function currentArtifact(s: ArtifactState, id: ArtifactId): boolean {
  const n = s.nodes[id];
  if (!n.prepared) return false;
  if (id === 'starter') return true;
  const from = predecessor(id);
  return (
    n.source?.id === from &&
    n.source.revision === s.nodes[from].revision &&
    currentArtifact(s, from) &&
    (from !== 'change' || s.approved === s.nodes.change.revision)
  );
}
export function artifactStatus(s: ArtifactState, id: ArtifactId) {
  const n = s.nodes[id];
  if (!n.revision) return 'Empty';
  if (!currentArtifact(s, id)) return 'Stale';
  if (id === 'change') return s.approved === n.revision ? 'Practice approved' : 'Review required';
  return id === 'result' ? 'Practice completed' : 'Prepared in practice';
}
export function restoreArtifacts(raw: string | null): ArtifactState | null {
  if (raw === null) return null;
  try {
    const s = JSON.parse(raw) as ArtifactState;
    if (
      !stamp(s.epoch) ||
      !integer(s.version) ||
      !known(s.selected) ||
      !['preview', 'production'].includes(s.environment) ||
      typeof s.message !== 'string' ||
      s.message.length > 500 ||
      !(s.approved === null || integer(s.approved))
    )
      return null;
    const nodes = {} as ArtifactState['nodes'];
    for (const id of ids) {
      const n = s.nodes[id];
      if (
        !integer(n.revision) ||
        typeof n.prepared !== 'boolean' ||
        (n.revision === 0 && (n.prepared || n.source !== null))
      )
        return null;
      if (
        n.source !== null &&
        (id === 'starter' ||
          n.source.id !== predecessor(id) ||
          !integer(n.source.revision) ||
          n.source.revision === 0)
      )
        return null;
      if (id !== 'starter' && n.prepared && n.source === null) return null;
      nodes[id] = {
        revision: n.revision,
        prepared: n.prepared,
        source: n.source === null ? null : { id: n.source.id, revision: n.source.revision }
      };
    }
    if (s.approved !== null && (s.approved !== nodes.change.revision || !nodes.change.prepared))
      return null;
    if (
      s.carry !== null &&
      (!known(s.carry.id) || !integer(s.carry.revision) || !stamp(s.carry.token))
    )
      return null;
    const clean: ArtifactState = {
      epoch: s.epoch,
      version: s.version,
      selected: s.selected,
      nodes,
      approved: s.approved,
      environment: s.environment,
      carry:
        s.carry === null
          ? null
          : { id: s.carry.id, revision: s.carry.revision, token: s.carry.token },
      message: s.message
    };
    // Saved downstream evidence must agree with the complete current dependency path.
    for (const id of ids) if (nodes[id].prepared && !currentArtifact(clean, id)) return null;
    return clean;
  } catch {
    return null;
  }
}
export function applyArtifact(
  s: ArtifactState,
  intent: ArtifactIntent,
  expected: { epoch: string; version: number }
): ArtifactState {
  const next = structuredClone(s);
  if (intent.type === 'inspect') {
    next.selected = intent.id;
    return next;
  }
  if (s.epoch !== expected.epoch || s.version !== expected.version) {
    next.message =
      'An object changed in another tab. Inspect the current objects and pick up again.';
    return next;
  }
  const fail = (message: string) => {
    next.message = message;
    return next;
  };
  const invalidate = (id: ArtifactId) => {
    for (const child of ids.slice(ids.indexOf(id) + 1)) next.nodes[child].prepared = false;
    if (ids.indexOf(id) <= ids.indexOf('change')) next.approved = null;
    next.carry = null;
  };
  if (intent.type === 'reset') return initialArtifacts(intent.epoch);
  if (intent.type === 'unpack') {
    if (s.nodes.starter.prepared)
      return fail('The project is already unpacked. Pick it up and choose GitHub.');
    next.nodes.starter = { revision: 1, prepared: true, source: null };
    next.message = 'Project unpacked in practice. Tap it, then tap GitHub.';
  } else if (intent.type === 'revise') {
    if (!currentArtifact(s, 'change'))
      return fail('Bring a current repository plan to Codex first.');
    next.nodes.change.revision++;
    invalidate('change');
    next.message =
      'Source revision changed. Approval cancelled; vault, destination and receipt are stale.';
  } else if (intent.type === 'approve') {
    if (!currentArtifact(s, 'change'))
      return fail('This proposal is stale. Bring the current repository plan again.');
    if (s.approved === s.nodes.change.revision)
      return fail('This exact practice revision is already approved.');
    next.approved = s.nodes.change.revision;
    next.message = `Practice approval recorded for change revision ${s.nodes.change.revision}. No real code was changed.`;
  } else if (intent.type === 'environment') {
    if (s.environment === intent.value) return s;
    next.environment = intent.value;
    if (s.nodes.target.revision) next.nodes.target.revision++;
    invalidate('target');
    next.message =
      'Practice destination changed. Previous beacon evidence is stale; review and carry this destination again.';
  } else if (intent.type === 'cancel') {
    next.carry = null;
    next.message = 'Object put down. Prepared objects are unchanged.';
  } else if (intent.type === 'pick') {
    if (!currentArtifact(s, intent.id))
      return fail('This object is empty or stale. Rebuild it from its current source first.');
    if (intent.id === 'result')
      return fail('Inspect the practice receipt here; it has no outgoing destination.');
    if (intent.id === 'change' && s.approved !== s.nodes.change.revision)
      return fail('Review and approve this exact practice change before carrying it to the vault.');
    next.carry = { id: intent.id, revision: s.nodes[intent.id].revision, token: intent.token };
    next.selected = intent.id;
    next.message = `Carrying ${artifactObjects.find((o) => o.id === intent.id)!.output}. Tap its next destination.`;
  } else if (intent.type === 'place') {
    const carry = s.carry;
    next.selected = intent.id;
    if (!carry) return fail('Pick up a prepared object first, then tap its next destination.');
    if (predecessor(intent.id) !== carry.id)
      return fail(
        'That destination does not accept this object. Follow the highlighted next stop or put it down.'
      );
    if (
      !currentArtifact(s, carry.id) ||
      carry.revision !== s.nodes[carry.id].revision ||
      (carry.id === 'change' && s.approved !== carry.revision)
    )
      return fail('The carried object is stale. Put it down and pick up the current revision.');
    const n = s.nodes[intent.id];
    if (!currentArtifact(s, intent.id) || n.source?.revision !== carry.revision) {
      invalidate(intent.id);
      next.nodes[intent.id] = {
        revision: n.revision + 1,
        prepared: true,
        source: { id: carry.id, revision: carry.revision }
      };
    }
    next.carry = null;
    next.message =
      intent.id === 'result'
        ? 'Practice health check completed. No Worker deployed; provider evidence remains unverified.'
        : `${artifactObjects.find((o) => o.id === intent.id)!.output} prepared in practice. Inspect it for the next action.`;
  }
  next.version++;
  return next;
}
export function applyStoredArtifact(
  raw: string | null,
  fallback: ArtifactState,
  intent: ArtifactIntent,
  expected: { epoch: string; version: number }
) {
  const fresh = raw === null ? initialArtifacts(fallback.epoch) : restoreArtifacts(raw);
  if (!fresh) {
    if (intent.type === 'reset') return initialArtifacts(intent.epoch);
    throw Error('invalid saved objects');
  }
  return applyArtifact(fresh, intent, expected);
}
