

import React, { useMemo } from 'react';
import { calculateZScore } from '../services/qcCalculator';
import { WestgardRuleViolation, CumulativeDataPoint } from './types';

interface DataGraphProps {
  data: CumulativeDataPoint[];
  title: string;
  targetMean: number | null;
  observedMean: number | null;
  observedSD: number | null;
  westgardViolations: WestgardRuleViolation[];
  id?: string;
}

export const DataGraph: React.FC<DataGraphProps> = ({ 
    data, title, targetMean, observedMean, observedSD, westgardViolations, id
}) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 italic my-3 text-center">No data points to plot.</p>;
  }

  const violationMap = useMemo(() => {
    const map = new Map<number, string>();
    if (westgardViolations) {
      // Violations are pre-sorted by severity. Iterate and fill the map.
      // The first rule found for an index will be the most severe.
      westgardViolations.forEach(v => {
        if (!v.rule.includes('Warning')) {
          v.dataPointIndices?.forEach(idx => {
            if (!map.has(idx)) {
              // Simplify rule name for display, e.g., "7_x" -> "7x"
              map.set(idx, v.rule.replace('_', '').replace(' (Warning)', ''));
            }
          });
        }
      });
    }
    return map;
  }, [westgardViolations]);


  const dataPoints = data.map(d => d.value);

  const width = 600;
  const height = 350;
  const margin = { top: 30, right: 40, bottom: 50, left: 60 }; 
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let yValuesToConsider: (number | null)[] = [...dataPoints, targetMean, observedMean];
  if (observedMean !== null && observedSD !== null && observedSD > 0) {
    for (let i = 1; i <= 3; i++) {
      yValuesToConsider.push(observedMean + i * observedSD);
      yValuesToConsider.push(observedMean - i * observedSD);
    }
  }
  const validYValues = yValuesToConsider.filter(v => v !== null && !isNaN(v)) as number[];
  
  if (validYValues.length === 0) {
      validYValues.push(...dataPoints);
  }

  const dataMin = Math.min(...validYValues);
  const dataMax = Math.max(...validYValues);
  const yRange = dataMax - dataMin;
  const yPadding = yRange === 0 ? 1 : yRange * 0.15;
  const effectiveYMin = dataMin - yPadding;
  const effectiveYMax = dataMax + yPadding;

  const xScale = (index: number) => margin.left + (dataPoints.length === 1 ? chartWidth / 2 : (index / (dataPoints.length - 1)) * chartWidth);
  const yScale = (value: number) => margin.top + chartHeight - ((value - effectiveYMin) / (effectiveYMax - effectiveYMin)) * chartHeight;

  const controlLines = [];
  if (targetMean !== null) controlLines.push({ value: targetMean, label: `Test Target (${targetMean.toFixed(2)})`, color: '#d97706', dashArray: "6 3" });
  if (observedMean !== null) {
      controlLines.push({ value: observedMean, label: `Cumulative Mean (${observedMean.toFixed(2)})`, color: '#10b981' });
      if (observedSD !== null && observedSD > 0) {
          for (let i = 1; i <= 3; i++) {
              controlLines.push({ value: observedMean + i * observedSD, label: `+${i}SD`, color: '#6b7280', opacity: i === 3 ? 0.9 : 0.6, dashArray: "3 3" });
              controlLines.push({ value: observedMean - i * observedSD, label: `-${i}SD`, color: '#6b7280', opacity: i === 3 ? 0.9 : 0.6, dashArray: "3 3" });
          }
      }
  }

  const linePath = dataPoints.length > 1 ? dataPoints.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ') : null;
  
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = -1;
  data.forEach((point, i) => {
    const month = point.date.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        index: i,
        label: point.date.toLocaleString('default', { month: 'short' }) + `'${String(point.date.getFullYear()).slice(2)}`,
      });
      lastMonth = month;
    }
  });


  return (
    <div id={id} className="mt-6 p-4 border border-gray-700 rounded-lg bg-gray-800 shadow">
      <h4 className="text-lg font-semibold text-gray-200 mb-3 text-center">{title}</h4>
      <svg viewBox={`0 0 ${width} ${height}`} aria-labelledby="chart-title" role="img" className="w-full h-auto">
        <title id="chart-title">{title}</title>
        
        {controlLines.map(line => (
          <g key={line.label}>
            <line x1={margin.left} y1={yScale(line.value)} x2={width - margin.right} y2={yScale(line.value)} stroke={line.color} strokeWidth="1" strokeDasharray={line.dashArray} opacity={line.opacity}/>
            <text x={margin.left - 8} y={yScale(line.value) + 3} textAnchor="end" fontSize="8px" fill={line.color} fontWeight="medium">{line.label}</text>
          </g>
        ))}

        {monthLabels.map(({ index, label }) => (
          <g key={`month-label-${index}`}>
            <text x={xScale(index)} y={height - margin.bottom + 20} textAnchor="middle" fontSize="10px" fill="#d1d5db">{label}</text>
            <line x1={xScale(index)} y1={height - margin.bottom} x2={xScale(index)} y2={height - margin.bottom + 5} stroke="#d1d5db" strokeWidth="1" />
          </g>
        ))}
        <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#d1d5db" strokeWidth="1"/>

        {linePath && <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="1.5" />}

        {data.map((point, i) => {
          const violationRule = violationMap.get(i);
          const isRejectionViolation = !!violationRule;
          const isWarningViolation = !isRejectionViolation && westgardViolations.some(v => v.rule.includes('Warning') && v.dataPointIndices?.includes(i));

          let pointColor = point.isCurrentMonth ? '#a78bfa' : '#6366f1';
          let pointRadius = point.isCurrentMonth ? "4.5" : "4";
          let pointStrokeWidth = point.isCurrentMonth ? '1.5' : '1';
          let titleMessage = `${point.date.toLocaleDateString()}: ${point.value.toFixed(2)}`;

          if (isRejectionViolation) {
            pointColor = '#ef4444';
            pointRadius = "5.5";
            pointStrokeWidth = '1.5';
            titleMessage += ` - VIOLATION: ${violationRule}`;
          } else if (isWarningViolation) {
            pointColor = '#f97316';
            pointRadius = "5";
            titleMessage += ' - WARNING: 1_2s';
          } else if (observedMean !== null && observedSD !== null && observedSD > 0) {
            const z = calculateZScore(point.value, observedMean, observedSD);
            if (z !== null && Math.abs(z) > 1) {
              pointColor = point.isCurrentMonth ? '#facc15' : '#eab308';
            }
          }

          return (
            <g key={`point-group-${i}`}>
              <circle key={`point-${i}`} cx={xScale(i)} cy={yScale(point.value)} r={pointRadius} fill={pointColor} stroke="white" strokeWidth={pointStrokeWidth}>
                <title>{titleMessage}</title>
              </circle>
              {isRejectionViolation && (
                <text x={xScale(i)} y={yScale(point.value) - 10} textAnchor="middle" fontSize="10px" fill="#fca5a5" fontWeight="bold" className="pointer-events-none">
                  {violationRule}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};