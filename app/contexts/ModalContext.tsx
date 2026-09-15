// src/contexts/ModalContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmModal, { ModalOptions, ModalType } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  onConfirm?: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ModalType;
}

interface ModalContextType {
  showConfirm: (options: ModalOptions) => void;
  confirm: (options: Omit<ModalOptions, 'onConfirm' | 'onCancel'>) => Promise<boolean>;
  showAlert: (message: string, title?: string, type?: ModalType) => void;
  alert: (message: string, title?: string, type?: ModalType) => Promise<void>;
  showPrompt: (options: PromptOptions) => void;
  prompt: (options: Omit<PromptOptions, 'onConfirm' | 'onCancel'>) => Promise<string | null>;
  showToast: (message: string, type?: ModalType, durationMs?: number) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalOptions(null);
  }, []);

  // 1. showConfirm (Callback-based)
  const showConfirm = useCallback((options: ModalOptions) => {
    setModalOptions({
      mode: 'confirm',
      ...options,
    });
    setModalOpen(true);
  }, []);

  // 2. confirm (Promise-based)
  const confirm = useCallback((options: Omit<ModalOptions, 'onConfirm' | 'onCancel'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalOptions({
        mode: 'confirm',
        ...options,
        onConfirm: () => {
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
      setModalOpen(true);
    });
  }, []);

  // 3. showAlert (Callback-based)
  const showAlert = useCallback((message: string, title?: string, type: ModalType = 'info') => {
    const defaultTitle = type === 'error' ? 'خطا' : type === 'success' ? 'عملیات موفق' : type === 'warning' ? 'هشدار' : 'اطلاعیه';
    setModalOptions({
      mode: 'alert',
      title: title || defaultTitle,
      message,
      confirmText: 'متوجه شدم',
      type,
      onConfirm: () => {},
    });
    setModalOpen(true);
  }, []);

  // 4. alert (Promise-based)
  const alert = useCallback((message: string, title?: string, type: ModalType = 'info'): Promise<void> => {
    return new Promise((resolve) => {
      const defaultTitle = type === 'error' ? 'خطا' : type === 'success' ? 'عملیات موفق' : type === 'warning' ? 'هشدار' : 'اطلاعیه';
      setModalOptions({
        mode: 'alert',
        title: title || defaultTitle,
        message,
        confirmText: 'متوجه شدم',
        type,
        onConfirm: () => {
          resolve();
        },
      });
      setModalOpen(true);
    });
  }, []);

  // 5. showPrompt (Callback-based)
  const showPrompt = useCallback((options: PromptOptions) => {
    setModalOptions({
      mode: 'prompt',
      ...options,
      onConfirm: (val) => options.onConfirm?.(val || ''),
    });
    setModalOpen(true);
  }, []);

  // 6. prompt (Promise-based)
  const prompt = useCallback((options: Omit<PromptOptions, 'onConfirm' | 'onCancel'>): Promise<string | null> => {
    return new Promise((resolve) => {
      setModalOptions({
        mode: 'prompt',
        ...options,
        onConfirm: (val) => {
          resolve(val !== undefined ? val : '');
        },
        onCancel: () => {
          resolve(null);
        },
      });
      setModalOpen(true);
    });
  }, []);

  // 7. showToast (اعلان‌های سبک و غیرمزاحم)
  const showToast = useCallback((message: string, type: ModalType = 'info', durationMs: number = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastIcons = {
    info: <Info size={18} className="text-blue-500 shrink-0" />,
    success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
    error: <AlertOctagon size={18} className="text-rose-500 shrink-0" />,
  };

  const toastBorders = {
    info: 'border-blue-200 bg-white text-slate-800 shadow-blue-500/10',
    success: 'border-emerald-200 bg-white text-slate-800 shadow-emerald-500/10',
    warning: 'border-amber-200 bg-white text-slate-800 shadow-amber-500/10',
    error: 'border-rose-200 bg-white text-slate-800 shadow-rose-500/10',
  };

  return (
    <ModalContext.Provider
      value={{
        showConfirm,
        confirm,
        showAlert,
        alert,
        showPrompt,
        prompt,
        showToast,
        closeModal,
      }}
    >
      {children}
      <ConfirmModal isOpen={modalOpen} options={modalOptions} onClose={closeModal} />

      {/* نوتیفیکیشن‌های شناور (Toasts) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 pointer-events-none max-w-md w-[calc(100%-2rem)]" dir="rtl">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl ${toastBorders[t.type]}`}
            >
              <div className="flex items-center gap-2.5">
                {toastIcons[t.type]}
                <span className="text-xs sm:text-sm font-bold leading-normal">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="بستن اعلان"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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