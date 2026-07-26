# Example ticket summary outcome contract

This synthetic Build fixture proves that a second operator can inspect a complete release package without inferring a live deployment or customer decision.

Success means the agent reads fixture tickets, reports their IDs and states, makes no write call, and retains the verifier receipts. Any missing fixture, unexpected tool, identity mismatch, or hash mismatch fails closed.

The fallback is manual fixture inspection. The fixture operator owns execution; the fixture support owner owns recovery. No customer, commercial entitlement, or production system is represented.
