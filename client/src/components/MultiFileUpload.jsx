import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';

const MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

export function MultiFileUpload({ files, onFilesChange, accept, label, maxFiles = MAX_FILES, maxSize = DEFAULT_MAX_SIZE, onError }) {
  const currentCount = files?.length ?? 0;
  const remaining = Math.max(0, maxFiles - currentCount);
  const [error, setError] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(new Set());

  const handleError = (message) => {
    setError(message);
    if (onError) onError(message);
    setTimeout(() => setError(null), 5000);
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error = rejection.errors[0];
      
      let errorMessage = 'File upload failed';
      if (error.code === 'file-too-large') {
        errorMessage = `File "${rejection.file.name}" is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
      } else if (error.code === 'file-invalid-type') {
        errorMessage = `File "${rejection.file.name}" is not a PDF. Please upload PDF files only`;
      } else if (error.code === 'too-many-files') {
        errorMessage = `You can only upload ${remaining} more file${remaining !== 1 ? 's' : ''}`;
      } else {
        errorMessage = error.message || `File "${rejection.file.name}" was rejected`;
      }
      
      handleError(errorMessage);
    }

    if (acceptedFiles.length === 0) return;

    const existing = files ?? [];
    const toAdd = Math.min(acceptedFiles.length, remaining);
    
    if (toAdd === 0) {
      handleError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles = acceptedFiles.slice(0, toAdd);
    const loadingSet = new Set(newFiles.map(f => f.name));
    setLoadingFiles(loadingSet);

    const readers = newFiles.map((file) => {
      return new Promise((resolve, reject) => {
        // Validate file size
        if (file.size > maxSize) {
          reject(new Error(`File "${file.name}" exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`));
          return;
        }

        const reader = new FileReader();
        
        reader.onerror = () => {
          reject(new Error(`Failed to read file "${file.name}"`));
        };
        
        reader.onabort = () => {
          reject(new Error(`Reading file "${file.name}" was cancelled`));
        };
        
        reader.onload = () => {
          try {
            const result = reader.result;
            if (!result || typeof result !== 'string') {
              throw new Error('Invalid file data');
            }
            resolve({ base64: result, name: file.name });
          } catch (err) {
            reject(new Error(`Failed to process file "${file.name}"`));
          }
        };
        
        try {
          reader.readAsDataURL(file);
        } catch (err) {
          reject(new Error(`Failed to read file "${file.name}"`));
        }
      });
    });

    Promise.allSettled(readers).then((results) => {
      const successful = [];
      const failed = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({ file: newFiles[index].name, error: result.reason.message });
        }
      });

      if (failed.length > 0) {
        const errorMessages = failed.map(f => `${f.file}: ${f.error}`).join('; ');
        handleError(`Some files failed to upload: ${errorMessages}`);
      }

      if (successful.length > 0) {
        onFilesChange([...existing, ...successful.map((r) => r.base64)]);
      }

      setLoadingFiles(new Set());
    });
  }, [files, remaining, maxFiles, maxSize, onFilesChange, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { 'application/pdf': ['.pdf'] } : undefined,
    maxFiles: remaining,
    maxSize,
    disabled: remaining === 0,
  });

  const removeFile = (index) => {
    const next = [...(files ?? [])];
    next.splice(index, 1);
    onFilesChange(next.length ? next : null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
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

      {files?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Resumes ({files.length} / {maxFiles})
          </p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((_, index) => (
              <li
                key={index}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <File className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  <span className="text-sm text-gray-800 truncate">
                    Resume {index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
                  aria-label={`Remove resume ${index + 1}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loadingFiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Processing {loadingFiles.size} file{loadingFiles.size !== 1 ? 's' : ''}...
          </p>
        </div>
      )}

      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            error
              ? 'border-red-300 bg-red-50'
              : isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              error ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <Upload className={`h-6 w-6 ${error ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-600">
              {isDragActive
                ? 'Drop PDFs here...'
                : `Drag & drop or click to select (up to ${remaining} more)`}
            </p>
            <p className="text-xs text-gray-500">
              Max {maxFiles} resumes · {formatFileSize(maxSize)} per file
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
