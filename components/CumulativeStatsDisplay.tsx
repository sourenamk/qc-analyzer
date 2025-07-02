


import React from 'react';
import { CalculatedStats } from './types';

interface CumulativeStatsDisplayProps {
  stats: CalculatedStats | null;
}

const StatCard: React.FC<{ label: string; value: string | null; unit?: string }> = ({ label, value, unit }) => (
  <div className="flex flex-col p-4 bg-gray-800/80 rounded-lg shadow-md border border-gray-700 text-center">
    <dt className="text-sm font-medium text-gray-400 truncate">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">
      {value ?? 'N/A'}
      {value && unit && <span className="text-lg ml-1 font-normal text-gray-300">{unit}</span>}
    </dd>
  </div>
);

export const CumulativeStatsDisplay: React.FC<CumulativeStatsDisplayProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Cumulative Statistics</h3>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Bias" value={stats.biasPercent?.toFixed(2) ?? null} unit="%" />
            <StatCard label="CV" value={stats.observedCV?.toFixed(2) ?? null} unit="%" />
            <StatCard label="Data Points" value={stats.count.toString()} />
        </dl>
    </div>
  );
};