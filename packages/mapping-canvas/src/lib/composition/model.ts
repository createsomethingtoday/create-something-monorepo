import sourceLock from './source-lock.json';
export const VERSION = 'draw.composition.v1';
export const STORAGE_KEY = 'draw.composition.demo.v1';
export type State = 'empty' | 'invalid' | 'error' | 'recovered';
export type Content = {
  title: string;
  description: string;
  buttonLabel: string;
  variant: 'primary' | 'secondary';
};
type ComponentProps = {
  'component.form-text-field': { label: string; binding: 'name' };
  'component.form-text-area': { label: string; binding: 'brief' };
  'component.button': { label: 'buttonLabel'; variant: 'variant' };
  'component.feedback-alert': Record<string, never>;
};
type ComponentNode = {
  [R in keyof ComponentProps]: { id: string; kind: 'component'; ref: R; props: ComponentProps[R] };
}[keyof ComponentProps];
export type Node =
  | { id: string; kind: 'stack'; gap: 'md' | 'lg'; children: Node[] }
  | { id: string; kind: 'slot'; name: 'heading' | 'action' }
  | { id: string; kind: 'use'; definition: string; slots: Record<string, Node> }
  | ComponentNode
  | { id: string; kind: 'copy'; title: string; body: string };
export type Document = {
  version: typeof VERSION;
  id: string;
  revision: number;
  overlay: 'overlay.agency-atlas-public';
  source: typeof sourceLock;
  content: Content;
  definitions: Record<string, Node>;
  root: Node;
};
const component = <R extends keyof ComponentProps>(
  id: string,
  ref: R,
  props: ComponentProps[R]
): ComponentNode => ({ id, kind: 'component', ref, props }) as ComponentNode;
export function createDocument(): Document {
  return {
    version: VERSION,
    id: 'request-demo',
    revision: 0,
    overlay: 'overlay.agency-atlas-public',
    source: structuredClone(sourceLock),
    content: {
      title: 'Make the next step clear.',
      description: 'A useful request keeps its context—even when something goes wrong.',
      buttonLabel: 'Review request',
      variant: 'primary'
    },
    definitions: {
      fields: {
        id: 'fields',
        kind: 'stack',
        gap: 'md',
        children: [
          component('name', 'component.form-text-field', { label: 'Your name', binding: 'name' }),
          component('brief', 'component.form-text-area', {
            label: 'What would you like to improve?',
            binding: 'brief'
          })
        ]
      },
      form: {
        id: 'form',
        kind: 'stack',
        gap: 'lg',
        children: [
          { id: 'heading', kind: 'slot', name: 'heading' },
          { id: 'details', kind: 'use', definition: 'fields', slots: {} },
          component('feedback', 'component.feedback-alert', {}),
          { id: 'action', kind: 'slot', name: 'action' }
        ]
      }
    },
    root: {
      id: 'request',
      kind: 'use',
      definition: 'form',
      slots: {
        heading: { id: 'intro', kind: 'copy', title: 'title', body: 'description' },
        action: component('submit', 'component.button', {
          label: 'buttonLabel',
          variant: 'variant'
        })
      }
    }
  };
}
function fail(message: string): never {
  throw new Error(message);
}
function obj(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) fail('Expected an object.');
  return x as Record<string, unknown>;
}
function keys(x: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(x).some((k) => !allowed.includes(k))) fail('Unsupported property.');
}
const short = (x: unknown, limit = 180): x is string =>
  typeof x === 'string' && x.trim().length > 0 && x.length <= limit;
