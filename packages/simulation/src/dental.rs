//! Dental Practice Scenario
//!
//! Simulates a day in a modern dental practice.
//! Time-aware: morning rush, afternoon steady, end-of-day wrap.
//! 
//! Patient Journeys: Events flow logically through stages:
//! - Call → Book → Visit → Treatment Plan → Insurance → Claim → Payment
//! - Recall → Contact → Book → Visit
//! - Review → Response → Posted

use crate::{Rng, SimItem, SimLogEntry, SimMetrics, SimState};
use crate::scenario::{Scenario, SimTime, TimeOfDay};

/// Patient name pools for realistic generation
const FIRST_NAMES: &[&str] = &[
    "James", "Sarah", "Michael", "Jennifer", "David", "Emily", "Robert", "Maria",
    "William", "Lisa", "Carlos", "Amanda", "Kevin", "Jessica", "Thomas", "Ashley",
    "Daniel", "Michelle", "Brian", "Nicole", "Steven", "Rachel", "Andrew", "Laura",
];

const LAST_NAMES: &[&str] = &[
    "Thompson", "Williams", "Johnson", "Morrison", "Chen", "Garcia", "Martinez",
    "Smith", "Brown", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore",
    "Jackson", "White", "Harris", "Martin", "Lee", "Walker", "Hall", "Young",
];

/// Insurance payers
const PAYERS: &[&str] = &[
    "Delta Dental", "Aetna", "Cigna", "MetLife", "Guardian", "United Healthcare",
    "Blue Cross", "Humana", "Principal",
];

/// Dental procedure types
const PROCEDURES: &[(&str, u32)] = &[
    ("Cleaning", 150),
    ("Crown", 1200),
    ("Filling", 250),
    ("Root Canal", 1500),
    ("Extraction", 300),
    ("Implant Consult", 200),
    ("Veneer Consult", 150),
    ("Whitening", 400),
    ("Deep Cleaning", 350),
    ("Bridge", 2500),
];

/// Patient journey stages - events flow through these logically
#[derive(Clone, Copy)]
enum JourneyStage {
    // New patient flow
    NewCall,           // Day 0: Patient calls
    Booked,            // Day 0-1: Appointment scheduled
    Confirmed,         // Day 1-2: Patient confirms
    Visited,           // Day 2-5: Visit completed
    TreatmentPlan,     // Day 3-7: Treatment plan created
    InsuranceCheck,    // Day 4-8: Eligibility verified
    ClaimFiled,        // Day 5-10: Claim submitted
    ClaimPending,      // Day 10-20: Waiting on insurance
    PaymentReceived,   // Day 15-30: Payment posted
    
    // Recall flow
    RecallDue,         // Patient overdue
    RecallContacted,   // Automation reached out
    RecallResponded,   // Patient responded
    RecallBooked,      // Appointment scheduled
    
    // Review flow  
    ReviewReceived,    // New review came in
    ResponseDrafted,   // Agent drafted response
    ResponsePosted,    // Response published
}

/// A patient journey tracks one patient through their care cycle
struct PatientJourney {
    first_name: &'static str,
    last_name: &'static str,
    payer: &'static str,
    procedure: &'static str,
    amount: u32,
    stage: JourneyStage,
    days_in_stage: u32,
}

impl PatientJourney {
    fn new(rng: &mut Rng, stage: JourneyStage) -> Option<Self> {
        Some(Self {
            first_name: *rng.pick(FIRST_NAMES)?,
            last_name: *rng.pick(LAST_NAMES)?,
            payer: *rng.pick(PAYERS)?,
            procedure: rng.pick(PROCEDURES).map(|(p, _)| *p)?,
            amount: rng.pick(PROCEDURES).map(|(_, a)| *a)?,
            stage,
            days_in_stage: rng.next_range(3) as u32,
        })
    }
    
    fn full_name(&self) -> String {
        format!("{} {}", self.first_name, self.last_name)
    }
}

pub struct DentalScenario;

