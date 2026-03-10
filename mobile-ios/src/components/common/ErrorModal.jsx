import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center animate-scale-in">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-red-600" size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-red-700 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
