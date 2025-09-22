import React, { useState, useEffect } from 'react';
import { X, Search, User, Send } from 'lucide-react';
import { graphqlQuery, GRAPHQL_QUERIES, GRAPHQL_MUTATIONS } from '../api';
import toast from 'react-hot-toast';

interface UserShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  filename: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
}

export default function UserShareModal({ isOpen, onClose, fileId, filename }: UserShareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const data = await graphqlQuery(GRAPHQL_QUERIES.SEARCH_USERS, {
        query: searchQuery.trim()
      });
      setSearchResults(data.searchUsers || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareWithUser = async () => {
    if (!selectedUser) {
      toast.error('Please select a user to share with');
      return;
    }

    try {
      setIsSharing(true);
      await graphqlQuery(GRAPHQL_MUTATIONS.SHARE_WITH_USER, {
        input: {
          fileId,
          username: selectedUser.username || selectedUser.email,
          message: message.trim() || null
        }
      });
      
      toast.success(`File shared with ${selectedUser.username || selectedUser.email}`);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to share file:', error);
      toast.error('Failed to share file');
    } finally {
      setIsSharing(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setMessage('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share with User
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Sharing file:</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{filename}</p>
          </div>

          {/* User search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search for user
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter username or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                    selectedUser?.id === user.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.username || user.email}
                      </p>
                      {user.username && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected user */}
          {selectedUser && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
              <p className="text-sm text-primary-600 dark:text-primary-400">Selected user:</p>
              <p className="font-medium text-primary-900 dark:text-primary-100">
                {selectedUser.username || selectedUser.email}
              </p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for the recipient..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleShareWithUser}
            disabled={!selectedUser || isSharing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Sharing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Share</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}