impl Scenario for DentalScenario {
    fn generate(seed: u64, timestamp_ms: i64) -> SimState {
        let time = SimTime::from_timestamp_ms(timestamp_ms);
        let mut rng = Rng::seeded(seed, (timestamp_ms / 60000) as u64); // Changes every minute
        
        // Generate patient journeys at various stages
        let journeys = generate_journeys(&mut rng, &time);
        
        let metrics = generate_metrics(&mut rng, &time);
        let items = generate_items_from_journeys(&mut rng, &time, &journeys);
        let activity_log = generate_activity_log_from_journeys(&mut rng, &time, &journeys);
        
        SimState {
            items,
            activity_log,
            metrics,
            time_of_day: time.time_of_day.as_str().to_string(),
            simulation_time: timestamp_ms,
        }
    }
}

/// Generate a realistic set of patient journeys at various stages
fn generate_journeys(rng: &mut Rng, time: &SimTime) -> Vec<PatientJourney> {
    let mut journeys = Vec::new();
    
    // New patient calls (today) - become inbox items needing callback
    for _ in 0..(3 + rng.next_range(4)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::NewCall) {
            journeys.push(j);
        }
    }
    
    // Recently booked (1-2 days ago) - need confirmation
    for _ in 0..(4 + rng.next_range(5)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::Booked) {
            journeys.push(j);
        }
    }
    
    // Confirmed for today/tomorrow - in progress
    for _ in 0..(6 + rng.next_range(8)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::Confirmed) {
            journeys.push(j);
        }
    }
    
    // Visited recently - treatment plans being created
    for _ in 0..(5 + rng.next_range(6)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::Visited) {
            journeys.push(j);
        }
    }
    
    // Treatment plans ready - need approval
    for _ in 0..(3 + rng.next_range(4)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::TreatmentPlan) {
            journeys.push(j);
        }
    }
    
    // Insurance being checked
    for _ in 0..(4 + rng.next_range(5)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::InsuranceCheck) {
            journeys.push(j);
        }
    }
    
    // Claims filed - waiting
    for _ in 0..(8 + rng.next_range(10)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::ClaimFiled) {
            journeys.push(j);
        }
    }
    
    // Claims pending (older) - some need appeals
    for _ in 0..(5 + rng.next_range(8)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::ClaimPending) {
            journeys.push(j);
        }
    }
    
    // Payments received today
    for _ in 0..(4 + rng.next_range(6)) {
        if let Some(j) = PatientJourney::new(rng, JourneyStage::PaymentReceived) {
            journeys.push(j);
        }
    }
    
    // Recall patients at various stages
    for _ in 0..(10 + rng.next_range(15)) {
        let stage = match rng.next_range(4) {
            0 => JourneyStage::RecallDue,
            1 => JourneyStage::RecallContacted,
            2 => JourneyStage::RecallResponded,
            _ => JourneyStage::RecallBooked,
        };
        if let Some(j) = PatientJourney::new(rng, stage) {
            journeys.push(j);
        }
    }
    
    // Reviews at various stages
    for _ in 0..(2 + rng.next_range(4)) {
        let stage = match rng.next_range(3) {
            0 => JourneyStage::ReviewReceived,
            1 => JourneyStage::ResponseDrafted,
            _ => JourneyStage::ResponsePosted,
        };
        if let Some(j) = PatientJourney::new(rng, stage) {
            journeys.push(j);
        }
    }
    
    journeys
}

