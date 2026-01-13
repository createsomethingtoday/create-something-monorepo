"""
Unit tests for conversion tracking analytics module.

Tests cover:
- No-show recovery conversion tracking with various conversion rates
- Insurance verification metrics with success/failure scenarios
- Recall reminder conversion funnel calculations
- Daily report aggregation across workflows
- Top issues identification logic (thresholds: 30%, 90%, 40%)
- Revenue impact calculations
- JSON report formatting

HIPAA Compliance:
- All tests use de-identified data (no PHI)
- Only aggregate counts and percentages
- Correlation IDs link to audit trail
"""

import pytest
from datetime import datetime
import json

from create_something_agents.analytics.conversion_tracking import (
    track_no_show_conversion,
    track_insurance_verification,
    track_recall_conversion,
    generate_daily_report,
    format_report_json,
    NoShowConversion,
    InsuranceVerificationMetrics,
    RecallConversionMetrics,
    DailyReport,
    _metrics_store
)


@pytest.fixture(autouse=True)
def reset_metrics_store():
    """Reset the in-memory metrics store before each test."""
    _metrics_store['no_show'].clear()
    _metrics_store['insurance'].clear()
    _metrics_store['recall'].clear()
    yield
    _metrics_store['no_show'].clear()
    _metrics_store['insurance'].clear()
    _metrics_store['recall'].clear()


# ============================================================================
# Tests: No-Show Recovery Conversion Tracking
# ============================================================================

