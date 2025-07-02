
import React from 'react';
import { SigmaMetricResult } from './types';

interface SigmaMetricsDisplayProps {
  sigmaMetrics: SigmaMetricResult | null;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
}

export const SigmaMetricsDisplay: React.FC<SigmaMetricsDisplayProps> = ({ sigmaMetrics, warningThreshold, criticalThreshold }) => {
  if (!sigmaMetrics) {
    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">Sigma Metrics</h3>
        <p className="text-gray-500 italic text-sm">Sigma metrics not yet calculated.</p>
      </div>
    );
  }

  const { sigmaValue, assessment, details } = sigmaMetrics;

  let assessmentColor = 'text-gray-300';
  let thresholdMessage = '';

  if (sigmaValue !== null) {
    if (criticalThreshold !== null && sigmaValue < criticalThreshold) {
      assessmentColor = 'text-red-500 font-bold';
      thresholdMessage = `CRITICAL: Sigma (${sigmaValue.toFixed(2)}) is below critical threshold (${criticalThreshold.toFixed(2)}).`;
    } else if (warningThreshold !== null && sigmaValue < warningThreshold) {
      assessmentColor = 'text-yellow-400 font-semibold';
      thresholdMessage = `WARNING: Sigma (${sigmaValue.toFixed(2)}) is below warning threshold (${warningThreshold.toFixed(2)}).`;
    } else {
      // Standard coloring based on assessment if no thresholds are breached or defined
      if (sigmaValue >= 6) assessmentColor = 'text-green-400';
      else if (sigmaValue >= 5) assessmentColor = 'text-green-500';
      else if (sigmaValue >= 4) assessmentColor = 'text-lime-400';
      else if (sigmaValue >= 3) assessmentColor = 'text-yellow-500'; // Default if no warning threshold but sigma is 3-4
      else assessmentColor = 'text-red-500'; // Default if no critical threshold but sigma is <3
    }
  }


  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">Sigma Metrics</h3>
      <div className="space-y-1 text-sm bg-gray-700/50 p-3 rounded-md shadow-sm border border-gray-700">
        <p>
          <span className="font-medium text-gray-400">Calculated Sigma Value:</span>
          <span className={`ml-2 font-bold ${assessmentColor}`}>{sigmaValue !== null ? sigmaValue.toFixed(2) : 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-gray-400">Performance Assessment:</span>
          <span className={`ml-2 ${assessmentColor}`}>{assessment}</span>
        </p>
        {thresholdMessage && (
          <p className={`mt-1 text-sm ${assessmentColor.includes('red') ? 'text-red-500' : 'text-yellow-400'}`}>
            {thresholdMessage}
          </p>
        )}
        {details && (
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-medium">Details:</span> {details}
          </p>
        )}
      </div>
    </div>
  );
};
