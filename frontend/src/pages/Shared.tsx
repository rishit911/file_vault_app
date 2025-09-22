import React, { useState, useEffect } from 'react';
import { formatRelativeTime, copyToClipboard } from '../utils';
import { Share2, Copy, ExternalLink, Trash2, RefreshCw, Users, MessageSquare, Download } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { graphqlQuery, GRAPHQL_QUERIES, GRAPHQL_MUTATIONS } from '../api';
import toast from 'react-hot-toast';

interface SharedLink {
    id: string;
    token: string;
    fileId?: string;
    folderId?: string;
    public: boolean;
    expiresAt?: string;
    maxDownloads?: number;
    createdAt: string;
}

interface UserShare {
    id: string;
    sharedAt: string;
    message?: string;
    file: {
        id: string;
        filename: string;
        fileObject: {
            id: string;
            sizeBytes: number;
            mimeType?: string;
        };
    };
    owner: {
        id: string;
        email: string;
        username?: string;
    };
    sharedWith?: {
        id: string;
        email: string;
        username?: string;
    };
}

export default function Shared() {
    const [activeTab, setActiveTab] = useState<'public' | 'user-shares' | 'shared-with-me'>('shared-with-me');
    const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
    const [userShares, setUserShares] = useState<UserShare[]>([]);
    const [sharedWithMe, setSharedWithMe] = useState<UserShare[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            
            if (activeTab === 'public') {
                const data = await graphqlQuery(GRAPHQL_QUERIES.LIST_SHARES, {
                    limit: 100,
                    offset: 0
                });
                setSharedLinks(data.listShares || []);
            } else if (activeTab === 'user-shares') {
                const data = await graphqlQuery(GRAPHQL_QUERIES.MY_USER_SHARES, {
                    limit: 100,
                    offset: 0
                });
                setUserShares(data.myUserShares || []);
            } else if (activeTab === 'shared-with-me') {
                const data = await graphqlQuery(GRAPHQL_QUERIES.SHARED_WITH_ME, {
                    limit: 100,
                    offset: 0
                });
                setSharedWithMe(data.sharedWithMe || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load shared files');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshData = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
        toast.success('Data refreshed');
    };

    const handleCopyLink = async (token: string) => {
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/s/${token}`;
        
        try {
            await copyToClipboard(shareUrl);
            toast.success('Link copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const handleRevokeShare = async (token: string) => {
        if (!confirm('Are you sure you want to revoke this share? The link will no longer work.')) {
            return;
        }

        try {
            await graphqlQuery(GRAPHQL_MUTATIONS.REVOKE_SHARE, { token });
            toast.success('Share revoked successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to revoke share:', error);
            toast.error('Failed to revoke share');
        }
    };

    const handleUnshareWithUser = async (userShareId: string) => {
        if (!confirm('Are you sure you want to stop sharing this file with this user?')) {
            return;
        }

        try {
            await graphqlQuery(GRAPHQL_MUTATIONS.UNSHARE_WITH_USER, { userShareId });
            toast.success('File unshared successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to unshare file:', error);
            toast.error('Failed to unshare file');
        }
    };

    const handleDownloadSharedFile = async (share: UserShare) => {
        try {
            // Create a download URL for the shared file
            const downloadUrl = `/api/v1/shared-files/${share.id}/download`;
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = share.file.filename;
            
            // Add authorization header by creating a form with token
            const token = localStorage.getItem('fv_token');
            if (token) {
                // Use fetch to download with authorization
                const response = await fetch(downloadUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success('File downloaded successfully');
                } else {
                    throw new Error('Download failed');
                }
            }
        } catch (error) {
            console.error('Failed to download file:', error);
            toast.error('Failed to download file');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Files</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your shared files and view files shared with you
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="btn-secondary"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('shared-with-me')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'shared-with-me'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Users className="h-4 w-4 inline mr-2" />
                        Shared with Me ({sharedWithMe.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('user-shares')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'user-shares'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Users className="h-4 w-4 inline mr-2" />
                        My User Shares ({userShares.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('public')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'public'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Share2 className="h-4 w-4 inline mr-2" />
                        Public Links ({sharedLinks.length})
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="card">
                {/* Shared with Me Tab */}
                {activeTab === 'shared-with-me' && (
                    <>
                        {sharedWithMe.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No files shared with you yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Files shared by other users will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                File
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Shared By
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Message
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Shared At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {sharedWithMe.map((share) => (
                                            <tr key={share.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {share.file.filename}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatFileSize(share.file.fileObject.sizeBytes)}
                                                                {share.file.fileObject.mimeType && ` • ${share.file.fileObject.mimeType}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    <div>
                                                        <p className="font-medium">
                                                            {share.owner.username || share.owner.email}
                                                        </p>
                                                        {share.owner.username && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {share.owner.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {share.message ? (
                                                        <div className="flex items-start space-x-2">
                                                            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                            <span>{share.message}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No message</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatRelativeTime(share.sharedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadSharedFile(share)}
                                                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400"
                                                        title="Download file"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* My User Shares Tab */}
                {activeTab === 'user-shares' && (
                    <>
                        {userShares.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No user shares yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Files you share with other users will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                File
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Shared With
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Message
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Shared At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {userShares.map((share) => (
                                            <tr key={share.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {share.file.filename}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatFileSize(share.file.fileObject.sizeBytes)}
                                                                {share.file.fileObject.mimeType && ` • ${share.file.fileObject.mimeType}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    <div>
                                                        <p className="font-medium">
                                                            {share.sharedWith?.username || share.sharedWith?.email}
                                                        </p>
                                                        {share.sharedWith?.username && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {share.sharedWith.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {share.message ? (
                                                        <div className="flex items-start space-x-2">
                                                            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                            <span>{share.message}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No message</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatRelativeTime(share.sharedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnshareWithUser(share.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                                                        title="Stop sharing"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* Public Links Tab */}
                {activeTab === 'public' && (
                    <>
                        {sharedLinks.length === 0 ? (
                            <div className="text-center py-12">
                                <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No public links yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Create public share links to see them here
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Share Token
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Access
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Max Downloads
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Expires
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {sharedLinks.map((link) => (
                                            <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <p className="text-sm font-mono text-gray-900 dark:text-white">
                                                                {link.token}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                ID: {link.id.substring(0, 8)}...
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    {link.fileId ? 'File' : link.folderId ? 'Folder' : 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        link.public 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                                    }`}>
                                                        {link.public ? 'Public' : 'Private'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    {link.maxDownloads || 'Unlimited'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {link.expiresAt ? formatRelativeTime(link.expiresAt) : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatRelativeTime(link.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyLink(link.token)}
                                                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400"
                                                            title="Copy link"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </button>
                                                        <a
                                                            href={`${window.location.origin}/s/${link.token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400"
                                                            title="Open link"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRevokeShare(link.token)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                                                            title="Revoke share"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}