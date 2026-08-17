# Receipt Schema

The local receipt uses
`create-something/notion-operator-playbook-receipt@1` and records:

- deterministic receipt ID;
- generation time and package version;
- Notion Workers SDK version;
- capability and managed-database keys;
- proof level;
- whether any external mutation occurred; and
- explicitly excluded evidence levels.

The local receipt must say `proofLevel=local-build-only` and
`externalMutations=false`. Acceptance-day evidence adds a separate deployment
receipt in Linear; it must not rewrite local proof into a hosted claim.
