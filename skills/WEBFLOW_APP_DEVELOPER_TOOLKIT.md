# Webflow App developer toolkit

Use these two public-safe skills at different points in a Webflow App's lifecycle. They are developer aids, not review decisions.

## Before review: `webflow-app-preflight`

Use during architecture, implementation, packaging, and submission preparation.

It helps a developer:

- choose Designer Extension, Data Client, or Hybrid capabilities;
- minimize and explain scopes;
- design authentication, authorization, lifecycle, and production-build controls;
- check listing and submission materials; and
- produce a go/no-go preflight result before submitting.

Run it early enough to change the architecture. Re-run its quality gate against the exact production artifact intended for submission.

## After findings: `webflow-app-review-remediation`

Use only after the developer has received findings for their App.

It helps a developer:

- preserve the issued priority and acceptance criteria;
- separate an urgent containment lane from ordinary implementation;
- create positive, negative, artifact, and authorized runtime evidence;
- distinguish source, artifact, installed-revision, runtime, submission, and reviewer-acceptance states; and
- prepare a concise resubmission packet ending in `READY TO RESUBMIT` or `NOT READY TO RESUBMIT`.

Give the skill only findings the recipient is authorized to receive. Do not attach internal reviewer discussion, another partner's examples, credentials, customer identifiers, or exploit payloads.

## Where App Review Preflight fits

The App Review Preflight Designer Extension can supplement either skill with bundle analysis and authorized runtime observations when the required App, sandbox, and test package are available. Its output is evidence—not Marketplace approval—and does not replace human policy decisions, incident response, or authorization tests that require two controlled identities.

## Provenance and decision boundaries

Both skills should label guidance as one of:

- **Published requirement** — supported by an exact public Webflow document.
- **Issued finding** — supplied to this developer for this App review.
- **Security control** — general engineering guidance or an issued acceptance criterion, not automatically published Webflow policy.
- **Open decision** — requires Webflow, AppSec, or another named decision owner.

Official starting points:

- [Marketplace Guidelines](https://developers.webflow.com/apps/docs/marketplace-guidelines)
- [Register an App](https://developers.webflow.com/apps/data/docs/register-an-app)
- [Scopes](https://developers.webflow.com/data/reference/scopes)
- [Designer Extensions](https://developers.webflow.com/apps/docs/designer-extensions)

## Sharing and shelf life

Share the skill directories as versioned files so developers can use them in a skill-capable coding agent or read them directly. Include the commit or archive checksum used for the engagement. Public documentation and Marketplace expectations can change; refresh links and rerun the included evals before reuse.

The Designer Extension can provide longer-lived automation once deployed and maintained. The skills are the faster artifact to distribute today, while their explicit provenance and versioning make future updates auditable.