fn generate_metrics(rng: &mut Rng, time: &SimTime) -> SimMetrics {
    let progress = time.business_progress;
    let is_busy = matches!(time.time_of_day, TimeOfDay::Morning | TimeOfDay::Afternoon);
    
    // Total appointments scales with day of week (busier midweek)
    let base_appointments = match time.day_of_week {
        1 => 28, // Monday
        2 => 34, // Tuesday (busiest)
        3 => 32, // Wednesday
        4 => 32, // Thursday
        5 => 24, // Friday (lighter)
        _ => 8,  // Weekend (emergency only)
    };
    
    let appointments_total = base_appointments + rng.next_range(6) as u32;
    
    // Completed follows progress through the day
    let expected_completed = (appointments_total as f64 * progress) as u32;
    let variance = rng.next_range_i64(-2, 3) as i32;
    let appointments_completed = (expected_completed as i32 + variance).max(0) as u32;
    
    // CALM but REALISTIC: Natural variation throughout the day
    // Morning rush might have 1-3 waiting, afternoon settles to 0-1
    let waiting_room = match time.time_of_day {
        TimeOfDay::Morning => {
            // Morning rush: occasionally 1-3 waiting
            if progress > 0.2 && progress < 0.5 {
                rng.next_range(4) as u32  // 0-3 during peak morning
            } else {
                rng.next_range(2) as u32  // 0-1 otherwise
            }
        },
        TimeOfDay::Midday => rng.next_range(2) as u32, // Lunch: 0-1
        TimeOfDay::Afternoon => {
            // Afternoon: well-optimized, usually 0-1, occasionally 1-2
            if rng.next_f64() > 0.8 {
                1 + rng.next_range(2) as u32
            } else {
                rng.next_range(2) as u32
            }
        },
        _ => 0, // Early morning/evening: no one waiting
    };
    
    // Wait time correlates with waiting room but stays low
    let avg_wait = match waiting_room {
        0 => 0,
        1 => 1 + rng.next_range(2) as u32,  // 1-2 min
        2 => 2 + rng.next_range(3) as u32,  // 2-4 min
        _ => 3 + rng.next_range(4) as u32,  // 3-6 min (rare)
    };
    
    // On-time rate: 94-99% - excellent because of all the automation
    let on_time_base = if matches!(time.time_of_day, TimeOfDay::Afternoon) { 97 } else { 95 };
    let on_time_rate = on_time_base + rng.next_range(3) as u32;
    
    // No-show rate: very low 1-3% because of aggressive confirmation
    let no_show_rate = 1 + rng.next_range(3) as u32;
    
    // FULL BLAST: Automations are hundreds per day
    // This is the "volume" that would overwhelm a human but the system handles calmly
    let automation_multiplier = (progress * 10.0).max(1.0);
    let base_automations = (80.0 * automation_multiplier) as u32; // 80-800 automations/day
    let automations_today = base_automations + rng.next_range(50) as u32;
    
    // High-volume breakdown of automations
    let calls_processed = (automations_today as f64 * 0.08) as u32 + rng.next_range(15) as u32; // 50-80 calls
    let confirmations_sent = appointments_total * 3 + rng.next_range(20) as u32; // 3x because reminder sequences
    let eligibility_checked = appointments_total + 20 + rng.next_range(30) as u32; // All appts + walk-ins + tomorrow
    let recalls_contacted = (25.0 * automation_multiplier * 0.4) as u32 + rng.next_range(15) as u32; // 30-100 recalls
    
    // Agents doing heavy reasoning work in the background
    let agents_completed = (progress * 45.0) as u32 + rng.next_range(12) as u32; // 40-55 agent tasks
    let agents_awaiting = 2 + rng.next_range(6) as u32; // 2-7 awaiting human approval
    
    // Human decisions stay LOW despite high volume - this is the calm
    // The ratio of automations:human is ~100:1
    let human_decisions = 5 + (progress * 12.0) as u32 + rng.next_range(4) as u32; // 5-20 decisions/day
    
    SimMetrics {
        waiting_room,
        avg_wait_minutes: avg_wait,
        on_time_rate,
        no_show_rate,
        appointments_total,
        appointments_completed,
        automations_today,
        calls_processed,
        confirmations_sent,
        eligibility_checked,
        recalls_contacted,
        agents_completed,
        agents_awaiting,
        human_decisions,
    }
}

/// Generate items from patient journeys - creates logical flow
fn generate_items_from_journeys(rng: &mut Rng, time: &SimTime, journeys: &[PatientJourney]) -> Vec<SimItem> {
    let mut items = Vec::new();
    
    for journey in journeys {
        if let Some(item) = journey_to_item(rng, time, journey) {
            items.push(item);
        }
    }
    
    // Add some noise items (dismissed)
    let noise_count = 8 + rng.next_range(12) as usize;
    for i in 0..noise_count {
        if let Some(item) = generate_noise_item(rng, i) {
            items.push(item);
        }
    }
    
    // Sort by score descending
    items.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    
    items
}

