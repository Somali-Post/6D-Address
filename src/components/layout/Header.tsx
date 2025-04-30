import React from 'react';
import { Link } from 'react-router-dom';
// FiMapPin might not be needed here anymore unless you want it elsewhere
// import { FiMapPin } from 'react-icons/fi';

const Header: React.FC = () => {
  return (
    <header className="bg-white text-gray-800 shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo and Site Title */}
        <Link to="/" className="flex items-center space-x-3 group">

          {/* --- Replaced placeholder with actual logo --- */}
          <img
            src="/images/SomPostLogo.png" // Path relative to the public folder
            alt="Somali Post Logo"
            // Adjust height as needed, w-auto maintains aspect ratio
            className="h-10 w-auto" // Increased height slightly
          />
          {/* --- End of Logo --- */}

          <span className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
             Somali 6D Address
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="space-x-2 md:space-x-4 flex items-center">
          <Link
            to="/"
            className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
             Home
           </Link>
          <Link
            to="/register"
            className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition duration-200 shadow-sm hover:shadow"
          >
            Register Address
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;