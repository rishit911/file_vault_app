import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Filter, Calendar, Hash, User, FileType } from 'lucide-react';
import { graphqlQuery, GRAPHQL_QUERIES } from '../api';
import { formatBytes, formatRelativeTime, getMimeTypeIcon } from '../utils';
import { debounce } from '../utils';

interface SearchResult {
  id: string;
  filename: string;
  visibility: string;
  uploadedAt: string;
  fileObject: {
    id: string;
    sizeBytes: number;
    mimeType: string;
  };
  user: {
    email: string;
  };
}

interface SearchFilters {
  mimeTypes: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
  uploaderEmail?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    mimeTypes: [],
  });
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const variables = {
          q: searchQuery,
          filter: {
            mimeTypes: searchFilters.mimeTypes.length > 0 ? searchFilters.mimeTypes : undefined,
            minSize: searchFilters.minSize,
            maxSize: searchFilters.maxSize,
            dateFrom: searchFilters.dateFrom,
            dateTo: searchFilters.dateTo,
            uploaderEmail: searchFilters.uploaderEmail,
          },
          pagination: {
            limit: 10,
            offset: 0,
          },
        };

        const data = await graphqlQuery(GRAPHQL_QUERIES.SEARCH_FILES, variables);
        setResults(data.searchFiles.items);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters, debouncedSearch]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    // Navigate to files page and highlight the result
    navigate('/files', { state: { highlightFileId: result.id } });
  };

  const handleViewAllResults = () => {
    setShowResults(false);
    navigate('/files', { 
      state: { 
        searchQuery: query,
        searchFilters: filters 
      } 
    });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const mimeTypeOptions = [
    { value: 'image/', label: 'Images', icon: '🖼️' },
    { value: 'video/', label: 'Videos', icon: '🎥' },
    { value: 'audio/', label: 'Audio', icon: '🎵' },
    { value: 'application/pdf', label: 'PDF', icon: '📄' },
    { value: 'text/', label: 'Text', icon: '📝' },
    { value: 'application/', label: 'Applications', icon: '⚙️' },
  ];

  return (
    <div ref={searchRef} className="relative flex-1 max-w-lg">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          placeholder="Search files..."
          className="input pl-10 pr-20 w-full"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded mr-1"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded mr-1 ${
              showFilters ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
          >
            <Filter className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-4">
            {/* File Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {mimeTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.mimeTypes.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            mimeTypes: [...prev.mimeTypes, option.value]
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            mimeTypes: prev.mimeTypes.filter(type => type !== option.value)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {option.icon} {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Size (bytes)
                </label>
                <input
                  type="number"
                  value={filters.minSize || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minSize: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  className="input text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Size (bytes)
                </label>
                <input
                  type="number"
                  value={filters.maxSize || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    maxSize: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  className="input text-sm"
                  placeholder="No limit"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateFrom: e.target.value || undefined
                  }))}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateTo: e.target.value || undefined
                  }))}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Uploader Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uploader Email
              </label>
              <input
                type="email"
                value={filters.uploaderEmail || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  uploaderEmail: e.target.value || undefined
                }))}
                className="input text-sm w-full"
                placeholder="user@example.com"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFilters({ mimeTypes: [] })}
                className="btn-secondary text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-40">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No files found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Try different keywords or filters</p>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="text-2xl mr-3">
                      {getMimeTypeIcon(result.fileObject.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.filename}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatBytes(result.fileObject.sizeBytes)}</span>
                        <span>{formatRelativeTime(result.uploadedAt)}</span>
                        <span>{result.user.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {results.length >= 10 && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                  <button
                    type="button"
                    onClick={handleViewAllResults}
                    className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                  >
                    View all results →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}