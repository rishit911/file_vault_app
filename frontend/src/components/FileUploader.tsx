import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { filesAPI } from '../api';
import { formatBytes } from '../utils';
import { Upload, X, CheckCircle, AlertCircle, File } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploaderProps {
  onUploaded?: () => void;
  className?: string;
}

export default function FileUploader({ onUploaded, className = '' }: FileUploaderProps) {
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newItems: FileUploadItem[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
    }));

    setUploadItems((prev) => [...prev, ...newItems]);
    setIsUploading(true);

    // Upload files one by one
    for (const item of newItems) {
      try {
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'uploading' } : i
          )
        );

        const formData = new FormData();
        formData.append('files', item.file);

        await filesAPI.upload(formData, (progress) => {
          setUploadItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, progress } : i
            )
          );
        });

        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'success', progress: 100 } : i
          )
        );

        toast.success(`${item.file.name} uploaded successfully`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: errorMessage } : i
          )
        );

        toast.error(`Failed to upload ${item.file.name}: ${errorMessage}`);
      }
    }

    setIsUploading(false);
    onUploaded?.();
  }, [onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: isUploading,
  });

  const removeItem = (id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setUploadItems((prev) => prev.filter((item) => item.status === 'uploading'));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              or click to select files (multiple files allowed)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadItems.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Upload Progress ({uploadItems.length} files)
            </h3>
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear completed
            </button>
          </div>

          <div className="space-y-3">
            {uploadItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.file.name}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  
                  {item.status === 'uploading' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {item.status === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {item.error}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {item.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {item.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600" />
                  )}
                  {(item.status === 'success' || item.status === 'error') && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}