import React, { createContext, useState, useContext, useCallback } from 'react';
import SuccessModal from '../components/common/SuccessModal';
import ErrorModal from '../components/common/ErrorModal';
import ConfirmationModal from '../components/common/ConfirmationModal';

const ModalContext = createContext();

export const useModal = () => {
  return useContext(ModalContext);
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    type: null, // 'success', 'error', or 'confirmation'
    isOpen: false,
    message: '',
    title: '',
    onConfirm: null,
    onCancel: null,
  });

  const showConfirmation = useCallback((title, message, onConfirm) => {
    setModalState({
      type: 'confirmation',
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        hideModal();
      },
      onCancel: () => hideModal(),
    });
  }, []);

  const showSuccess = useCallback((message, onConfirm) => {
    setModalState({
      type: 'success',
      isOpen: true,
      message,
      onConfirm,
    });
  }, []);

  const showError = useCallback((message, onConfirm) => {
    setModalState({
      type: 'error',
      isOpen: true,
      message,
      onConfirm,
    });
  }, []);

  const hideModal = () => {
    if (modalState.type !== 'confirmation' && modalState.onConfirm) {
      modalState.onConfirm();
    }
    setModalState({
      type: null,
      isOpen: false,
      message: '',
      title: '',
      onConfirm: null,
      onCancel: null,
    });
  };

  return (
    <ModalContext.Provider value={{ showSuccess, showError, showConfirmation }}>
      {children}
      <SuccessModal
        isOpen={modalState.type === 'success'}
        message={modalState.message}
        onClose={hideModal}
      />
      <ErrorModal
        isOpen={modalState.type === 'error'}
        message={modalState.message}
        onClose={hideModal}
      />
      <ConfirmationModal
        isOpen={modalState.type === 'confirmation'}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onCancel}
      />
    </ModalContext.Provider>
  );
};

