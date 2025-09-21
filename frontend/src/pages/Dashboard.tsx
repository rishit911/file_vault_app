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

interface RecentFile {
  id: string;
  filename: string;
  uploadedAt: string;
  fileObject: {
    sizeBytes: number;
    mimeType: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
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
    </div>
  );
}