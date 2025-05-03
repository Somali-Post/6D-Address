// import React, { ButtonHTMLAttributes, forwardRef } from 'react'; // <-- REMOVED React import
import { ButtonHTMLAttributes, forwardRef } from 'react'; // <-- Keep only necessary imports

// Define allowed variants and sizes
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

// Define the props for the Button component
// Extends standard HTML button attributes
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;    // Optional loading state
  className?: string;     // Allow custom classes to be passed
}

// Using forwardRef to allow parent components to get a ref to the button element
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary', // Default variant
      size = 'md',        // Default size to 'md'
      isLoading = false,
      className = '',
      disabled,            // Get disabled prop
      ...props             // Pass remaining standard button props
    },
    ref // The forwarded ref
  ) => {

    // Base classes for all buttons
    const baseClasses = "inline-flex items-center justify-center border font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out";

    // Classes for different variants
    const variantClasses: Record<ButtonVariant, string> = {
      primary: "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500", // Example secondary
      danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",   // Example danger
      link: "border-transparent text-blue-600 hover:text-blue-800 focus:ring-blue-500 underline shadow-none border-none bg-transparent", // Example link
    };

    // Classes for different sizes
    const sizeClasses: Record<ButtonSize, string> = {
       sm: "px-3 py-1.5 text-xs",      // Smaller padding and text
       md: "px-4 py-2 text-sm",       // Default/Medium padding and text
       lg: "px-6 py-3 text-base",      // Larger padding and text
    };

    // Classes for disabled state
    const disabledClasses = "opacity-50 cursor-not-allowed";

    // Combine classes based on props
    const combinedClasses = `
      ${baseClasses}
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${(disabled || isLoading) ? disabledClasses : ''}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={combinedClasses.replace(/\s+/g, ' ').trim()} // Cleanup whitespace
        disabled={disabled || isLoading} // Disable if explicitly disabled or loading
        {...props} // Spread the rest of the button props (type, onClick, etc.)
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

// Set display name for component for better debugging
Button.displayName = 'Button';

export default Button;