/// Convert a patient journey stage to an item
fn journey_to_item(rng: &mut Rng, time: &SimTime, journey: &PatientJourney) -> Option<SimItem> {
    let name = journey.full_name();
    let last = journey.last_name;
    let payer = journey.payer;
    let procedure = journey.procedure;
    let amount = journey.amount;
    
    let (title, body, source_type, category, score, status, minutes_ago) = match journey.stage {
        // === INBOX: Needs human attention ===
        JourneyStage::NewCall => (
            format!("New patient worth calling back"),
            format!("{} called about {}. Has PPO, scored {}/10.", name, procedure.to_lowercase(), 7 + rng.next_range(4)),
            "phone",
            "call",
            0.80 + rng.next_f64() * 0.15,
            "inbox",
            5 + rng.next_range(60) as i64,
        ),
        JourneyStage::TreatmentPlan => (
            format!("{}'s treatment plan ready", last),
            format!("${} {} - waiting for your review before presenting.", amount, procedure.to_lowercase()),
            "pms",
            "treatment_plan",
            0.75 + rng.next_f64() * 0.15,
            "inbox",
            30 + rng.next_range(120) as i64,
        ),
        JourneyStage::ClaimPending => {
            // Some claims need appeals
            if rng.next_f64() > 0.6 {
                (
                    format!("Appeal ready for {}'s {}", last, procedure.to_lowercase()),
                    format!("{} denied it. Drafted the letter - deadline in {} days.", payer, 3 + rng.next_range(7)),
                    "claims",
                    "claim",
                    0.88 + rng.next_f64() * 0.10,
                    "inbox",
                    60 + rng.next_range(180) as i64,
                )
            } else {
                (
                    format!("{} claim pending", last),
                    format!("${} {} submitted to {} - {} days ago.", amount, procedure.to_lowercase(), payer, 5 + rng.next_range(15)),
                    "claims",
                    "claim",
                    0.30 + rng.next_f64() * 0.20,
                    "approved",
                    1440 + rng.next_range(4320) as i64,
                )
            }
        },
        JourneyStage::ResponseDrafted => {
            let rating = 2 + rng.next_range(3) as u32;
            (
                format!("Response ready for {}-star review", rating),
                if rating <= 2 { "Drafted an apology. Review before posting?".to_string() } 
                else { "Drafted a thank-you. Ready to post.".to_string() },
                "reviews",
                "review",
                if rating <= 2 { 0.85 + rng.next_f64() * 0.10 } else { 0.40 + rng.next_f64() * 0.15 },
                "inbox",
                15 + rng.next_range(90) as i64,
            )
        },
        JourneyStage::RecallResponded => (
            format!("{} wants to schedule", last),
            format!("Responded to recall text. Was {} months overdue.", 6 + rng.next_range(18)),
            "pms",
            "recall",
            0.70 + rng.next_f64() * 0.15,
            "inbox",
            10 + rng.next_range(60) as i64,
        ),
        
        // === APPROVED: Completed successfully ===
        JourneyStage::Booked => (
            format!("{} booked", last),
            format!("{} scheduled for {}.", name, procedure.to_lowercase()),
            "phone",
            "call",
            0.60 + rng.next_f64() * 0.20,
            "approved",
            60 + rng.next_range(240) as i64,
        ),
        JourneyStage::Confirmed => (
            format!("{} confirmed", last),
            format!("Replied to reminder - {} tomorrow.", procedure.to_lowercase()),
            "pms",
            "appointment",
            0.50 + rng.next_f64() * 0.20,
            "approved",
            30 + rng.next_range(180) as i64,
        ),
        JourneyStage::Visited => (
            format!("{} visit completed", last),
            format!("{} done. Creating treatment plan.", procedure),
            "pms",
            "appointment",
            0.55 + rng.next_f64() * 0.20,
            "approved",
            120 + rng.next_range(360) as i64,
        ),
        JourneyStage::InsuranceCheck => (
            format!("{} verified", last),
            format!("{} confirmed coverage for {}.", payer, procedure.to_lowercase()),
            "insurance",
            "eligibility",
            0.45 + rng.next_f64() * 0.25,
            "approved",
            45 + rng.next_range(120) as i64,
        ),
        JourneyStage::ClaimFiled => (
            format!("Claim filed - {}", last),
            format!("${} {} submitted to {}.", amount, procedure.to_lowercase(), payer),
            "claims",
            "claim",
            0.50 + rng.next_f64() * 0.20,
            "approved",
            180 + rng.next_range(480) as i64,
        ),
        JourneyStage::PaymentReceived => (
            format!("{} ${}", payer, amount - rng.next_range(200) as u32),
            format!("Posted for {}'s {}.", last, procedure.to_lowercase()),
            "accounting",
            "payment",
            0.55 + rng.next_f64() * 0.25,
            "approved",
            30 + rng.next_range(240) as i64,
        ),
        JourneyStage::RecallBooked => (
            format!("{} rescheduled", last),
            format!("Was overdue - now booked for {}.", procedure.to_lowercase()),
            "pms",
            "recall",
            0.60 + rng.next_f64() * 0.20,
            "approved",
            60 + rng.next_range(180) as i64,
        ),
        JourneyStage::ResponsePosted => (
            format!("Replied to {}-star review", 3 + rng.next_range(3)),
            "Response posted.".to_string(),
            "reviews",
            "review",
            0.40 + rng.next_f64() * 0.20,
            "approved",
            120 + rng.next_range(360) as i64,
        ),
        
        // === SNOOZED: Waiting for something ===
        JourneyStage::RecallDue => (
            format!("{} - {} months overdue", last, 6 + rng.next_range(24)),
            format!("Last {} was a while ago. In recall queue.", procedure.to_lowercase()),
            "pms",
            "recall",
            0.35 + rng.next_f64() * 0.20,
            "snoozed",
            2880 + rng.next_range(10080) as i64,
        ),
        JourneyStage::RecallContacted => (
            format!("Waiting on {} for recall", last),
            format!("Sent {} messages. No response yet.", 2 + rng.next_range(3)),
            "pms",
            "recall",
            0.30 + rng.next_f64() * 0.15,
            "snoozed",
            1440 + rng.next_range(4320) as i64,
        ),
        JourneyStage::ReviewReceived => (
            format!("New {}-star review", 1 + rng.next_range(5)),
            "Agent analyzing for response.".to_string(),
            "reviews",
            "review",
            0.50 + rng.next_f64() * 0.20,
            "snoozed",
            30 + rng.next_range(120) as i64,
        ),
    };
    
    Some(SimItem {
        id: rng.random_id("sim"),
        title,
        body,
        source_type: source_type.to_string(),
        category: category.to_string(),
        score,
        status: status.to_string(),
        minutes_ago,
        metadata: None,
    })
}

