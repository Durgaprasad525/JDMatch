import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';

export function FileUpload({ file, onFileSelect, accept, label, maxSize = 10 * 1024 * 1024 }) {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      alert(`File rejected: ${error.message}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        onFileSelect(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, [onFileSelect]);

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
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <Upload className="h-8 w-8 text-gray-600" />
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
  );
}
