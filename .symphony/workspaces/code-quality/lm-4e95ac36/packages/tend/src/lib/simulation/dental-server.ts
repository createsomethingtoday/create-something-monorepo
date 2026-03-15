/**
 * Dental Practice Simulation (TypeScript Server-Side)
 * 
 * This mirrors the Rust simulation engine logic for server-side use.
 * Same seed + same time = same output as the WASM module.
 */

// Simple seeded PRNG (xorshift64) - matches Rust implementation
class Rng {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed === 0n ? 0xDEADBEEFn : seed;
  }

  static seeded(seed: bigint, modifier: bigint): Rng {
    const combined = (seed * 0x517cc1b727220a95n + modifier) & 0xFFFFFFFFFFFFFFFFn;
    return new Rng(combined);
  }

  nextU64(): bigint {
    let x = this.state;
    x ^= x << 13n;
    x &= 0xFFFFFFFFFFFFFFFFn;
    x ^= x >> 7n;
    x ^= x << 17n;
    x &= 0xFFFFFFFFFFFFFFFFn;
    this.state = x;
    return x;
  }

  nextF64(): number {
    return Number((this.nextU64() >> 11n)) / Number(1n << 53n);
  }

  nextRange(max: number): number {
    if (max === 0) return 0;
    return Number(this.nextU64() % BigInt(max));
  }

  nextRangeI64(min: number, max: number): number {
    if (max <= min) return min;
    const range = max - min;
    return min + this.nextRange(range);
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.nextRange(items.length)];
  }

  weightedPick<T>(items: readonly [T, number][]): T | undefined {
    if (items.length === 0) return undefined;
    const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
    if (totalWeight === 0) return undefined;
    
    let roll = this.nextRange(totalWeight);
    for (const [item, weight] of items) {
      if (roll < weight) return item;
      roll -= weight;
    }
    return items[items.length - 1][0];
  }

  randomId(prefix: string): string {
    return `${prefix}-${(this.nextU64() & 0xFFFFFFFFn).toString(16).padStart(8, '0')}`;
  }
}

// Data pools
const FIRST_NAMES = [
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert', 'Maria',
  'William', 'Lisa', 'Carlos', 'Amanda', 'Kevin', 'Jessica', 'Thomas', 'Ashley',
  'Daniel', 'Michelle', 'Brian', 'Nicole', 'Steven', 'Rachel', 'Andrew', 'Laura',
] as const;

const LAST_NAMES = [
  'Thompson', 'Williams', 'Johnson', 'Morrison', 'Chen', 'Garcia', 'Martinez',
  'Smith', 'Brown', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'White', 'Harris', 'Martin', 'Lee', 'Walker', 'Hall', 'Young',
] as const;

const PAYERS = [
  'Delta Dental', 'Aetna', 'Cigna', 'MetLife', 'Guardian', 'United Healthcare',
  'Blue Cross', 'Humana', 'Principal',
] as const;

const PROCEDURES: readonly [string, number][] = [
  ['Cleaning', 150],
  ['Crown', 1200],
  ['Filling', 250],
  ['Root Canal', 1500],
  ['Extraction', 300],
  ['Implant Consult', 200],
  ['Veneer Consult', 150],
  ['Whitening', 400],
  ['Deep Cleaning', 350],
  ['Bridge', 2500],
];

type TimeOfDay = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'late_afternoon' | 'evening';

interface SimTime {
  timestampMs: number;
  hour: number;
  minuteOfDay: number;
  dayOfWeek: number;
  timeOfDay: TimeOfDay;
  businessProgress: number;
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour <= 8) return 'early_morning';
  if (hour >= 9 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 13) return 'midday';
  if (hour >= 14 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 18) return 'late_afternoon';
  return 'evening';
}

function getBusinessProgress(minuteOfDay: number): number {
  const start = 480; // 8am
  const end = 1080; // 6pm
  
  if (minuteOfDay < start) return 0;
  if (minuteOfDay > end) return 1;
  return (minuteOfDay - start) / (end - start);
}

