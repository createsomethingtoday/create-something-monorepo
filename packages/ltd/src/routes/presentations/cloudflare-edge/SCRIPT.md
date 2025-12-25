# SCRIPT.md — CLOUDFLARE: EDGE

## Recording Notes

**Duration**: ~25 minutes
**Pace**: Technical but philosophical. Infrastructure should feel *invisible*, not complicated.
**Tone**: Practical with Heideggerian grounding. Show how infrastructure recedes.

---

## Narration Markup Reference

| Markup | Meaning | Example |
|--------|---------|---------"|
| `[PAUSE]` | Brief pause (1 second) | "Less, but better. [PAUSE] That's it." |
| `[PAUSE 2s]` | Explicit duration pause | "The tool should disappear. [PAUSE 2s]" |
| `[BEAT]` | Dramatic beat (1.5 seconds) | "Not addition. [BEAT] Subtraction." |
| `[BREATHE]` | Take a breath, gather | "[BREATHE] Now let me explain..." |
| `[SLOW]...[/SLOW]` | Slower, deliberate pacing | "[SLOW]Weniger, aber besser.[/SLOW]" |
| `[QUOTE]...[/QUOTE]` | Read as quotation (different register) | "[QUOTE]The hammer disappears into use.[/QUOTE]" |
| `*emphasis*` | Vocal stress on word | "This is *one* principle at *three* scales." |
| `{stage direction}` | Visual/action note | "{slide transition}" |
| `↗` | Rising intonation (question) | "Have I built this before↗" |
| `↘` | Falling intonation (statement) | "Unify↘" |
| `—` | Em-dash = brief pause + emphasis | "Not addition—subtraction." |

---

## Slide 1: Title [0:00]

{slide appears}

[BREATHE]

Cloudflare: Edge.

[PAUSE]

Infrastructure that *disappears*.

[BEAT]

Less than fifty milliseconds cold starts. Global by default. No region selection. No scaling configuration.

[PAUSE 2s]

This presentation covers the edge infrastructure that powers every CREATE SOMETHING property—and how it recedes into transparent use.

{hold 2 seconds on title}

---

## Slide 2: Why Edge Computing? [1:30]

{slide transition}

[BREATHE]

Why edge computing↗

[PAUSE]

Traditional servers run in *one place*. [PAUSE] A datacenter in Virginia. [PAUSE] A server in Frankfurt. [PAUSE] Users in Tokyo wait.

[PAUSE]

Edge functions run *everywhere*. [PAUSE] Three hundred global locations. [PAUSE] Users in Tokyo get Tokyo. Users in São Paulo get São Paulo.

[PAUSE 2s]

Cold starts under fifty milliseconds. [PAUSE] Not seconds—*milliseconds*.

[PAUSE]

That's not optimization. [BEAT] That's a different category entirely.

[PAUSE]

When infrastructure is this fast, you stop thinking about it. [PAUSE] You think about the user experience.

---

## Slide 3: Quote - Heidegger [3:00]

{slide transition}

[BREATHE]

Heidegger understood this.

[QUOTE]
[SLOW]"The tool is genuinely itself only when it withdraws into equipmentality."[/SLOW]
[/QUOTE]

[PAUSE 2s]

Equipment—tools, infrastructure—*works* when it disappears.

[PAUSE]

A hammer is truly a hammer when you're thinking about the *nail*, not the hammer.

[PAUSE]

Infrastructure is truly infrastructure when you're thinking about the *user*, not the servers.

[PAUSE 2s]

Cloudflare's edge achieves this. The infrastructure withdraws. The experience remains.

---

## Slide 4: Architecture Overview [4:30]

{slide transition - ASCII diagram appears}

[BREATHE]

This is the CREATE SOMETHING architecture.

[PAUSE]

Four properties at the top: .space for practice, .io for research, .agency for services, .ltd for philosophy.

[PAUSE]

Each property deploys to the *same* edge network. [PAUSE] Same infrastructure. [PAUSE] Per-package isolation.

