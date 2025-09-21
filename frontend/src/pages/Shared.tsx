import React, { useState, useEffect } from 'react';
import { formatRelativeTime, copyToClipboard } from '../utils';
import { Share2, Copy, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
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

export default function Shared() {
    const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchSharedLinks();
    }, []);

    const fetchSharedLinks = async () => {
        try {
            setIsLoading(true);
            
            const data = await graphqlQuery(GRAPHQL_QUERIES.LIST_SHARES, {
                limit: 100,
                offset: 0
            });
            
            setSharedLinks(data.listShares || []);
        } catch (error) {
            console.error('Failed to fetch shared links:', error);
            toast.error('Failed to load shared links');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshShares = async () => {
        setIsRefreshing(true);
        await fetchSharedLinks();
        setIsRefreshing(false);
        toast.success('Shares refreshed');
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
            fetchSharedLinks();
        } catch (error) {
            console.error('Failed to revoke share:', error);
            toast.error('Failed to revoke share');
        }
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Links</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your shared files and folders ({sharedLinks.length} shares)
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refreshShares}
                    disabled={isRefreshing}
                    className="btn-secondary"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Shared Links List */}
            <div className="card">
                {sharedLinks.length === 0 ? (
                    <div className="text-center py-12">
                        <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No shared links yet</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            Share files or folders to see them here
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
            </div>
        </div>
    );
}