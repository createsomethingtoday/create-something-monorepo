import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { discoverTypes } from './type-discovery.mjs';
import { editTypes } from './type-edits.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const version = 'substrate-learned-vocabulary/v1';

function readState(file) {
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state.schema !== version) throw new Error('Unsupported vocabulary state');
  return state;
}

function update(file, transform) {
  const lock = file + '.lock';
  fs.mkdirSync(lock);
  const tmp = path.join(lock, randomUUID());
  try {
    const previous = fs.existsSync(file) ? readState(file) : null;
    const state = transform(previous);
    if (JSON.stringify(state) !== JSON.stringify(previous)) {
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', {mode: 0o600});
      fs.renameSync(tmp, file);
    }
    return state;
  } finally {
    fs.rmSync(lock, {recursive: true, force: true});
  }
}

function* documents(root, dir = root) {
  for (const item of fs.readdirSync(dir, {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* documents(root, full);
    if (item.isFile() && /\.(md|txt|json)$/i.test(item.name)) yield path.relative(root, full);
  }
}

export function syncVocabulary(directory, statePath) {
  const root = fs.realpathSync(directory);
  const file = path.join(fs.realpathSync(path.dirname(statePath)), path.basename(statePath));
  if (file === root || file.startsWith(root + path.sep)) throw new Error('Store the state file outside the source directory');
  return update(file, previous => {
    if (previous && previous.root !== root) throw new Error('State belongs to another source directory');
    const sources = [];
    const prior = new Map(previous?.sources.map(source => [source.path, source]));
    const types = new Map((previous?.types ?? []).map(type => [type.id, {...type, evidence: []}]));
    for (const relative of documents(root)) {
      const bytes = fs.readFileSync(path.join(root, relative));
      const hash = digest(bytes);
      const cached = prior.get(relative);
      const source = cached?.hash === hash ? cached : {path: relative, hash, findings: discoverTypes(relative, bytes.toString('utf8'))};
      sources.push(source);
      for (const finding of source.findings) {
        const id = 'type:' + finding.name;
        const type = types.get(id) ?? {id, name: finding.name, description: '', curated: false, evidence: []};
        type.evidence.push({source: relative, hash, excerpt: finding.evidence});
        types.set(id, type);
      }
    }
    const current = [...types.values()].filter(type => type.curated || type.evidence.length);
    current.sort((a,b) => a.id.localeCompare(b.id, 'en'));
    return {schema: version, root, sources, types: current};
  });
}

export function editVocabulary(file, instruction) {
  return update(file, state => {
    if (!state) throw new Error('Sync the vocabulary before editing');
    const edited = editTypes(state.types, instruction);
    return {...state, types: edited.map((type, i) => ({
      ...type, curated: type.curated || type.name !== state.types[i].name || type.description !== state.types[i].description
    }))};
  });
}

export function vocabularyReport(state) {
  return {schema: version, documents: state.sources.length, types: state.types};
}
