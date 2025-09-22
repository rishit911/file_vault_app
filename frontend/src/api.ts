import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fv_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("fv_token");
      window.location.href = "/login";
      toast.error("Session expired. Please login again.");
    } else if (error.response?.status === 403) {
      toast.error("Access denied. Insufficient permissions.");
    } else if (error.response?.status === 413) {
      // Quota exceeded
      toast.error("Upload blocked: Storage quota exceeded. Please delete some files or contact support.");
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      const retryAfter = error.response.headers['retry-after'];
      const seconds = retryAfter ? parseInt(retryAfter) : 60;
      toast.error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
      
      // Disable buttons temporarily (emit custom event)
      window.dispatchEvent(new CustomEvent('rateLimitExceeded', { 
        detail: { retryAfter: seconds } 
      }));
    } else if (error.code === "NETWORK_ERROR" || error.response?.status === 0) {
      toast.error("Cannot connect to server. Please check if the backend is running.");
    }
    return Promise.reject(error);
  }
);

// GraphQL helper function
export const graphqlQuery = async (query: string, variables?: any) => {
  try {
    console.log('Making GraphQL request:', { query: query.substring(0, 50) + '...', variables });
    const response = await api.post("/graphql", {
      query,
      variables,
    });
    
    console.log('GraphQL response:', response.data);
    
    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors);
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data;
  } catch (error) {
    console.error("GraphQL Error:", error);
    throw error;
  }
};

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", { email, password }),
  
  register: (email: string, password: string) =>
    api.post("/api/v1/auth/register", { email, password }),
};