[PAUSE 2s]

Below: the Cloudflare services.

Pages for deployment and SSR.

Workers for compute.

D1 for database.

KV for cache.

R2 for storage.

[PAUSE]

Each package gets its *own* D1 database, its *own* KV namespace. [PAUSE] Isolation by design.

[PAUSE 2s]

But the deployment target is the same—three hundred global locations. [PAUSE] Same latency characteristics. [PAUSE] Same reliability.

---

## Slide 5: D1 Database [6:30]

{slide transition}

[BREATHE]

D1 is SQLite at the edge.

[PAUSE]

Not a key-value store. [PAUSE] Not a document database. [PAUSE] *Real SQL*.

[PAUSE]

ACID transactions. [PAUSE] Foreign keys. [PAUSE] Joins. [PAUSE] Everything you expect from SQL.

[PAUSE 2s]

But globally replicated. [PAUSE] Read replicas at every edge location. [PAUSE] Writes go to primary, reads go to nearest.

[PAUSE]

Millisecond queries worldwide.

[BEAT]

The database disappears. [PAUSE] Only the data remains.

---

## Slide 6: D1 Code [8:00]

{slide transition - code appears}

[BREATHE]

Here's what D1 queries look like.

[PAUSE]

Prepared statements. [PAUSE] Parameter binding with the question mark. [PAUSE] Bind method chains values.

[PAUSE]

`.first()` for single results. [PAUSE] `.all()` for multiple. [PAUSE] `.run()` for mutations.

[PAUSE 2s]

The batch method is important. [PAUSE] Multiple statements, atomic execution. [PAUSE] Either all succeed or none do.

[PAUSE]

This is familiar SQL. [PAUSE] Prepare, bind, execute. [PAUSE] The API is simple because the *concept* is simple.

---

## Slide 7: KV Store [9:30]

{slide transition}

[BREATHE]

KV is key-value storage at the edge.

[PAUSE]

Sub-millisecond reads. [PAUSE] Globally replicated. [PAUSE] Eventually consistent.

[PAUSE]

That last part matters. [PAUSE] *Eventually* consistent, not *immediately* consistent.

[PAUSE 2s]

Use KV for: [PAUSE] sessions, [PAUSE] cached API responses, [PAUSE] feature flags. [PAUSE] Data where slight staleness is acceptable.

[PAUSE]

Don't use KV for: [PAUSE] counters, [PAUSE] inventory, [PAUSE] anything requiring immediate consistency. [PAUSE] Use D1 for that.

[PAUSE 2s]

Different tools, different guarantees. Choose based on the problem.

---

## Slide 8: KV Code [11:00]

{slide transition - code appears}

[BREATHE]

KV operations.

[PAUSE]

Get with metadata—you can store extra information alongside each value. [PAUSE] Useful for tracking creation time, source, or other context.

[PAUSE]

Put with expiration—TTL in seconds. [PAUSE] The data expires automatically. [PAUSE] No cleanup jobs needed.

[PAUSE 2s]

List with prefix—pattern matching across keys. [PAUSE] Useful for namespacing: `user:123`, `session:abc`.

[PAUSE]

Simple API. [PAUSE] Automatic replication. [PAUSE] Global reads.

---

## Slide 9: R2 Storage [12:30]

{slide transition}

[BREATHE]

R2 is object storage.

[PAUSE]

Think S3, but with zero egress fees.

[BEAT]

Zero. Egress. Fees.

[PAUSE 2s]

That's not a minor detail. [PAUSE] Traditional object storage charges for every byte served. [PAUSE] R2 doesn't.

[PAUSE]

Use R2 for: [PAUSE] user uploads, [PAUSE] static assets, [PAUSE] backups, [PAUSE] anything large and read-heavy.

[PAUSE 2s]

S3 API compatible—existing tools work. [PAUSE] Integrate with Workers for on-the-fly processing.

---

## Slide 10: Workers [14:00]

{slide transition}