function getSimTime(timestampMs: number): SimTime {
  // Simulate US Central timezone (UTC-6) for realistic demo business hours
  // This ensures viewers see the practice "during the day" at reasonable US times
  const tzOffsetMs = -6 * 60 * 60 * 1000; // CST
  const localDate = new Date(timestampMs + tzOffsetMs);
  
  const hour = localDate.getUTCHours();
  const minuteOfDay = hour * 60 + localDate.getUTCMinutes();
  
  return {
    timestampMs,
    hour,
    minuteOfDay,
    dayOfWeek: localDate.getUTCDay(),
    timeOfDay: getTimeOfDay(hour),
    businessProgress: getBusinessProgress(minuteOfDay),
  };
}

export interface SimulatedMetrics {
  today: {
    appointments: number;
    completed: number;
    remaining: number;
    avgWaitTime: string;
    onTimeRate: number;
  };
  automations: {
    today: number;
    callsProcessed: number;
    confirmationsSent: number;
    eligibilityChecked: number;
    recallsContacted: number;
  };
  agents: {
    completed: number;
    awaitingApproval: number;
  };
  humanActions: {
    today: number;
  };
  health: {
    waitingRoom: number;
    noShowRate: number;
  };
}

export interface SimulatedItem {
  id: string;
  tenantId: string;
  sourceId: string;
  title: string;
  body: string;
  sourceType: string;
  category: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  status: 'inbox' | 'approved' | 'dismissed' | 'snoozed';
  sourceTimestamp: Date;
  ingestedAt: Date;
  metadata: Record<string, unknown>;
}

export interface SimulatedLogEntry {
  minutesAgo: number;
  text: string;
}

