import React, { InputHTMLAttributes, forwardRef } from 'react';

// Define the props for the Input component
// Extends standard HTML input attributes
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;         // Optional label text
  id: string;            // Input element ID (required for label association)
  error?: string;         // Optional error message
  className?: string;     // Allow custom styling for the input itself
  labelClassName?: string;// Allow custom styling for the label
  containerClassName?: string; // Allow custom styling for the container div
  icon?: React.ReactNode; // *** FIX: Add optional icon prop ***
}

// Using forwardRef to allow parent components to get a ref to the input element
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      id,
      error,
      className = '',
      labelClassName = '',
      containerClassName = '',
      icon,             // Destructure the new icon prop
      ...props          // Pass remaining standard input props
    },
    ref // The forwarded ref
  ) => {
    const baseInputClasses = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    const errorInputClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";
    const inputClasses = `${baseInputClasses} ${error ? errorInputClasses : ''} ${icon ? 'pl-10' : ''} ${className}`; // Add left padding if icon exists

    const baseLabelClasses = "block text-sm font-medium text-gray-700";
    const labelClasses = `${baseLabelClasses} ${labelClassName}`;

    const containerClasses = `relative ${containerClassName}`; // Make container relative for icon positioning

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={id} className={labelClasses}>
            {label}
          </label>
        )}
        {/* *** FIX: Render icon if provided *** */}
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {/* Adjust styling (text color, size) as needed */}
            {icon}
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={inputClasses}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props} // Spread the rest of the input props (type, placeholder, value, onChange, etc.)
        />
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

// Set display name for component for better debugging
Input.displayName = 'Input';

export default Input;
