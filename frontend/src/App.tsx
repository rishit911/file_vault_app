import React, { useState } from "react";
import Login from "./pages/Login";
import FileUploader from "./components/FileUploader";
import FileList from "./components/FileList";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("fv_token"));

  return (
    <div style={{ padding: 24 }}>
      <h1>file_vault_proj — File Vault</h1>
      {!loggedIn ? (
        <Login onLogin={() => setLoggedIn(true)} />
      ) : (
        <>
          <button
            onClick={() => {
              localStorage.removeItem("fv_token");
              setLoggedIn(false);
            }}
          >
            Logout
          </button>
          <FileUploader onUploaded={() => { /* will refresh via FileList's effect if needed */ }} />
          <FileList />
        </>
      )}
    </div>
  );
}