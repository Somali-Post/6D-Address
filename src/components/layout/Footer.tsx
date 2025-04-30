import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-200 text-gray-600 py-4 mt-auto"> {/* Changed mt-10 to mt-auto */}
      <div className="container mx-auto px-4 text-center text-sm">
        © {currentYear} Somali Post. All rights reserved. Somali 6D Address System.
      </div>
    </footer>
  );
};

export default Footer;