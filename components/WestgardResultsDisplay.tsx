


import React from 'react';
import { WestgardRuleViolation } from './types';

interface WestgardResultsDisplayProps {
  violations: WestgardRuleViolation[];
}

export const WestgardResultsDisplay: React.FC<WestgardResultsDisplayProps> = ({ violations }) => {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">Westgard Rule Evaluation (Cumulative)</h3>
      {violations.length === 0 ? (
        <p className="text-green-500">No Westgard rule violations detected in the cumulative data.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {violations.map((violation, index) => (
            <li key={index} className={violation.rule.includes('Warning') ? 'text-yellow-400' : 'text-red-500'}>
              <strong className="font-semibold">{violation.rule}:</strong> {violation.message}
              {/* Note: Specific day/data point numbers are omitted here; view the chart for visual location of violations. */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
