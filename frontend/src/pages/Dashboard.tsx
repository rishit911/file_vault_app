import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { graphqlQuery, GRAPHQL_QUERIES } from '../api';
import { formatBytes, formatRelativeTime } from '../utils';
import { Files, HardDrive, Users, TrendingUp, Upload, Share2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface StorageStats {
  totalDedupedBytes: number;
  originalBytes: number;
  savedBytes: number;
  savedPercent: number;
}

interface QuotaInfo {
  used: number;
  total: number;
  percentage: number;
}

interface RecentFile {
  id: string;
  filename: string;
  uploadedAt: string;
  fileObject: {
    sizeBytes: number;
    mimeType: string;
  };
}

interface DeduplicatedFile {
  hash: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  refCount: number;
  spaceSaved: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [deduplicatedFiles, setDeduplicatedFiles] = useState<DeduplicatedFile[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch storage stats
      const statsData = await graphqlQuery(GRAPHQL_QUERIES.STORAGE_STATS);
      setStats(statsData.stats);
      
      // Fetch recent files
      const filesData = await graphqlQuery(GRAPHQL_QUERIES.MY_FILES, {
        pagination: { limit: 5, offset: 0 }
      });
      setRecentFiles(filesData.files.items);
      
      // Fetch all files to analyze duplicates
      const allFilesData = await graphqlQuery(GRAPHQL_QUERIES.MY_FILES, {
        pagination: { limit: 100, offset: 0 }
      });
      
      // Process files to find duplicates
      const fileMap = new Map<string, DeduplicatedFile>();
      allFilesData.files.items.forEach((file: any) => {
        const hash = file.fileObject.hash;
        if (fileMap.has(hash)) {
          const existing = fileMap.get(hash)!;
          existing.refCount += 1;
          existing.spaceSaved += file.fileObject.sizeBytes;
        } else {
          fileMap.set(hash, {
            hash,
            filename: file.filename,
            sizeBytes: file.fileObject.sizeBytes,
            mimeType: file.fileObject.mimeType,
            refCount: 1,
            spaceSaved: 0
          });
        }
      });
      
      // Filter to show only duplicated files (refCount > 1) and sort by space saved
      const duplicatedFiles = Array.from(fileMap.values())
        .filter(file => file.refCount > 1)
        .sort((a, b) => b.spaceSaved - a.spaceSaved)
        .slice(0, 5);
      
      setDeduplicatedFiles(duplicatedFiles);
      
      // Mock quota data (replace with actual API call when available)
      const mockQuota = {
        used: statsData.stats.totalDedupedBytes,
        total: 1024 * 1024 * 1024, // 1GB default quota
        percentage: (statsData.stats.totalDedupedBytes / (1024 * 1024 * 1024)) * 100
      };
      setQuota(mockQuota);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Storage',
      value: stats ? formatBytes(stats.totalDedupedBytes) : '0 Bytes',
      icon: HardDrive,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Storage Saved',
      value: stats ? formatBytes(stats.savedBytes) : '0 Bytes',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
      subtitle: stats ? `${stats.savedPercent.toFixed(1)}% saved` : '0% saved',
    },
    {
      title: 'My Files',
      value: recentFiles.length.toString(),
      icon: Files,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your FileVault activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Quota Usage */}
      {quota && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Storage Usage
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatBytes(quota.used)} / {formatBytes(quota.total)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                quota.percentage >= 95 ? 'bg-red-500' : 
                quota.percentage >= 85 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(quota.percentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {quota.percentage.toFixed(1)}% used
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {formatBytes(quota.total - quota.used)} remaining
            </span>
          </div>
          
          {/* Warning Banner */}
          {quota.percentage >= 85 && (
            <div className={`mt-4 p-3 rounded-lg ${
              quota.percentage >= 95 ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
              'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }`}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {quota.percentage >= 95 ? 
                    'Storage quota nearly full! Please delete some files or contact support.' :
                    'Storage quota warning: You\'re approaching your storage limit.'
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '/files'}
            className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Upload Files</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add new files to your vault
              </p>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/shared'}
            className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Manage Shares</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage shared links
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Files */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Files
          </h2>
          <button
            onClick={() => window.location.href = '/files'}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            View all
          </button>
        </div>
        
        {recentFiles.length > 0 ? (
          <div className="space-y-3">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Files className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.filename}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatBytes(file.fileObject.sizeBytes)} • {formatRelativeTime(file.uploadedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Files className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No files uploaded yet</p>
            <button
              onClick={() => window.location.href = '/files'}
              className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Upload your first file
            </button>
          </div>
        )}
      </div>

      {/* Deduplicated Files */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Deduplicated Files
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Space saved by deduplication
          </span>
        </div>
        
        {deduplicatedFiles.length > 0 ? (
          <div className="space-y-3">
            {deduplicatedFiles.map((file) => (
              <div
                key={file.hash}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-green-50 dark:bg-green-900/20"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Files className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatBytes(file.sizeBytes)} • {file.mimeType || 'Unknown type'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {file.refCount}x duplicated
                      </span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {formatBytes(file.spaceSaved)} saved
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {((file.spaceSaved / (file.sizeBytes * file.refCount)) * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">efficiency</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Total Space Saved by Deduplication
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {deduplicatedFiles.length} unique files with duplicates
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatBytes(deduplicatedFiles.reduce((sum, file) => sum + file.spaceSaved, 0))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats ? `${stats.savedPercent.toFixed(1)}% total savings` : '0% savings'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No duplicate files found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Upload more files to see deduplication benefits
            </p>
          </div>
        )}
      </div>
    </div>
  );
}