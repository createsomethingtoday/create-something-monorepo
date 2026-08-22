# CREATE SOMETHING Product Family

> Canonicalized: July 16, 2026  
> Public sequence: `Map -> Build -> Control`

## Product verdict

CREATE SOMETHING has two standalone software products and one implementation
service:

| Offer                        | Type                               | Customer job                                                                       | Commercial rule                                                                                                          |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **CREATE SOMETHING Map**     | Public starter + account workspace | Understand, design, version, and share a human-agent workflow.                     | The browser-local starter is $0. The account workspace is a separate subscription with pricing activated only at launch. |
| **CREATE SOMETHING Build**   | Service                            | Turn an approved map into an owned, connected system.                              | Fixed-scope or custom implementation; it is not a second software license.                                               |
| **CREATE SOMETHING Control** | Subscription                       | Operate delegated work with explicit authority, approvals, evidence, and recovery. | Can be purchased independently with monthly and yearly billing. **Control includes Map.**                                |

The public journey is:

```text
Map the system -> Build the system -> Control the system
```

Customers can stop after Map, bring an existing system directly to Control, or
use Build to implement the approved definition. A Control customer does not buy
a separate Map license for the workflows Control governs.

## Map

Map turns conversations, documents, repositories, and connected tools into a
living workflow definition. The browser-local public starter costs $0 and does
not touch production. The account-scoped Map workspace is a distinct
subscription for durable history, review, sharing, export, and Build handoff.
It owns the customer-facing experience for:

- actors, agents, systems, artifacts, owners, and relationships;
- approval, run, wait, stop, and recovery boundaries;
- versions, diffs, review state, and implementation handoff;
- reusable patterns, client workspaces, and machine-readable export; and
- the explicit handoff to Build or activation in Control.

Map ends at an approved, build-ready or operate-ready workflow definition. It
does not own production execution, external writes, policy enforcement, or
incident recovery.

`Atlas` remains the internal implementation name for the graph/session model,
canvas components, APIs, MCP tools, stored records, and compatibility routes.
Public copy and navigation use `CREATE SOMETHING Map` or `Map`.

## Build

Build is the CREATE SOMETHING implementation service. It owns the scoped work
required to connect tools, establish owned state, implement the workflow,
exercise approval and failure paths, and hand the system to its operator.

Build can follow Map, but it is not mandatory. A team may use Map without Build,
or bring an existing implementation to Control. Build is quoted as a service;
it is not included in a software subscription unless a signed scope says so.

## Control

Control turns an approved workflow definition into bounded, observable delegated
work. It owns the customer-facing experience for:

- Signal intake and the operator Inbox;
- Decision routing, policy evaluation, and approval state;
- runs, waits, stops, escalations, and recovery;
- Proof, receipts, audit history, and rollback notes; and
- recurring review of incidents, drift, policies, prompts, and golden tasks.

Control includes Map because every governed workflow needs a legible definition
and operating context. Signal, Decision, and Proof are operator surfaces inside
Control, not additive standalone licenses.

`Policy OS` remains a compatibility name for the governed contract bundle,
runtime policy layer, historical documents, and existing entitlement identifiers
such as `policy_os_trial` and `policy_os_core`. Public copy and navigation use
`CREATE SOMETHING Control` or `Control`.

## Subscription shape

The account-scoped Map workspace and Control each support monthly and yearly
subscription cadences. The Map workspace price remains a launch configuration;
the public browser-local Map starter is $0. Control is Managed AI Operations
from $900 per month after launch. Exact Stripe price IDs must be configured and
approved through the launch workflow before checkout can be represented as active.

## Public source distribution

The supported source distribution is $0 under MIT. It is a separate, allowlisted
artifact with two public Pi packages; it is not the entire monorepo and it is not
the managed Control service. The machine-readable boundary lives in
`config/public-distribution.v1.json`, and `PUBLIC_DISTRIBUTION.md` is the public
contract.

The safe pre-launch state is:

- product and cadence are visible;
- the customer job and inclusion rule are explicit;
- a conversation or launch-notification action is available; and
- inactive Stripe prices are never presented as purchasable.

Enterprise extends Control with private infrastructure, multi-team boundaries,
compliance requirements, procurement, and implementation support. It does not
create a third runtime or a separate product foundation.

## Shared system boundary

The public products project one shared internal system:

| Layer                             | Internal owner                        | Public use                                                                                      |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Database                          | **Substrate**                         | Workspaces, source records, workflow state, identity, files, actions, runs, and receipts.       |
| Derived graph                     | **Topology**                          | System discovery, repo relationships, readiness, and drift context.                             |
| Mapping implementation            | **Atlas**                             | Graph/session records, canvas state, story state, proposals, and handoffs behind Map.           |
| Governed execution implementation | **Policy OS compatibility contracts** | Policy, entitlements, approval boundaries, runtime checks, and contract bundles behind Control. |
| Operator surfaces                 | **Signal / Decision / Proof**         | Inbox, judgment, and evidence inside Control.                                                   |

Map and Control must reuse the same database, canvas kernel, workflow definition,
identity, and receipt contracts. A public rename does not authorize a schema,
package, API, MCP tool, stored-data, or entitlement migration.

## Naming rules

- Use `CREATE SOMETHING Map` on first public reference and `Map` afterward.
- Use `CREATE SOMETHING Build` for the implementation service and `Build` afterward.
- Use `CREATE SOMETHING Control` on first public reference and `Control` afterward.
- Use `Map -> Build -> Control` when explaining the full customer journey.
- State `Control includes Map` wherever the two subscriptions are compared.
- Keep Atlas, Policy OS, Substrate, Topology, and `policy_os_*` in internal,
  historical, or compatibility contexts where they remain technically true.
- Do not imply that Stripe prices, subscriptions, enterprise capabilities, or a
  public launch are active until the owning live-system verification passes.

## Promotion boundary

Repository productization is not publication. Stripe product creation, price
activation, checkout testing, production deployment, public announcement,
trademark claims, and customer migration each require their owning approval and
verification path. Rollback restores the prior public routes and copy while
leaving internal contracts unchanged.
