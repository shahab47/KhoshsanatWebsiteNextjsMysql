// src/contexts/ModalContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmModal, { ModalOptions } from '@/components/ui/ConfirmModal';

interface ModalContextType {
  showConfirm: (options: ModalOptions) => void;
  showAlert: (message: string, title?: string, type?: ModalOptions['type']) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

  const showConfirm = useCallback((options: ModalOptions) => {
    setModalOptions(options);
    setModalOpen(true);
  }, []);

  const showAlert = useCallback((message: string, title?: string, type: ModalOptions['type'] = 'info') => {
    setModalOptions({
      title: title || (type === 'error' ? 'خطا' : 'اطلاعیه'),
      message,
      confirmText: 'باشه',
      type,
      onConfirm: () => {},
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalOptions(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      <ConfirmModal isOpen={modalOpen} options={modalOptions} onClose={closeModal} />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}