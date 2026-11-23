# Operator handoff

Signal: state the authenticated tenant's aggregate health and whether dispatch is enabled.
Decision: name the required authorized review (reconcile uncertain receipt, inspect blocked mapping, or approve known-no-write retry reset).
Proof: reference the retained receipt and approved policy version through the authorized operational system. Avoid credentials, tokens and customer details in copied summaries.
Recovery: stop dispatch before investigation; an issued external write may complete. Reconcile rather than replay blindly. Keep blocked work visible and do not imply customer effects.
