import React, { useState } from "react";
import Login from "./pages/Login";
import AdminPage from "./pages/Admin";
import FileUploader from "./components/FileUploader";
import FileList from "./components/FileList";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("fv_token"));
  const [currentView, setCurrentView] = useState<"files" | "admin">("files");

  return (
    <div style={{ padding: 24 }}>
      <h1>file_vault_proj — File Vault</h1>
      {!loggedIn ? (
        <Login onLogin={() => setLoggedIn(true)} />
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setCurrentView("files")}
              style={{ 
                marginRight: 10, 
                padding: '8px 16px',
                backgroundColor: currentView === "files" ? "#007bff" : "#f8f9fa",
                color: currentView === "files" ? "white" : "black",
                border: "1px solid #ccc"
              }}
            >
              My Files
            </button>
            <button
              onClick={() => setCurrentView("admin")}
              style={{ 
                marginRight: 10, 
                padding: '8px 16px',
                backgroundColor: currentView === "admin" ? "#007bff" : "#f8f9fa",
                color: currentView === "admin" ? "white" : "black",
                border: "1px solid #ccc"
              }}
            >
              Admin
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("fv_token");
                setLoggedIn(false);
              }}
              style={{ 
                padding: '8px 16px',
                backgroundColor: "#dc3545",
                color: "white",
                border: "1px solid #dc3545"
              }}
            >
              Logout
            </button>
          </div>

          {currentView === "files" ? (
            <>
              <FileUploader onUploaded={() => { /* will refresh via FileList's effect if needed */ }} />
              <FileList />
            </>
          ) : (
            <AdminPage />
          )}
        </>
      )}
    </div>
  );
}