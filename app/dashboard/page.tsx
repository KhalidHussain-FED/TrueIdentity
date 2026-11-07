"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fingerprint, Scan, Coins, LogOut, ShieldCheck, Users } from "lucide-react";

// Define the Session type based on your auth setup
type Session = { id: string; email: string; name: string; role: string; credits: number; } | null;

export default function Dashboard() {
  const router = useRouter();
  
  // State to hold the current user's session
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  const services = [
    { name: "CNIC Match/Mismatch & Lifetime check", desc: "Check a CNIC against its fingerprints — Match or Mismatch, no record details.", credits: "50", slug: "cnic-match", icon: <Fingerprint size={28} /> },
    { name: "FingerPrint to Issue Date (DOB, Pic, Mother Name)", desc: "Upload biometric scans to retrieve available identity record details including DOB, mother, and pic.", credits: "150", slug: "fingerprint-verify", icon: <Scan size={28} /> }
  ];

  // Fetch the session on load to know if user is ADMIN
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session"); // Ensure you have a route that returns the session
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error("Failed to load session", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, []);

  async function logout() {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
    router.refresh();
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <main style={{ minHeight: "100vh", background: "#FAF8F5", paddingTop: 60, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#111" }}>Dashboard</h1>
            <p style={{ color: "#6b7280", margin: "8px 0 0 0" }}>Select a service to continue.</p>
          </div>
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e5e7eb", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* ADMIN CONTROL PANEL - Only shows if role is ADMIN */}
        {session?.role === "ADMIN" && (
          <div style={{ marginBottom: 32, background: "#1d1d1b", borderRadius: 16, padding: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: 0 }}>Admin Control Panel</h2>
                <p style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: 14 }}>Manage users, credits, and system roles.</p>
              </div>
            </div>
            <button onClick={() => router.push("/dashboard/admin/users")} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#1d1d1b", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
              <Users size={18} /> Manage Users
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 24 }}>
          {services.map(s => (
            <div key={s.slug} style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 56, height: 56, background: "#FAF8F5", border: "1px solid #e8e5e0", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#111" }}>
                {s.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0", color: "#111" }}>{s.name}</h3>
                <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 24 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F3F4F6", padding: "6px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  <Coins size={14} /> {s.credits} credits
                </span>
                <button onClick={() => router.push(`/dashboard/${s.slug}`)} style={{ background: "#1a1a1a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                  Open &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}