[BREATHE]

Workers are edge compute.

[PAUSE]

JavaScript and TypeScript at every edge location.

[PAUSE]

Cold starts under fifty milliseconds. [PAUSE] Not Lambda's seconds—*milliseconds*.

[PAUSE 2s]

The secret: V8 isolates, not containers.

[PAUSE]

Containers start cold. [PAUSE] They load operating systems, runtimes, dependencies. [PAUSE] Seconds pass.

[PAUSE]

V8 isolates start warm. [PAUSE] Just the code. [PAUSE] Milliseconds.

[PAUSE 2s]

Standard Web APIs—fetch, crypto, streams. [PAUSE] Write for the browser, run on the server.

[PAUSE]

Workers can access D1, KV, R2 directly. [PAUSE] All the storage, all the compute, same edge location.

---

## Slide 11: Pages [15:30]

{slide transition}

[BREATHE]

Pages is where SvelteKit meets the edge.

[PAUSE]

Push to Git. [PAUSE] Build starts automatically. [PAUSE] Deploy completes in minutes.

[PAUSE]

SSR happens via integrated Workers. [PAUSE] Your load functions run at the edge. [PAUSE] Platform access included.

[PAUSE 2s]

Preview deployments per branch. [PAUSE] Every pull request gets its own URL. [PAUSE] Test before merge.

[PAUSE]

Static assets cached globally. [PAUSE] Immutable hashes, infinite cache. [PAUSE] Dynamic content fresh.

[PAUSE 2s]

Push to Git. [PAUSE] Deployment happens. [PAUSE] Infrastructure disappears.

---

## Slide 12: Project Names [17:00]

{slide transition - ASCII table appears}

[BREATHE]

Now a practical concern. [PAUSE] Project names.

[PAUSE]

This table shows an historical inconsistency.

[PAUSE]

Space, io, and agency use `create-something-*` with the hyphen between words.

[PAUSE]

LTD and LMS use `createsomething-*` *without* the hyphen.

[PAUSE 2s]

This happened. [PAUSE] We documented it rather than rename.

[BEAT]

Why↗ [PAUSE] Because renaming breaks production. [PAUSE] Custom domains point to specific project names. [PAUSE] Change the name, break the binding.

[PAUSE 2s]

The rule: look up the exact name. [PAUSE] Don't guess the pattern. [PAUSE] Use the table.

[PAUSE]

Reference: `.claude/rules/PROJECT_NAME_REFERENCE.md`

---

## Slide 13: Type Generation [18:30]

{slide transition - code appears}

[BREATHE]

Type generation.

[PAUSE]

Before development—before writing code—run `wrangler types`.

[PAUSE]

This reads your `wrangler.toml` and generates TypeScript interfaces. [PAUSE] Your bindings become typed.

[PAUSE 2s]

DB becomes `D1Database`. [PAUSE] KV becomes `KVNamespace`. [PAUSE] Autocomplete works. [PAUSE] Type errors appear before runtime.

[PAUSE]

Run this after changing bindings. [PAUSE] Add a KV namespace↗ [PAUSE] Regenerate types.

[PAUSE 2s]

Types are generated, not written. [PAUSE] The source of truth is `wrangler.toml`.

---

## Slide 14: Platform Access [20:00]

{slide transition - code appears}

[BREATHE]

Platform access pattern.

[PAUSE]

In SvelteKit, `platform` is available in load functions and API routes.

[PAUSE]

`platform.env` holds all your Cloudflare bindings.

[PAUSE 2s]

The pattern: destructure `platform` from the load parameters. [PAUSE] Access `platform?.env.DB` for database. [PAUSE] Access `platform?.env.KV` for cache.

[PAUSE]

Optional chaining because during build, platform might not exist. [PAUSE] At runtime, it always does.

[PAUSE 2s]

This is the standard pattern. [PAUSE] Every route, same access. [PAUSE] Bindings available everywhere server-side.

---

## Slide 15: API Routes [21:30]

