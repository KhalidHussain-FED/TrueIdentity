"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", justifyContent: "center", alignItems: "center", background: "#FAF8F5", fontFamily: "system-ui" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Welcome back</h1>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 14, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 14, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          {error && <p style={{ color: "red", fontSize: 14, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 10, border: "none", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#6b7280" }}>
          No account? <Link href="/register" style={{ color: "#1a1a1a", fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}