import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center animate-scale-in">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-yellow-600" size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-2xl font-bold text-lg hover:bg-gray-300 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-primary-dark transition"
          >
            Ya
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
