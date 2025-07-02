
import React from 'react';

/**
 * @deprecated This component is deprecated and is no longer in use.
 * The monthly analysis features, including this scatter plot for monthly data, 
 * have been removed to streamline the application for single-run analysis.
 * A new plot for single runs is now generated from the main App component.
 */
export const MonthlyScatterPlot: React.FC = () => {
  return (
    <div className="p-4 my-6 bg-yellow-50 border border-yellow-300 rounded-lg">
      <p className="text-yellow-800 font-semibold">Component Deprecated</p>
      <p className="text-yellow-700 text-sm">
        The MonthlyScatterPlot component is no longer in use.
      </p>
    </div>
  );
};
