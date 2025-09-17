import React, { useState } from "react";
import api from "../api";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const resp = await api.post("/api/v1/auth/login", { email, password });
      const token = resp.data.token;
      localStorage.setItem("fv_token", token);
      onLogin();
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <form onSubmit={submit}>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}