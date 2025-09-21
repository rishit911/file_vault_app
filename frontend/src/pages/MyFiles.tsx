import React, { useState, useEffect } from 'react';
import { graphqlQuery, GRAPHQL_QUERIES, GRAPHQL_MUTATIONS, filesAPI } from '../api';
import { formatBytes, formatRelativeTime, getMimeTypeIcon, debounce } from '../utils';
import FileUploader from '../components/FileUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareModal from '../components/ShareModal';
import FolderTree from '../components/FolderTree';
import MoveToFolderModal from '../components/MoveToFolderModal';
import { 
  Search, 
  Filter, 
  Share2, 
  Trash2, 
  Tag,
  FileText,
  RefreshCw,
  FolderOpen,
  Move
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileItem {
  id: string;
  filename: string;
  visibility: string;
  uploadedAt: string;
  fileObject: {
    id: string;
    hash: string;
    sizeBytes: number;
    mimeType: string;
    refCount: number;
    createdAt: string;
  };
  user: {
    id: string;
    email: string;
  };
  tags: Array<{
    id: string;
    name: string;
  }>;
}

interface FileFilter {
  search: string;
  mimeTypes: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
  tags: string[];
  folderId?: string | null;
}

export default function MyFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FileFilter>({
    search: '',
    mimeTypes: [],
    tags: [],
    folderId: null,
  });
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    fileId: string;
    filename: string;
  }>({
    isOpen: false,
    fileId: '',
    filename: '',
  });
  const [moveModal, setMoveModal] = useState<{
    isOpen: boolean;
    fileIds: string[];
  }>({
    isOpen: false,
    fileIds: [],
  });

  const pageSize = 20;

  useEffect(() => {
    fetchFiles();
  }, [currentPage, filter, selectedFolderId]);

  useEffect(() => {
    setFilter(prev => ({ ...prev, folderId: selectedFolderId }));
    setCurrentPage(1);
  }, [selectedFolderId]);

  const debouncedSearch = debounce((searchTerm: string) => {
    setFilter(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      
      const variables = {
        filter: {
          filenameContains: filter.search || undefined,
          mimeTypes: filter.mimeTypes.length > 0 ? filter.mimeTypes : undefined,
          minSize: filter.minSize,
          maxSize: filter.maxSize,
          dateFrom: filter.dateFrom,
          dateTo: filter.dateTo,
          tags: filter.tags.length > 0 ? filter.tags : undefined,
          folderId: filter.folderId,
        },
        pagination: {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        },
      };

      const data = filter.search 
        ? await graphqlQuery(GRAPHQL_QUERIES.SEARCH_FILES, { q: filter.search, ...variables })
        : await graphqlQuery(GRAPHQL_QUERIES.MY_FILES, variables);

      const result = filter.search ? data.searchFiles : data.files;
      setFiles(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFiles = async () => {
    setIsRefreshing(true);
    await fetchFiles();
    setIsRefreshing(false);
    toast.success('Files refreshed');
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await filesAPI.delete(fileId);
      toast.success('File deleted successfully');
      fetchFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) return;

    try {
      await Promise.all(
        Array.from(selectedFiles).map(fileId => filesAPI.delete(fileId))
      );
      toast.success(`${selectedFiles.size} files deleted successfully`);
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error('Failed to delete files:', error);
      toast.error('Failed to delete some files');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const handleShare = (fileId: string, filename: string) => {
    setShareModal({
      isOpen: true,
      fileId,
      filename,
    });
  };

  const closeShareModal = () => {
    setShareModal({
      isOpen: false,
      fileId: '',
      filename: '',
    });
  };

  const handleMoveFiles = (fileIds: string[]) => {
    setMoveModal({
      isOpen: true,
      fileIds,
    });
  };

  const closeMoveModal = () => {
    setMoveModal({
      isOpen: false,
      fileIds: [],
    });
  };

  const handleMoveComplete = () => {
    setSelectedFiles(new Set());
    fetchFiles();
    closeMoveModal();
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex h-full">
      {/* Sidebar with Folder Tree */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        <FolderTree 
          onFolderSelect={handleFolderSelect}
          selectedFolderId={selectedFolderId}
          onRefresh={fetchFiles}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Files</h1>
                {selectedFolderId && (
                  <>
                    <span className="text-gray-400">/</span>
                    <FolderOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-lg text-gray-700 dark:text-gray-300">Current Folder</span>
                  </>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {totalCount} files • {formatBytes(files.reduce((sum, f) => sum + f.fileObject.sizeBytes, 0))} total
              </p>
            </div>
            <button
              type="button"
              onClick={refreshFiles}
              disabled={isRefreshing}
              className="btn-secondary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* File Uploader */}
          <FileUploader onUploaded={fetchFiles} selectedFolderId={selectedFolderId} />

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                className="input pl-10"
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  File Type
                </label>
                <select
                  className="input"
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilter(prev => ({
                      ...prev,
                      mimeTypes: value ? [value] : []
                    }));
                  }}
                >
                  <option value="">All types</option>
                  <option value="image/">Images</option>
                  <option value="video/">Videos</option>
                  <option value="audio/">Audio</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text/">Text</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  className="input"
                  onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  className="input"
                  onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFiles.size} files selected
                </span>
                <div className="flex space-x-2">
                  <button 
                    type="button" 
                    onClick={() => handleMoveFiles(Array.from(selectedFiles))} 
                    className="btn-secondary"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Move to Folder
                  </button>
                  <button type="button" onClick={handleBulkDelete} className="btn-danger">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* Files Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No files found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Upload some files to get started
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedFiles.size === files.length && files.length > 0}
                        onChange={selectAllFiles}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">
                            {getMimeTypeIcon(file.fileObject.mimeType)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.filename}
                            </p>
                            {file.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {file.tags.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatBytes(file.fileObject.sizeBytes)}
                        {file.fileObject.refCount > 1 && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            (shared {file.fileObject.refCount}x)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {file.fileObject.mimeType?.split('/')[0] || 'unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(file.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleMoveFiles([file.id])}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                            title="Move to folder"
                          >
                            <Move className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(file.id, file.filename)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400"
                            title="Share file"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(file.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title="Delete file"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} files
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

          {/* Share Modal */}
          <ShareModal
            isOpen={shareModal.isOpen}
            onClose={closeShareModal}
            fileId={shareModal.fileId}
            filename={shareModal.filename}
          />

          {/* Move to Folder Modal */}
          <MoveToFolderModal
            isOpen={moveModal.isOpen}
            onClose={closeMoveModal}
            fileIds={moveModal.fileIds}
            onMoveComplete={handleMoveComplete}
          />
        </div>
      </div>
    </div>
  );
}