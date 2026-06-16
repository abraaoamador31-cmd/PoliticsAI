import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function Login({ onSwitchToRegister, onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Preencha todos os campos"); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Email ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h2 style={styles.title}>Politics<span style={styles.accent}>AI</span></h2>
        <p style={styles.subtitle}>Entre na sua conta</p>

        {error && <div style={styles.error}>{error}</div>}

        <input
          style={styles.input}
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        <button style={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p style={styles.switch}>
          Nao tem conta?{" "}
          <span style={styles.link} onClick={onSwitchToRegister}>
            Cadastre-se gratis
          </span>
        </p>

        <p style={styles.free}>3 buscas gratuitas por mes</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(5,8,15,0.95)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, fontFamily: "'JetBrains Mono', monospace",
  },
  box: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: "2.5rem", width: "100%", maxWidth: 400,
    display: "flex", flexDirection: "column", gap: "1rem",
  },
  title: {
    fontFamily: "'DM Serif Display', serif", fontSize: "2rem",
    color: "#fff", textAlign: "center", margin: 0,
  },
  accent: {
    fontStyle: "italic",
    background: "linear-gradient(135deg, #f0b429, #ff6b35)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  subtitle: { color: "#4a5568", fontSize: "0.75rem", textAlign: "center", margin: 0 },
  error: {
    background: "rgba(255,92,92,0.1)", border: "1px solid rgba(255,92,92,0.3)",
    color: "#ff5c5c", padding: "0.75rem", borderRadius: 8, fontSize: "0.75rem",
  },
  input: {
    background: "#161c27", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8, padding: "0.85rem 1rem", color: "#dce6f0",
    fontSize: "0.85rem", fontFamily: "'JetBrains Mono', monospace",
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  btn: {
    background: "linear-gradient(135deg, #f0b429, #ff6b35)",
    border: "none", borderRadius: 8, padding: "0.9rem",
    color: "#000", fontWeight: 700, fontSize: "0.9rem",
    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
  },
  switch: { color: "#4a5568", fontSize: "0.72rem", textAlign: "center", margin: 0 },
  link: { color: "#4f8ef7", cursor: "pointer" },
  free: {
    color: "#00d97e", fontSize: "0.65rem", textAlign: "center",
    margin: 0, letterSpacing: "0.1em",
  },
};