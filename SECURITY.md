# Security Policy

CREATE SOMETHING takes the security of this repository and its deployed services seriously.

## Supported versions

Security fixes are applied to the latest code on `main` and to currently deployed production services. Older commits, abandoned experiments, and unofficial forks are not supported.

## Report a vulnerability privately

Do not open a public issue, discussion, or pull request for a suspected vulnerability.

Email [security@createsomething.io](mailto:security@createsomething.io) with:

- the affected package, service, or URL;
- a concise description of the impact;
- reproduction steps or a proof of concept;
- any known prerequisites or mitigations; and
- a safe way to contact you.

Please avoid including live credentials, personal data, or client content. If sensitive evidence is necessary, ask us to establish an appropriate transfer method first.

We will acknowledge a report as soon as practical, investigate it, and coordinate remediation and disclosure with the reporter. Response and resolution time depend on severity and complexity.

## Safe-harbor expectations

Good-faith research should:

- stay within accounts and data you own or have explicit permission to test;
- use the minimum access needed to demonstrate the issue;
- stop if you encounter personal, client, or other confidential data;
- avoid persistence, denial of service, social engineering, and destructive actions; and
- give us a reasonable opportunity to remediate before public disclosure.

We will not pursue legal action against researchers who follow these expectations and make a good-faith effort to avoid harm. This policy does not authorize testing of third-party services or data.

## Operational security

Never commit secrets. Store credentials in the approved secret manager or deployment platform, use least-privilege scopes, and rotate a credential immediately if exposure is suspected. Security-sensitive changes require focused tests and reviewer approval.