function generateMetrics(rng: Rng, time: SimTime): SimulatedMetrics {
  const progress = time.businessProgress;
  const isBusy = time.timeOfDay === 'morning' || time.timeOfDay === 'afternoon';
  
  // HIGH VOLUME: More appointments per day
  const baseAppointments: Record<number, number> = {
    0: 8, 1: 28, 2: 34, 3: 32, 4: 32, 5: 24, 6: 8
  };
  
  const appointmentsTotal = (baseAppointments[time.dayOfWeek] || 28) + rng.nextRange(6);
  const expectedCompleted = Math.floor(appointmentsTotal * progress);
  
  // Variance scales with time - less variance early, more later
  // This prevents "0 seen" when it's clearly past opening
  const maxNegativeVariance = progress < 0.1 ? 0 : progress < 0.2 ? 1 : 2;
  const variance = rng.nextRangeI64(-maxNegativeVariance, 3);
  
  // Minimum completed based on time: if we're past 8:30am and before closing, at least 1
  const minCompleted = (progress > 0.05 && progress < 1) ? 1 : 0;
  const appointmentsCompleted = Math.max(minCompleted, expectedCompleted + variance);
  
  // CALM but REALISTIC: Natural variation throughout the day
  let waitingRoom: number;
  if (time.timeOfDay === 'morning') {
    // Morning rush: occasionally 1-3 waiting
    waitingRoom = (progress > 0.2 && progress < 0.5) 
      ? rng.nextRange(4)  // 0-3 during peak morning
      : rng.nextRange(2);  // 0-1 otherwise
  } else if (time.timeOfDay === 'midday') {
    waitingRoom = rng.nextRange(2); // Lunch: 0-1
  } else if (time.timeOfDay === 'afternoon') {
    // Afternoon: well-optimized, usually 0-1, occasionally 1-2
    waitingRoom = rng.nextF64() > 0.8 ? 1 + rng.nextRange(2) : rng.nextRange(2);
  } else {
    waitingRoom = 0; // Early morning/evening: no one waiting
  }
  
  // Wait time correlates with waiting room
  const avgWait = waitingRoom === 0 ? 0 
    : waitingRoom === 1 ? 1 + rng.nextRange(2)
    : waitingRoom === 2 ? 2 + rng.nextRange(3)
    : 3 + rng.nextRange(4);
  
  // EXCELLENT: High on-time rate because of automation
  const onTimeBase = time.timeOfDay === 'afternoon' ? 97 : 95;
  const onTimeRate = onTimeBase + rng.nextRange(3);
  
  // LOW: Very few no-shows because of aggressive confirmation
  const noShowRate = 1 + rng.nextRange(3);
  
  // FULL BLAST: Hundreds of automations per day
  const automationMultiplier = Math.max(1, progress * 10);
  const baseAutomations = Math.floor(80 * automationMultiplier); // 80-800/day
  const automationsToday = baseAutomations + rng.nextRange(50);
  
  // HIGH VOLUME breakdown
  const callsProcessed = Math.floor(automationsToday * 0.08) + rng.nextRange(15); // 50-80 calls
  const confirmationsSent = appointmentsTotal * 3 + rng.nextRange(20); // 3x for reminder sequences
  const eligibilityChecked = appointmentsTotal + 20 + rng.nextRange(30); // All + tomorrow + walk-ins
  const recallsContacted = Math.floor(25 * automationMultiplier * 0.4) + rng.nextRange(15); // 30-100 recalls
  
  // HEAVY agent work in background
  const agentsCompleted = Math.floor(progress * 45) + rng.nextRange(12); // 40-55 agent tasks
  const agentsAwaiting = 2 + rng.nextRange(6); // 2-7 awaiting human
  
  // LOW: Human decisions stay minimal despite volume (100:1 ratio)
  const humanDecisions = 5 + Math.floor(progress * 12) + rng.nextRange(4); // 5-20/day
  
  return {
    today: {
      appointments: appointmentsTotal,
      completed: appointmentsCompleted,
      remaining: Math.max(0, appointmentsTotal - appointmentsCompleted),
      avgWaitTime: `${avgWait} min`,
      onTimeRate,
    },
    automations: {
      today: automationsToday,
      callsProcessed,
      confirmationsSent,
      eligibilityChecked,
      recallsContacted,
    },
    agents: {
      completed: agentsCompleted,
      awaitingApproval: agentsAwaiting,
    },
    humanActions: {
      today: humanDecisions,
    },
    health: {
      waitingRoom,
      noShowRate,
    },
  };
}