/// Generate noise items that get auto-dismissed
fn generate_noise_item(rng: &mut Rng, index: usize) -> Option<SimItem> {
    let last = *rng.pick(LAST_NAMES)?;
    
    let noise_types = &[
        ("Spam blocked", "Marketing call auto-blocked.", "phone", "call"),
        ("Wrong number", "Misdial, ended politely.", "phone", "call"),
        ("Rx refill", "Routed to clinical queue.", "phone", "call"),
        ("Duplicate merged", &format!("Merged duplicate {} record.", last), "pms", "patient"),
        ("FYI only", &format!("{} confirmed via portal.", last), "pms", "appointment"),
        ("Auto-handled", "Routine follow-up sent.", "automation", "task"),
        ("Test record", "System test, auto-cleaned.", "system", "maintenance"),
    ];
    
    let (title, body, source_type, category) = *rng.pick(noise_types)?;
    
    Some(SimItem {
        id: rng.random_id("sim"),
        title: title.to_string(),
        body: body.to_string(),
        source_type: source_type.to_string(),
        category: category.to_string(),
        score: 0.02 + rng.next_f64() * 0.10,
        status: "dismissed".to_string(),
        minutes_ago: 30 + (index as i64 * 20) + rng.next_range(40) as i64,
        metadata: None,
    })
}

