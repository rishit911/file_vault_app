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

interface FolderFile {
  filename: string;
  size: number;
  mimeType: string;
  downloadUrl: string;
}

export default function PublicShare() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<Share | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

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
        
        // If it's a folder share, fetch the manifest
        if (data.shareByToken.folderId) {
          await fetchFolderManifest();
        }
      } else {
        setError('This shared link does not exist or has expired.');
      }
    } catch (error: any) {
      console.error('Failed to fetch share:', error);
      
      // Handle specific HTTP status codes
      if (error.response?.status === 410) {
        setError('expired');
      } else if (error.response?.status === 403) {
        setError('limit_reached');
      } else if (error.message?.includes('not found')) {
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

  const fetchFolderManifest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/s/${token}`);
      
      if (response.ok) {
        const manifest = await response.json();
        if (manifest.files) {
          setFolderFiles(manifest.files.map((file: any) => ({
            filename: file.filename,
            size: file.size,
            mimeType: file.mimeType,
            downloadUrl: `${backendUrl}/s/${token}/${encodeURIComponent(file.filename)}`
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch folder manifest:', error);
    }
  };

  const handleDownload = (filename?: string) => {
    if (share && token) {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const downloadUrl = filename 
        ? `${backendUrl}/s/${token}/${encodeURIComponent(filename)}`
        : `${backendUrl}/s/${token}`;
      
      if (filename) {
        setIsDownloading(filename);
        setTimeout(() => setIsDownloading(null), 2000);
      }
      
      window.location.href = downloadUrl;
      toast.success(`Download started${filename ? `: ${filename}` : ''}`);
    }
  };

  const handleDownloadAll = async () => {
    if (folderFiles.length === 0) return;
    
    toast.success(`Starting download of ${folderFiles.length} files...`);
    
    for (const file of folderFiles) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
      handleDownload(file.filename);
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
    const getErrorContent = () => {
      switch (error) {
        case 'expired':
          return {
            icon: '⏰',
            title: 'This link has expired',
            message: 'The shared link you\'re trying to access has expired and is no longer available.',
            showRetry: false
          };
        case 'limit_reached':
          return {
            icon: '🚫',
            title: 'Download limit reached',
            message: 'This shared link has reached its maximum number of downloads and is no longer available.',
            showRetry: false
          };
        default:
          return {
            icon: '❌',
            title: 'Unable to Load Content',
            message: error,
            showRetry: true
          };
      }
    };

    const errorContent = getErrorContent();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">{errorContent.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {errorContent.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {errorContent.message}
          </p>
          <div className="space-y-3">
            {errorContent.showRetry && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Try Again
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="btn-secondary w-full"
            >
              Return Home
            </button>
          </div>
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
          {share.fileId ? (
            // Single File Share
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Shared File
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
                onClick={() => handleDownload()}
                className="btn-primary inline-flex items-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Download File
              </button>
            </div>
          ) : (
            // Folder Share with Manifest
            <div>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Shared Folder
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {folderFiles.length} files available for download
                </p>
              </div>

              {folderFiles.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Files in this folder
                    </h3>
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      className="btn-primary inline-flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            File Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {folderFiles.map((file, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-2xl mr-3">
                                  {getMimeTypeIcon(file.mimeType)}
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {file.filename}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {file.mimeType || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => handleDownload(file.filename)}
                                disabled={isDownloading === file.filename}
                                className="btn-secondary inline-flex items-center"
                              >
                                {isDownloading === file.filename ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                                    Downloading...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="text-center space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">Access:</span> {share.public ? 'Public' : 'Private'}</p>
                {share.maxDownloads && (
                  <p><span className="font-medium">Max Downloads:</span> {share.maxDownloads}</p>
                )}
                {share.expiresAt && (
                  <p><span className="font-medium">Expires:</span> {new Date(share.expiresAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}
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