function generateInboxItem(rng: Rng, time: SimTime, index: number, now: number): SimulatedItem | null {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  if (!first || !last) return null;
  
  const patient = `${first} ${last}`;
  const payer = rng.pick(PAYERS) || 'Insurance';
  const procedureEntry = rng.pick(PROCEDURES);
  const [procedure, amount] = procedureEntry || ['procedure', 100];
  
  const itemTypes: [string, number][] = time.timeOfDay === 'morning' 
    ? [['appeal_ready', 30], ['review_response', 20], ['new_patient_call', 35], ['insurance_issue', 25], ['unconfirmed_appt', 20]]
    : time.timeOfDay === 'afternoon'
    ? [['appeal_ready', 20], ['review_response', 30], ['new_patient_call', 20], ['insurance_issue', 15], ['schedule_gap', 30]]
    : [['appeal_ready', 25], ['review_response', 25], ['new_patient_call', 25], ['insurance_issue', 20], ['unconfirmed_appt', 15]];
  
  const itemType = rng.weightedPick(itemTypes);
  if (!itemType) return null;
  
  let title: string, body: string, sourceType: string, category: string, baseScore: number;
  
  switch (itemType) {
    case 'appeal_ready':
      title = `Appeal ready for ${last}'s ${procedure.toLowerCase()}`;
      body = `Drafted the letter. ${payer} denied it saying no pre-auth, but we have the notes. Deadline is in 5 days.`;
      sourceType = 'claims';
      category = 'claim';
      baseScore = 0.90 + rng.nextF64() * 0.08;
      break;
    case 'review_response': {
      const rating = 2 + rng.nextRange(3);
      title = `Response ready for ${rating}-star review`;
      body = rating <= 2 
        ? "Drafted an apology. Want to review before it posts?" 
        : "Drafted a thank-you. Ready to post.";
      sourceType = 'reviews';
      category = 'review';
      baseScore = rating <= 2 ? 0.85 + rng.nextF64() * 0.08 : 0.35 + rng.nextF64() * 0.1;
      break;
    }
    case 'new_patient_call':
      title = 'New patient worth calling back';
      body = `${patient} called about ${procedure.toLowerCase()}. Has PPO, looks promising - scored ${7 + rng.nextRange(4)}/10.`;
      sourceType = 'phone';
      category = 'call';
      baseScore = 0.80 + rng.nextF64() * 0.12;
      break;
    case 'insurance_issue':
      title = `${patient} - insurance might be gone`;
      body = `Has ${procedure.toLowerCase()} scheduled but ${payer} says coverage ended. Might have new insurance.`;
      sourceType = 'insurance';
      category = 'eligibility';
      baseScore = 0.70 + rng.nextF64() * 0.15;
      break;
    case 'unconfirmed_appt':
      title = `${patient} hasn't confirmed tomorrow`;
      body = `${procedure} at $${amount}, sent 2 texts. Call them?`;
      sourceType = 'pms';
      category = 'appointment';
      baseScore = 0.65 + rng.nextF64() * 0.15;
      break;
    case 'schedule_gap':
      title = "Gap in schedule tomorrow";
      body = `Texted ${2 + rng.nextRange(4)} patients who might want it. Waiting to hear back.`;
      sourceType = 'pms';
      category = 'appointment';
      baseScore = 0.40 + rng.nextF64() * 0.15;
      break;
    default:
      return null;
  }
  
  const minutesAgo = index === 0 ? 5 + rng.nextRange(15)
    : index === 1 ? 20 + rng.nextRange(40)
    : index === 2 ? 60 + rng.nextRange(60)
    : 120 + rng.nextRange(180);
  
  return {
    id: rng.randomId('sim'),
    tenantId: 'demo',
    sourceId: sourceType,
    title,
    body,
    sourceType,
    category,
    score: baseScore,
    scoreBreakdown: {},
    status: 'inbox',
    sourceTimestamp: new Date(now - minutesAgo * 60000),
    ingestedAt: new Date(now),
    metadata: {},
  };
}

