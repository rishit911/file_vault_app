import React, { useState, useEffect } from 'react';
import { graphqlQuery, GRAPHQL_QUERIES, GRAPHQL_MUTATIONS } from '../api';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderNode {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string;
  createdAt: string;
  children?: FolderNode[];
  isExpanded?: boolean;
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  onRefresh?: () => void;
}

export default function FolderTree({ onFolderSelect, selectedFolderId, onRefresh }: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderNode | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const data = await graphqlQuery(GRAPHQL_QUERIES.MY_FOLDERS, {
        limit: 1000,
        offset: 0
      });
      
      const folderList = data.myFolders || [];
      const folderTree = buildFolderTree(folderList);
      setFolders(folderTree);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const buildFolderTree = (folderList: FolderNode[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create map of all folders
    folderList.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [], isExpanded: false });
    });

    // Build tree structure
    folderList.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children!.push(folderNode);
        } else {
          // Parent not found, treat as root
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      await graphqlQuery(GRAPHQL_MUTATIONS.CREATE_FOLDER, {
        input: {
          name: newFolderName.trim(),
          parentId: parentFolderId,
        }
      });

      toast.success('Folder created successfully');
      setNewFolderName('');
      setParentFolderId(null);
      setShowCreateModal(false);
      fetchFolders();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!editName.trim() || !editingFolder) {
      toast.error('Please enter a valid folder name');
      return;
    }

    try {
      await graphqlQuery(GRAPHQL_MUTATIONS.RENAME_FOLDER, {
        folderId: editingFolder.id,
        name: editName.trim(),
      });

      toast.success('Folder renamed successfully');
      setEditingFolder(null);
      setEditName('');
      fetchFolders();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folder: FolderNode) => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"? This will also delete all files in this folder.`)) {
      return;
    }

    try {
      await graphqlQuery(GRAPHQL_MUTATIONS.DELETE_FOLDER, {
        folderId: folder.id,
      });

      toast.success('Folder deleted successfully');
      fetchFolders();
      onRefresh?.();
      
      // If the deleted folder was selected, clear selection
      if (selectedFolderId === folder.id) {
        onFolderSelect?.(null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const toggleFolder = (folderId: string) => {
    const updateFolders = (folders: FolderNode[]): FolderNode[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded };
        }
        if (folder.children) {
          return { ...folder, children: updateFolders(folder.children) };
        }
        return folder;
      });
    };

    setFolders(updateFolders(folders));
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 rounded-md cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {hasChildren ? (
              folder.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500" />
              )
            ) : (
              <div className="h-3 w-3" />
            )}
          </button>

          {/* Folder Icon */}
          <div className="mr-2">
            {folder.isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
          </div>

          {/* Folder Name */}
          <span
            className="flex-1 text-sm truncate cursor-pointer"
            onClick={() => onFolderSelect?.(folder.id)}
          >
            {folder.name}
          </span>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setParentFolderId(folder.id);
                setShowCreateModal(true);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Create subfolder"
            >
              <FolderPlus className="h-3 w-3 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder);
                setEditName(folder.name);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Rename folder"
            >
              <Edit2 className="h-3 w-3 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Delete folder"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </button>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && folder.isExpanded && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Folders</h3>
        <button
          type="button"
          onClick={() => {
            setParentFolderId(null);
            setShowCreateModal(true);
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Create folder"
        >
          <FolderPlus className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* All Files Option */}
      <div className="px-2 py-2">
        <div
          className={`flex items-center py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
            selectedFolderId === null ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
          }`}
          onClick={() => onFolderSelect?.(null)}
        >
          <Folder className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-sm">All Files</span>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No folders yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Create your first folder</p>
          </div>
        ) : (
          <div className="space-y-1">
            {folders.map(folder => renderFolder(folder))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Folder
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="input w-full mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setShowCreateModal(false);
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewFolderName('');
                  setParentFolderId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rename Folder
            </h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Folder name"
              className="input w-full mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameFolder();
                } else if (e.key === 'Escape') {
                  setEditingFolder(null);
                  setEditName('');
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setEditingFolder(null);
                  setEditName('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameFolder}
                className="btn-primary"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}