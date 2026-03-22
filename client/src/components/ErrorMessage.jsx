import { AlertCircle, RefreshCw, Info } from 'lucide-react';

export function ErrorMessage({ error, onRetry }) {
  // Extract error message and determine error type
  const errorMessage = error?.message || error?.data?.message || 'An unexpected error occurred during analysis.';
  const errorCode = error?.data?.code || error?.code;
  
  // Categorize error types for better UX
  const getErrorDetails = () => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection and try again.',
        type: 'network'
      };
    }
    
    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. This might be due to large files or server load. Please try again.',
        type: 'timeout'
      };
    }
    
    if (message.includes('pdf') || message.includes('parse')) {
      return {
        title: 'PDF Processing Error',
        description: 'There was an issue processing one or more PDF files. Please ensure files are valid PDFs and try again.',
        type: 'pdf'
      };
    }
    
    if (message.includes('rate limit') || message.includes('too many')) {
      return {
        title: 'Rate Limit Exceeded',
        description: 'Too many requests. Please wait a moment before trying again.',
        type: 'rate-limit'
      };
    }
    
    if (message.includes('authentication') || message.includes('api key')) {
      return {
        title: 'Authentication Error',
        description: 'There was an issue with authentication. Please contact support if this persists.',
        type: 'auth'
      };
    }
    
    return {
      title: 'Analysis Failed',
      description: errorMessage,
      type: 'generic'
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="card border-red-200 bg-red-50">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-red-900 mb-2">
            {errorDetails.title}
          </h3>
          <p className="text-red-700 mb-3">
            {errorDetails.description}
          </p>
          
          {errorCode && (
            <div className="mb-4 p-3 bg-red-100 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 text-red-800 text-sm">
                <Info className="h-4 w-4" />
                <span>Error Code: {errorCode}</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
