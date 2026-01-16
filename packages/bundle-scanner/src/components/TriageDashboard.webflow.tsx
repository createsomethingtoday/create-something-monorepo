import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import React from 'react';
import { TriageDashboard as TriageDashboardBase } from './TriageDashboard';
import type { ScanReport } from '@create-something/bundle-scanner-core';

/**
 * Simplified Triage Dashboard for Webflow Designer preview
 * 
 * In production, this receives a full ScanReport. In the Designer,
 * we show a preview with configurable counts.
 */
interface DesignerTriageDashboardProps {
  blockerCount: number;
  reviewCount: number;
  infoCount: number;
  showEmailButton: boolean;
}

const DesignerTriageDashboard: React.FC<DesignerTriageDashboardProps> = ({
  blockerCount,
  reviewCount,
  infoCount,
  showEmailButton = true,
}) => {
  // Create a mock report for designer preview
  const mockReport: ScanReport = {
    scanReportVersion: '1.1.0',
    runId: 'preview-mode',
    createdAt: new Date().toISOString(),
    policyMetadata: {
      rulesetVersion: '1.0.0',
      configVersion: '1.0.0',
    },
    verdict: blockerCount > 0 ? 'REJECTED' : reviewCount > 0 ? 'ACTION_REQUIRED' : 'PASS',
    verdictReasons: [],
    bundleSummary: {
      fileCount: 100,
      totalBytes: 1024 * 1024,
      scannedFileCount: 80,
      skippedFileCount: 20,
    },
    findings: {
      // Mock findings to match the counts
      ...(blockerCount > 0 ? {
        'MOCK-BLOCKER': {
          rule: {
            ruleId: 'MOCK-BLOCKER',
            name: 'Mock Blocker',
            category: 'SECURITY',
            reviewBucket: 'AUTO_REJECT',
            severity: 'BLOCKER',
            disposition: 'REJECTED',
            description: 'Preview blocker finding',
            matchers: [],
          },
          count: blockerCount,
          items: [],
        }
      } : {}),
      ...(reviewCount > 0 ? {
        'MOCK-REVIEW': {
          rule: {
            ruleId: 'MOCK-REVIEW',
            name: 'Mock Review Item',
            category: 'SECURITY',
            reviewBucket: 'ACTION_REQUIRED',
            severity: 'HIGH',
            disposition: 'ACTION_REQUIRED',
            description: 'Preview review finding',
            matchers: [],
          },
          count: reviewCount,
          items: [],
        }
      } : {}),
      ...(infoCount > 0 ? {
        'MOCK-INFO': {
          rule: {
            ruleId: 'MOCK-INFO',
            name: 'Mock Info',
            category: 'INFO',
            reviewBucket: 'INFO',
            severity: 'INFO',
            disposition: 'INFO',
            description: 'Preview info finding',
            matchers: [],
          },
          count: infoCount,
          items: [],
        }
      } : {}),
    },
  };

  return <TriageDashboardBase report={mockReport} />;
};

/**
 * Webflow Code Component wrapper for TriageDashboard
 * 
 * 60-second review summary showing blocker/review/info counts
 * with recommendation and email draft generation.
 */
export default declareComponent(DesignerTriageDashboard, {
  name: 'Triage Dashboard',
  description: '60-second review summary with Auto-Reject, Review Needed, and Informational counts',
  group: 'Bundle Scanner',
  props: {
    blockerCount: props.Number({
      name: 'Blocker Count',
      defaultValue: 0,
      tooltip: 'Number of auto-reject issues',
    }),
    reviewCount: props.Number({
      name: 'Review Count',
      defaultValue: 2,
      tooltip: 'Number of issues requiring manual review',
    }),
    infoCount: props.Number({
      name: 'Info Count',
      defaultValue: 5,
      tooltip: 'Number of informational findings',
    }),
    showEmailButton: props.Boolean({
      name: 'Show Email Button',
      defaultValue: true,
      tooltip: 'Display the rejection email draft button',
    }),
  },
});
