
import React from 'react';

interface MonthlyDataGridProps {
  dayInputs: string[];
  onDayInputChange: (dayIndex: number, value: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

export const MonthlyDataGrid: React.FC<MonthlyDataGridProps> = ({ 
  dayInputs, 
  onDayInputChange,
  selectedMonth,
  selectedYear
}) => {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  return (
    <div className="grid grid-cols-7 gap-2 mt-4">
      {Array.from({ length: daysInMonth }, (_, i) => i).map((dayIndex) => {
        const dayNumber = dayIndex + 1;
        return (
          <div key={dayIndex} className="relative">
            <label htmlFor={`day-${dayNumber}`} className="absolute -top-2.5 left-1.5 text-xs text-gray-400 bg-gray-800 px-1">
              {dayNumber}
            </label>
            <input
              id={`day-${dayNumber}`}
              type="text" // Use text to allow for easier clearing and handling of non-numeric input before parsing
              inputMode="decimal" // Hint for mobile keyboards
              value={dayInputs[dayIndex] || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and a single decimal point
                if (/^\d*\.?\d*$/.test(value)) {
                  onDayInputChange(dayIndex, value);
                }
              }}
              className="w-full h-12 text-center bg-gray-700 border border-gray-600 rounded-md shadow-sm p-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="-"
              aria-label={`QC value for day ${dayNumber}`}
            />
          </div>
        );
      })}
    </div>
  );
};
