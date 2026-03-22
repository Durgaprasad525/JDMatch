import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function ErrorToast({ message, onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
            aria-label="Close error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useErrorToast() {
  const [error, setError] = useState(null);

  const showError = (message) => {
    setError(message);
  };

  const clearError = () => {
    setError(null);
  };

  const ErrorToastComponent = error ? (
    <ErrorToast message={error} onClose={clearError} />
  ) : null;

  return { showError, clearError, ErrorToastComponent };
}
