'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, AlertTriangle, Info, CheckCircle2, AlertOctagon, Loader2 } from 'lucide-react';

export type ModalType = 'info' | 'warning' | 'error' | 'success';
export type ModalMode = 'confirm' | 'alert' | 'prompt';

export interface ModalOptions {
  mode?: ModalMode;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  defaultValue?: string;
  placeholder?: string;
  onConfirm?: (inputValue?: string) => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmModalProps {
  isOpen: boolean;
  options: ModalOptions | null;
  onClose: () => void;
}

export default function ConfirmModal({ isOpen, options, onClose }: ConfirmModalProps) {
  const prefersReduced = useReducedMotion();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mode = options?.mode || 'confirm';
  const isAlert = mode === 'alert';
  const isPrompt = mode === 'prompt';

  const {
    title = isAlert ? 'اطلاعیه' : 'تأیید عملیات',
    message = '',
    confirmText = isAlert ? 'متوجه شدم' : 'تأیید',
    cancelText = 'انصراف',
    type = isAlert ? 'info' : 'warning',
    defaultValue = '',
    placeholder = '',
  } = options || {};

  // تنظیم مقدار پیش‌فرض اینپوت هنگام باز شدن
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      setIsSubmitting(false);
      if (isPrompt) {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      }
    }
  }, [isOpen, defaultValue, isPrompt]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;
    if (options?.onConfirm) {
      try {
        setIsSubmitting(true);
        await options.onConfirm(isPrompt ? inputValue : undefined);
      } finally {
        setIsSubmitting(false);
      }
    }
    onClose();
  }, [options, isPrompt, inputValue, isSubmitting, onClose]);

  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    if (options?.onCancel) options.onCancel();
    onClose();
  }, [options, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleConfirm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel, handleConfirm]);

  const badgeTheme = {
    info: {
      badge: 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-sm shadow-blue-500/10',
      icon: <Info className="w-6 h-6 shrink-0 text-blue-600" />,
      btn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500/40 shadow-blue-600/20',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-600 border border-amber-200/80 shadow-sm shadow-amber-500/10',
      icon: <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600" />,
      btn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/40 shadow-amber-600/20',
    },
    error: {
      badge: 'bg-rose-50 text-rose-600 border border-rose-200/80 shadow-sm shadow-rose-500/10',
      icon: <AlertOctagon className="w-6 h-6 shrink-0 text-rose-600" />,
      btn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500/40 shadow-rose-600/20',
    },
    success: {
      badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-sm shadow-emerald-500/10',
      icon: <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />,
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/40 shadow-emerald-600/20',
    },
  }[type];

  return (
    <AnimatePresence>
      {isOpen && options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dialog-title"
          dir="rtl"
        >
          {/* Backdrop با افکت بلور ظریف و مات صنعتی */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* کارت مودال با طراحی اختصاصی خوش‌صنعت */}
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: prefersReduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 overflow-hidden z-10 text-right"
          >
            {/* سربرگ مودال با نشانک رنگی */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${badgeTheme.badge}`}>
                  {badgeTheme.icon}
                </div>
                <div>
                  <h3 id="modal-dialog-title" className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    خوش‌صنعت پایدار
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                aria-label="بستن پنجره"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* متن پیام */}
            <div className="text-slate-600 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line my-4 font-normal">
              {message}
            </div>

            {/* اینپوت در صورت نیاز (حالت Prompt) */}
            {isPrompt && (
              <div className="my-5">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                  dir="ltr"
                />
              </div>
            )}

            {/* دکمه‌های عملیات */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              {!isAlert && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer disabled:opacity-50"
                >
                  {cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 ${badgeTheme.btn}`}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin shrink-0" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}