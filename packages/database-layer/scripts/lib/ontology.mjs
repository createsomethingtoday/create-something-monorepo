import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const ontologyContract = JSON.parse(fs.readFileSync(new URL('../../ontology/v1/contract.json', import.meta.url), 'utf8'));
const own = (object, key) => Object.hasOwn(object, key);
const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonempty string`);
};
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const serialize = (value) => JSON.stringify(canonical(value));
const sorted = (records) => [...records].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Compose whole modules before validating references, allowing cross-module edges. */
export function composeTopology(modules) {
  if (!Array.isArray(modules) || modules.length === 0) throw new Error('at least one module is required');
  const nodes = new Map();
  const edges = new Map();
  for (const module of modules) {
    requiredText(module?.id, 'module id');
    for (const [kind, index] of [['node', nodes], ['edge', edges]]) {
      const records = module[kind === 'node' ? 'nodes' : 'edges'];
      if (!Array.isArray(records)) throw new Error(`${module.id}: ${kind} records must be an array`);
      const seen = new Set();
      for (const record of records) {
        requiredText(record?.id, `${kind} id`);
        if (seen.has(record.id)) throw new Error(`duplicate ${kind} ${record.id} in ${module.id}`);
        seen.add(record.id);
        if (index.has(record.id) && serialize(index.get(record.id)) !== serialize(record)) throw new Error(`conflicting ${kind} ${record.id}`);
        if (kind === 'edge' && record.evidence !== undefined && typeof record.evidence !== 'string') throw new Error(`${record.id}: evidence must be a string`);
        index.set(record.id, canonical(record));
      }
    }
  }
  for (const module of modules) {
    if (module.rootNodeId !== undefined && !nodes.has(module.rootNodeId)) throw new Error(`unknown root ${module.rootNodeId}`);
  }
  for (const node of nodes.values()) {
    if (typeof node.path !== 'string') throw new Error(`${node.id}.path must be a string`);
    for (const key of ['title', 'owner']) requiredText(node[key], `${node.id}.${key}`);
    for (const [key, terms] of [['tier', ontologyContract.tiers], ['surface', ontologyContract.surfaces], ['status', ontologyContract.statuses]]) {
      if (!terms.includes(node[key])) throw new Error(`${node.id}: unknown ${key} ${node[key]}`);
    }
  }
  for (const edge of edges.values()) {
    if (!own(ontologyContract.relations, edge.relation)) throw new Error(`${edge.id}: unknown relation ${edge.relation}`);
    for (const key of ['source', 'target']) if (!nodes.has(edge[key])) throw new Error(`${edge.id}: unknown ${key} ${edge[key]}`);
  }
  return { id: 'substrate:ontology:composed', nodes: sorted(nodes.values()), edges: sorted(edges.values()) };
}

export function topologyDigest(topology) {
  const graph = composeTopology([topology]);
  return createHash('sha256').update(serialize(graph)).digest('hex');
}

// Encode opaque source identities as IRIs; labels never become identifiers.
const iri = (id) => `<urn:createsomething:substrate:node:${encodeURIComponent(id)}>`;
const literal = (value) => JSON.stringify(value);
export function exportTopologyRdf(topology) {
  const graph = composeTopology([topology]);
  const lines = [`@prefix cs: <${ontologyContract.namespace}> .`, '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .', ''];
  for (const node of graph.nodes) {
    lines.push(`${iri(node.id)} a cs:Node ; rdfs:label ${literal(node.title)} ; cs:sourceId ${literal(node.id)} ; cs:path ${literal(node.path)} ; cs:owner ${literal(node.owner)} ; cs:tier ${literal(node.tier)} ; cs:surface ${literal(node.surface)} ; cs:coverageStatus ${literal(node.status)} .`);
  }
  for (const edge of graph.edges) {
    lines.push(`${iri(edge.source)} cs:${edge.relation} ${iri(edge.target)} .`);
    lines.push(`${`<urn:createsomething:substrate:edge:${encodeURIComponent(edge.id)}>`} a cs:Edge ; cs:sourceId ${literal(edge.id)} ; cs:source ${iri(edge.source)} ; cs:target ${iri(edge.target)} ; cs:relation cs:${edge.relation}${edge.evidence === undefined ? '' : ` ; cs:evidence ${literal(edge.evidence)}`} .`);
  }
  return `${lines.join('\n')}\n`;
}

/** A modeled dependency closure, not logical entailment or permission to execute. */
export function planTopologyChange(before, after, { protectedNodeIds = [] } = {}) {
  const base = composeTopology([before]);
  const next = composeTopology([after]);
  const changedNodes = new Set();
  const changedEdges = new Set();
  for (const [key, changes] of [['nodes', changedNodes], ['edges', changedEdges]]) {
    const left = new Map(base[key].map((record) => [record.id, record]));
    const right = new Map(next[key].map((record) => [record.id, record]));
    for (const id of new Set([...left.keys(), ...right.keys()])) {
      if (serialize(left.get(id)) !== serialize(right.get(id))) {
        changes.add(id);
        if (key === 'edges') for (const edge of [left.get(id), right.get(id)].filter(Boolean)) {
          changedNodes.add(edge.source); changedNodes.add(edge.target);
        }
      }
    }
  }
  const adjacency = new Map();
  const link = (from, to) => { if (!adjacency.has(from)) adjacency.set(from, new Set()); adjacency.get(from).add(to); };
  for (const edge of [...base.edges, ...next.edges]) {
    const direction = ontologyContract.relations[edge.relation];
    if (direction === 'source' || direction === 'both') link(edge.target, edge.source);
    if (direction === 'target' || direction === 'both') link(edge.source, edge.target);
  }
  const affected = new Set(changedNodes);
  const queue = [...affected];
  for (let i = 0; i < queue.length; i++) for (const id of adjacency.get(queue[i]) ?? []) {
    if (!affected.has(id)) { affected.add(id); queue.push(id); }
  }
  const violations = [];
  for (const id of protectedNodeIds) {
    if (!base.nodes.some((node) => node.id === id)) throw new Error(`protected node not in baseline: ${id}`);
    if (affected.has(id)) violations.push({ id, reason: 'protected node changed or affected' });
  }
  return {
    schema: 'substrate-ontology-plan/v1', verification: 'local_structural_and_modeled_impact', authority: 'review_only',
    baselineDigest: topologyDigest(base), proposedDigest: topologyDigest(next),
    changedNodeIds: [...changedNodes].sort(), changedEdgeIds: [...changedEdges].sort(), affectedNodeIds: [...affected].sort(),
    protectedViolations: violations, requiresReview: affected.size > 0, protectedContractsSatisfied: violations.length === 0,
    limits: ['Impact follows declared relation directions only.', 'No OWL entailment, SHACL engine, proof checker, live state or execution authorization verified.']
  };
}

export function exportVocabulary() {
  const header = `@prefix cs: <${ontologyContract.namespace}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
