# Workshop components

> Source snapshot range (UTC): 2026-10-01T00:00:00.000Z to 2026-10-01T00:00:00.000Z.

## Queue topology

The intake queue feeds a review worker, which writes a receipt ledger. The ledger is the durable record; the dashboard reads a projection of it.

## Component ownership

The queue belongs to the intake team. The review worker belongs to operations. An ownership field names who can resolve a component incident.

## Dependency map

The dashboard depends on the ledger and the worker depends on the queue. Dependency edges describe the direction of data flow; proximity on a canvas is not an edge.

