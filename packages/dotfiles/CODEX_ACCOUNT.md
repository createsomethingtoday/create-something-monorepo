# Manual Codex account policy helper

This recovers the useful policy-alignment operation from the retained account-switcher
prototype. It deliberately omits automatic auth watching, token snapshots, app restarts,
managed-cache deletion, and edits to existing tasks or Codex's internal SQLite database.
Use the application's normal login flow to switch accounts.

Install only when wanted (Python 3.11+):

```bash
./packages/dotfiles/scripts/install-codex-account.sh
codex-account status
codex-account sync
```

The normal dotfiles installer does not install this helper. The standalone installer
refuses to overwrite an existing helper; review an earlier local installation separately.
No launch agent is installed, unloaded, or changed.

`sync` previews a policy for the exact local identity hint `micah@webflow.com` (workspace
write, on-request) or `micah@createsomething.io` (full access, never). Other addresses,
including other Webflow addresses, are rejected. A decoded JWT is only a routing hint,
not independent identity verification or authority to override organization policy.

For an intentional change, close Codex clients first and run `codex-account sync --apply
--clients-closed`. The personal full-access policy additionally requires
`--allow-full-access`. This only changes the two top-level legacy config defaults for
future sessions. It leaves auth, managed requirements/cache and existing tasks untouched.
Files must be owned, private regular files; symlinks and hard links are rejected.

Configs using permission or configuration profiles are rejected for manual review.
[Official permissions documentation](https://learn.chatgpt.com/docs/permissions) states
that permission profiles do not compose with legacy sandbox settings; managed requirements
remain authoritative. The helper does not claim to validate all effective configuration
layers or change the permissions of running/resumed tasks.

A private rollback receipt preserves the exact previous config bytes. Preview with
`codex-account rollback`; apply with `codex-account rollback --apply --clients-closed`.
Rollback refuses to overwrite any edits made since the helper's change. Keep that receipt
until the change is accepted; a second mutation is refused while it exists.

Tests use temporary directories and synthetic identities only:

```bash
python3 -m unittest discover -s packages/dotfiles/tests -v
```

No live account/config migration is part of installing or testing the helper.
