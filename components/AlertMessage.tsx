import React from 'react';

interface AlertMessageProps {
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  onClose?: () => void;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({ message, type, onClose }) => {
  let bgColor = 'bg-blue-100 border-blue-500 text-blue-700';
  let iconPath = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"; // Info icon

  switch (type) {
    case 'error':
      bgColor = 'bg-red-100 border-red-500 text-red-700';
      iconPath = "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"; // Error icon
      break;
    case 'success':
      bgColor = 'bg-green-100 border-green-500 text-green-700';
      iconPath = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"; // Success icon
      break;
    case 'warning':
      bgColor = 'bg-yellow-100 border-yellow-500 text-yellow-700';
      iconPath = "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"; // Warning icon
      break;
  }

  return (
    <div className={`border-l-4 p-4 ${bgColor} rounded-md shadow-md mb-6`} role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d={iconPath}/>
          </svg>
        </div>
        <div>
          <p className="font-semibold">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:ring-2 focus:ring-opacity-50 inline-flex h-8 w-8" 
          aria-label="Close">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        )}
      </div>
    </div>
  );
};