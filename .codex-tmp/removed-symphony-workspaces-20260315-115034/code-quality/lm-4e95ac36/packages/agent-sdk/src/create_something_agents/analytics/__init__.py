"""
Dental Practice Analytics Module

This module provides conversion tracking and reporting for dental practice workflows.
"""

from .conversion_tracking import (
    NoShowConversion,
    InsuranceVerificationMetrics,
    RecallConversionMetrics,
    DailyReport,
    track_no_show_conversion,
    track_insurance_verification,
    track_recall_conversion,
    generate_daily_report,
    format_report_json
)

__all__ = [
    'NoShowConversion',
    'InsuranceVerificationMetrics',
    'RecallConversionMetrics',
    'DailyReport',
    'track_no_show_conversion',
    'track_insurance_verification',
    'track_recall_conversion',
    'generate_daily_report',
    'format_report_json'
]
