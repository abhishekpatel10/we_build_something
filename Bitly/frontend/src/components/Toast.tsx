import React from 'react';
import type { ToastMessage } from '../types';
import { CheckIcon, XIcon, ActivityIcon } from './Icons';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-portal">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-bubble toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckIcon size={16} />}
            {toast.type === 'error' && <XIcon size={16} />}
            {toast.type === 'info' && <ActivityIcon size={16} />}
          </div>
          <div className="toast-body">{toast.message}</div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Close notification"
          >
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