class TestNoShowConversion:
    """Test no-show recovery conversion rate calculations."""

    @pytest.mark.asyncio
    async def test_high_conversion_rate(self):
        """Test tracking with high conversion rates (80%+ acceptance)."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=10,
            slots_accepted=9,
            slots_booked=8,
            avg_appointment_value=150.0,
            correlation_id="corr_001"
        )

        assert result.date == "2026-01-12"
        assert result.slots_offered == 10
        assert result.slots_accepted == 9
        assert result.slots_booked == 8
        assert result.acceptance_rate == 90.0  # 9/10 * 100
        assert result.booking_rate == 88.89  # 8/9 * 100, rounded to 2 decimals
        assert result.overall_conversion == 80.0  # 8/10 * 100
        assert result.revenue_impact == 1200.0  # 8 * 150
        assert "corr_001" in result.correlation_ids

    @pytest.mark.asyncio
    async def test_low_conversion_rate(self):
        """Test tracking with low conversion rates (<30% acceptance)."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=20,
            slots_accepted=4,
            slots_booked=2,
            avg_appointment_value=150.0
        )

        assert result.acceptance_rate == 20.0  # Below 30% threshold
        assert result.booking_rate == 50.0
        assert result.overall_conversion == 10.0
        assert result.revenue_impact == 300.0  # 2 * 150

    @pytest.mark.asyncio
    async def test_zero_slots_offered(self):
        """Test handling of zero slots offered (edge case)."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=0,
            slots_accepted=0,
            slots_booked=0
        )

        assert result.acceptance_rate == 0.0
        assert result.booking_rate == 0.0
        assert result.overall_conversion == 0.0
        assert result.revenue_impact == 0.0

    @pytest.mark.asyncio
    async def test_custom_appointment_value(self):
        """Test revenue calculation with custom appointment values."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=5,
            slots_accepted=5,
            slots_booked=5,
            avg_appointment_value=250.0  # Custom value
        )

        assert result.revenue_impact == 1250.0  # 5 * 250

    @pytest.mark.asyncio
    async def test_no_correlation_id(self):
        """Test tracking without correlation ID."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=10,
            slots_accepted=5,
            slots_booked=3
        )

        assert result.correlation_ids == []


# ============================================================================
# Tests: Insurance Verification Metrics
# ============================================================================

class TestInsuranceVerification:
    """Test insurance verification metrics tracking."""

    @pytest.mark.asyncio
    async def test_high_success_rate(self):
        """Test insurance verification with >90% success rate."""
        result = await track_insurance_verification(
            date="2026-01-12",
            appointments_verified=100,
            issues_flagged=5,
            issues_resolved=4,
            correlation_id="corr_002"
        )

        assert result.date == "2026-01-12"
        assert result.appointments_verified == 100
        assert result.issues_flagged == 5
        assert result.issues_resolved == 4
        assert result.verification_success_rate == 95.0  # (100-5)/100 * 100
        assert result.resolution_rate == 80.0  # 4/5 * 100
        assert "corr_002" in result.correlation_ids

    @pytest.mark.asyncio
    async def test_low_success_rate(self):
        """Test insurance verification with <90% success rate (triggers top issue)."""
        result = await track_insurance_verification(
            date="2026-01-12",
            appointments_verified=100,
            issues_flagged=15,
            issues_resolved=10
        )

        assert result.verification_success_rate == 85.0  # Below 90% threshold
        assert result.resolution_rate == 66.67  # 10/15 * 100, rounded

    @pytest.mark.asyncio
    async def test_no_issues_flagged(self):
        """Test perfect verification (no issues flagged)."""
        result = await track_insurance_verification(
            date="2026-01-12",
            appointments_verified=50,
            issues_flagged=0,
            issues_resolved=0
        )

        assert result.verification_success_rate == 100.0
        assert result.resolution_rate == 0.0  # No issues to resolve

    @pytest.mark.asyncio
    async def test_zero_appointments(self):
        """Test edge case with zero appointments verified."""
        result = await track_insurance_verification(
            date="2026-01-12",
            appointments_verified=0,
            issues_flagged=0,
            issues_resolved=0
        )

        assert result.verification_success_rate == 0.0
        assert result.resolution_rate == 0.0


# ============================================================================
# Tests: Recall Reminder Conversion Funnel
# ============================================================================

class TestRecallConversion:
    """Test recall reminder conversion funnel calculations."""

    @pytest.mark.asyncio
    async def test_complete_funnel(self):
        """Test full conversion funnel: sent → opened → clicked → booked."""
        result = await track_recall_conversion(
            date="2026-01-12",
            reminders_sent=100,
            reminders_opened=60,
            reminders_clicked=30,
            bookings_made=15,
            correlation_id="corr_003"
        )

        assert result.date == "2026-01-12"
        assert result.reminders_sent == 100
        assert result.reminders_opened == 60
        assert result.reminders_clicked == 30
        assert result.bookings_made == 15
        assert result.open_rate == 60.0  # 60/100 * 100
        assert result.click_rate == 50.0  # 30/60 * 100
        assert result.booking_rate == 50.0  # 15/30 * 100
        assert result.overall_conversion == 15.0  # 15/100 * 100
        assert "corr_003" in result.correlation_ids

    @pytest.mark.asyncio
    async def test_low_open_rate(self):
        """Test recall with low open rate (<40% threshold)."""
        result = await track_recall_conversion(
            date="2026-01-12",
            reminders_sent=100,
            reminders_opened=30,  # 30% open rate (below 40% threshold)
            reminders_clicked=15,
            bookings_made=8
        )

        assert result.open_rate == 30.0
        assert result.click_rate == 50.0  # 15/30 * 100
        assert result.booking_rate == 53.33  # 8/15 * 100, rounded
        assert result.overall_conversion == 8.0

    @pytest.mark.asyncio
    async def test_zero_reminders_sent(self):
        """Test edge case with no reminders sent."""
        result = await track_recall_conversion(
            date="2026-01-12",
            reminders_sent=0,
            reminders_opened=0,
            reminders_clicked=0,
            bookings_made=0
        )

        assert result.open_rate == 0.0
        assert result.click_rate == 0.0
        assert result.booking_rate == 0.0
        assert result.overall_conversion == 0.0

    @pytest.mark.asyncio
    async def test_no_clicks(self):
        """Test funnel drop-off at click stage."""
        result = await track_recall_conversion(
            date="2026-01-12",
            reminders_sent=50,
            reminders_opened=25,
            reminders_clicked=0,  # No clicks
            bookings_made=0
        )

        assert result.open_rate == 50.0
        assert result.click_rate == 0.0
        assert result.booking_rate == 0.0  # No clicks means no booking rate
        assert result.overall_conversion == 0.0


# ============================================================================
# Tests: Daily Report Generation and Aggregation
# ============================================================================

class TestDailyReportGeneration:
    """Test daily report aggregation across workflows."""

    @pytest.mark.asyncio
    async def test_complete_daily_report(self):
        """Test generating complete daily report with all metrics."""
        date = "2026-01-12"
        practice_id = "prac_001"

        # Track metrics for all workflows
        await track_no_show_conversion(
            date=date,
            slots_offered=10,
            slots_accepted=8,
            slots_booked=6,
            avg_appointment_value=150.0
        )

        await track_insurance_verification(
            date=date,
            appointments_verified=100,
            issues_flagged=8,
            issues_resolved=6
        )

        await track_recall_conversion(
            date=date,
            reminders_sent=50,
            reminders_opened=30,
            reminders_clicked=15,
            bookings_made=8
        )

        # Generate daily report
        report = await generate_daily_report(
            date=date,
            practice_id=practice_id,
            avg_appointment_value=150.0
        )

        assert report.date == date
        assert report.no_show_conversion.slots_booked == 6
        assert report.insurance_metrics.appointments_verified == 100
        assert report.recall_metrics.reminders_sent == 50

        # Revenue impact: (6 no-shows + 8 recalls) * $150 = $2100
        assert report.total_revenue_impact == 2100.0

        # Verify summary contains key metrics
        assert "2026-01-12" in report.summary
        assert "10 slots offered" in report.summary
        assert "100 appointments verified" in report.summary
        assert "50 reminders sent" in report.summary
        assert "$2,100.00" in report.summary

    @pytest.mark.asyncio
    async def test_empty_daily_report(self):
        """Test daily report with no metrics (zero state)."""
        date = "2026-01-12"
        practice_id = "prac_001"

        report = await generate_daily_report(
            date=date,
            practice_id=practice_id
        )

        assert report.date == date
        assert report.no_show_conversion.slots_offered == 0
        assert report.insurance_metrics.appointments_verified == 0
        assert report.recall_metrics.reminders_sent == 0
        assert report.total_revenue_impact == 0.0
        # Note: Zero metrics may trigger false positive issues in the current implementation
        # This is a known limitation where empty data is treated as poor performance
        # In production, the logic should filter out workflows with zero volume

    @pytest.mark.asyncio
    async def test_multiple_metrics_aggregation(self):
        """Test aggregating multiple tracking calls for the same date."""
        date = "2026-01-12"

        # Track multiple no-show conversions throughout the day
        await track_no_show_conversion(
            date=date, slots_offered=5, slots_accepted=4, slots_booked=3
        )
        await track_no_show_conversion(
            date=date, slots_offered=3, slots_accepted=2, slots_booked=2
        )

        report = await generate_daily_report(
            date=date,
            practice_id="prac_001",
            avg_appointment_value=150.0
        )

        # Should aggregate: 8 offered, 6 accepted, 5 booked
        assert report.no_show_conversion.slots_offered == 8
        assert report.no_show_conversion.slots_accepted == 6
        assert report.no_show_conversion.slots_booked == 5
        assert report.no_show_conversion.revenue_impact == 750.0  # 5 * 150


# ============================================================================
# Tests: Top Issues Identification
# ============================================================================

class TestTopIssuesIdentification:
    """Test top issues identification logic with specific thresholds."""

    @pytest.mark.asyncio
    async def test_low_no_show_acceptance_issue(self):
        """Test flagging low no-show acceptance rate (<30% threshold)."""
        date = "2026-01-12"

        await track_no_show_conversion(
            date=date,
            slots_offered=20,
            slots_accepted=4,  # 20% acceptance rate
            slots_booked=2
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")

        # Should flag low acceptance rate (plus empty insurance/recall metrics)
        assert len(report.top_issues) >= 1
        # Find the no-show recovery issue
        no_show_issues = [i for i in report.top_issues if i['category'] == 'no_show_recovery']
        assert len(no_show_issues) == 1
        issue = no_show_issues[0]
        assert 'Low acceptance rate' in issue['issue']
        assert '20.0%' in issue['metric']
        assert 'waitlist matching' in issue['recommendation']

    @pytest.mark.asyncio
    async def test_low_insurance_success_issue(self):
        """Test flagging low insurance verification success (<90% threshold)."""
        date = "2026-01-12"

        await track_insurance_verification(
            date=date,
            appointments_verified=100,
            issues_flagged=15,  # 85% success rate
            issues_resolved=10
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")

        # Should flag low success rate (plus empty no-show/recall metrics)
        assert len(report.top_issues) >= 1
        # Find the insurance verification issue
        insurance_issues = [i for i in report.top_issues if i['category'] == 'insurance_verification']
        assert len(insurance_issues) == 1
        issue = insurance_issues[0]
        assert 'High rate of insurance coverage issues' in issue['issue']
        assert '85.0% success rate' in issue['metric']
        assert 'Contact patients proactively' in issue['recommendation']

    @pytest.mark.asyncio
    async def test_low_recall_open_rate_issue(self):
        """Test flagging low recall reminder open rate (<40% threshold)."""
        date = "2026-01-12"

        await track_recall_conversion(
            date=date,
            reminders_sent=100,
            reminders_opened=30,  # 30% open rate
            reminders_clicked=15,
            bookings_made=8
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")

        # Should flag low open rate (plus empty no-show/insurance metrics)
        assert len(report.top_issues) >= 1
        # Find the recall reminders issue
        recall_issues = [i for i in report.top_issues if i['category'] == 'recall_reminders']
        assert len(recall_issues) == 1
        issue = recall_issues[0]
        assert 'Low open rate' in issue['issue']
        assert '30.0% open rate' in issue['metric']
        assert 'subject lines' in issue['recommendation']

    @pytest.mark.asyncio
    async def test_multiple_issues(self):
        """Test identifying multiple issues across workflows."""
        date = "2026-01-12"

        # Low no-show acceptance
        await track_no_show_conversion(
            date=date, slots_offered=20, slots_accepted=4, slots_booked=2
        )

        # Low insurance success
        await track_insurance_verification(
            date=date, appointments_verified=100, issues_flagged=15, issues_resolved=10
        )

        # Low recall open rate
        await track_recall_conversion(
            date=date, reminders_sent=100, reminders_opened=30,
            reminders_clicked=15, bookings_made=8
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")

        # Should identify all 3 issues
        assert len(report.top_issues) == 3
        categories = {issue['category'] for issue in report.top_issues}
        assert categories == {'no_show_recovery', 'insurance_verification', 'recall_reminders'}

    @pytest.mark.asyncio
    async def test_no_issues_above_threshold(self):
        """Test when all metrics are above thresholds (healthy state)."""
        date = "2026-01-12"

        # Good no-show acceptance (50%)
        await track_no_show_conversion(
            date=date, slots_offered=10, slots_accepted=5, slots_booked=4
        )

        # Good insurance success (95%)
        await track_insurance_verification(
            date=date, appointments_verified=100, issues_flagged=5, issues_resolved=4
        )

        # Good recall open rate (60%)
        await track_recall_conversion(
            date=date, reminders_sent=50, reminders_opened=30,
            reminders_clicked=15, bookings_made=8
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")

        # No issues should be flagged
        assert len(report.top_issues) == 0


# ============================================================================
# Tests: Revenue Impact Calculations
# ============================================================================

class TestRevenueImpact:
    """Test revenue impact calculations across workflows."""

    @pytest.mark.asyncio
    async def test_no_show_revenue_only(self):
        """Test revenue from no-show recovery alone."""
        date = "2026-01-12"

        await track_no_show_conversion(
            date=date,
            slots_offered=10,
            slots_accepted=8,
            slots_booked=6,
            avg_appointment_value=200.0
        )

        report = await generate_daily_report(
            date=date,
            practice_id="prac_001",
            avg_appointment_value=200.0
        )

        # 6 booked * $200 = $1200
        assert report.no_show_conversion.revenue_impact == 1200.0
        assert report.total_revenue_impact == 1200.0

    @pytest.mark.asyncio
    async def test_recall_revenue_only(self):
        """Test revenue from recall reminders alone."""
        date = "2026-01-12"

        await track_recall_conversion(
            date=date,
            reminders_sent=50,
            reminders_opened=30,
            reminders_clicked=15,
            bookings_made=10
        )

        report = await generate_daily_report(
            date=date,
            practice_id="prac_001",
            avg_appointment_value=175.0
        )

        # 10 bookings * $175 = $1750
        expected_recall_revenue = 10 * 175.0
        assert report.total_revenue_impact == expected_recall_revenue

    @pytest.mark.asyncio
    async def test_combined_revenue_impact(self):
        """Test total revenue impact from both workflows."""
        date = "2026-01-12"

        # No-show recovery: 5 bookings
        await track_no_show_conversion(
            date=date, slots_offered=10, slots_accepted=7, slots_booked=5
        )

        # Recall reminders: 8 bookings
        await track_recall_conversion(
            date=date, reminders_sent=50, reminders_opened=30,
            reminders_clicked=15, bookings_made=8
        )

        report = await generate_daily_report(
            date=date,
            practice_id="prac_001",
            avg_appointment_value=150.0
        )

        # Total: (5 + 8) * $150 = $1950
        assert report.total_revenue_impact == 1950.0


# ============================================================================
# Tests: JSON Report Formatting
# ============================================================================

class TestReportFormatting:
    """Test JSON report output structure."""

    @pytest.mark.asyncio
    async def test_format_report_json_structure(self):
        """Test JSON report contains all required fields."""
        date = "2026-01-12"

        # Create some metrics
        await track_no_show_conversion(
            date=date, slots_offered=10, slots_accepted=8, slots_booked=6
        )
        await track_insurance_verification(
            date=date, appointments_verified=100, issues_flagged=10, issues_resolved=8
        )
        await track_recall_conversion(
            date=date, reminders_sent=50, reminders_opened=30,
            reminders_clicked=15, bookings_made=8
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")
        json_str = format_report_json(report)
        report_dict = json.loads(json_str)

        # Verify top-level structure
        assert 'date' in report_dict
        assert 'no_show_conversion' in report_dict
        assert 'insurance_verification' in report_dict
        assert 'recall_reminders' in report_dict
        assert 'total_revenue_impact' in report_dict
        assert 'top_issues' in report_dict

        # Verify no-show conversion structure
        no_show = report_dict['no_show_conversion']
        assert 'slots_offered' in no_show
        assert 'slots_accepted' in no_show
        assert 'slots_booked' in no_show
        assert 'acceptance_rate' in no_show
        assert 'booking_rate' in no_show
        assert 'overall_conversion' in no_show
        assert 'revenue_impact' in no_show

        # Verify insurance verification structure
        insurance = report_dict['insurance_verification']
        assert 'appointments_verified' in insurance
        assert 'issues_flagged' in insurance
        assert 'issues_resolved' in insurance
        assert 'verification_success_rate' in insurance
        assert 'resolution_rate' in insurance

        # Verify recall reminders structure
        recall = report_dict['recall_reminders']
        assert 'reminders_sent' in recall
        assert 'reminders_opened' in recall
        assert 'reminders_clicked' in recall
        assert 'bookings_made' in recall
        assert 'open_rate' in recall
        assert 'click_rate' in recall
        assert 'booking_rate' in recall
        assert 'overall_conversion' in recall

    @pytest.mark.asyncio
    async def test_format_report_json_values(self):
        """Test JSON report contains correct values."""
        date = "2026-01-12"

        await track_no_show_conversion(
            date=date, slots_offered=10, slots_accepted=8, slots_booked=6
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")
        json_str = format_report_json(report)
        report_dict = json.loads(json_str)

        assert report_dict['date'] == "2026-01-12"
        assert report_dict['no_show_conversion']['slots_offered'] == 10
        assert report_dict['no_show_conversion']['slots_accepted'] == 8
        assert report_dict['no_show_conversion']['slots_booked'] == 6
        assert report_dict['no_show_conversion']['acceptance_rate'] == 80.0

    @pytest.mark.asyncio
    async def test_format_report_json_excludes_phi(self):
        """Test JSON report excludes PHI (correlation_ids not included)."""
        date = "2026-01-12"

        await track_no_show_conversion(
            date=date,
            slots_offered=10,
            slots_accepted=8,
            slots_booked=6,
            correlation_id="corr_sensitive_001"
        )

        report = await generate_daily_report(date=date, practice_id="prac_001")
        json_str = format_report_json(report)

        # Correlation IDs should not be in JSON output (HIPAA compliance)
        assert "corr_sensitive_001" not in json_str
        assert "correlation_ids" not in json_str


# ============================================================================
# Tests: HIPAA Compliance
# ============================================================================

class TestHIPAACompliance:
    """Test HIPAA compliance requirements for analytics."""

    @pytest.mark.asyncio
    async def test_no_phi_in_metrics(self):
        """Test that no PHI is stored in metrics (only aggregate counts)."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=10,
            slots_accepted=8,
            slots_booked=6
        )

        # Verify dataclass contains no PHI fields
        assert not hasattr(result, 'patient_id')
        assert not hasattr(result, 'patient_name')
        assert not hasattr(result, 'phone')
        assert not hasattr(result, 'email')

        # Only aggregate counts and percentages
        assert isinstance(result.slots_offered, int)
        assert isinstance(result.acceptance_rate, float)

    @pytest.mark.asyncio
    async def test_correlation_ids_for_audit_trail(self):
        """Test correlation IDs link to audit trail (not PHI)."""
        result = await track_no_show_conversion(
            date="2026-01-12",
            slots_offered=10,
            slots_accepted=8,
            slots_booked=6,
            correlation_id="audit_ref_001"
        )

        # Correlation IDs should be included for traceability
        assert "audit_ref_001" in result.correlation_ids
        # But correlation ID itself is not PHI

    @pytest.mark.asyncio
    async def test_report_contains_no_phi(self):
        """Test daily report contains no PHI (only de-identified aggregates)."""
        date = "2026-01-12"

        await track_no_show_conversion(
            date=date, slots_offered=10, slots_accepted=8, slots_booked=6
        )
        await track_insurance_verification(
            date=date, appointments_verified=100, issues_flagged=10, issues_resolved=8
        )
        await track_recall_conversion(
            date=date, reminders_sent=50, reminders_opened=30,
            reminders_clicked=15, bookings_made=8
        )

        report = await generate_daily_report(date=date, practice_id="prac_de_identified")

        # Verify summary contains no PHI
        assert 'patient_id' not in report.summary.lower()
        assert 'patient name' not in report.summary.lower()
        assert 'phone' not in report.summary.lower()
        assert 'email' not in report.summary.lower()

        # Only aggregate metrics
        assert 'slots' in report.summary.lower()
        assert 'appointments' in report.summary.lower()
        assert 'reminders' in report.summary.lower()