function generateCompletedItem(rng: Rng, index: number, now: number): SimulatedItem | null {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const payer = rng.pick(PAYERS);
  if (!first || !last || !payer) return null;
  
  const proc = rng.pick(PROCEDURES);
  const [procedure, amount] = proc || ['procedure', 100];
  
  // Many more completed item types showing throughput
  const types = [
    'appeal_sent', 'patient_booked', 'review_responded', 'payment_posted',
    'eligibility_verified', 'confirmation_sent', 'claim_filed', 'recall_scheduled',
    'forms_processed', 'referral_sent', 'prescription_sent', 'records_transferred',
    'insurance_updated', 'recall_completed', 'waitlist_filled'
  ];
  const itemType = rng.pick(types);
  
  let title: string, body: string, sourceType: string, category: string;
  
  switch (itemType) {
    case 'appeal_sent':
      title = `Sent ${last}'s appeal`;
      body = `Appeal went to ${payer} with the imaging. Now we wait.`;
      sourceType = 'claims';
      category = 'claim';
      break;
    case 'patient_booked':
      title = `${first} ${last} booked`;
      body = `${procedure} confirmed for next week.`;
      sourceType = 'phone';
      category = 'call';
      break;
    case 'review_responded':
      title = `Replied to ${3 + rng.nextRange(3)}-star review`;
      body = 'Response posted.';
      sourceType = 'reviews';
      category = 'review';
      break;
    case 'payment_posted': {
      const payAmount = 800 + rng.nextRange(6000);
      title = `${payer} $${payAmount}`;
      body = `Posted to ${2 + rng.nextRange(6)} accounts.`;
      sourceType = 'accounting';
      category = 'payment';
      break;
    }
    case 'eligibility_verified':
      title = `${last} verified`;
      body = `${payer} coverage confirmed for ${procedure.toLowerCase()}.`;
      sourceType = 'insurance';
      category = 'eligibility';
      break;
    case 'confirmation_sent':
      title = `${last} confirmed`;
      body = 'Replied to reminder text.';
      sourceType = 'pms';
      category = 'appointment';
      break;
    case 'claim_filed':
      title = `Claim filed - ${last}`;
      body = `$${amount} ${procedure.toLowerCase()} submitted to ${payer}.`;
      sourceType = 'claims';
      category = 'claim';
      break;
    case 'recall_scheduled':
      title = `${last} rescheduled`;
      body = `Was overdue, now booked for ${procedure.toLowerCase()}.`;
      sourceType = 'pms';
      category = 'recall';
      break;
    case 'forms_processed':
      title = `${last}'s forms done`;
      body = 'New patient paperwork processed.';
      sourceType = 'pms';
      category = 'document';
      break;
    case 'referral_sent':
      title = `Referral sent - ${last}`;
      body = 'Sent to specialist with records.';
      sourceType = 'pms';
      category = 'referral';
      break;
    case 'prescription_sent':
      title = `Rx sent for ${last}`;
      body = 'E-prescribed to pharmacy.';
      sourceType = 'clinical';
      category = 'prescription';
      break;
    case 'records_transferred':
      title = `${last}'s records sent`;
      body = 'Sent to new dentist per request.';
      sourceType = 'pms';
      category = 'document';
      break;
    case 'insurance_updated':
      title = `${last}'s insurance updated`;
      body = `Changed to ${payer} effective this month.`;
      sourceType = 'insurance';
      category = 'eligibility';
      break;
    case 'recall_completed':
      title = `${last} reactivated`;
      body = 'Was 18mo overdue, now scheduled.';
      sourceType = 'pms';
      category = 'recall';
      break;
    case 'waitlist_filled':
      title = `Filled gap - ${last}`;
      body = `Moved from waitlist to ${procedure.toLowerCase()} slot.`;
      sourceType = 'pms';
      category = 'appointment';
      break;
    default:
      return null;
  }
  
  // Tighter spacing for high volume
  const minutesAgo = 15 + (index * 12) + rng.nextRange(20);
  
  return {
    id: rng.randomId('sim'),
    tenantId: 'demo',
    sourceId: sourceType,
    title,
    body,
    sourceType,
    category,
    score: 0.45 + rng.nextF64() * 0.45,
    scoreBreakdown: {},
    status: 'approved',
    sourceTimestamp: new Date(now - minutesAgo * 60000),
    ingestedAt: new Date(now),
    metadata: {},
  };
}