const id = (x: unknown): x is string => typeof x === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(x);
export function parseDocument(text: string): Document {
  if (text.length > 40000) fail('Composition is too large.');
  const d = obj(JSON.parse(text));
  keys(d, ['version', 'id', 'revision', 'overlay', 'source', 'content', 'definitions', 'root']);
  if (
    d.version !== VERSION ||
    !id(d.id) ||
    !Number.isSafeInteger(d.revision) ||
    Number(d.revision) < 0 ||
    d.overlay !== 'overlay.agency-atlas-public'
  )
    fail('Unsupported composition version or identity.');
  if (JSON.stringify(d.source) !== JSON.stringify(sourceLock))
    fail('Canon source or asset version does not match this renderer.');
  const c = obj(d.content);
  keys(c, ['title', 'description', 'buttonLabel', 'variant']);
  if (
    !short(c.title, 70) ||
    !short(c.description, 180) ||
    !short(c.buttonLabel, 32) ||
    !['primary', 'secondary'].includes(String(c.variant))
  )
    fail('Invalid content props.');
  const defs = obj(d.definitions);
  if (Object.keys(defs).length > 8 || Object.keys(defs).some((k) => !id(k)))
    fail('Invalid definitions.');
  let count = 0;
  function check(value: unknown, locals: Set<string>, depth = 0): void {
    const n = obj(value);
    if (++count > 80 || depth > 10 || !id(n.id) || locals.has(n.id))
      fail('Duplicate ID or composition limit exceeded.');
    locals.add(n.id);
    switch (n.kind) {
      case 'stack':
        keys(n, ['id', 'kind', 'gap', 'children']);
        if (
          !['md', 'lg'].includes(String(n.gap)) ||
          !Array.isArray(n.children) ||
          n.children.length > 12
        )
          fail('Invalid stack.');
        n.children.forEach((v) => check(v, locals, depth + 1));
        break;
      case 'slot':
        keys(n, ['id', 'kind', 'name']);
        if (!['heading', 'action'].includes(String(n.name))) fail('Unknown slot.');
        break;
      case 'use':
        keys(n, ['id', 'kind', 'definition', 'slots']);
        if (typeof n.definition !== 'string' || !Object.hasOwn(defs, n.definition))
          fail('Unknown definition.');
        for (const [k, v] of Object.entries(obj(n.slots))) {
          if (!['heading', 'action'].includes(k)) fail('Unknown slot.');
          check(v, locals, depth + 1);
        }
        break;
      case 'copy':
        keys(n, ['id', 'kind', 'title', 'body']);
        if (n.title !== 'title' || n.body !== 'description') fail('Unknown content binding.');
        break;
      case 'component': {
        keys(n, ['id', 'kind', 'ref', 'props']);
        const p = obj(n.props);
        if (n.ref === 'component.form-text-field' || n.ref === 'component.form-text-area') {
          keys(p, ['label', 'binding']);
          if (
            !short(p.label, 70) ||
            p.binding !== (n.ref === 'component.form-text-field' ? 'name' : 'brief')
          )
            fail('Invalid field props.');
        } else if (n.ref === 'component.button') {
          keys(p, ['label', 'variant']);
          if (p.label !== 'buttonLabel' || p.variant !== 'variant') fail('Invalid button props.');
        } else if (n.ref === 'component.feedback-alert') keys(p, []);
        else fail('Unknown Canon component.');
        break;
      }
      default:
        fail('Unknown node kind.');
    }
  }
  for (const n of Object.values(defs)) check(n, new Set());
  check(d.root, new Set());
  const doc = d as unknown as Document;
  const expanded = expand(doc);
  const components = expanded.filter((n) => n.kind === 'component');
  for (const ref of [
    'component.form-text-field',
    'component.form-text-area',
    'component.button',
    'component.feedback-alert'
  ])
    if (components.filter((n) => n.kind === 'component' && n.ref === ref).length !== 1)
      fail('This form renderer requires exactly one of each supported control.');
  return doc;
}
export type Expanded = Exclude<Node, { kind: 'use' } | { kind: 'slot' }> & { instanceId: string };
export function expand(d: Document): Expanded[] {
  const out: Expanded[] = [];
  const ids = new Set<string>();
  function visit(n: Node, path: string, slots: Record<string, Node>, chain: string[]) {
    if (chain.length > 8 || out.length > 100) fail('Composition cycle or expansion limit.');
    const instanceId = `${path}/${n.id}`;
    if (n.kind === 'use') {
      if (chain.includes(n.definition)) fail('Composition cycle.');
      const definition = d.definitions[n.definition];
      if (!definition) fail('Missing definition.');
      const names: string[] = [];
      const scan = (v: Node) => {
        if (v.kind === 'slot') names.push(v.name);
        if (v.kind === 'stack') v.children.forEach(scan);
      };
      scan(definition);
      if (
        names.length !== new Set(names).size ||
        names.some((k) => !n.slots[k]) ||
        Object.keys(n.slots).some((k) => !names.includes(k))
      )
        fail('Missing or unused named slot.');
      visit(definition, instanceId, n.slots, [...chain, n.definition]);
      return;
    }
    if (n.kind === 'slot') {
      if (!slots[n.name]) fail('Missing slot.');
      visit(slots[n.name], instanceId, {}, chain);
      return;
    }
    if (ids.has(instanceId)) fail('Duplicate instance ID.');
    ids.add(instanceId);
    out.push({ ...n, instanceId });
    if (n.kind === 'stack') n.children.forEach((child) => visit(child, instanceId, slots, chain));
  }
  visit(d.root, d.id, {}, []);
  return out;
}
export function updateContent(d: Document, patch: Partial<Content>): Document {
  return parseDocument(
    JSON.stringify({ ...d, revision: d.revision + 1, content: { ...d.content, ...patch } })
  );
}
export function serialize(d: Document): string {
  return JSON.stringify(parseDocument(JSON.stringify(d)), null, 2);
}
export type Values = { name: string; brief: string };
export function validate(values: Values) {
  return {
    name: values.name.trim() ? '' : 'Enter your name.',
    brief: values.brief.trim() ? '' : 'Describe one thing you want to improve.'
  };
}
export function resolveTree(d: Document): Resolved {
  const walk = (n: Node, path: string, slots: Record<string, Node>): Resolved => {
    const instanceId = `${path}/${n.id}`;
    if (n.kind === 'use') return walk(d.definitions[n.definition], instanceId, n.slots);
    if (n.kind === 'slot') return walk(slots[n.name], instanceId, {});
    return {
      ...n,
      instanceId,
      children: n.kind === 'stack' ? n.children.map((child) => walk(child, instanceId, slots)) : []
    };
  };
  return walk(d.root, d.id, {});
}
export type Resolved = Expanded & { children: Resolved[] };
export { sourceLock };
