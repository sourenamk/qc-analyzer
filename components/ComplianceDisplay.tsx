
import React from 'react';
import { CalculatedStats, TestData } from './types';

interface ComplianceDisplayProps {
  calculatedStats: CalculatedStats | null;
  testData: TestData | null;
}

const ComplianceItem: React.FC<{ label: string; userValue: string | null; targetValue: string | null; compliant?: boolean | null; notes?: string }> = ({ label, userValue, targetValue, compliant, notes }) => {
  let complianceText = '';
  let textColor = 'text-gray-300';

  if (compliant === true) {
    complianceText = ' (Compliant)';
    textColor = 'text-green-500';
  } else if (compliant === false) {
    complianceText = ' (Not Compliant)';
    textColor = 'text-red-500';
  } else if (compliant === null) {
    complianceText = ' (N/A)';
    textColor = 'text-gray-500';
  }


  return (
    <div className="mb-2">
      <span className="font-semibold">{label}:</span>
      <span className={`ml-2 ${textColor}`}>
        User: {userValue ?? 'N/A'}
        {targetValue && ` (Target: ${targetValue})`}
        {complianceText}
      </span>
      {notes && <p className="text-xs text-gray-500 pl-2">{notes}</p>}
    </div>
  );
};

export const ComplianceDisplay: React.FC<ComplianceDisplayProps> = ({ calculatedStats, testData }) => {
  if (!calculatedStats || !testData) {
    return <p className="text-gray-500 italic">Compliance data not yet available.</p>;
  }

  const { observedCV, biasPercent, observedMean } = calculatedStats;
  const { refBioCVStr, refBioBiasStr, cliaTEaStr, refBioTEaStr, targetMeanStr } = testData;

  const targetMean = parseFloat(targetMeanStr);

  // Biological Variation Compliance
  const bioCvTarget = parseFloat(refBioCVStr);
  const bioBiasTarget = parseFloat(refBioBiasStr);

  const isBioCvCompliant = (observedCV !== null && !isNaN(bioCvTarget)) ? observedCV <= bioCvTarget : null;
  const isBioBiasCompliant = (biasPercent !== null && !isNaN(bioBiasTarget)) ? Math.abs(biasPercent) <= bioBiasTarget : null;

  // TEa Compliance
  // Prioritize CLIA TEa, then Biological Variation TEa
  let teaStrToUse: string | null = null;
  let teaSource: string | null = null;

  if (cliaTEaStr && !isNaN(parseFloat(cliaTEaStr))) {
    teaStrToUse = cliaTEaStr;
    teaSource = 'CLIA';
  } else if (refBioTEaStr && !isNaN(parseFloat(refBioTEaStr))) {
    teaStrToUse = refBioTEaStr;
    teaSource = 'Biological Variation';
  }

  const teaPercentTarget = teaStrToUse ? parseFloat(teaStrToUse) : null;
  let isTeaCompliant: boolean | null = null;
  let teaComplianceNotes = `Using TEa from: ${teaSource || 'Not specified'}.`;


  if (teaPercentTarget !== null && observedMean !== null && !isNaN(targetMean) && targetMean !== 0 && observedCV !== null && biasPercent !== null) {
    // Simple TEa check: Total Error Budget Consumed = |Bias%| + (Z * CV%)
    // Using Z=1.65 for 95% confidence (common in some models, but can vary. For simplicity, can use Z=1)
    // For a basic check: Is |Bias%| + CV% <= TEa% ?
    // Or, more directly related to mean: Is observed mean within targetMean +/- TEa_absolute?
    const teaAbsolute = (teaPercentTarget / 100) * targetMean;
    const lowerLimit = targetMean - teaAbsolute;
    const upperLimit = targetMean + teaAbsolute;
    isTeaCompliant = observedMean >= lowerLimit && observedMean <= upperLimit;
    teaComplianceNotes += ` Target range for mean: ${lowerLimit.toFixed(2)} - ${upperLimit.toFixed(2)}. Observed mean: ${observedMean.toFixed(2)}.`;
  } else if (teaPercentTarget === null) {
     teaComplianceNotes = 'TEa target not specified or invalid.';
  } else {
     teaComplianceNotes += ' Insufficient data for full TEa assessment (e.g., Observed Mean, Target Mean, CV, or Bias missing).';
  }


  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-200 mb-3">Compliance Assessment</h3>
      
      <div className="bg-gray-700/50 p-4 rounded-md shadow-sm border border-gray-700 mb-4">
        <h4 className="text-md font-semibold text-gray-300 mb-2">Biological Variation Goals</h4>
        <ComplianceItem
          label="Observed CV"
          userValue={observedCV?.toFixed(2) + '%' ?? 'N/A'}
          targetValue={!isNaN(bioCvTarget) ? bioCvTarget.toFixed(2) + '%' : 'N/A'}
          compliant={isBioCvCompliant}
        />
        <ComplianceItem
          label="Observed Bias"
          userValue={biasPercent?.toFixed(2) + '%' ?? 'N/A'}
          targetValue={!isNaN(bioBiasTarget) ? bioBiasTarget.toFixed(2) + '%' : 'N/A'}
          compliant={isBioBiasCompliant}
        />
      </div>

      <div className="bg-gray-700/50 p-4 rounded-md shadow-sm border border-gray-700">
        <h4 className="text-md font-semibold text-gray-300 mb-2">Total Allowable Error (TEa)</h4>
        <ComplianceItem
          label="Overall Performance vs TEa"
          userValue={isTeaCompliant === null ? "Cannot Assess" : (isTeaCompliant ? "Meets TEa" : "Exceeds TEa")}
          targetValue={teaPercentTarget?.toFixed(2) + '%' ?? 'N/A'}
          compliant={isTeaCompliant}
          notes={teaComplianceNotes}
        />
      </div>
    </div>
  );
};
