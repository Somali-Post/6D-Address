import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null | undefined;
  id: string;
  className?: string;
  icon?: React.ReactNode; // <-- Add prop type for optional icon
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  id,
  error = null,
  className = '',
  icon, // <-- Destructure the icon prop
  type = 'text',
  ...props
}, ref) => {

  const baseStyle = 'block w-full border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed placeholder-gray-400';
  // Add padding based on whether icon exists
  const paddingStyle = icon ? 'pl-10 pr-3 py-2' : 'px-4 py-2';
  const focusStyle = 'focus:ring-blue-500 focus:border-blue-500';
  const errorStyle = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <div className="w-full relative"> {/* Add relative positioning for icon */}
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      {/* Conditionally render icon if provided */}
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon} {/* Render the icon element */}
        </div>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        // Apply base, padding, error/focus, and custom classes
        className={`${baseStyle} ${paddingStyle} ${error ? errorStyle : focusStyle} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;