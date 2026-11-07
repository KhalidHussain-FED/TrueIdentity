"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER", // Default to USER
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Redirect to login after success
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", textAlign: "center" }}>Create an Account</h1>
        
        {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px" }} 
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Email Address</label>
            <input 
              type="email" 
              required 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px" }} 
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Password</label>
            <input 
              type="password" 
              required 
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px" }} 
            />
          </div>

          {/* NEW ROLE DROPDOWN */}
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Account Type</label>
            <select 
              value={formData.role} 
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", background: "white", cursor: "pointer" }}
            >
              <option value="USER">Standard User</option>
              <option value="ADMIN">Administrator (Admin)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: "8px", padding: "12px", background: "#1d1d1b", color: "white", borderRadius: "8px", border: "none", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "#6b7280" }}>
          Already have an account? <Link href="/login" style={{ color: "#1d1d1b", fontWeight: "600", textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}