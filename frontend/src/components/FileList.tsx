import React, { useEffect, useState } from "react";
import api from "../api";

type Item = {
  user_file_id: string;
  file_object_id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  ref_count: number;
  storage_saved_bytes: number;
};

export default function FileList() {
  const [items, setItems] = useState<Item[]>([]);

  const fetchList = async () => {
    try {
      const resp = await api.get("/api/v1/files");
      setItems(resp.data);
    } catch (err) {
      console.error(err);
      alert("Could not fetch files");
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await api.delete(`/api/v1/files/${id}`);
      fetchList();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div>
      <h3>Your files</h3>
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Size</th>
            <th>Refs</th>
            <th>Saved</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.user_file_id}>
              <td>{it.filename}</td>
              <td>{it.size_bytes}</td>
              <td>{it.ref_count}</td>
              <td>{it.storage_saved_bytes}</td>
              <td>
                <button onClick={() => del(it.user_file_id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}