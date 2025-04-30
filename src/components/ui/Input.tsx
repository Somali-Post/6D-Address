import React, { forwardRef } from 'react'; // Import forwardRef

// Define the props the Input component accepts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null | undefined;
  id: string;
  className?: string;
}

// Use forwardRef to allow passing refs to the underlying input element
// The component now receives 'props' and 'ref' as arguments
const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  id,
  error = null,
  className = '',
  type = 'text',
  ...props // Spread the rest of the standard input props
}, ref) => { // The ref is passed as the second argument

  const baseStyle = 'block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed placeholder-gray-400';
  const focusStyle = 'focus:ring-blue-500 focus:border-blue-500';
  const errorStyle = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        // Pass the forwarded ref directly to the native input element
        ref={ref}
        id={id}
        type={type}
        className={`${baseStyle} ${error ? errorStyle : focusStyle} ${className}`}
        {...props} // Spread other props like value, onChange, etc.
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
});

// Set a display name for debugging purposes (optional but good practice)
Input.displayName = 'Input';

export default Input;