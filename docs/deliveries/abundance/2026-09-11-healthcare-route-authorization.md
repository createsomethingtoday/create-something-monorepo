# Healthcare route classification

The NPG Hub rejected `abundance-healthcare-mcp__estimate_registry_travel` because its identifier contains `registry`. The generic classifier interpreted this as Hub administration. The same rule affects `search_registry_sourcing`. In these two reviewed first-party routes, registry means the NPPES data source.

Production decision evidence from cs-telemetry: policy `policy.hub-route-authorization.v1`, access `control_plane`, rollout `legacy_enforce`, evaluation path `legacy`, rule `hub_execute_destructive_requires_review`, decision `require_human_review`. Legacy events have a null policy hash. The request, compiled manifest and runtime policy rule match this event; the error is the classified resource effect.

Classify only the exact abundance-healthcare-mcp server/proxy/tool tuples: sourcing reads data, travel reserves bounded Geocodio credits and writes a saved report. Travel remains a write, blocked for read-only sessions. Administrative and destructive routes, other servers and invocation-action classification retain their rules. No policy rule, rollout mode, token, entitlement or discovery scope changes.

Release through reviewed source and deploy only the NPG Hub using its existing bindings/settings. Capture the prior deployment version for rollback. Verify a routed sourcing result and cached travel report, and inspect a new authorization event for `read`/`write` and the expected allow decision. Verify read-only travel denial through the policy regression tests. Dify rendered verification remains a separate requirement.
