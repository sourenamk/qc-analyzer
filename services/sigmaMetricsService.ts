
import { TestData } from '../components/types';

/**
 * Calculates Sigma Metric.
 * Assumes TEa, Bias, and CV are all percentages.
 * Sigma = (TEa% - |Bias%|) / CV%
 * @param teaPercent Total Allowable Error (as a percentage, e.g., 10 for 10%)
 * @param biasPercent Absolute Bias (as a percentage, e.g., 2.5 for 2.5%)
 * @param cvPercent Coefficient of Variation (as a percentage, e.g., 1.5 for 1.5%)
 * @returns Sigma value, or null if inputs are invalid (e.g., CV is zero or negative).
 */
export const calculateSigmaMetric = (
  teaPercent: number | null,
  biasPercent: number | null, // Should be absolute value already
  cvPercent: number | null
): number | null => {
  if (teaPercent === null || biasPercent === null || cvPercent === null) {
    return null;
  }
  if (isNaN(teaPercent) || isNaN(biasPercent) || isNaN(cvPercent)) {
    return null;
  }
  if (cvPercent <= 0) { // CV must be positive for calculation
    return null;
  }

  const absoluteBiasPercent = Math.abs(biasPercent);
  return (teaPercent - absoluteBiasPercent) / cvPercent;
};

/**
 * Provides a qualitative assessment based on the Sigma value using specified grading.
 * @param sigmaValue The calculated Sigma metric.
 * @returns A string describing the performance level.
 */
export const getSigmaAssessment = (sigmaValue: number | null): string => {
  if (sigmaValue === null || isNaN(sigmaValue)) {
    return 'N/A';
  }
  if (sigmaValue >= 6) return 'Excellent (≥6σ)';
  if (sigmaValue >= 5) return 'Good (5-6σ)'; // 5 to <6
  if (sigmaValue >= 4) return 'Fair (4-5σ)';   // 4 to <5
  if (sigmaValue >= 3) return 'Poor (3-4σ)';   // 3 to <4
  return 'Unacceptable (<3σ)'; // Sigma < 3
};