/// Generate activity log from patient journeys - shows logical flow
fn generate_activity_log_from_journeys(rng: &mut Rng, time: &SimTime, journeys: &[PatientJourney]) -> Vec<SimLogEntry> {
    let mut log = Vec::new();
    
    // Generate log entries from journeys - shows the narrative
    for journey in journeys {
        if let Some(entry) = journey_to_log_entry(rng, journey) {
            log.push(entry);
        }
        // Sometimes add a related "previous step" entry to show progression
        if rng.next_f64() > 0.6 {
            if let Some(prev_entry) = journey_previous_step_log(rng, journey) {
                log.push(prev_entry);
            }
        }
    }
    
    // Add batch operation entries
    let batch_count = 10 + rng.next_range(15) as usize;
    for i in 0..batch_count {
        let batch_templates = &[
            ("batch", format!("Batch verified {} patients for tomorrow", 8 + rng.next_range(20))),
            ("batch", format!("Sent {} confirmation texts", 15 + rng.next_range(30))),
            ("batch", format!("Texted {} overdue patients", 5 + rng.next_range(25))),
            ("batch", format!("Synced {} records from PMS", 20 + rng.next_range(50))),
            ("batch", format!("Posted {} payments totaling ${}", 3 + rng.next_range(8), 2000 + rng.next_range(15000))),
            ("agent", "Completed: Schedule optimization".to_string()),
            ("agent", "Completed: Recall prioritization".to_string()),
            ("agent", "Completed: Claims review".to_string()),
        ];
        
        if let Some((entry_type, text)) = rng.pick(batch_templates) {
            log.push(SimLogEntry {
                minutes_ago: (i as i64 * 2) + rng.next_range(3) as i64,
                text: text.clone(),
                entry_type: entry_type.to_string(),
            });
        }
    }
    
    // Sort by most recent first and limit
    log.sort_by_key(|e| e.minutes_ago);
    log.truncate(60);
    
    log
}

/// Convert a journey to its current activity log entry
fn journey_to_log_entry(rng: &mut Rng, journey: &PatientJourney) -> Option<SimLogEntry> {
    let name = journey.full_name();
    let procedure = journey.procedure;
    let payer = journey.payer;
    let amount = journey.amount;
    
    let (entry_type, text, base_minutes) = match journey.stage {
        JourneyStage::NewCall => (
            "call",
            format!("{} called about {} - scored {}/10", name, procedure.to_lowercase(), 7 + rng.next_range(4)),
            5 + rng.next_range(30) as i64,
        ),
        JourneyStage::Booked => (
            "booking",
            format!("{} booked for {}", name, procedure.to_lowercase()),
            15 + rng.next_range(60) as i64,
        ),
        JourneyStage::Confirmed => (
            "confirmation",
            format!("{} confirmed tomorrow's {}", name, procedure.to_lowercase()),
            10 + rng.next_range(45) as i64,
        ),
        JourneyStage::Visited => (
            "visit",
            format!("{} checked out - {} complete", name, procedure),
            30 + rng.next_range(120) as i64,
        ),
        JourneyStage::TreatmentPlan => (
            "treatment",
            format!("Created treatment plan for {} - ${}", name, amount),
            20 + rng.next_range(90) as i64,
        ),
        JourneyStage::InsuranceCheck => (
            "eligibility",
            format!("Verified {} - {} active", name, payer),
            8 + rng.next_range(30) as i64,
        ),
        JourneyStage::ClaimFiled => (
            "claim",
            format!("Filed ${} claim for {} to {}", amount, name, payer),
            25 + rng.next_range(90) as i64,
        ),
        JourneyStage::ClaimPending => (
            "claim",
            format!("Drafted appeal for {}'s denied {}", name, procedure.to_lowercase()),
            45 + rng.next_range(180) as i64,
        ),
        JourneyStage::PaymentReceived => (
            "payment",
            format!("Posted {} ${} for {}", payer, amount - rng.next_range(200) as u32, name),
            12 + rng.next_range(60) as i64,
        ),
        JourneyStage::RecallDue => (
            "recall",
            format!("Added {} to recall queue - {} months overdue", name, 6 + rng.next_range(18)),
            60 + rng.next_range(240) as i64,
        ),
        JourneyStage::RecallContacted => (
            "recall",
            format!("Sent recall to {} - last visit {} months ago", name, 8 + rng.next_range(16)),
            30 + rng.next_range(120) as i64,
        ),
        JourneyStage::RecallResponded => (
            "recall",
            format!("{} responded to recall - wants to schedule", name),
            5 + rng.next_range(30) as i64,
        ),
        JourneyStage::RecallBooked => (
            "recall",
            format!("{} rescheduled after {} month gap", name, 8 + rng.next_range(14)),
            15 + rng.next_range(60) as i64,
        ),
        JourneyStage::ReviewReceived => (
            "review",
            format!("New {}-star review received", 1 + rng.next_range(5)),
            20 + rng.next_range(90) as i64,
        ),
        JourneyStage::ResponseDrafted => (
            "review",
            format!("Agent drafted response - ready for review"),
            10 + rng.next_range(45) as i64,
        ),
        JourneyStage::ResponsePosted => (
            "review",
            format!("Posted response to {}-star review", 3 + rng.next_range(3)),
            25 + rng.next_range(120) as i64,
        ),
    };
    
    Some(SimLogEntry {
        minutes_ago: base_minutes,
        text,
        entry_type: entry_type.to_string(),
    })
}

