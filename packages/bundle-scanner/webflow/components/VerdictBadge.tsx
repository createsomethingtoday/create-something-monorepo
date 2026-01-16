/**
 * Verdict Badge Component
 * Displays scan verdict with appropriate styling
 */

import React from 'react';
import type { Verdict } from '../types';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

const verdictConfig: Record<Verdict, { label: string; bgClass: string; textClass: string; icon: string }> = {
  PASS: {
    label: 'PASS',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    icon: '✓'
  },
  ACTION_REQUIRED: {
    label: 'ACTION REQUIRED',
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    icon: '⚠'
  },
  REJECTED: {
    label: 'REJECTED',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    icon: '✕'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export function VerdictBadge({ verdict, size = 'md' }: VerdictBadgeProps) {
  const config = verdictConfig[verdict];
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${config.bgClass} ${config.textClass} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export default VerdictBadge;
