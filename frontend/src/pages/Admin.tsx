import React, { useEffect, useState } from "react";
import api from "../api";

export default function AdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmin = async () => {
    const q = `query { 
      adminFiles(pagination:{limit:50, offset:0}) { 
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
            refCount 
            mimeType
            createdAt
          } 
        } 
      }
      stats {
        totalDedupedBytes
        originalBytes
        savedBytes
        savedPercent
      }
    }`;

    try {
      setLoading(true);
      const resp = await api.post("/graphql", { query: q });
      
      if (resp.data.errors) {
        throw new Error(resp.data.errors[0].message);
      }
      
      setItems(resp.data.data.adminFiles.items);
      setStats(resp.data.data.stats);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.errors?.[0]?.message || err.message || "Admin fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmin();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading admin data...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Admin Access Error</h2>
        <p>{error}</p>
        <p>Make sure you are logged in as an admin user.</p>
      </div>
    );
  }

  const getUniqueUsers = () => {
    const users = new Set(items.map(item => item.user.email));
    return users.size;
  };

  const getTotalStorageUsed = () => {
    const uniqueFiles = new Map();
    items.forEach(item => {
      uniqueFiles.set(item.fileObject.id, item.fileObject.sizeBytes);
    });
    return Array.from(uniqueFiles.values()).reduce((sum, size) => sum + size, 0);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard — System Overview</h2>
      
      {/* System Health Stats */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>Total Files</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {items.length}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>Active Users</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {getUniqueUsers()}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>Storage Used</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
              {formatBytes(stats.totalDedupedBytes)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>Storage Saved</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>
              {formatBytes(stats.savedBytes)}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              ({stats.savedPercent.toFixed(1)}% saved)
            </div>
          </div>
        </div>
      )}

      <h3>All Files ({items.length} files)</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={fetchAdmin} style={{ padding: '8px 16px' }}>
          Refresh Data
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Filename</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>User</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Size</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Refs</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>MIME Type</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Uploaded</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Hash</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <strong>{item.filename}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {item.visibility} • ID: {item.id.substring(0, 8)}...
                </small>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {item.user.email}
                <br />
                <small style={{ color: '#666' }}>
                  {item.user.role} • {item.user.id.substring(0, 8)}...
                </small>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {formatBytes(item.fileObject.sizeBytes)}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <span style={{ 
                  backgroundColor: item.fileObject.refCount > 1 ? '#e8f5e8' : '#f5f5f5',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}>
                  {item.fileObject.refCount}
                </span>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <small>{item.fileObject.mimeType || 'unknown'}</small>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <small>{formatDate(item.uploadedAt)}</small>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <code style={{ fontSize: '11px', color: '#666' }}>
                  {item.fileObject.hash.substring(0, 12)}...
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No files found in the system.
        </div>
      )}
    </div>
  );
}