{slide transition - code appears}

[BREATHE]

API routes work the same way.

[PAUSE]

Standard SvelteKit patterns. [PAUSE] GET, POST, PUT, DELETE handlers.

[PAUSE]

Platform access via the request handler's second parameter.

[PAUSE 2s]

Request parsing with `request.json()`. [PAUSE] Response creation with `json()` helper.

[PAUSE]

Edge execution—your API runs at three hundred locations. [PAUSE] Users hit the nearest. [PAUSE] Latency minimized.

[PAUSE 2s]

Same patterns you know. [PAUSE] Different execution model. [PAUSE] The infrastructure recedes.

---

## Slide 16: SDK Pattern [23:00]

{slide transition - code appears}

[BREATHE]

For complex operations, use the SDK.

[PAUSE]

Direct bindings work for simple queries. [PAUSE] Single database read, single KV get.

[PAUSE]

But composed operations—cross-database queries, multi-step workflows—benefit from the SDK.

[PAUSE 2s]

Import from `@create-something/cloudflare-sdk`.

[PAUSE]

List namespaces. [PAUSE] Query multiple databases. [PAUSE] Deploy pages programmatically.

[PAUSE]

The SDK handles authentication, pagination, error handling. [PAUSE] You call methods.

[PAUSE 2s]

SDK for orchestration. [PAUSE] Direct bindings for simple access. [PAUSE] Choose based on complexity.

---

## Slide 17: Zuhandenheit Applied [24:30]

{slide transition}

[BREATHE]

Zuhandenheit applied.

[PAUSE]

When edge infrastructure works, you don't think about it.

[PAUSE 2s]

No region selection—it's everywhere.

No cold start delays—it's instant.

No scaling configuration—it's automatic.

No egress bills—it's free.

[BEAT]

You think about the user experience. [PAUSE] The infrastructure serves silently.

[PAUSE 2s]

This is the goal. [PAUSE] Not *impressive* infrastructure. [PAUSE] *Invisible* infrastructure.

[PAUSE]

When the user loads your page and it's fast, they don't thank Cloudflare. [PAUSE] They don't even notice. [PAUSE] They just *use*.

[PAUSE 2s]

That's Zuhandenheit. [PAUSE] Ready-to-hand. [PAUSE] Equipment that withdraws.

---

## Slide 18: Final [26:00]

{slide transition}

[BREATHE]

[PAUSE 2s]

[SLOW]The edge disappears.[/SLOW]

[PAUSE 2s]

You don't think about latency.

You think about users.

[PAUSE]

You don't think about scaling.

You think about features.

[PAUSE]

You don't think about regions.

You think about experiences.

[BEAT]

The infrastructure recedes.

The work remains.

{hold on final slide}

[END]

---

## Post-Production Notes

### Audio Cleanup
- Remove mouth clicks
- Normalize audio levels
- Add subtle room tone between sections

### Visual Sync
- Ensure slide transitions align with `{slide transition}` markers
- Add fade transitions (300ms) at section breaks
- Consider subtle zoom on ASCII diagrams
- Highlight code blocks as they're referenced

### Accessibility
- Generate captions from script
- Ensure captions include pause markers as `[...]`
- Verify contrast on all slides

---

## Narration Checklist

Before recording:

- [ ] Room is quiet (no HVAC, no fans)
- [ ] Microphone positioned correctly
- [ ] Water available (avoid mouth sounds)
- [ ] Script printed or on teleprompter
- [ ] Practiced full read-through once

During recording:

- [ ] Maintain consistent distance from microphone
- [ ] Pause fully at `[PAUSE]` markers
- [ ] Slow down at `[SLOW]` sections
- [ ] Breathe at `[BREATHE]` markers
- [ ] Emphasize `*words*` with vocal stress

After recording:

- [ ] Review for clarity and pacing
- [ ] Check for mouth sounds or clicks
- [ ] Verify all 18 slides covered
- [ ] Run /audit-voice on transcript
