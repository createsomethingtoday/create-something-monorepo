import React from 'react';
import type { Verdict } from '@create-something/bundle-scanner-core';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const config = {
    PASS: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: CheckCircle,
      label: 'PASS'
    },
    ACTION_REQUIRED: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      label: 'REVIEW'
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: XCircle,
      label: 'REJECTED'
    }
  };

  const { bg, text, border, icon: Icon, label } = config[verdict];

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${bg} ${text} ${border} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Verdict: ${label}`}
    >
      <Icon className={iconSize[size]} aria-hidden="true" />
      {label}
    </span>
  );
};
