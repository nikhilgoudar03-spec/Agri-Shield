import React from 'react';

export type SensorStatusType =
  | 'LIVE'
  | 'STALE'
  | 'OFFLINE'
  | 'DEVICE OFFLINE'
  | 'NO DATA'
  | 'SENSOR ERROR'
  | 'GPS FIX NOT AVAILABLE'
  | 'ONLINE'
  | 'ERROR';

interface StatusBadgeProps {
  status: SensorStatusType | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toUpperCase() || 'NO DATA';

  let bg = 'bg-gray-100 text-gray-700 dark:bg-charcoal-800 dark:text-gray-300 border-gray-200 dark:border-forest-800';
  let dot = 'bg-gray-400';
  let pulse = false;

  if (norm === 'LIVE' || norm === 'ONLINE') {
    bg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
    dot = 'bg-emerald-500';
    pulse = true;
  } else if (norm === 'STALE') {
    bg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800';
    dot = 'bg-amber-500';
  } else if (norm === 'OFFLINE' || norm === 'DEVICE OFFLINE') {
    bg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800';
    dot = 'bg-rose-500';
  } else if (norm === 'SENSOR ERROR' || norm === 'ERROR') {
    bg = 'bg-red-50 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800';
    dot = 'bg-red-600';
  } else if (norm === 'GPS FIX NOT AVAILABLE') {
    bg = 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
    dot = 'bg-yellow-500';
    pulse = true;
  } else if (norm === 'NO DATA') {
    bg = 'bg-gray-100 text-gray-600 dark:bg-forest-950/60 dark:text-gray-400 border-gray-200 dark:border-forest-800';
    dot = 'bg-gray-400';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center space-x-1.5 font-semibold rounded-full border ${px} ${bg} transition-colors whitespace-nowrap`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{norm}</span>
    </span>
  );
};

