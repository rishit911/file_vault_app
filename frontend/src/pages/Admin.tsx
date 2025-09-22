import React, { useState, useEffect } from 'react';
import { graphqlQuery, GRAPHQL_QUERIES, adminAPI } from '../api';
import { formatBytes, formatRelativeTime } from '../utils';
import { 
  Users, 
  HardDrive, 
  Files, 
  TrendingUp, 
  Download, 
  RefreshCw,
  BarChart3,
  Activity
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalFileObjects: number;
  totalUserFiles: number;
  deduplicatedStorageBytes: number;
  logicalStorageBytes: number;
  dedupSavingsBytes: number;
}

interface AdminFile {
  id: string;
  filename: string;
  visibility: string;
  uploadedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  fileObject: {
    id: string;
    hash: string;
    sizeBytes: number;
    mimeType: string;
    refCount: number;
    createdAt: string;
  };
}

interface DownloadRecord {
  id: string;
  shareId?: string;
  fileId: string;
  downloaderId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'downloads'>('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch admin stats
      const statsData = await graphqlQuery(GRAPHQL_QUERIES.ADMIN_STATS);
      setStats(statsData.adminStats);
      
      // Fetch admin files
      const filesData = await graphqlQuery(GRAPHQL_QUERIES.ADMIN_FILES, {
        pagination: { limit: 50, offset: 0 }
      });
      setFiles(filesData.adminFiles.items);
      
      // Fetch admin downloads
      const downloadsData = await graphqlQuery(GRAPHQL_QUERIES.ADMIN_DOWNLOADS, {
        limit: 20,
        offset: 0
      });
      setDownloads(downloadsData.adminDownloads);
      
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchAdminData();
    toast.success('Admin data refreshed');
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
      title: 'Total Users',
      value: stats?.totalUsers.toString() || '0',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Total Files',
      value: stats?.totalUserFiles.toString() || '0',
      icon: Files,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Storage Used',
      value: stats ? formatBytes(stats.deduplicatedStorageBytes) : '0 Bytes',
      icon: HardDrive,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Storage Saved',
      value: stats ? formatBytes(stats.dedupSavingsBytes) : '0 Bytes',
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      subtitle: stats ? `${((stats.dedupSavingsBytes / stats.logicalStorageBytes) * 100).toFixed(1)}% saved` : '0% saved',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            System overview and management
          </p>
        </div>
        <button
          type="button"
          onClick={refreshData}
          className="btn-secondary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'files', name: 'All Files', icon: Files },
              { id: 'downloads', name: 'Downloads', icon: Download },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Storage Usage Chart */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Storage Efficiency
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats ? formatBytes(stats.logicalStorageBytes) : '0 B'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Logical Storage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats ? formatBytes(stats.deduplicatedStorageBytes) : '0 B'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Physical Storage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats ? formatBytes(stats.dedupSavingsBytes) : '0 B'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Space Saved</div>
                  </div>
                </div>
                
                {/* Simple Progress Bar Visualization */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Storage Efficiency</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stats ? `${((stats.dedupSavingsBytes / Math.max(stats.logicalStorageBytes, 1)) * 100).toFixed(1)}%` : '0%'} saved
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: stats ? `${Math.min((stats.dedupSavingsBytes / Math.max(stats.logicalStorageBytes, 1)) * 100, 100)}%` : '0%' 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    System Health
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Unique Files</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stats?.totalFileObjects || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">File References</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stats?.totalUserFiles || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Deduplication Ratio</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {stats ? `${((stats.totalUserFiles / Math.max(stats.totalFileObjects, 1)) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Downloads
                  </h3>
                  <div className="space-y-3">
                    {downloads.slice(0, 5).map((download) => (
                      <div key={download.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Download className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              File Download
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {download.ip || 'Unknown IP'} • {formatRelativeTime(download.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {download.shareId ? 'Shared' : 'Direct'}
                        </div>
                      </div>
                    ))}
                    {downloads.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                        No recent downloads
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Refs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.filename}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {file.fileObject.mimeType}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {file.user.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {file.user.role}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {formatBytes(file.fileObject.sizeBytes)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            file.fileObject.refCount > 1 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {file.fileObject.refCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(file.uploadedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'downloads' && (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Downloaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {downloads.map((download) => (
                      <tr key={download.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">
                          {download.fileId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {download.ip || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {download.userAgent || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(download.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}