function generateDismissedItem(rng: Rng, index: number, now: number): SimulatedItem | null {
  // Many types of noise that get filtered out
  const types = [
    'wrong_number', 'routed_elsewhere', 'patient_moved', 'spam_call',
    'duplicate_record', 'cancelled_appt', 'auto_resolved', 'no_action_needed',
    'handled_by_automation', 'expired_offer', 'test_entry'
  ];
  const itemType = rng.pick(types);
  const last = rng.pick(LAST_NAMES) || 'Patient';
  
  let title: string, body: string, sourceType: string, category: string;
  
  switch (itemType) {
    case 'wrong_number':
      title = 'Wrong number';
      body = 'Misdial, ended politely.';
      sourceType = 'phone';
      category = 'call';
      break;
    case 'routed_elsewhere':
      title = 'Rx refill';
      body = 'Routed to clinical queue.';
      sourceType = 'phone';
      category = 'call';
      break;
    case 'patient_moved':
      title = `${last} transferred`;
      body = 'Records sent to new provider.';
      sourceType = 'pms';
      category = 'patient';
      break;
    case 'spam_call':
      title = 'Spam blocked';
      body = 'Marketing call auto-blocked.';
      sourceType = 'phone';
      category = 'call';
      break;
    case 'duplicate_record':
      title = 'Duplicate merged';
      body = `Merged duplicate ${last} record.`;
      sourceType = 'pms';
      category = 'patient';
      break;
    case 'cancelled_appt':
      title = `${last} cancelled`;
      body = 'Slot already filled from waitlist.';
      sourceType = 'pms';
      category = 'appointment';
      break;
    case 'auto_resolved':
      title = 'Issue resolved';
      body = `${last}'s balance cleared by payment.`;
      sourceType = 'accounting';
      category = 'payment';
      break;
    case 'no_action_needed':
      title = 'FYI only';
      body = `${last} confirmed via patient portal.`;
      sourceType = 'pms';
      category = 'appointment';
      break;
    case 'handled_by_automation':
      title = 'Auto-handled';
      body = 'Routine follow-up sent automatically.';
      sourceType = 'automation';
      category = 'task';
      break;
    case 'expired_offer':
      title = 'Offer expired';
      body = `${last} didn't respond to treatment plan.`;
      sourceType = 'pms';
      category = 'treatment_plan';
      break;
    case 'test_entry':
      title = 'Test record';
      body = 'System test, auto-cleaned.';
      sourceType = 'system';
      category = 'maintenance';
      break;
    default:
      return null;
  }
  
  // Tighter spacing showing constant filtering
  const minutesAgo = 30 + (index * 25) + rng.nextRange(40);
  
  return {
    id: rng.randomId('sim'),
    tenantId: 'demo',
    sourceId: sourceType,
    title,
    body,
    sourceType,
    category,
    score: 0.02 + rng.nextF64() * 0.12,
    scoreBreakdown: {},
    status: 'dismissed',
    sourceTimestamp: new Date(now - minutesAgo * 60000),
    ingestedAt: new Date(now),
    metadata: {},
  };
}

function generateSnoozedItem(rng: Rng, now: number): SimulatedItem | null {
  const last = rng.pick(LAST_NAMES) || 'Patient';
  const proc = rng.pick(PROCEDURES);
  const [procedure, amount] = proc || ['procedure', 1000];
  
  const title = rng.nextF64() > 0.5
    ? `${last} wants ${procedure.toLowerCase()} after their event`
    : 'Waiting on imaging from specialist';
  
  const body = rng.nextF64() > 0.5
    ? `$${amount} job but they're waiting. Following up next month.`
    : `Insurance needs the CBCT before processing ${last}'s claim.`;
  
  const minutesAgo = 1440 + rng.nextRange(4320); // 1-4 days ago
  
  return {
    id: rng.randomId('sim'),
    tenantId: 'demo',
    sourceId: 'pms',
    title,
    body,
    sourceType: 'pms',
    category: 'treatment_plan',
    score: 0.55 + rng.nextF64() * 0.15,
    scoreBreakdown: {},
    status: 'snoozed',
    sourceTimestamp: new Date(now - minutesAgo * 60000),
    ingestedAt: new Date(now),
    metadata: {},
  };
}

