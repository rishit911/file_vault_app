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
      const resp = await api.post("/api/v1/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      console.log("uploaded", resp.data);
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