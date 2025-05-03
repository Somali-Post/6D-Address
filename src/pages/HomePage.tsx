import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiMap, FiSend, FiArrowRight } from 'react-icons/fi';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-20 md:space-y-32 overflow-x-hidden">

      {/* --- HERO SECTION --- */}
      <section className="container mx-auto px-4 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* --- Left Column: Text Content --- */}
          <div className="text-center md:text-left">
             <p className="mb-3 text-sm font-semibold text-blue-600 uppercase tracking-wider">Powered by Somali Post</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-slate-900 leading-tight">
              Unlock Somalia with 6 Digits
            </h1>
            <p className="text-lg md:text-xl mb-10 max-w-lg text-slate-600 leading-relaxed mx-auto md:mx-0">
              Discover precise locations across Somalia using a unique six-digit code.
            </p>
            <Link
              to="/register"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition duration-200 shadow hover:shadow-md"
            >
              Get Started
            </Link>
          </div>

          {/* --- Right Column: Image --- */}
          <div className="text-center">
             {/* --- >>> UPDATED IMAGE SOURCE <<< --- */}
             <img
                src="/images/Heromap.svg" // Use the correct SVG filename
                alt="Stylized map of Somalia showing 6D address system concept" // Updated alt text
                className="max-w-full h-auto rounded-lg mx-auto" // Removed shadow as SVG might have its own or look better without
                // width={600} // Keep commented out unless needed
                // height={450}
              />
             {/* --- >>> END IMAGE UPDATE <<< --- */}
          </div>
        </div>
      </section>

      {/* --- Features/Benefits Section (Remains the same) --- */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center text-gray-800"> Simple Address, Powerful Benefits </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          <div className="text-center p-6"> <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-blue-100 text-blue-600"> <FiSend size={32} /> </div> <h3 className="font-semibold mb-2 text-xl text-gray-800">Reliable Mail & Packages</h3> <p className="text-base text-gray-500 leading-relaxed">Ensure deliveries reach your doorstep accurately, every time.</p> </div>
          <div className="text-center p-6"> <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-green-100 text-green-600"> <FiMap size={32} /> </div> <h3 className="font-semibold mb-2 text-xl text-gray-800">Efficient Services</h3> <p className="text-base text-gray-500 leading-relaxed">Faster taxi, food delivery, emergency response, and navigation.</p> </div>
          <div className="text-center p-6"> <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-purple-100 text-purple-600"> <FiCheckCircle size={32} /> </div> <h3 className="font-semibold mb-2 text-xl text-gray-800">Easy to Use & Share</h3> <p className="text-base text-gray-500 leading-relaxed">Your unique 6-digit code is simple to remember and communicate.</p> </div>
        </div>
      </section>

       {/* --- "How it Works" Section (Remains the same) --- */}
      <section className="bg-slate-50 py-16 px-6 md:py-24">
          <div className="container mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center text-gray-800"> Get Your Code in Minutes </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 text-center">
                  <div className="flex flex-col items-center"> <div className="relative mb-4"> <span className="block w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-semibold flex items-center justify-center">1</span> <div className="hidden md:block absolute left-full top-1/2 w-full border-t-2 border-dashed border-gray-300 ml-4"></div> </div> <h3 className="font-semibold text-lg text-gray-700">Go to Register</h3> </div>
                  <div className="flex flex-col items-center"> <div className="relative mb-4"> <span className="block w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-semibold flex items-center justify-center">2</span> <div className="hidden md:block absolute left-full top-1/2 w-full border-t-2 border-dashed border-gray-300 ml-4"></div> </div> <h3 className="font-semibold text-lg text-gray-700">Pinpoint Location</h3> </div>
                  <div className="flex flex-col items-center"> <div className="relative mb-4"> <span className="block w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-semibold flex items-center justify-center">3</span> <div className="hidden md:block absolute left-full top-1/2 w-full border-t-2 border-dashed border-gray-300 ml-4"></div> </div> <h3 className="font-semibold text-lg text-gray-700">Get 6D Code</h3> </div>
                  <div className="flex flex-col items-center"> <div className="relative mb-4"> <span className="block w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-semibold flex items-center justify-center">4</span> </div> <h3 className="font-semibold text-lg text-gray-700">Add Mobile & Submit</h3> </div>
              </div>
           </div>
      </section>

      {/* --- About Somali Post Section (Remains the same) --- */}
       <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div>
                 <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-gray-800"> A Somali Post Initiative </h2>
                 <p className="text-lg text-gray-600 mb-4 leading-relaxed"> The Somali 6D Digital Address system is proudly managed by Somali Post, the national postal service of Somalia. </p>
                 <p className="text-gray-600 mb-6 leading-relaxed"> Our goal is to provide every citizen with a reliable and modern addressing solution, facilitating commerce, essential services, and national development through improved logistics and location identification. This system ensures privacy with its non-reversible code linked securely to your mobile number. </p>
                  <Link to="/register" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800 group" > Register your location today <FiArrowRight className="ml-2 w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" /> </Link>
             </div>
             <div className="text-center flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-10 rounded-xl border border-sky-100 min-h-[250px]">
                  <img src="/images/SomPostLogo.png" alt="Somali Postal Service" className="max-h-40 w-auto" />
             </div>
          </div>
      </section>

    </div>
  );
};

export default HomePage;