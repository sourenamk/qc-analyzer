
import React from 'react';

/**
 * @deprecated This component is deprecated and its functionality has been removed.
 * The monthly data entry and analysis UI has been replaced by a single, ad-hoc
 * analysis workbench directly within the main App component.
 */
export const TestDataEditor: React.FC = () => {
  return (
    <div className="p-4 my-6 bg-yellow-50 border border-yellow-300 rounded-lg">
      <p className="text-yellow-800 font-semibold">Component Deprecated</p>
      <p className="text-yellow-700 text-sm">
        The TestDataEditor component is no longer in use. It has been replaced by a simplified
        analysis interface in the main application view.
      </p>
    </div>
  );
};
