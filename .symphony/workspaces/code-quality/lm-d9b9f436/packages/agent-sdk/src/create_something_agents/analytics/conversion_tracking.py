"""
Conversion Rate Tracking and Analytics Module

This module tracks conversion rates for the three core dental practice workflows:
1. No-show recovery (slots offered → accepted → booked)
2. Insurance verification (verified → issues flagged → issues resolved)
3. Recall reminders (reminders sent → responses → bookings)

HIPAA Compliance:
- No PHI stored in metrics (only counts and percentages)
- All metrics use de-identified patient_id references
- Audit trail references included (correlation_id) for traceability
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json


@dataclass
class NoShowConversion:
    """No-show recovery conversion metrics"""
    date: str
    slots_offered: int
    slots_accepted: int
    slots_booked: int
    acceptance_rate: float  # accepted / offered
    booking_rate: float     # booked / accepted
    overall_conversion: float  # booked / offered
    revenue_impact: float   # estimated revenue from recovered slots
    correlation_ids: List[str]


@dataclass
class InsuranceVerificationMetrics:
    """Insurance verification metrics"""
    date: str
    appointments_verified: int
    issues_flagged: int
    issues_resolved: int
    verification_success_rate: float  # verified without issues / total
    resolution_rate: float            # resolved / flagged
    correlation_ids: List[str]


@dataclass
class RecallConversionMetrics:
    """Recall reminder conversion metrics"""
    date: str
    reminders_sent: int
    reminders_opened: int
    reminders_clicked: int
    bookings_made: int
    open_rate: float    # opened / sent
    click_rate: float   # clicked / opened
    booking_rate: float # booked / clicked
    overall_conversion: float  # booked / sent
    correlation_ids: List[str]


@dataclass
class DailyReport:
    """Complete daily analytics report"""
    date: str
    no_show_conversion: NoShowConversion
    insurance_metrics: InsuranceVerificationMetrics
    recall_metrics: RecallConversionMetrics
    total_revenue_impact: float
    top_issues: List[Dict[str, any]]
    summary: str


# In-memory storage (production would use D1 database)
_metrics_store: Dict[str, Dict] = {
    'no_show': {},
    'insurance': {},
    'recall': {}
}


async def track_no_show_conversion(
    date: str,
    slots_offered: int,
    slots_accepted: int,
    slots_booked: int,
    avg_appointment_value: float = 150.0,
    correlation_id: Optional[str] = None
) -> NoShowConversion:
    """
    Track no-show recovery conversion metrics for a given date.

    Args:
        date: Date in YYYY-MM-DD format
        slots_offered: Number of no-show slots offered to waitlist patients
        slots_accepted: Number of slots accepted by patients
        slots_booked: Number of slots successfully booked
        avg_appointment_value: Average revenue per appointment (default $150)
        correlation_id: Optional correlation ID for audit trail

    Returns:
        NoShowConversion object with calculated metrics

    HIPAA Compliance:
        - No PHI stored (only aggregate counts)
        - Correlation_id links to audit trail for details
    """
    # Calculate conversion rates
    acceptance_rate = (slots_accepted / slots_offered * 100) if slots_offered > 0 else 0.0
    booking_rate = (slots_booked / slots_accepted * 100) if slots_accepted > 0 else 0.0
    overall_conversion = (slots_booked / slots_offered * 100) if slots_offered > 0 else 0.0
    revenue_impact = slots_booked * avg_appointment_value

    # Create conversion object
    conversion = NoShowConversion(
        date=date,
        slots_offered=slots_offered,
        slots_accepted=slots_accepted,
        slots_booked=slots_booked,
        acceptance_rate=round(acceptance_rate, 2),
        booking_rate=round(booking_rate, 2),
        overall_conversion=round(overall_conversion, 2),
        revenue_impact=round(revenue_impact, 2),
        correlation_ids=[correlation_id] if correlation_id else []
    )

    # Store metrics (production would use D1 database)
    if date not in _metrics_store['no_show']:
        _metrics_store['no_show'][date] = []
    _metrics_store['no_show'][date].append(conversion)

    return conversion


async def track_insurance_verification(
    date: str,
    appointments_verified: int,
    issues_flagged: int,
    issues_resolved: int,
    correlation_id: Optional[str] = None
) -> InsuranceVerificationMetrics:
    """
    Track insurance verification metrics for a given date.

    Args:
        date: Date in YYYY-MM-DD format
        appointments_verified: Total appointments verified
        issues_flagged: Number of appointments with coverage issues
        issues_resolved: Number of flagged issues resolved before appointment
        correlation_id: Optional correlation ID for audit trail

    Returns:
        InsuranceVerificationMetrics object with calculated rates

    HIPAA Compliance:
        - No PHI stored (only aggregate counts)
        - Correlation_id links to audit trail for details
    """
    # Calculate success and resolution rates
    verification_success_rate = (
        (appointments_verified - issues_flagged) / appointments_verified * 100
        if appointments_verified > 0 else 0.0
    )
    resolution_rate = (
        issues_resolved / issues_flagged * 100
        if issues_flagged > 0 else 0.0
    )

    # Create metrics object
    metrics = InsuranceVerificationMetrics(
        date=date,
        appointments_verified=appointments_verified,
        issues_flagged=issues_flagged,
        issues_resolved=issues_resolved,
        verification_success_rate=round(verification_success_rate, 2),
        resolution_rate=round(resolution_rate, 2),
        correlation_ids=[correlation_id] if correlation_id else []
    )

    # Store metrics (production would use D1 database)
    if date not in _metrics_store['insurance']:
        _metrics_store['insurance'][date] = []
    _metrics_store['insurance'][date].append(metrics)

    return metrics


async def track_recall_conversion(
    date: str,
    reminders_sent: int,
    reminders_opened: int,
    reminders_clicked: int,
    bookings_made: int,
    correlation_id: Optional[str] = None
) -> RecallConversionMetrics:
    """
    Track recall reminder conversion metrics for a given date.

    Args:
        date: Date in YYYY-MM-DD format
        reminders_sent: Number of recall reminders sent
        reminders_opened: Number of reminders opened by patients
        reminders_clicked: Number of booking links clicked
        bookings_made: Number of appointments booked from reminders
        correlation_id: Optional correlation ID for audit trail

    Returns:
        RecallConversionMetrics object with calculated conversion rates

    HIPAA Compliance:
        - No PHI stored (only aggregate counts)
        - Correlation_id links to audit trail for details
    """
    # Calculate conversion rates
    open_rate = (reminders_opened / reminders_sent * 100) if reminders_sent > 0 else 0.0
    click_rate = (reminders_clicked / reminders_opened * 100) if reminders_opened > 0 else 0.0
    booking_rate = (bookings_made / reminders_clicked * 100) if reminders_clicked > 0 else 0.0
    overall_conversion = (bookings_made / reminders_sent * 100) if reminders_sent > 0 else 0.0

    # Create metrics object
    metrics = RecallConversionMetrics(
        date=date,
        reminders_sent=reminders_sent,
        reminders_opened=reminders_opened,
        reminders_clicked=reminders_clicked,
        bookings_made=bookings_made,
        open_rate=round(open_rate, 2),
        click_rate=round(click_rate, 2),
        booking_rate=round(booking_rate, 2),
        overall_conversion=round(overall_conversion, 2),
        correlation_ids=[correlation_id] if correlation_id else []
    )

    # Store metrics (production would use D1 database)
    if date not in _metrics_store['recall']:
        _metrics_store['recall'][date] = []
    _metrics_store['recall'][date].append(metrics)

    return metrics


async def generate_daily_report(
    date: str,
    practice_id: str,
    avg_appointment_value: float = 150.0
) -> DailyReport:
    """
    Generate comprehensive daily analytics report for all workflows.

    Args:
        date: Date in YYYY-MM-DD format
        practice_id: Practice identifier
        avg_appointment_value: Average revenue per appointment (default $150)

    Returns:
        DailyReport object with all metrics and summary

    HIPAA Compliance:
        - No PHI in report (only aggregate metrics)
        - Practice_id is de-identified reference

    Report includes:
        - No-show recovery conversion percentages
        - Insurance verification success rates
        - Recall reminder conversion funnel
        - Total revenue impact estimate
        - Top issues requiring attention

    Production Note:
        - This would query D1 database for historical metrics
        - Current implementation uses in-memory store
    """
    # Aggregate metrics for the date
    no_show_data = _metrics_store['no_show'].get(date, [])
    insurance_data = _metrics_store['insurance'].get(date, [])
    recall_data = _metrics_store['recall'].get(date, [])

    # Aggregate no-show metrics
    if no_show_data:
        no_show_agg = {
            'slots_offered': sum(m.slots_offered for m in no_show_data),
            'slots_accepted': sum(m.slots_accepted for m in no_show_data),
            'slots_booked': sum(m.slots_booked for m in no_show_data),
        }
        no_show_conversion = NoShowConversion(
            date=date,
            slots_offered=no_show_agg['slots_offered'],
            slots_accepted=no_show_agg['slots_accepted'],
            slots_booked=no_show_agg['slots_booked'],
            acceptance_rate=round(
                (no_show_agg['slots_accepted'] / no_show_agg['slots_offered'] * 100)
                if no_show_agg['slots_offered'] > 0 else 0.0, 2
            ),
            booking_rate=round(
                (no_show_agg['slots_booked'] / no_show_agg['slots_accepted'] * 100)
                if no_show_agg['slots_accepted'] > 0 else 0.0, 2
            ),
            overall_conversion=round(
                (no_show_agg['slots_booked'] / no_show_agg['slots_offered'] * 100)
                if no_show_agg['slots_offered'] > 0 else 0.0, 2
            ),
            revenue_impact=round(no_show_agg['slots_booked'] * avg_appointment_value, 2),
            correlation_ids=[]
        )
    else:
        no_show_conversion = NoShowConversion(
            date=date, slots_offered=0, slots_accepted=0, slots_booked=0,
            acceptance_rate=0.0, booking_rate=0.0, overall_conversion=0.0,
            revenue_impact=0.0, correlation_ids=[]
        )

    # Aggregate insurance metrics
    if insurance_data:
        insurance_agg = {
            'appointments_verified': sum(m.appointments_verified for m in insurance_data),
            'issues_flagged': sum(m.issues_flagged for m in insurance_data),
            'issues_resolved': sum(m.issues_resolved for m in insurance_data),
        }
        insurance_metrics = InsuranceVerificationMetrics(
            date=date,
            appointments_verified=insurance_agg['appointments_verified'],
            issues_flagged=insurance_agg['issues_flagged'],
            issues_resolved=insurance_agg['issues_resolved'],
            verification_success_rate=round(
                ((insurance_agg['appointments_verified'] - insurance_agg['issues_flagged'])
                 / insurance_agg['appointments_verified'] * 100)
                if insurance_agg['appointments_verified'] > 0 else 0.0, 2
            ),
            resolution_rate=round(
                (insurance_agg['issues_resolved'] / insurance_agg['issues_flagged'] * 100)
                if insurance_agg['issues_flagged'] > 0 else 0.0, 2
            ),
            correlation_ids=[]
        )
    else:
        insurance_metrics = InsuranceVerificationMetrics(
            date=date, appointments_verified=0, issues_flagged=0, issues_resolved=0,
            verification_success_rate=0.0, resolution_rate=0.0, correlation_ids=[]
        )

    # Aggregate recall metrics
    if recall_data:
        recall_agg = {
            'reminders_sent': sum(m.reminders_sent for m in recall_data),
            'reminders_opened': sum(m.reminders_opened for m in recall_data),
            'reminders_clicked': sum(m.reminders_clicked for m in recall_data),
            'bookings_made': sum(m.bookings_made for m in recall_data),
        }
        recall_metrics = RecallConversionMetrics(
            date=date,
            reminders_sent=recall_agg['reminders_sent'],
            reminders_opened=recall_agg['reminders_opened'],
            reminders_clicked=recall_agg['reminders_clicked'],
            bookings_made=recall_agg['bookings_made'],
            open_rate=round(
                (recall_agg['reminders_opened'] / recall_agg['reminders_sent'] * 100)
                if recall_agg['reminders_sent'] > 0 else 0.0, 2
            ),
            click_rate=round(
                (recall_agg['reminders_clicked'] / recall_agg['reminders_opened'] * 100)
                if recall_agg['reminders_opened'] > 0 else 0.0, 2
            ),
            booking_rate=round(
                (recall_agg['bookings_made'] / recall_agg['reminders_clicked'] * 100)
                if recall_agg['reminders_clicked'] > 0 else 0.0, 2
            ),
            overall_conversion=round(
                (recall_agg['bookings_made'] / recall_agg['reminders_sent'] * 100)
                if recall_agg['reminders_sent'] > 0 else 0.0, 2
            ),
            correlation_ids=[]
        )
    else:
        recall_metrics = RecallConversionMetrics(
            date=date, reminders_sent=0, reminders_opened=0, reminders_clicked=0,
            bookings_made=0, open_rate=0.0, click_rate=0.0, booking_rate=0.0,
            overall_conversion=0.0, correlation_ids=[]
        )

    # Calculate total revenue impact
    recall_revenue = recall_metrics.bookings_made * avg_appointment_value
    total_revenue_impact = no_show_conversion.revenue_impact + recall_revenue

    # Identify top issues
    top_issues = []

    # No-show conversion issues
    if no_show_conversion.acceptance_rate < 30:
        top_issues.append({
            'category': 'no_show_recovery',
            'issue': 'Low acceptance rate for no-show slots',
            'metric': f'{no_show_conversion.acceptance_rate}%',
            'recommendation': 'Review waitlist matching criteria and notification timing'
        })

    # Insurance verification issues
    if insurance_metrics.verification_success_rate < 90:
        top_issues.append({
            'category': 'insurance_verification',
            'issue': 'High rate of insurance coverage issues',
            'metric': f'{insurance_metrics.verification_success_rate}% success rate',
            'recommendation': 'Contact patients proactively about coverage issues'
        })

    # Recall reminder issues
    if recall_metrics.open_rate < 40:
        top_issues.append({
            'category': 'recall_reminders',
            'issue': 'Low open rate for recall reminders',
            'metric': f'{recall_metrics.open_rate}% open rate',
            'recommendation': 'Test different subject lines and send times'
        })

    # Generate summary
    summary = f"""Daily Dental Practice Analytics for {date}

