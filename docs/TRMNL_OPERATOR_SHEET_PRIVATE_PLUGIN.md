# TRMNL Operator Sheet Private Plugin

This runbook configures TRMNL as the large paper operator sheet for the Core
Service OS.

Core Ink remains the pocket pager: it answers whether the operator needs to act
now. TRMNL is the slower, visible sheet: it shows the daily or weekly operating
state, counts, cadence, and next action without exposing raw customer data or
agent reasoning.

## Source contract

Use the Ink bridge as the only producer.

```text
Service systems -> Ink bridge -> /ink/trmnl -> TRMNL Private Plugin
```

Polling endpoint:

```text
GET https://ink.createsomething.agency/ink/trmnl
```

Required header:

```text
x-ink-token=<INK_DEVICE_TOKEN>
```

The response is root-level JSON for TRMNL polling:

| Field | Purpose |
| --- | --- |
| `headline` | Primary operator state, for example `APPROVAL NEEDED` |
| `summary` | Short service or queue label |
| `reason` | Why the sheet is showing this state |
| `detail` | Longer safe operating brief |
| `action` | Next operator action |
| `status_label` | `Clear`, `Attention`, or `Urgent` |
| `decision_required` | Boolean for conditional markup |
| `can_step_away` | Boolean for calm/clear state |
| `active_alerts` | Count of live alerts |
| `poor_health` | Count of poor health snapshots |
| `metrics` | Small label/value/tone array for sheet cards |
| `generated_time` | Central Time render time |
| `generated_date` | Central Time render date |
| `cadence.next_review` | Human-readable review checkpoint |

The TRMNL payload intentionally excludes raw `selected_alert`,
`selected_health`, device heartbeat data, and nested producer payloads. Do not
put PHI, private message text, secrets, or raw agent chain-of-thought into alert
fields that may reach a shared physical display.

## Private Plugin setup

Create a TRMNL Private Plugin with the Polling strategy.

Recommended settings:

| Setting | Value |
| --- | --- |
| Strategy | `Polling` |
| Polling URL | `https://ink.createsomething.agency/ink/trmnl` |
| Polling Verb | `GET` |
| Polling Headers | `x-ink-token=<INK_DEVICE_TOKEN>` |
| Remove bleed margin | `No` unless the final screen needs edge-to-edge layout |
| Dark mode | Operator preference |

Use a device-scoped Ink token. Do not use the source token that producer systems
use to write alerts and health snapshots.

## Starter full-screen markup

Paste this into the full-screen markup editor, then tune typography once the
real device preview is available.

```html
<style>
  .cs-sheet {
    display: flex;
    flex-direction: column;
    gap: 22px;
    height: 100%;
  }

  .cs-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 2px solid #000;
    padding-bottom: 14px;
  }

  .cs-kicker,
  .cs-meta,
  .cs-card-label,
  .cs-footer {
    font-size: 18px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .cs-title {
    margin: 4px 0 0;
    font-size: 44px;
    line-height: 0.95;
    letter-spacing: 0;
  }

  .cs-status {
    border: 2px solid #000;
    padding: 8px 12px;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .cs-body {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
    gap: 24px;
    flex: 1;
    min-height: 0;
  }

  .cs-summary {
    font-size: 28px;
    line-height: 1.12;
    margin: 0 0 14px;
  }

  .cs-detail {
    font-size: 23px;
    line-height: 1.18;
    margin: 0;
  }

  .cs-action {
    border: 3px solid #000;
    padding: 16px;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 700;
  }

  .cs-cards {
    display: grid;
    gap: 12px;
  }

  .cs-card {
    border: 2px solid #000;
    padding: 12px;
  }

  .cs-card-value {
    display: block;
    margin-top: 4px;
    font-size: 36px;
    line-height: 1;
    font-weight: 700;
  }

  .cs-footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-top: 2px solid #000;
    padding-top: 12px;
  }
</style>

<div class="screen">
  <div class="view view--full">
    <div class="layout">
      <section class="cs-sheet">
        <header class="cs-header">
          <div>
            <div class="cs-kicker">CREATE SOMETHING Operator Sheet</div>
            <h1 class="cs-title">{{ headline }}</h1>
          </div>
          <div class="cs-status">{{ status_label }}</div>
        </header>

        <main class="cs-body">
          <section>
            <p class="cs-summary">{{ summary }}</p>
            <p class="cs-detail">{{ detail }}</p>
          </section>

          <aside class="cs-cards">
            {% for metric in metrics %}
              <div class="cs-card">
                <span class="cs-card-label">{{ metric.label }}</span>
                <span class="cs-card-value">{{ metric.value }}</span>
              </div>
            {% endfor %}
          </aside>
        </main>

        <section class="cs-action">
          {% if decision_required %}
            {{ action }}
          {% else %}
            {{ footer }}
          {% endif %}
        </section>

        <footer class="cs-footer">
          <span>{{ reason }}</span>
          <span>{{ generated_time }} {{ generated_date }}</span>
        </footer>
      </section>
    </div>
  </div>
</div>
```

## Webhook variant

Polling is the default because it keeps TRMNL read-only against the Ink bridge.
If a client needs push updates, use the webhook-shaped endpoint as the payload
source:

```text
GET https://ink.createsomething.agency/ink/trmnl/webhook-payload
```

It returns:

```json
{
  "merge_variables": {
    "headline": "CALM OPERATOR",
    "status_label": "Clear",
    "active_alerts": 0
  }
}
```

Example push:

```bash
curl -sS "$INK_BRIDGE_URL/ink/trmnl/webhook-payload" \
  -H "x-ink-token: $INK_DEVICE_TOKEN" \
  > /tmp/trmnl-operator-sheet.json

curl -sS "$TRMNL_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/trmnl-operator-sheet.json \
  -X POST
```

Keep webhook pushes below the TRMNL account's rate limit and payload-size limit.
For a normal operator sheet, polling is simpler and safer.

## Acceptance check

1. Force-refresh the Private Plugin.
2. Confirm `headline`, `status_label`, `active_alerts`, and `poor_health` appear
   in the variables panel.
3. Trigger a harmless test alert through Ink.
4. Confirm Core Ink shows the pocket action and TRMNL shows the larger operator
   sheet without raw private payload fields.
5. Clear the test alert and confirm both surfaces return to calm state.
