import React from 'react';

// Define the props the Button component accepts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Allow standard button attributes like onClick, type, etc.
  variant?: 'primary' | 'secondary' | 'danger'; // Optional style variants
  isLoading?: boolean; // Optional loading state
  children: React.ReactNode; // Ensure children are always passed
  className?: string; // Allow passing custom classes for layout/spacing
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = '', // Default to empty string
  variant = 'primary', // Default to primary style
  isLoading = false,
  disabled, // Use the disabled prop directly
  ...props // Pass any other button attributes
}) => {
  // Base styles for all buttons - adjusted padding/font size for a slightly cleaner look
  const baseStyle = 'inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow-sm';

  // Variant-specific styles
  let variantStyle = '';
  switch (variant) {
    case 'secondary':
      // Lighter secondary button
      variantStyle = 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 focus:ring-gray-400';
      break;
    case 'danger':
      variantStyle = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      break;
    case 'primary':
    default:
      // Slightly softer primary blue
      variantStyle = 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400';
      break;
  }

  return (
    <button
      // Combine base, variant, and custom classes
      className={`${baseStyle} ${variantStyle} ${className}`}
      // Disable the button if explicitly disabled OR if isLoading is true
      disabled={disabled || isLoading}
      {...props} // Spread the rest of the props (like onClick, type)
    >
      {/* Show loading spinner if isLoading is true */}
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5" // Spinner style - color inherited or set explicitly
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          // Ensure spinner color contrasts with button background
          style={{ color: variant === 'primary' || variant === 'danger' ? 'white' : 'currentColor' }}
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {/* Render the button text/content */}
      {children}
    </button>
  );
};

export default Button;