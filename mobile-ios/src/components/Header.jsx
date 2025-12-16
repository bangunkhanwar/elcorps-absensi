import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ title, showBack = false }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
      <div className="flex items-center px-4 py-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-1 hover:bg-white/20 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        
        <h1 className="text-xl font-bold flex-1">{title}</h1>
        
        <div className="w-8"></div> {/* Spacer untuk alignment */}
      </div>
    </header>
  );
};

export default Header;