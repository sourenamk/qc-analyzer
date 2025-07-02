
import React from 'react';
import { TestData } from './types';

interface TestSelectorProps {
  tests: TestData[];
  activeTestId: string | null;
  onSelectTest: (testId: string) => void;
}

export const TestSelector: React.FC<TestSelectorProps> = ({ tests, activeTestId, onSelectTest }) => {
  if (!tests || tests.length === 0) {
    return <p className="text-gray-500 italic my-4">No tests available in this category.</p>;
  }

  return (
    <div className="mb-6">
      <label htmlFor="test-selector" className="block text-sm font-medium text-gray-300 mb-1">
        Select Test:
      </label>
      <select
        id="test-selector"
        name="test-selector"
        value={activeTestId || ''}
        onChange={(e) => onSelectTest(e.target.value)}
        className="w-full md:w-1/2 p-3 border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-700 text-white"
      >
        {tests.map((test) => (
          <option key={test.id} value={test.id}>
            {test.name}
          </option>
        ))}
      </select>
    </div>
  );
};
