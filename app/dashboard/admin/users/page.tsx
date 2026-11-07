"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Coins, Shield, ShieldAlert, Trash2, Pencil } from "lucide-react";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  createdAt: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) throw new Error("Unauthorized. Admin access only.");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          credits: editingUser.credits,
          role: editingUser.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUsers(users.map((u) => (u.id === editingUser.id ? editingUser : u)));
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This will delete the user and all their records.")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#FAF8F5", paddingTop: 30, paddingBottom: 80, color: "#1a1a1a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button type="button" onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, color: "#666", cursor: "pointer" }}>
            <ArrowLeft size={17} />
          </button>
          <span style={{ fontSize: 15, color: "#888", fontWeight: 500 }}>Back to Dashboard</span>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 4px 30px rgba(0,0,0,0.02)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>User Management</h1>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>Manage user roles, credits, and accounts.</p>

          {error && <div style={{ background: "#fef2f2", color: "#991b1b", padding: 16, borderRadius: 8, marginBottom: 24 }}>{error}</div>}

          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e8e5e0", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#FAF8F5", borderBottom: "1px solid #e8e5e0" }}>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>User</th>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Role</th>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Credits</th>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Joined</th>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600, color: "#111" }}>{u.name}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: u.role === "ADMIN" ? "#e0e7ff" : "#f3f4f6", color: u.role === "ADMIN" ? "#3730a3" : "#374151" }}>
                          {u.role === "ADMIN" ? <Shield size={12} /> : <User size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#b45309" }}>
                          <Coins size={14} /> {u.credits}
                        </span>
                      </td>
                      <td style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 16, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                          <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }}>
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT USER MODAL */}
      {isModalOpen && editingUser && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "20px", fontWeight: "bold" }}>Edit User</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Credits</label>
                <input 
                  type="number" 
                  value={editingUser.credits} 
                  onChange={(e) => setEditingUser({ ...editingUser, credits: parseInt(e.target.value) || 0 })} 
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} 
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Role</label>
                <select 
                  value={editingUser.role} 
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", background: "white", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} style={{ padding: "8px 16px", background: "#1d1d1b", color: "white", borderRadius: "6px", border: "none", cursor: "pointer" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}