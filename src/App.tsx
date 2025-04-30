import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/layout/Header.tsx'; // Ensure .tsx extension
import Footer from './components/layout/Footer.tsx'; // Ensure .tsx extension
import HomePage from './pages/HomePage.tsx'; // Use the real HomePage component
import RegisterMapPage from './pages/RegisterMapPage.tsx'; // <-- IMPORT THE REAL MAP PAGE

// Layout component to wrap pages with Header and Footer
const Layout: React.FC = () => {
  return (
    // Use flex column and min-h-screen to push footer down
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      {/* flex-grow allows main content to take up available space */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet /> {/* Child routes defined below will render here */}
      </main>
      <Footer />
    </div>
  );
};

// Main App component defining the routes
function App() {
  return (
    <Routes>
      {/* All routes within this <Route> will use the Layout component */}
      <Route path="/" element={<Layout />}>
        {/* The 'index' route is the default child route for '/' */}
        <Route index element={<HomePage />} /> {/* Use the imported HomePage */}
        {/* The '/register' route */}
        {/* V V V V V V V V V V V V V V V V V V V V V V V V V V V */}
        <Route path="register" element={<RegisterMapPage />} /> {/* <-- USE THE IMPORTED MAP PAGE */}
        {/* ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ */}
        {/* Add more child routes here if needed later */}
      </Route>
      {/* You could add routes outside the Layout here if needed */}
    </Routes>
  );
}

export default App;