No-Show Recovery:
- {no_show_conversion.slots_offered} slots offered
- {no_show_conversion.slots_booked} slots booked ({no_show_conversion.overall_conversion}% conversion)
- Revenue recovered: ${no_show_conversion.revenue_impact:,.2f}

Insurance Verification:
- {insurance_metrics.appointments_verified} appointments verified
- {insurance_metrics.issues_flagged} coverage issues flagged
- {insurance_metrics.verification_success_rate}% verification success rate

Recall Reminders:
- {recall_metrics.reminders_sent} reminders sent
- {recall_metrics.bookings_made} appointments booked ({recall_metrics.overall_conversion}% conversion)
- Revenue generated: ${recall_revenue:,.2f}

Total Revenue Impact: ${total_revenue_impact:,.2f}
Top Issues: {len(top_issues)} items requiring attention
"""

    # Create daily report
    report = DailyReport(
        date=date,
        no_show_conversion=no_show_conversion,
        insurance_metrics=insurance_metrics,
        recall_metrics=recall_metrics,
        total_revenue_impact=round(total_revenue_impact, 2),
        top_issues=top_issues,
        summary=summary.strip()
    )

    return report


def format_report_json(report: DailyReport) -> str:
    """
    Format daily report as JSON for API consumption.

    Args:
        report: DailyReport object

    Returns:
        JSON string representation of the report
    """
    report_dict = {
        'date': report.date,
        'no_show_conversion': {
            'slots_offered': report.no_show_conversion.slots_offered,
            'slots_accepted': report.no_show_conversion.slots_accepted,
            'slots_booked': report.no_show_conversion.slots_booked,
            'acceptance_rate': report.no_show_conversion.acceptance_rate,
            'booking_rate': report.no_show_conversion.booking_rate,
            'overall_conversion': report.no_show_conversion.overall_conversion,
            'revenue_impact': report.no_show_conversion.revenue_impact
        },
        'insurance_verification': {
            'appointments_verified': report.insurance_metrics.appointments_verified,
            'issues_flagged': report.insurance_metrics.issues_flagged,
            'issues_resolved': report.insurance_metrics.issues_resolved,
            'verification_success_rate': report.insurance_metrics.verification_success_rate,
            'resolution_rate': report.insurance_metrics.resolution_rate
        },
        'recall_reminders': {
            'reminders_sent': report.recall_metrics.reminders_sent,
            'reminders_opened': report.recall_metrics.reminders_opened,
            'reminders_clicked': report.recall_metrics.reminders_clicked,
            'bookings_made': report.recall_metrics.bookings_made,
            'open_rate': report.recall_metrics.open_rate,
            'click_rate': report.recall_metrics.click_rate,
            'booking_rate': report.recall_metrics.booking_rate,
            'overall_conversion': report.recall_metrics.overall_conversion
        },
        'total_revenue_impact': report.total_revenue_impact,
        'top_issues': report.top_issues
    }

    return json.dumps(report_dict, indent=2)


# Production Note: D1 Database Schema
"""
CREATE TABLE conversion_metrics (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    practice_id TEXT NOT NULL,
    workflow_type TEXT NOT NULL,  -- 'no_show', 'insurance', 'recall'
    metrics TEXT NOT NULL,         -- JSON blob with workflow-specific metrics
    correlation_id TEXT,
    created_at INTEGER NOT NULL,

    INDEX idx_date_practice (date, practice_id),
    INDEX idx_workflow_type (workflow_type)
);

-- Store metrics with 2-year retention
-- Query with: SELECT * FROM conversion_metrics WHERE date = ? AND practice_id = ?
"""
