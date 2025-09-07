import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="card border-red-200 bg-red-50">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Analysis Failed
          </h3>
          <p className="text-red-700 mb-4">
            {error?.message || 'An unexpected error occurred during analysis.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
