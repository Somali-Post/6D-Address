import React from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiPlusCircle, FiSearch } from 'react-icons/fi'; // Removed FiPhone
import Button from '../components/ui/Button'; // Assuming Button component is correctly located

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      {/* Hero Section */}
      <section className="mb-16">
        <FiMapPin className="mx-auto text-6xl text-blue-600 mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
          Welcome to 6D Address
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Your precise digital address for Somalia. Easily register, find, and share locations with a unique 6-digit code.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg">
              <FiPlusCircle className="mr-2" /> Register New Location
            </Button>
          </Link>
          <Link to="/search">
             <Button variant="secondary" size="lg">
              <FiSearch className="mr-2" /> Find Location by Code
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <FiPlusCircle className="text-3xl text-blue-500 mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Register Precisely</h3>
          <p className="text-gray-600">
            Pinpoint your location on the map and get a unique 6D Code instantly.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <FiSearch className="text-3xl text-green-500 mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Effortless Lookup</h3>
          <p className="text-gray-600">
            Quickly find any registered location using its simple 6D Code.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <FiMapPin className="text-3xl text-purple-500 mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Easy Navigation</h3>
          <p className="text-gray-600">
            View locations on the map and get directions (integration possible).
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