/// Generate a "previous step" log entry to show journey progression
fn journey_previous_step_log(rng: &mut Rng, journey: &PatientJourney) -> Option<SimLogEntry> {
    let name = journey.full_name();
    let procedure = journey.procedure;
    let payer = journey.payer;
    
    // Show what happened before the current stage
    let (entry_type, text, minutes_ago) = match journey.stage {
        JourneyStage::Booked => (
            "call",
            format!("{} called earlier about {}", name, procedure.to_lowercase()),
            120 + rng.next_range(240) as i64,
        ),
        JourneyStage::Confirmed => (
            "booking",
            format!("{} was booked yesterday", name),
            720 + rng.next_range(720) as i64,
        ),
        JourneyStage::Visited => (
            "confirmation",
            format!("{} confirmed this morning", name),
            180 + rng.next_range(300) as i64,
        ),
        JourneyStage::TreatmentPlan => (
            "visit",
            format!("{}'s {} completed", name, procedure),
            240 + rng.next_range(480) as i64,
        ),
        JourneyStage::ClaimFiled => (
            "eligibility",
            format!("{}'s {} coverage verified", name, payer),
            180 + rng.next_range(360) as i64,
        ),
        JourneyStage::PaymentReceived => (
            "claim",
            format!("{} claim was filed 2 weeks ago", name),
            10080 + rng.next_range(10080) as i64,
        ),
        JourneyStage::RecallBooked => (
            "recall",
            format!("{} responded to recall text", name),
            60 + rng.next_range(180) as i64,
        ),
        JourneyStage::ResponsePosted => (
            "review",
            format!("Agent drafted response earlier"),
            60 + rng.next_range(180) as i64,
        ),
        _ => return None,
    };
    
    Some(SimLogEntry {
        minutes_ago,
        text,
        entry_type: entry_type.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dental_scenario_generates() {
        let state = DentalScenario::generate(12345, 1705849200000);
        
        assert!(!state.items.is_empty());
        assert!(!state.activity_log.is_empty());
        assert!(state.metrics.appointments_total > 0);
    }

    #[test]
    fn test_time_affects_metrics() {
        // 9am
        let morning = DentalScenario::generate(12345, 1705831200000);
        // 5pm
        let evening = DentalScenario::generate(12345, 1705860000000);
        
        // Evening should have more appointments completed
        assert!(evening.metrics.appointments_completed >= morning.metrics.appointments_completed);
    }
}
