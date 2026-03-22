import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';

export function FileUpload({ file, onFileSelect, accept, label, maxSize = 10 * 1024 * 1024, onError }) {
  const [error, setError] = useState(null);

  const handleError = (message) => {
    setError(message);
    if (onError) onError(message);
    setTimeout(() => setError(null), 5000);
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Clear previous errors
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error = rejection.errors[0];
      
      let errorMessage = 'File upload failed';
      if (error.code === 'file-too-large') {
        errorMessage = `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
      } else if (error.code === 'file-invalid-type') {
        errorMessage = 'Invalid file type. Please upload a PDF file';
      } else if (error.code === 'too-many-files') {
        errorMessage = 'Only one file is allowed';
      } else {
        errorMessage = error.message || 'File rejected';
      }
      
      handleError(errorMessage);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file size
      if (file.size > maxSize) {
        handleError(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      
      reader.onerror = () => {
        handleError('Failed to read file. Please try again.');
      };
      
      reader.onload = () => {
        try {
          const result = reader.result;
          if (!result || typeof result !== 'string') {
            throw new Error('Invalid file data');
          }
          onFileSelect(result);
          setError(null);
        } catch (err) {
          handleError('Failed to process file. Please try again.');
        }
      };
      
      reader.onabort = () => {
        handleError('File reading was cancelled');
      };
      
      try {
        reader.readAsDataURL(file);
      } catch (err) {
        handleError('Failed to read file. Please try again.');
      }
    }
  }, [onFileSelect, maxSize, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize,
  });

  const removeFile = () => {
    onFileSelect(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (file) {
    return (
      <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">PDF uploaded successfully</p>
              <p className="text-xs text-green-700">Ready for analysis</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          error
            ? 'border-red-300 bg-red-50'
            : isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-3 rounded-full ${
            error ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <Upload className={`h-8 w-8 ${error ? 'text-red-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-1">{label}</p>
            <p className="text-sm text-gray-600">
              {isDragActive
                ? 'Drop the PDF file here...'
                : 'Drag & drop a PDF file here, or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Max file size: {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