export const filesAPI = {
  upload: (formData: FormData, onProgress?: (progress: number) => void) =>
    api.post("/api/v1/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }),
  
  list: () => api.get("/api/v1/files"),
  
  delete: (fileId: string) => api.delete(`/api/v1/files/${fileId}`),
};

export const sharesAPI = {
  create: (data: { fileId?: string; folderId?: string; public?: boolean; expiresAt?: string; maxDownloads?: number }) =>
    api.post("/api/v1/shares", data),
  
  getByToken: (token: string) => api.get(`/s/${token}`),
};

export const foldersAPI = {
  create: (data: { name: string; parentId?: string }) =>
    api.post("/api/v1/folders", data),
  
  list: () => api.get("/api/v1/folders/contents"),
};

export const adminAPI = {
  stats: () => api.get("/api/v1/admin/stats"),
  
  downloads: (params?: { limit?: number; offset?: number }) =>
    api.get("/api/v1/admin/downloads", { params }),
  
  upload: (data: { ownerId: string; fileObjectId: string; filename: string; visibility: string }) =>
    api.post("/api/v1/admin/upload", data),
};

// GraphQL queries
export const GRAPHQL_QUERIES = {
  ME: `
    query Me {
      me {
        id
        email
        role
        createdAt
      }
    }
  `,
  
  MY_FILES: `
    query MyFiles($filter: FileFilter, $pagination: PaginationInput) {
      files(filter: $filter, pagination: $pagination) {
        totalCount
        items {
          id
          filename
          visibility
          uploadedAt
          fileObject {
            id
            hash
            sizeBytes
            mimeType
            refCount
            createdAt
          }
          user {
            id
            email
          }
          tags {
            id
            name
          }
        }
      }
    }
  `,
  
  SEARCH_FILES: `
    query SearchFiles($q: String!, $filter: FileFilter, $pagination: PaginationInput) {
      searchFiles(q: $q, filter: $filter, pagination: $pagination) {
        totalCount
        items {
          id
          filename
          visibility
          uploadedAt
          fileObject {
            id
            hash
            sizeBytes
            mimeType
            refCount
            createdAt
          }
          user {
            id
            email
          }
          tags {
            id
            name
          }
        }
      }
    }
  `,
  
  MY_FOLDERS: `
    query MyFolders($limit: Int, $offset: Int) {
      myFolders(limit: $limit, offset: $offset) {
        id
        name
        ownerId
        parentId
        createdAt
      }
    }
  `,
  
  STORAGE_STATS: `
    query StorageStats {
      stats {
        totalDedupedBytes
        originalBytes
        savedBytes
        savedPercent
      }
    }
  `,
  
  ADMIN_FILES: `
    query AdminFiles($pagination: PaginationInput) {
      adminFiles(pagination: $pagination) {
        totalCount
        items {
          id
          filename
          visibility
          uploadedAt
          user {
            id
            email
            role
          }
          fileObject {
            id
            hash
            sizeBytes
            mimeType
            refCount
            createdAt
          }
        }
      }
    }
  `,
  
  ADMIN_STATS: `
    query AdminStats {
      adminStats {
        totalUsers
        totalFileObjects
        totalUserFiles
        deduplicatedStorageBytes
        logicalStorageBytes
        dedupSavingsBytes
      }
    }
  `,
  
  ADMIN_DOWNLOADS: `
    query AdminDownloads($from: Time, $to: Time, $limit: Int, $offset: Int) {
      adminDownloads(from: $from, to: $to, limit: $limit, offset: $offset) {
        id
        shareId
        fileId
        downloaderId
        ip
        userAgent
        createdAt
      }
    }
  `,
  
  LIST_SHARES: `
    query ListShares($limit: Int, $offset: Int) {
      listShares(limit: $limit, offset: $offset) {
        id
        token
        public
        fileId
        folderId
        maxDownloads
        expiresAt
        createdAt
      }
    }
  `,
  
  SHARE_BY_TOKEN: `
    query ShareByToken($token: String!) {
      shareByToken(token: $token) {
        id
        token
        public
        fileId
        folderId
        maxDownloads
        expiresAt
        createdAt
      }
    }
  `,
  
  SHARED_WITH_ME: `
    query SharedWithMe($limit: Int, $offset: Int) {
      sharedWithMe(limit: $limit, offset: $offset) {
        id
        sharedAt
        message
        file {
          id
          filename
          fileObject {
            id
            sizeBytes
            mimeType
          }
        }
        owner {
          id
          email
          username
        }
      }
    }
  `,
  
  MY_USER_SHARES: `
    query MyUserShares($limit: Int, $offset: Int) {
      myUserShares(limit: $limit, offset: $offset) {
        id
        sharedAt
        message
        file {
          id
          filename
          fileObject {
            id
            sizeBytes
            mimeType
          }
        }
        sharedWith {
          id
          email
          username
        }
      }
    }
  `,
  
  SEARCH_USERS: `
    query SearchUsers($query: String!) {
      searchUsers(query: $query) {
        id
        email
        username
      }
    }
  `,
};

// GraphQL mutations
export const GRAPHQL_MUTATIONS = {
  CREATE_FOLDER: `
    mutation CreateFolder($input: CreateFolderInput!) {
      createFolder(input: $input) {
        id
        name
        ownerId
        parentId
        createdAt
      }
    }
  `,
  
  SHARE_FILE: `
    mutation ShareFile($input: ShareCreateInput!) {
      createShare(input: $input) {
        token
        url
        expiresAt
      }
    }
  `,
  
  SHARE_FOLDER: `
    mutation ShareFolder($folderId: ID!, $public: Boolean, $expiresAt: Time, $maxDownloads: Int) {
      shareFolder(folderId: $folderId, public: $public, expiresAt: $expiresAt, maxDownloads: $maxDownloads) {
        token
        url
        expiresAt
      }
    }
  `,
  
  ADD_TAG_TO_FILE: `
    mutation AddTagToFile($fileId: UUID!, $tagName: String!) {
      addTagToFile(fileId: $fileId, tagName: $tagName)
    }
  `,
  
  REMOVE_TAG_FROM_FILE: `
    mutation RemoveTagFromFile($fileId: UUID!, $tagName: String!) {
      removeTagFromFile(fileId: $fileId, tagName: $tagName)
    }
  `,
  
  CREATE_TAG: `
    mutation CreateTag($name: String!) {
      createTag(name: $name) {
        id
        name
      }
    }
  `,
  
  REVOKE_SHARE: `
    mutation RevokeShare($token: String!) {
      revokeShare(token: $token)
    }
  `,
  
  RENAME_FOLDER: `
    mutation RenameFolder($folderId: ID!, $name: String!) {
      renameFolder(folderId: $folderId, name: $name) {
        id
        name
        ownerId
        parentId
        createdAt
      }
    }
  `,
  
  DELETE_FOLDER: `
    mutation DeleteFolder($folderId: ID!) {
      deleteFolder(folderId: $folderId)
    }
  `,
  
  MOVE_FILE_TO_FOLDER: `
    mutation MoveFileToFolder($userFileId: ID!, $folderId: ID) {
      moveFileToFolder(userFileId: $userFileId, folderId: $folderId)
    }
  `,
  
  SHARE_WITH_USER: `
    mutation ShareWithUser($input: ShareWithUserInput!) {
      shareWithUser(input: $input) {
        id
        sharedAt
        message
        file {
          id
          filename
        }
        owner {
          id
          email
          username
        }
        sharedWith {
          id
          email
          username
        }
      }
    }
  `,
  
  UNSHARE_WITH_USER: `
    mutation UnshareWithUser($userShareId: UUID!) {
      unshareWithUser(userShareId: $userShareId)
    }
  `,
  
  UPDATE_USERNAME: `
    mutation UpdateUsername($username: String!) {
      updateUsername(username: $username) {
        id
        email
        username
        role
        createdAt
      }
    }
  `,
};

export default api;