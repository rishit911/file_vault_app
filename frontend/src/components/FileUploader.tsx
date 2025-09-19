import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import api from "../api";

export default function FileUploader({ onUploaded }: { onUploaded: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const form = new FormData();
    acceptedFiles.forEach((f) => form.append("files", f));

    setProgress(0);
    try {
      // Upload files via REST API (handles streaming, hashing, deduplication)
      // The REST endpoint already creates database records, so no additional
      // GraphQL registerFile call is needed for basic uploads
      const resp = await api.post("/api/v1/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      
      console.log("uploaded", resp.data);
      // Response contains: filename, hash, size_bytes, mime_type, file_object_id, user_file_id
      
      // TODO: When GraphQL client is added, optionally call registerFile mutation here
      // for additional metadata processing or custom business logic
      
      setProgress(null);
      onUploaded();
    } catch (err) {
      console.error(err);
      setProgress(null);
      alert("Upload failed: " + (err as any).message);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{ border: "2px dashed #999", padding: 16, cursor: "pointer" }}
      >
        <input {...getInputProps()} />
        <p>Drag & drop files here, or click to select (multiple allowed)</p>
      </div>
      {progress !== null && <div>Uploading: {progress}%</div>}
    </div>
  );
}