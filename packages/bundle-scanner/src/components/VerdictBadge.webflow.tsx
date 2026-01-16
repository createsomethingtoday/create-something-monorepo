import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { VerdictBadge } from './VerdictBadge';

/**
 * Webflow Code Component wrapper for VerdictBadge
 * 
 * Displays PASS/REVIEW/REJECTED status badges for scan results.
 * Use in the Designer to show scan verdicts visually.
 */
export default declareComponent(VerdictBadge, {
  name: 'Verdict Badge',
  description: 'Displays scan verdict status (PASS, REVIEW, or REJECTED) with appropriate styling',
  group: 'Bundle Scanner',
  props: {
    verdict: props.Variant({
      name: 'Verdict',
      options: ['PASS', 'ACTION_REQUIRED', 'REJECTED'],
      defaultValue: 'PASS',
      tooltip: 'The scan result verdict to display',
    }),
    size: props.Variant({
      name: 'Size',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
      tooltip: 'Badge size variant',
    }),
  },
});
