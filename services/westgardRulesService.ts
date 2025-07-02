

import { WestgardRuleViolation } from '../components/types';
import { calculateZScore } from './qcCalculator';

export const evaluateWestgardRules = (
  observedValues: number[], // Assumes already filtered for valid numbers
  meanForRules: number | null,
  calculatedSD: number | null
): WestgardRuleViolation[] => {
  const violations: WestgardRuleViolation[] = [];
  if (meanForRules === null || calculatedSD === null || calculatedSD <= 0 || observedValues.length === 0) {
    return violations; // Cannot evaluate without valid calculated mean/SD or data
  }

  const zScores = observedValues.map((value, index) => ({
    value,
    z: calculateZScore(value, meanForRules, calculatedSD),
    index: index 
  }));
  
  const validZScores = zScores.filter(item => item.z !== null) as { value: number; z: number; index: number }[];

  if (validZScores.length === 0) return violations;

  // 1_2s Rule (Warning) - Individual points
  validZScores.forEach(item => {
    if (Math.abs(item.z) > 2 && Math.abs(item.z) <= 3) {
      if (!violations.some(v => (v.rule === '1_3s' || v.rule === '2_2s' || v.rule === 'R_4s' || v.rule === '4_1s') && v.dataPointIndices?.includes(item.index))) {
         violations.push({ rule: '1_2s (Warning)', message: `One point outside ±2SD.`, dataPointIndices: [item.index] });
      }
    }
  });
  
  // 1_3s Rule
  validZScores.forEach(item => {
    if (Math.abs(item.z) > 3) {
      violations.push({ rule: '1_3s', message: `One point outside ±3SD.`, dataPointIndices: [item.index] });
    }
  });

  // 2_2s Rule
  for (let i = 1; i < validZScores.length; i++) {
    const prev = validZScores[i-1];
    const curr = validZScores[i];
    if ( (prev.z > 2 && curr.z > 2) || (prev.z < -2 && curr.z < -2) ) {
      violations.push({ rule: '2_2s', message: `Two consecutive points outside ±2SD on the same side.`, dataPointIndices: [prev.index, curr.index] });
    }
  }

  // R_4s Rule
  for (let i = 1; i < validZScores.length; i++) {
    const prev = validZScores[i-1];
    const curr = validZScores[i];
    if ( (prev.z > 2 && curr.z < -2) || (prev.z < -2 && curr.z > 2) ) {
      violations.push({ rule: 'R_4s', message: `One point +2SD and next -2SD (or vice versa). Range of 4SD.`, dataPointIndices: [prev.index, curr.index] });
    }
  }
  
  // 4_1s Rule
  for (let i = 0; i <= validZScores.length - 4; i++) {
    const fourPoints = validZScores.slice(i, i + 4);
    if (fourPoints.every(p => p.z > 1) || fourPoints.every(p => p.z < -1)) {
      violations.push({ rule: '4_1s', message: `Four consecutive points outside ±1SD on the same side.`, dataPointIndices: fourPoints.map(p=>p.index) });
      i += 3; 
    }
  }

  // 10_x Rule (or N_x rule, using N=7 for fewer data points typical in monthly)
  const N_X_COUNT = 7; 
  for (let i = 0; i <= validZScores.length - N_X_COUNT; i++) {
    const nPoints = validZScores.slice(i, i + N_X_COUNT);
    if (nPoints.every(p => p.z > 0) || nPoints.every(p => p.z < 0)) {
      violations.push({ rule: `${N_X_COUNT}_x`, message: `${N_X_COUNT} consecutive points on the same side of the mean.`, dataPointIndices: nPoints.map(p=>p.index) });
      i += (N_X_COUNT - 1); 
    }
  }
  
  const finalViolations: WestgardRuleViolation[] = [];
  const violationMap = new Map<string, WestgardRuleViolation>();

  violations.forEach(v => {
    const key = `${v.rule}-${v.dataPointIndices?.sort().join(',')}`;
    if (!violationMap.has(key)) {
      violationMap.set(key, v);
    }
  });
  
  const rejectionRules = ['1_3s', '2_2s', 'R_4s', '4_1s', `${N_X_COUNT}_x`];
  
  violationMap.forEach(v => {
      if (v.rule.includes('1_2s')) {
          const pointIdx = v.dataPointIndices ? v.dataPointIndices[0] : -1;
          const hasOverlappingRejection = Array.from(violationMap.values()).some(
              rejV => rejectionRules.includes(rejV.rule) && rejV.dataPointIndices?.includes(pointIdx)
          );
          if (!hasOverlappingRejection) {
              finalViolations.push(v);
          }
      } else {
          finalViolations.push(v);
      }
  });

  return finalViolations.sort((a,b) => { 
    const ruleOrder = ['1_3s', 'R_4s', '2_2s',  '4_1s', `${N_X_COUNT}_x`, '1_2s (Warning)'];
    return ruleOrder.indexOf(a.rule) - ruleOrder.indexOf(b.rule);
  });
};