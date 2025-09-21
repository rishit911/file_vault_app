import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { graphqlQuery, GRAPHQL_QUERIES } from '../api';
import { formatBytes, getMimeTypeIcon } from '../utils';
import { Download, File, Folder, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Share {
  id: string;
  token: string;
  public: boolean;
  fileId?: string;
  folderId?: string;
  maxDownloads?: number;
  expiresAt?: string;
  createdAt: string;
}

export default function PublicShare() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<Share | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchShare();
    }
  }, [token]);

  const fetchShare = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await graphqlQuery(GRAPHQL_QUERIES.SHARE_BY_TOKEN, { token });
      
      if (data.shareByToken) {
        setShare(data.shareByToken);
      } else {
        setError('This shared link does not exist or has expired.');
      }
    } catch (error: any) {
      console.error('Failed to fetch share:', error);
      if (error.message?.includes('not found')) {
        setError('This shared link does not exist or has expired.');
      } else if (error.message?.includes('forbidden')) {
        setError('This shared link has reached its download limit.');
      } else {
        setError('Failed to load shared content. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (share && token) {
      // Use the backend URL for downloads
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const downloadUrl = `${backendUrl}/s/${token}`;
      window.location.href = downloadUrl; // Use location.href for file downloads
      toast.success('Download started');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Content
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Content Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The shared content could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
            {share.fileId ? (
              <File className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            ) : (
              <Folder className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Shared {share.fileId ? 'File' : 'Folder'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Shared via FileVault
          </p>
        </div>

        {/* Content */}
        <div className="card p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {share.fileId ? '📄' : '📁'}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Shared {share.fileId ? 'File' : 'Folder'}
            </h2>
            <div className="mb-6 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Access:</span> {share.public ? 'Public' : 'Private'}
              </p>
              {share.maxDownloads && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Max Downloads:</span> {share.maxDownloads}
                </p>
              )}
              {share.expiresAt && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Expires:</span> {new Date(share.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary inline-flex items-center"
            >
              <Download className="h-5 w-5 mr-2" />
              Download {share.fileId ? 'File' : 'Folder'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by{' '}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              FileVault
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}