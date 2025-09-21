import React, { useState, useEffect } from 'react';
import { X, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { graphqlQuery, GRAPHQL_QUERIES, GRAPHQL_MUTATIONS } from '../api';
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

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileIds: string[];
  fileNames?: string[];
  onSuccess?: () => void;
  onMoveComplete?: () => void;
}

export default function MoveToFolderModal({ 
  isOpen, 
  onClose, 
  fileIds, 
  fileNames = [], 
  onSuccess,
  onMoveComplete
}: MoveToFolderModalProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

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
      folderMap.set(folder.id, { ...folder, children: [], isExpanded: true });
    });

    // Build tree structure
    folderList.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children!.push(folderNode);
        } else {
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
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

  const handleMoveFiles = async () => {
    if (fileIds.length === 0) return;

    setIsMoving(true);
    try {
      // Move each file to the selected folder
      await Promise.all(
        fileIds.map(fileId =>
          graphqlQuery(GRAPHQL_MUTATIONS.MOVE_FILE_TO_FOLDER, {
            userFileId: fileId,
            folderId: selectedFolderId,
          })
        )
      );

      const folderName = selectedFolderId 
        ? getFolderName(selectedFolderId) 
        : 'root folder';
      
      toast.success(
        `${fileIds.length} file${fileIds.length > 1 ? 's' : ''} moved to ${folderName}`
      );
      
      onSuccess?.();
      onMoveComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to move files:', error);
      toast.error('Failed to move files');
    } finally {
      setIsMoving(false);
    }
  };

  const getFolderName = (folderId: string): string => {
    const findFolder = (folders: FolderNode[]): FolderNode | null => {
      for (const folder of folders) {
        if (folder.id === folderId) return folder;
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(folders);
    return folder?.name || 'Unknown folder';
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded mr-1"
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
          <span className="flex-1 text-sm truncate">
            {folder.name}
          </span>
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Move to Folder
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* File Info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Moving {fileIds.length} file{fileIds.length > 1 ? 's' : ''}
              {fileNames.length > 0 && ':'}
            </p>
            {fileNames.length > 0 && (
              <div className="max-h-20 overflow-y-auto">
                {fileNames.map((name, index) => (
                  <p key={index} className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    • {name}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Root Folder Option */}
          <div className="mb-4">
            <div
              className={`flex items-center py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedFolderId === null ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <Folder className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium">Root Folder (No folder)</span>
            </div>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No folders available</p>
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map(folder => renderFolder(folder))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMoveFiles}
            disabled={isMoving}
            className="btn-primary"
          >
            {isMoving ? 'Moving...' : 'Move Files'}
          </button>
        </div>
      </div>
    </div>
  );
}