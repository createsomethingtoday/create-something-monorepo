# Substrate ontology boundary v1

The topology JSON remains authoritative. This boundary gives independent modules
one versioned vocabulary, rejects ambiguous composition, exports a semantic
projection, and shows the modeled impact of a proposed change before review.
It serves the **Database** tier; relation directions are explicit **Judgment**
artifacts consumed by local **Automation**. Nothing here changes action authority.

Inspired by [Open Ontologies](https://github.com/fabio-rovai/open-ontologies/tree/cefe5997d04553ac495873e8aa1046c1d6b85f7d).
The upstream source was inspected at the commit recorded in `contract.json`.
No upstream executable, daemon, dependency, or service is installed by this package.

## Run

From the repository root:

```sh
node packages/database-layer/scripts/ontology.mjs check
node packages/database-layer/scripts/ontology.mjs check base.json client-module.json
node packages/database-layer/scripts/ontology.mjs export /tmp/new-ontology-bundle
node packages/database-layer/scripts/ontology.mjs plan baseline.json proposed.json protected-node-id
node --test packages/database-layer/test/ontology.test.mjs
```

Equivalent package scripts: `ontology:check`, `ontology:export`, `ontology:plan`.
`check` and `export` default to the existing topology snapshot. They do not refresh
it or establish current production state. The normal topology refresh pipeline
runs this check after generating the mapped topology and operating slices.

Each module has an `id`, `nodes`, and `edges`, using existing topology fields.
All modules compose before endpoint validation, so edges can cross module boundaries.
Nodes require an ID, title, owner, string path, tier, surface, and coverage status.
The existing empty root-package path is preserved. IDs are opaque identities;
renaming a title does not rename a node. Unknown terms, duplicate IDs within a
module, conflicting shared records, and unresolved roots or endpoints fail closed.
Identical shared records deduplicate. Declared `rootNodeId` values compose into a
sorted `rootNodeIds` set, retained when composing an already-composed graph.
Root additions, removals and switches change the digest, seed impact, and require
review. Composition does not mutate its inputs.

`contract.json` owns allowed terms and relation impact directions. Add terms with
review and regression coverage; incompatible meaning changes require a new version.
The RDF vocabulary and SHACL shapes are generated from this same contract to
avoid separately maintained term lists. The ESM API is exported at
`@create-something/database-layer/ontology`.

## Review a change

The planner compares canonical complete node and edge records and returns both
snapshot digests, changed IDs, the affected closure, and protected-node violations.
It walks edges from both snapshots, retaining impact after removals. Cycles terminate.
An edge change seeds both endpoints conservatively. For record changes:

| Relation | Change propagates toward |
| --- | --- |
| `depends_on`, `documents`, `renders` | source |
| `contains`, `runs`, `governs`, `configures` | target |
| `client_overlay` | both endpoints |

These directions are a repo-owned model, not a theorem about runtime behavior.
Protected IDs must exist in the baseline; any direct or transitive impact on one
makes `protectedContractsSatisfied` false and the CLI exits 1. Invalid inputs also
exit 1. A valid plan with changes and no protected violations exits 0 but sets
`requiresReview: true`. **Exit 0 does not authorize promotion or establish semantic
compatibility.** No automatic apply, rollback, approval, or risk scoring is provided.

## Export and verify

Export creates a new directory and refuses overwrites. The bundle contains:

- `topology.ttl`: stable node IRIs, metadata, direct relations, and edge evidence.
- `vocabulary.ttl`: OWL classes and properties under the versioned namespace.
- `shapes.ttl`: SHACL cardinality, node-kind, enum, and endpoint constraints.
- `manifest.json`: input paths, canonical snapshot digest, counts, verification limits.

Node and edge IRI namespaces are separate. Input text is encoded as literals;
source IDs are percent-encoded into opaque URNs. RDF is a selected-field projection;
the source digest covers complete records, including metadata outside the projection.
`mapped` becomes `coverageStatus`, never verified health or production readiness.

These Turtle files are intended for Open Ontologies and other RDF/SHACL consumers.
The local structural validator runs without an RDF engine. SHACL is an additional
interchange constraint layer, not an identical replacement for composition checks:
RDF set semantics can erase duplicate assertions that the JSON validator rejects.

Independent validation can use RDFLib and pySHACL in a separate environment:

```python
from rdflib import Graph
from pyshacl import validate

def graph(name):
    return Graph().parse('/tmp/new-ontology-bundle/' + name, format='turtle')

conforms, _, report = validate(
    graph('topology.ttl'),
    shacl_graph=graph('shapes.ttl'),
    ont_graph=graph('vocabulary.ttl'),
)
assert conforms, report
```

The optional engine verifier runs an operator-selected binary with a bounded
60-second timeout, isolated temporary store, memory mode, and `--no-connect`.
It requires every expected batch result, vocabulary namespace coverage, and
explicit vocabulary and SHACL conformance. Missing, malformed, incomplete, and
exit-zero nonconforming results fail closed. Temporary stores are removed.

```sh
node packages/database-layer/scripts/verify-ontology-engine.mjs /tmp/new-ontology-bundle /absolute/path/to/open-ontologies
```

Open Ontologies v2.1.0 on Darwin arm64 was exercised against the repository export;
vocabulary and SHACL conformance passed. This release is commit
`ef6e781c71aaccaa35c2a1cd06169f0c862d5769`, distinct from the inspected main commit.
Its downloaded asset SHA-256 was checked against
`493f6db51550112528d19f3ca88caf133b46c2a9054a195a98bc588b57ba07b6`.
The binary was used from a temporary path, not added to the package or global setup.
Other versions/platforms remain untested. Lean certificate checking remains untested.
Each exported manifest starts with `upstreamRuntime: untested`; the separate verifier
emits a conformance receipt with SHA-256 digests for the binary and each Turtle
artifact. It validates isolated copies of the input bytes; archive the exact bundle
and receipt together. Digests bind bytes, not the correctness of assertions.

 Upstream defaults to in-memory storage;
when evaluating its CLI, use one isolated batch process with `--no-connect` and
an explicit temporary `--data-dir`. Inspect structured validation and plan results;
upstream `plan` can exit 0 while reporting risk. Do not represent local structural
checks or a digest as formally certified inference.
