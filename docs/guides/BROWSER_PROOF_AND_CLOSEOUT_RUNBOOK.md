# Browser Proof and Closeout Runbook

- **Status:** v1 internal runbook
- **Owner:** surface owner
**Trigger:** a change, deploy, or handoff claims completion

## Preconditions

- exact source revision or deployed artifact identifier
- named target environment and URL
- expected behavior and any retired behavior that must no longer appear
- required viewports and authenticated state, if relevant

## Procedure

1. Load a fresh page against the named target; do not reuse an ambiguous tab as
   proof.
2. Confirm the expected user path and the absence of retired copy or behavior.
3. Check the relevant desktop and mobile sizes, including horizontal overflow
   and primary-action reachability.
4. Inspect console and network output. Separate source regressions from known
   third-party, auth, or edge-propagation noise.
5. Capture a screenshot or structured readback with URL, viewport, time, and
   revision/deploy identifier.
6. Write a receipt that labels evidence as local, preview, deployed, or
   production. Those are not interchangeable.

## Stop conditions

- No exact revision or target can be named.
- The route is authenticated but the required identity is unavailable.
- The observation is stale, cached, or contradicted by a fresh browser readback.
- A required production mutation would be needed to continue without approval.

## Closeout receipt

```text
Surface and target:
Source revision/deploy:
Viewports and interaction path checked:
Expected and retired behavior:
Console/network findings:
Evidence artifact:
Known unknowns or third-party noise:
Next owner and worktree disposition:
```
