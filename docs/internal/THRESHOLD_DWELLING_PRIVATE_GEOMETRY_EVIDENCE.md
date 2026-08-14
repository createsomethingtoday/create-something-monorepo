# Threshold Dwelling Private Geometry Evidence Boundary

**Status:** private-evidence contract only. No document-upload, OCR, cloud-storage, or professional-review service is implemented by this experiment.

## Purpose

The next step toward an issued physical 1:1 scene is not to upload construction documents to a headset or browser. It is to let a private project graph record that a reviewer accepted a revision-specific geometry fact, while delivering only the resulting gate state to rendering clients.

`THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET` represents that boundary. Its records hold an opaque document identifier, one geometry-fact identifier, a submitted/accepted state, an asserted value, and (for acceptance) the named reviewer. It has no file path, file name, URL, page image, document bytes, extracted text, prompt transcript, or client-delivery payload.

## Data flow

```text
private project document
        ↓
private project graph: opaque document ID + fact-scoped evidence record
        ↓ named reviewer accepts one asserted geometry value
private physical-scene issuance
        ↓ source-free projection only
browser / iPad / Vision Pro spatial package: source-free readiness projection
```

An accepted record can issue only its matching fact. For example, an accepted door schedule/elevation record can populate `door-opening-geometry`; it cannot silently establish wall thicknesses, structural support, glass geometry, roof geometry, or site grade.

Submitted records remain non-geometric. They mark the fact as `submitted`, keep its value and source reference out of the rendering path, and do not make the scene eligible.

## Client-delivery rules

The source-free projection contains only:

- the issuance identifier and revision-scoped gate status;
- the horizontal-coordinate truth label;
- a readiness item for each geometry fact: its ID, plain-language title, submitted/accepted/missing state, and required reviewer disciplines;
- fact IDs still unissued;
- whether a physical 1:1 scene is eligible for visualization; and
- `clientSourceDocuments: "excluded"` plus `constructionReady: false`.

The readiness items are not evidence records. They deliberately exclude opaque document identifiers, asserted values, document locations, source references, reviewer identities, timestamps, and acceptance rationale. The WorkWay spatial package repeats the same source-document exclusion at its outer level and at its physical-scene contract level. Rust and Swift validators reject a package that tries to include private source documents, and the browser renders only the readiness projection.

## Future upload implementation requirements

Before connecting a real upload surface, determine and implement:

1. Private storage ownership, retention/deletion policy, encryption, access controls, audit records, and per-project isolation.
2. The roles allowed to submit evidence and the licensed/qualified roles allowed to accept each geometry fact.
3. Revision identity, document versioning, citation/location representation, and invalidation rules when a source document changes.
4. Human review gates for AI extraction. AI may help locate candidate values, but may not directly convert a document into issued geometry.
5. A new immutable WorkWay package revision whenever accepted evidence changes the scene; existing cached clients must not be patched with undocumented geometry.

This is a visualization-evidence workflow only. It does not create a permit set, code-compliance decision, safety certification, construction authorization, procurement quantity, or field-layout instruction. See [Physical 1:1 Scene Issuance](./THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE.md) for the geometry gate itself.
