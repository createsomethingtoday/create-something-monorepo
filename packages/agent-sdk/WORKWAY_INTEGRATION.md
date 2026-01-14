# WORKWAY Integration

The CREATE SOMETHING Agent SDK leverages [WORKWAY](https://github.com/workwayco/workway) for production workflow execution.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   .agency (Frontend)                         │
│            "Apps + Agents That Keep Working"                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Registry                            │
│         Maps verticals → WORKWAY workflows                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      WORKWAY SDK                             │
│   @workwayco/sdk | @workwayco/integrations | @workwayco/cli │
└─────────────────────────────────────────────────────────────┘
```

## Why WORKWAY?

WORKWAY provides production-ready infrastructure that would take months to build:

### Dental/Medical Integrations
- **NexHealth**: Full PMS integration (appointments, patients, no-shows, forms)
- **Weave**: Patient communications (SMS, reviews, missed call follow-up)
- **Sikka**: Dental analytics and practice metrics

### Workflow Engine
- TypeScript-native with full type safety
- Cloudflare Workers edge deployment
- Webhook triggers, schedules, and polling
- State persistence and error handling

### Already Built vs. Building Ourselves

| Capability | WORKWAY | Build Ourselves |
|------------|---------|-----------------|
| NexHealth integration | ✅ 1000+ lines | 2-3 weeks |
| Weave integration | ✅ 900+ lines | 2-3 weeks |
| Workflow execution engine | ✅ Complete | 1-2 months |
| Webhook management | ✅ Complete | 2-3 weeks |
| OAuth token refresh | ✅ Complete | 1-2 weeks |

**Decision**: Use WORKWAY. Follow DRY principle.

## Dental Practice Workflows via WORKWAY

### No-Show Recovery

```typescript
import { NexHealth } from '@workwayco/integrations/nexhealth';
import { Weave } from '@workwayco/integrations/weave';

// Detect no-shows
const nexhealth = new NexHealth({ apiKey, subdomain, locationId });
const appointments = await nexhealth.listAppointments({ 
  status: 'no_show',
  startDate: yesterday,
  endDate: today 
});

// Follow up via Weave
const weave = new Weave({ apiKey, locationId });
for (const noShow of appointments.data.data) {
  await weave.sendNoShowFollowUp({
    patientPhone: noShow.patient?.phone,
    patientName: noShow.patient?.first_name,
    practiceName: 'Your Practice'
  });
}
```

### Patient Reactivation (Recall)

```typescript
// Find inactive patients
const inactive = await nexhealth.getInactivePatients({ monthsInactive: 6 });

// Send recall reminders
for (const patient of inactive.data) {
  await weave.sendMessage({
    phoneNumber: patient.phone,
    body: `Hi ${patient.first_name}! It's been a while since your last visit...`
  });
}
```

### Appointment Reminders

```typescript
// Get tomorrow's appointments
const tomorrow = await nexhealth.getUpcomingAppointments(1);

// Send reminders
for (const appt of tomorrow.data) {
  await weave.sendAppointmentReminder({
    patientPhone: appt.patient?.phone,
    patientName: appt.patient?.first_name,
    appointmentTime: appt.start_time,
    practiceName: 'Your Practice',
    includeConfirmation: true
  });
}
```

### Review Requests (Post-Visit)

```typescript
// After completed appointments, request reviews
const completed = await nexhealth.listAppointments({
  status: 'completed',
  startDate: today,
  endDate: today
});

for (const appt of completed.data.data) {
  await weave.requestReview({
    patientPhone: appt.patient?.phone,
    patientName: appt.patient?.first_name,
    practiceName: 'Your Practice',
    delayMinutes: 30 // Wait 30 min after visit
  });
}
```

## Using WORKWAY in .agency

The `.agency` property uses WORKWAY workflows to deliver the "Apps + Agents" promise:

1. **Client gets a website** (vertical template)
2. **Client gets agents** (WORKWAY workflows running on schedule/webhook)
3. **Client sees analytics** (WORKWAY execution logs + custom dashboard)

### Agent Registry Mapping

```typescript
// packages/agency/src/lib/agents/registry.ts
export const AGENT_REGISTRY = {
  'dental-practice': {
    workflows: [
      'dental-no-show-recovery',
      'dental-appointment-reminders', 
      'dental-recall-reactivation',
      'dental-review-requests'
    ],
    integrations: ['nexhealth', 'weave'],
    compliance: ['hipaa']
  },
  'medical-practice': {
    workflows: [...],
    integrations: ['nexhealth', 'weave'],
    compliance: ['hipaa']
  },
  'law-firm': {
    workflows: [...],
    integrations: ['calendly', 'slack', 'notion'],
    compliance: []
  }
};
```

## WORKWAY Repository

The WORKWAY SDK is at: `/Users/micahjohnson/Documents/Github/WORKWAY/Cloudflare/packages/`

Key packages:
- `sdk/` - Core SDK (@workwayco/sdk)
- `integrations/` - All integrations including nexhealth, weave
- `cli/` - Command-line interface
- `workflows/` - Example workflow templates

## Next Steps

1. Build agent registry in .agency
2. Create client dashboard using WORKWAY execution logs
3. Define WORKWAY workflows for each vertical
4. Build enrollment flow that provisions WORKWAY workflows
