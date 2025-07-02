

import React from 'react';
import { TestData } from './types';

interface ReferenceDataDisplayProps {
  testData: TestData | null;
}

export const ReferenceDataDisplay: React.FC<ReferenceDataDisplayProps> = ({ testData }) => {
  if (!testData) {
    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">Reference & Regulatory Data</h3>
            <p className="text-gray-500 italic text-sm">Reference data not available for the selected test.</p>
        </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-200 mb-2">Reference & Regulatory Data</h3>
      <div className="space-y-1 text-sm bg-gray-700/50 p-3 rounded-md shadow-sm border border-gray-700">
        <p>
          <span className="font-medium text-gray-400">Biological Variation CV (%):</span>
          <span className="ml-2 text-gray-100">{testData.refBioCVStr || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-gray-400">Biological Variation Bias (%):</span>
          <span className="ml-2 text-gray-100">{testData.refBioBiasStr || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-gray-400">Biological Variation TEa (%):</span>
          <span className="ml-2 text-gray-100">{testData.refBioTEaStr || 'N/A'}</span>
        </p>
        <p>
          <span className="font-medium text-gray-400">CLIA TEa (%):</span>
          <span className="ml-2 text-gray-100">{testData.cliaTEaStr || 'N/A'}</span>
        </p>
      </div>
    </div>
  );
};