function generateActivityLog(rng: Rng, time: SimTime): SimulatedLogEntry[] {
  // HIGH VOLUME: Many more activity templates showing constant flow
  const templates = [
    // Eligibility (high frequency)
    "Verified {patient} - {payer} active",
    "Checked {patient}'s coverage for {procedure}",
    "Batch verified {count} patients for tomorrow",
    // Confirmations (very high frequency)
    "{patient} confirmed {time}",
    "Sent reminder to {patient}",
    "Sent {count} confirmation texts",
    // Calls (medium frequency)
    "New patient call scored {score}/10",
    "Routed call to scheduling",
    "Transcribed voicemail from {patient}",
    // Claims (medium frequency)
    "Filed claim for {patient}'s {procedure}",
    "Drafted appeal for {patient} - needs review",
    "Posted {payer}: ${amount}",
    "Posted {count} payments totaling ${amount}",
    // Recalls (batched)
    "Texted {count} overdue patients",
    "{patient} responded - booking",
    // Agent work
    "Agent drafted response for {patient}",
    "Agent analyzed {patient}'s treatment history",
    "Completed: Schedule optimization",
    // Misc
    "Synced {count} records from PMS",
    "Processed {patient}'s forms",
  ];
  
  // FULL BLAST: 30-60 log entries showing constant activity
  const baseEntries = 25 + Math.floor(time.businessProgress * 35);
  const entryCount = Math.min(60, baseEntries + rng.nextRange(15));
  const log: SimulatedLogEntry[] = [];
  
  for (let i = 0; i < entryCount; i++) {
    const template = rng.pick(templates) || templates[0];
    const first = rng.pick(FIRST_NAMES) || 'Patient';
    const last = rng.pick(LAST_NAMES) || 'Name';
    const payer = rng.pick(PAYERS) || 'Insurance';
    const proc = rng.pick(PROCEDURES);
    const procedure = proc?.[0] || 'procedure';
    const apptTime = `${8 + rng.nextRange(10)}:${String(rng.nextRange(4) * 15).padStart(2, '0')}`;
    
    // Higher counts for batch operations
    const batchCount = 5 + rng.nextRange(25);
    const paymentAmount = 500 + rng.nextRange(8000);
    
    const text = template
      .replace('{patient}', `${first} ${last}`)
      .replace('{payer}', payer)
      .replace('{procedure}', procedure)
      .replace('{time}', apptTime)
      .replace('{count}', String(batchCount))
      .replace('{score}', String(6 + rng.nextRange(5)))
      .replace('{amount}', String(paymentAmount));
    
    // Tighter spacing - activity every 30s to 2min
    const minutesAgo = i + rng.nextRange(2);
    log.push({ minutesAgo, text });
  }
  
  log.sort((a, b) => a.minutesAgo - b.minutesAgo);
  return log;
}

/**
 * Generate a complete simulation state for the given timestamp
 * HIGH VOLUME: Shows massive throughput while remaining calm
 */
export function generateDentalSimulation(timestampMs: number = Date.now()) {
  const seed = BigInt(Math.floor(timestampMs / 86400000)); // Day-level seed
  const minuteSeed = BigInt(Math.floor(timestampMs / 60000));
  const rng = Rng.seeded(seed, minuteSeed);
  const time = getSimTime(timestampMs);
  
  const metrics = generateMetrics(rng, time);
  
  const items: SimulatedItem[] = [];
  
  // HIGH VOLUME: More inbox items showing the flow
  const inboxCount = 6 + rng.nextRange(8); // 6-14 inbox
  for (let i = 0; i < inboxCount; i++) {
    const item = generateInboxItem(rng, time, i, timestampMs);
    if (item) items.push(item);
  }
  
  // MANY completed items showing throughput
  const completedCount = 15 + rng.nextRange(20); // 15-35 completed
  for (let i = 0; i < completedCount; i++) {
    const item = generateCompletedItem(rng, i, timestampMs);
    if (item) items.push(item);
  }
  
  // Dismissed items - filtered noise
  const dismissedCount = 8 + rng.nextRange(12); // 8-20 dismissed
  for (let i = 0; i < dismissedCount; i++) {
    const item = generateDismissedItem(rng, i, timestampMs);
    if (item) items.push(item);
  }
  
  // Snoozed items - things waiting
  const snoozedCount = 3 + rng.nextRange(5); // 3-8 snoozed
  for (let i = 0; i < snoozedCount; i++) {
    const item = generateSnoozedItem(rng, timestampMs);
    if (item) items.push(item);
  }
  
  // Sort by score
  items.sort((a, b) => b.score - a.score);
  
  const activityLog = generateActivityLog(rng, time);
  
  return { items, metrics, activityLog, timeOfDay: time.timeOfDay };
}