`;
  return header + '\ncs: a owl:Ontology .\ncs:Node a owl:Class .\ncs:Edge a owl:Class .\n' +
    ['sourceId', 'path', 'owner', 'tier', 'surface', 'coverageStatus', 'evidence'].map((term) => `cs:${term} a owl:DatatypeProperty ; rdfs:range xsd:string .\n`).join('') +
    ['source', 'target'].map((term) => `cs:${term} a owl:ObjectProperty ; rdfs:domain cs:Edge ; rdfs:range cs:Node .\n`).join('') +
    'cs:relation a owl:ObjectProperty .\n' +
    Object.keys(ontologyContract.relations).sort().map((term) => `cs:${term} a owl:ObjectProperty ; rdfs:domain cs:Node ; rdfs:range cs:Node .\n`).join('');
}

export function exportShapes() {
  const property = (term, constraint) => `  sh:property [ sh:path ${term} ; sh:minCount 1 ; sh:maxCount 1 ; ${constraint} ]`;
  return `@prefix cs: <${ontologyContract.namespace}> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

cs:NodeShape a sh:NodeShape ; sh:targetClass cs:Node ; sh:nodeKind sh:IRI ;
` + [
    property('cs:path', 'sh:datatype xsd:string'),
    ...['cs:sourceId', 'rdfs:label', 'cs:owner'].map((term) => property(term, 'sh:datatype xsd:string ; sh:minLength 1')),
    ...[['tier', ontologyContract.tiers], ['surface', ontologyContract.surfaces], ['coverageStatus', ontologyContract.statuses]].map(([term, values]) => property(`cs:${term}`, `sh:in ( ${values.map(literal).join(' ')} )`)),
    ...Object.keys(ontologyContract.relations).sort().map((term) => `  sh:property [ sh:path cs:${term} ; sh:class cs:Node ; sh:nodeKind sh:IRI ]`)
  ].join(' ;\n') + ' .\n\ncs:EdgeShape a sh:NodeShape ; sh:targetClass cs:Edge ; sh:nodeKind sh:IRI ;\n' + [
    property('cs:sourceId', 'sh:datatype xsd:string ; sh:minLength 1'),
    ...['source', 'target'].map((term) => property(`cs:${term}`, 'sh:class cs:Node ; sh:nodeKind sh:IRI')),
    property('cs:relation', `sh:in ( ${Object.keys(ontologyContract.relations).sort().map((term) => `cs:${term}`).join(' ')} )`)
  ].join(' ;\n') + ' .\n';
}
