# Atlas Starter Map Follow-up Templates

**Purpose:** Follow up after qualified engagement with Atlas starter-map content  
**When to use:** Within 24-48 hours of a relevant comment, reply, or repeat engagement  
**Primary CTA:** Load the relevant starter map or book a Workflow Mapping Session after 2-3 positive exchanges

---

## Template 1: Workflow-Specific Comment

**Trigger:** They commented with a real workflow or approval-boundary detail.

```text
Hi {{first_name}},

Your point about {{workflow_detail}} is exactly the boundary I was trying to get at.

The useful first pass is usually:

- what can run
- what must wait
- what should stop
- what receipt proves the handoff happened

If useful, this starter map is the closest fit:
{{atlas_link}}

No need to enter anything private. I would just rename the owner, source record, and stop condition first.
```

## Template 2: ICP Like or Repeat Engagement

**Trigger:** They liked or reacted to two or more workflow-boundary posts and match a starter-map ICP.

```text
Hi {{first_name}},

Noticed you have been following the workflow-boundary posts.

Curious if {{starter_workflow}} is something your team is actively dealing with at {{company}}?

We made a public Atlas starter map for that pattern. It does not connect to private systems or run tools. It is just a first-pass map for owner, record, run action, approval, stop condition, and receipt.

Happy to send it if useful.
```

## Template 3: Send the Map After They Opt In

**Trigger:** They ask for the map or respond positively to Template 2.

```text
Here is the starter map:
{{atlas_link}}

The quickest useful edit:

1. Rename the workflow owner.
2. Replace the source record with the real artifact your team works from.
3. Rewrite the stop condition so it names the actual risk.

If you want, send back the stop condition you land on and I can sanity-check whether it is specific enough.
```

## Template 4: Move to Mapping Session

**Trigger:** They name a real workflow, have a business owner, and the boundary matters.

```text
This sounds worth mapping live.

Would you be open to a 20-minute Workflow Mapping Session?

Not a sales pitch. We will use your workflow to identify the owner, source record, run/wait/stop boundary, evidence receipt, and the next safe implementation step.

Calendar: {{calendar_link}}

If timing is easier another way, send two windows that work.
```

## Template 5: Low-Pressure Close

**Trigger:** The exchange is useful, but timing is unclear.

```text
Makes sense.

I will keep sharing concrete workflow maps as we publish them.

If {{workflow_name}} becomes active again, the place I would start is the stop condition. Once that is clear, the automation path gets much easier to judge.
```

## Starter Map Link Defaults

Use the canonical `/atlas` URL with channel attribution:

```text
https://createsomething.agency/atlas?utm_source=linkedin&utm_medium=dm&utm_campaign=atlas-starter-maps-v20260623&utm_content={{starter_map_id}}
```

Starter map IDs:

- `revops-lead-handoff`
- `healthcare-prior-authorization-prep`
- `construction-rfi-submittal-control`
- `marketplace-review-queue`
- `insurance-claims-intake`

## Qualification Rules

Follow up only when at least two are true:

- They named a real workflow.
- Their role owns operations, revenue operations, review, support, healthcare admin, project controls, claims, marketplace quality, or systems delivery.
- The workflow crosses more than one system or team.
- There is a visible approval, authority, privacy, contract, or consent boundary.
- Their company appears able to fund a mapping or implementation engagement.

Do not follow up when:

- The engagement is only a casual like from a non-ICP profile.
- The message would require guessing their private operational context.
- The only available pitch is "we help companies automate."

## Tracking

After sending:

- Add `source = linkedin` or the relevant channel.
- Add `source_detail = atlas-starter-maps-v20260623/{{starter_map_id}}`.
- Note the workflow named by the buyer.
- Record whether the conversation moved to teardown, mapping session, parked, or no response.
