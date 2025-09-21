import React, { useState } from 'react';
import { X, Copy, Check, Calendar, Hash, Globe, Lock } from 'lucide-react';
import { graphqlQuery, GRAPHQL_MUTATIONS } from '../api';
import toast from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  filename: string;
}

interface ShareSettings {
  public: boolean;
  expiresAt?: string;
  maxDownloads?: number;
}

export default function ShareModal({ isOpen, onClose, fileId, filename }: ShareModalProps) {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    public: true,
  });
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateShare = async () => {
    try {
      setIsCreating(true);
      
      const variables = {
        input: {
          fileId,
          public: shareSettings.public,
          expiresAt: shareSettings.expiresAt || null,
          maxDownloads: shareSettings.maxDownloads || null,
        },
      };

      const data = await graphqlQuery(GRAPHQL_MUTATIONS.SHARE_FILE, variables);
      setShareUrl(data.createShare.url);
      setIsCreated(true);
      toast.success('Share link created successfully!');
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Share link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setShareSettings({ public: true });
    setShareUrl('');
    setIsCreated(false);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share File
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isCreated ? (
            <>
              {/* File Info */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  You're about to share:
                </p>
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {filename}
                </p>
              </div>

              {/* Share Settings */}
              <div className="space-y-4 mb-6">
                {/* Public/Private */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Level
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="public"
                        checked={shareSettings.public}
                        onChange={() => setShareSettings(prev => ({ ...prev, public: true }))}
                        className="mr-3 text-primary-600 focus:ring-primary-500"
                      />
                      <Globe className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        Public - Anyone with the link can access
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="public"
                        checked={!shareSettings.public}
                        onChange={() => setShareSettings(prev => ({ ...prev, public: false }))}
                        className="mr-3 text-primary-600 focus:ring-primary-500"
                      />
                      <Lock className="h-4 w-4 mr-2 text-orange-600" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        Private - Restricted access
                      </span>
                    </label>
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={shareSettings.expiresAt || ''}
                    onChange={(e) => setShareSettings(prev => ({ 
                      ...prev, 
                      expiresAt: e.target.value || undefined 
                    }))}
                    className="input w-full"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                {/* Max Downloads */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Hash className="h-4 w-4 mr-2" />
                    Max Downloads (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={shareSettings.maxDownloads || ''}
                    onChange={(e) => setShareSettings(prev => ({ 
                      ...prev, 
                      maxDownloads: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Create Button */}
              <button
                type="button"
                onClick={handleCreateShare}
                disabled={isCreating}
                className="btn-primary w-full"
              >
                {isCreating ? 'Creating Share Link...' : 'Create Share Link'}
              </button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Share Link Created!
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Anyone with this link can download your file
                </p>
              </div>

              {/* Share URL */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input flex-1 rounded-r-none bg-gray-50 dark:bg-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="btn-primary rounded-l-none px-4"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Share Details
                </h5>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium">Access:</span>{' '}
                    {shareSettings.public ? 'Public' : 'Private'}
                  </p>
                  {shareSettings.expiresAt && (
                    <p>
                      <span className="font-medium">Expires:</span>{' '}
                      {new Date(shareSettings.expiresAt).toLocaleString()}
                    </p>
                  )}
                  {shareSettings.maxDownloads && (
                    <p>
                      <span className="font-medium">Max Downloads:</span>{' '}
                      {shareSettings.maxDownloads}
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary w-full"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}