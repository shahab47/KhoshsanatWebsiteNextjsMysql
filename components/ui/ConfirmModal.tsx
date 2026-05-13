'use client';

import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export type ModalType = 'info' | 'warning' | 'error' | 'success';

export interface ModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmModalProps {
  isOpen: boolean;
  options: ModalOptions | null;
  onClose: () => void;
}

export default function ConfirmModal({ isOpen, options, onClose }: ConfirmModalProps) {
  if (!isOpen || !options) return null;

  const {
    title = 'تأیید',
    message,
    confirmText = 'تأیید',
    cancelText = 'انصراف',
    type = 'warning',
    onConfirm,
    onCancel,
  } = options;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const iconMap = {
    info: <Info className="w-6 h-6 text-blue-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
  };

  const buttonColorMap = {
    info: 'bg-blue-600 hover:bg-blue-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    error: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {iconMap[type]}
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>
        </div>
        <div className="mb-6 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
          {message}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl font-bold transition shadow-sm text-white ${buttonColorMap[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}