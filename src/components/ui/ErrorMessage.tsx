import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi'; // Using an icon

// Define props
interface ErrorMessageProps {
  message: string | null | undefined; // Accept null or undefined to hide component
  className?: string; // Allow custom classes for layout/spacing
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  // Don't render anything if message is null, undefined, or an empty string
  if (!message) {
    return null;
  }

  return (
    // Styling for the error box - softer red background
    <div
      className={`bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg relative flex items-start space-x-3 ${className}`} // Use flex for icon alignment, adjusted padding/rounding/spacing
      role="alert"
    >
      <FiAlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" /> {/* Icon styling */}
      <span className="block sm:inline text-sm font-medium">{message}</span> {/* Message text - slightly bolder */}
    </div>
  );
};

export default ErrorMessage;