"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Fingerprint, FolderOpen, History, Scan, Upload,
  ShieldCheck, CheckCircle2, Hand, Settings2, Coins, XCircle, Plus,
  Pencil, Trash2, Search 
} from "lucide-react";

// --- Types ---
type Row = { id: string; type: string; reference: string; status: string; createdAt: string; name?: string; nameUrdu?: string; dob?: string; issueDate?: string; expiryDate?: string; gender?: string; motherName?: string; placeOfBirth?: string; address?: string; fatherName?: string; };
type ServiceConfig = { title: string; subtitle: string; price: number; kind: "bio"; tabs: string[]; };
type JobDraft = { id: string; createdAt: string; status: string; count: number; };
type JazzCashMatchResult = { 
  cnic: string; found?: boolean; summary?: string; message?: string; fileName?: string; status?: string;
  details?: { name?: string; fatherName?: string; motherName?: string; gender?: string; dob?: string; issueDate?: string; expiryDate?: string; placeOfBirth?: string; address?: string; cnicImage?: string; };
  name?: string; fatherName?: string; motherName?: string; gender?: string; dob?: string; issueDate?: string; expiryDate?: string; placeOfBirth?: string; address?: string; cnicImage?: string;
};

const configs: Record<string, ServiceConfig> = {
  "cnic-match": { title: "CNIC Match & Mismatch check", subtitle: "Upload biometric scans and get a Match or Mismatch result — no record details", price: 50, kind: "bio", tabs: ["Single", "Folder (Bulk)", "Bulk (Background)", "History"] },
};

const normalize = (value: string) => value.replace(/[-\s()]/g, "");
const validCNIC = (value: string) => /^\d{13}$/.test(normalize(value));

const safeRender = (val: any) => {
  if (val === null || val === undefined || val === "") return "N/A";
  if (typeof val === "object") return val.en || val.ur || val.addressEn || val.addressUr || JSON.stringify(val);
  return String(val);
};

function downloadCSV(rows: Row[], slug: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [ ["Date", "ID Number", "Result", "Type"], ...rows.map((r) => [ new Date(r.createdAt).toLocaleString(), r.reference, r.status === "SUCCESS" ? "match" : "mismatch", r.expiryDate?.toLowerCase() === "lifetime" ? "Lifetime" : (r.issueDate && r.issueDate !== "N/A" ? r.issueDate : "") ]) ];
  const content = lines.map((l) => l.map(escape).join(",")).join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}-request-history.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Toggle({ title, description, checked, change }: { title: string; description: string; checked: boolean; change: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 16 }}>
        <strong style={{ fontSize: 15, color: '#111', marginBottom: 4 }}>{title}</strong>
        <small style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>{description}</small>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={(e) => change(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? '#10b981' : '#e5e7eb', transition: '.4s', borderRadius: 34 }}>
          <span style={{ position: 'absolute', height: 18, width: 18, left: 3, bottom: 3, backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: checked ? 'translateX(20px)' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
        </span>
      </label>
    </div>
  );
}

function Advanced({ advanced, setAdvanced, invert, setInvert, flip, setFlip }: any) {
  return (
    <div className="svc-advanced">
      <button type="button" onClick={() => setAdvanced(!advanced)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Settings2 size={18} /> Advanced features</div>
        <span>{advanced ? "−" : "+"}</span>
      </button>
      {advanced && (
        <div className="svc-advanced-inner">
          <p>Fine-tune how scans are processed. These settings apply to both single and folder lookups.</p>
          <Toggle title="Invert scan colors" description="Switches black and white in each scan image." checked={invert} change={setInvert} />
          <Toggle title="Flip scan horizontally" description="Flips each scan left-to-right before it is sent." checked={flip} change={setFlip} />
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: JazzCashMatchResult }) {
  const isFound = result.found || result.status === "LOCAL_RECORD_FOUND" || result.status === "MATCH";
  const details = result.details || result;

  if (!isFound) {
    return (
      <div style={{ marginTop: 20, padding: 20, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, textAlign: 'center' }}>
        <XCircle size={32} color="#991b1b" style={{ margin: '0 auto 10px' }} />
        <h3 style={{ margin: 0, color: '#991b1b', fontSize: 16 }}>Record Not Found / Mismatch</h3>
        <p style={{ margin: '5px 0 0', color: '#6b7280', fontSize: 14 }}>{safeRender(result.summary || result.message || "Is CNIC ka data API se nahi mila.")}</p>
        {result.fileName && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#9ca3af' }}>File: {result.fileName}</p>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #d1d5db', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fafc 100%)', position: 'relative' }}>
      <div style={{ backgroundColor: '#0f5132', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18} /><span style={{ fontWeight: 600, fontSize: 14 }}>PAKISTAN NATIONAL IDENTITY CARD</span></div>
        <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>NADRA</span>
      </div>
      <div style={{ padding: 24, display: 'flex', gap: 24 }}>
        <div style={{ width: 140, flexShrink: 0 }}>
          <div style={{ width: '100%', height: 170, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', border: '2px solid #fff' }}>
            {details.cnicImage ? <img src={details.cnicImage} alt="CNIC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Fingerprint size={48} color="#9ca3af" />}
          </div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px 20px' }}>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>NAME</div><div style={{ fontSize: 16, fontWeight: 700 }}>{safeRender(details.name)}</div></div>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>ID NUMBER</div><div style={{ fontSize: 16, color: '#0f5132', fontWeight: 700 }}>{safeRender(result.cnic)}</div></div>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>FATHER NAME</div><div style={{ fontSize: 14 }}>{safeRender(details.fatherName)}</div></div>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>DOB</div><div style={{ fontSize: 14 }}>{safeRender(details.dob)}</div></div>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>ISSUE DATE</div><div style={{ fontSize: 14 }}>{safeRender(details.issueDate)}</div></div>
          <div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>EXPIRY DATE</div><div style={{ fontSize: 14, color: '#b91c1c', fontWeight: 700 }}>{safeRender(details.expiryDate)}</div></div>
          <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600 }}>ADDRESS</div><div style={{ fontSize: 13 }}>{safeRender(details.address)}</div></div>
        </div>
      </div>
    </div>
  );
}

export default function CnicMatchPage() {
  const slug = "cnic-match";
  const router = useRouter();
  const cfg = configs[slug];

  const [tab, setTab] = useState(cfg.tabs[0]);
  const [number, setNumber] = useState("");
  const [files, setFiles] = useState<Record<number, File>>({});
  const [mode, setMode] = useState("Single Thumb");
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");
  const [apiResult, setApiResult] = useState<JazzCashMatchResult | null>(null);
  const [bulkResults, setBulkResults] = useState<JazzCashMatchResult[]>([]); 
  const [advanced, setAdvanced] = useState(true);
  const [invert, setInvert] = useState(false);
  const [flip, setFlip] = useState(false);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [jobs, setJobs] = useState<JobDraft[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);

  // SEARCH STATES
  const [searchCnic, setSearchCnic] = useState("");

  const upload = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const singleThumbUpload = useRef<HTMLInputElement>(null);

  const activePositions = mode === "2 Thumbs" ? [0, 5] : mode === "8 Fingers" ? [1, 2, 3, 4, 6, 7, 8, 9] : mode === "10 Fingers" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0];
  const loadedCount = mode === "Single Thumb" ? (files[0] ? 1 : 0) : activePositions.filter((index) => Boolean(files[index])).length;

  const refreshHistory = useCallback(async () => {
    try {
      // FIXED: Removed ?type=CNIC_MATCH to fetch ALL records
      const response = await fetch("/api/requests", { cache: "no-store" });
      const data = await response.json();
      if (Array.isArray(data)) setRows(data);
    } catch (error) { setMsg("History unavailable."); }
  }, []);

  useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  // FETCH RECORD WITHOUT IMAGE (FOR SINGLE TAB)
  async function fetchRecordOnly() {
    const cleanCnic = number.replace(/\D/g, "");
    if (cleanCnic.length !== 13) {
      alert("Please enter a valid 13-digit CNIC.");
      return;
    }

    setBusy(true); 
    setApiResult(null); 
    setMsg("Searching database...");
    
    try {
      const res = await fetch(`/api/search?cnic=${cleanCnic}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setApiResult(data.result);
        setMsg("Record fetched from database.");
      } else {
        setApiResult({ cnic: cleanCnic, found: false, message: data.error || "Record not found." });
        setMsg(data.error || "Record not found.");
      }
    } catch (err) {
      setMsg("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setMsg(""); 
    setApiResult(null); 
    setBulkResults([]);
    
    if (!consent) { setMsg("Please confirm permission."); return; }
    setBusy(true);

    try {
      if (tab === "Single") {
        const fileToUpload = files[0];
        if (!fileToUpload) throw new Error("Please upload an image.");
        if (!validCNIC(number)) throw new Error("Valid 13-digit CNIC required.");

        const formData = new FormData();
        formData.append("file", fileToUpload, fileToUpload.name);
        formData.append("cnic", normalize(number));

        const res = await fetch("/api/cnic-match", { method: "POST", body: formData });
        const data = await res.json();
        
        if (data.result) {
          setApiResult(data.result);
          if (data.found) setMsg("Record Found Successfully.");
          else setMsg("Record not found. Fingerprint mismatch.");
        } else {
          setApiResult({ cnic: number, found: false, message: data.error || "Record Not Found" });
          setMsg("Record not found.");
        }
        void refreshHistory();
      } 
      else if (tab === "Folder (Bulk)") {
        const validFiles = folderFiles.filter(f => f.name.match(/\.(bmp|png|jpe?g|wsq)$/i) && f.name.match(/(\d{13})/));
        const total = validFiles.length;
        let processed = 0;

        setTab("Single");

        for (const file of validFiles) {
          const match = file.name.match(/(\d{13})/);
          if (!match) continue;

          processed++;
          const cnic = match[1];

          setMsg(`Processing ${processed} of ${total} (CNIC: ${cnic})...`);
          
          const formData = new FormData();
          formData.append("file", file, file.name);
          formData.append("cnic", cnic);

          try {
            const res = await fetch("/api/cnic-match", { method: "POST", body: formData });
            const data = await res.json();
            
            if (data.result) {
              setBulkResults((prev) => [...prev, { ...data.result, fileName: file.name }]);
            } else {
              setBulkResults((prev) => [...prev, { 
                cnic, 
                found: false, 
                status: "FAILED",
                message: data.error || "Fingerprint mismatch or Not Found", 
                fileName: file.name 
              }]);
            }
          } catch (e) { 
            console.error(e); 
            setBulkResults((prev) => [...prev, { 
              cnic, 
              found: false, 
              status: "FAILED",
              message: "Network error or Failed to connect.", 
              fileName: file.name 
            }]);
          }
        }
        
        setMsg(`Bulk complete. All ${total} files processed.`);
        void refreshHistory();
      }
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = { ...files };
    
    for (const file of Array.from(list)) {
      if (!/\.(bmp|png|jpe?g|wsq)$/i.test(file.name)) continue;
      
      const cnicMatch = file.name.match(/(\d{13})/);
      if (cnicMatch) {
        setNumber(cnicMatch[1]); 
      }

      const match = file.name.match(/(?:finger[-_ ]?|^)(10|[1-9])(?:\D|$)/i);
      const index = match ? Number(match[1]) - 1 : 0;
      next[index] = file;
    }
    setFiles(next);
    if (Object.keys(next).length === 1) setMode("Single Thumb");
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/admin/requests?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setRows(rows.filter((r) => r.id !== id));
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Failed to delete record.");
    }
  }

  async function handleSaveEdit() {
    if (!editingRow) return;
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRow),
      });
      const data = await res.json();
      if (data.success) {
        setRows(rows.map(r => r.id === editingRow.id ? { ...r, ...editingRow } : r));
        setIsModalOpen(false);
        setEditingRow(null);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Failed to update record.");
    }
  }

  // Filter Logic (Includes Lifetime)
  const filtered = rows.filter((row) => {
    if (filter === "All") return true;
    if (filter === "Lifetime") return row.expiryDate?.toLowerCase() === "lifetime";
    return row.status === filter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const shown = filtered.slice(page * 20, (page + 1) * 20);

  return (
    <main style={{ minHeight: "100vh", background: "#FAF8F5", paddingTop: 30, paddingBottom: 80, color: "#1a1a1a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .svc-breadcrumb { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .svc-breadcrumb button { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; color: #666; cursor: pointer; }
        .svc-breadcrumb span { font-size: 15px; color: #888; font-weight: 500; }
        .svc-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .svc-title { display: flex; align-items: center; gap: 16px; }
        .svc-icon { width: 54px; height: 54px; background: #fff; border: 1px solid #e8e5e0; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #111; box-shadow: 0 2px 10px rgba(0,0,0,0.02); flex-shrink: 0; }
        .svc-title h1 { font-size: 28px; font-weight: 600; margin: 0 0 6px 0; color: #111; letter-spacing: -0.5px; }
        .svc-title p { margin: 0; color: #6b7280; font-size: 16px; }
        .svc-price { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e8e5e0; padding: 10px 16px; border-radius: 99px; font-weight: 500; color: #4b5563; font-size: 14px; }
        .svc-panel { background: #fff; border: 1px solid #e8e5e0; border-radius: 16px; box-shadow: 0 4px 30px rgba(0,0,0,0.02); overflow: hidden; max-width: 1300px; margin: 0 auto; }
        .svc-tabs { display: flex; border-bottom: 1px solid #e8e5e0; background: #fff; padding: 0; overflow-x: auto; }
        .svc-tabs button { padding: 18px 28px; background: transparent; border: none; font-size: 15px; font-weight: 600; color: #666; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; white-space: nowrap; }
        .svc-tabs button.active { background: #1d1d1b; color: #fff; }
        .svc-price-note { padding: 12px 32px; background-color: #FAF8F5; border-bottom: 1px solid #e8e5e0; font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
        .svc-body { padding: 32px; }
        .svc-history-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .svc-history-head strong { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
        .svc-history-head small { background: #F3F4F6; padding: 2px 10px; border-radius: 99px; font-size: 13px; color: #4b5563; }
        .svc-muted { font-size: 14px; color: #6b7280; }
        .svc-table-wrap { overflow-x: auto; border: 1px solid #e8e5e0; border-radius: 12px; }
        .svc-table-wrap table { width: 100%; border-collapse: collapse; text-align: left; }
        .svc-table-wrap th { background: #FAF8F5; padding: 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8e5e0; white-space: nowrap; }
        .svc-table-wrap td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; white-space: nowrap; }
        .svc-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; font-size: 14px; color: #666; }
        .svc-pagination button { padding: 8px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; cursor: pointer; }
        .svc-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .svc-primary { padding: 14px 28px; background: #1d1d1b; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .svc-primary:disabled { background: #9ca3af; cursor: not-allowed; }
        .svc-input { width: 100%; border: 1px solid #e5e5e5; border-radius: 12px; padding: 14px 16px; font-size: 15px; outline: none; margin-bottom: 24px; }
        .svc-count { display: inline-flex; align-items: center; gap: 6px; background: #FAF8F5; border: 1px solid #e8e5e0; color: #4b5563; padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
        .svc-auto-line { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .svc-mode-label { display: inline-flex; align-items: center; gap: 6px; background: #1d1d1b; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }
        .svc-drop { border: 2px dashed #e8e5e0; border-radius: 16px; padding: 48px 20px; text-align: center; cursor: pointer; background: #FAF8F5; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; }
        .svc-hidden { display: none; }
        .svc-single-area { display: flex; justify-content: center; margin-bottom: 24px; }
        .svc-single-card { border: 1px dashed #e8e5e0; border-radius: 12px; padding: 32px 64px; display: flex; flex-direction: column; align-items: center; gap: 12px; background: #fff; }
        .svc-single-fingerprint { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #FAF8F5; border-radius: 50%; margin-bottom: 8px; }
        .svc-file-name { color: #10b981; font-weight: 500; font-size: 13px; }
        .svc-actions { display: flex; justify-content: flex-end; margin-top: 32px; }
        .svc-message { padding: 16px; background: #F3F4F6; border-radius: 10px; font-size: 14px; margin-top: 20px; }
        
        .svc-toggle { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
        .svc-toggle span { display: flex; flex-direction: column; padding-right: 16px; }
        .svc-toggle strong { font-size: 15px; color: #111; margin-bottom: 4px; }
        .svc-toggle small { font-size: 13px; color: #6b7280; line-height: 1.4; }
        .svc-toggle input { width: 44px; height: 24px; appearance: none; background: #e5e7eb; border-radius: 99px; position: relative; cursor: pointer; outline: none; transition: 0.3s; }
        .svc-toggle input:checked { background: #10b981; }
        .svc-toggle input::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .svc-toggle input:checked::after { transform: translateX(20px); }
        
        .svc-advanced { border: 1px solid #e8e5e0; border-radius: 12px; margin-top: 32px; overflow: hidden; background: #FAF8F5; }
        .svc-advanced > button { width: 100%; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: 600; font-size: 16px; color: #222; background: transparent; border: none; }
        .svc-advanced-inner { padding: 0 24px 24px; background: #fff; border-top: 1px solid #e8e5e0; }
        .svc-advanced-inner p { margin: 20px 0; font-size: 14px; color: #6b7280; }

        .mode-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; border-top: 1px solid #e8e5e0; padding-top: 24px; margin-bottom: 24px; }
        .mode-card { flex: 1 1 200px; max-width: 240px; border-radius: 12px; padding: 16px; cursor: pointer; position: relative; transition: all 0.2s; border: 1px solid #e8e5e0; background: #fff; }
        .mode-card.active-orange { border: 2px solid #d97706; background: #f59e0b; color: #fff; }
        .mode-card.active-grey { border: 2px solid #1d1d1b; background: #B6B1AC; }
        .mode-card.active-green { border: 2px solid #10b981; background: #10b981; color: #fff; }
        .mode-card .icon-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .mode-card strong { font-size: 15px; }
        .mode-card p { margin: 0; font-size: 13px; color: #6b7280; }
        .mode-card.active-orange p, .mode-card.active-green p { color: rgba(255,255,255,0.9); }
        .mode-card.active-grey p { color: #374151; }
        .mode-card .radio-circle { position: absolute; top: 16px; right: 16px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #111; background: #fff; display: flex; align-items: center; justify-content: center; }
        .mode-card .radio-circle::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #111; }
        .mode-card.active-orange .radio-circle, .mode-card.active-green .radio-circle { border-color: #fff; }
        .mode-card.active-orange .radio-circle::after, .mode-card.active-green .radio-circle::after { background: #fff; }
      `}} />

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px" }}>
        
        <div className="svc-breadcrumb">
          <button type="button" onClick={() => router.push("/dashboard")}><ArrowLeft size={17} /></button>
          <span>Home</span><span>›</span><span>CNIC</span>
        </div>

        <div className="svc-heading">
          <div className="svc-title">
            <span className="svc-icon"><Fingerprint size={23} /></span>
            <div><h1>{cfg.title}</h1><p>{cfg.subtitle}</p></div>
          </div>
          <div className="svc-price"><Coins size={18} /> Credit <b>{cfg.price}</b> per check</div>
        </div>

        <section className="svc-panel">
          <nav className="svc-tabs">
            {cfg.tabs.map((item) => (
              <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => { setTab(item); setApiResult(null); setBulkResults([]); }}>
                {item === "History" ? <History size={15} /> : item.includes("Bulk") ? <FolderOpen size={15} /> : <Scan size={15} />}
                {item}
              </button>
            ))}
          </nav>

          <div className="svc-price-note">
            <Coins size={14} /> {cfg.price} credits per check — billing and biometric matching are not active. No credits are charged.
          </div>

          {tab === "History" ? (
            <div className="svc-body">
              
              <div style={{ border: '1px solid #e8e5e0', borderRadius: 12, padding: '20px 24px', marginBottom: 24, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download size={20} color="#111" />
                    <strong style={{ fontSize: 16, fontWeight: 600 }}>Download history</strong>
                    <span style={{ background: '#F3F4F6', padding: '2px 10px', borderRadius: 99, fontSize: 13, fontWeight: 500, color: '#4b5563' }}>
                      {rows.length.toLocaleString()} rows
                    </span>
                  </div>
                  <button type="button" onClick={() => downloadCSV(filtered, slug)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                    <Download size={14} /> Download <span style={{ fontSize: 10 }}>▼</span>
                  </button>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Every row in the scope you pick — not limited by the page.</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, appearance: 'none', background: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 8px top 50%', backgroundSize: '8px' }}>
                    <option value="All">All</option>
                    <option value="SUCCESS">Match</option>
                    <option value="FAILED">Mismatch</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{filtered.length} rows</span>
                </div>
              </div>
              
              <div className="svc-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, paddingLeft: 20 }}><input type="checkbox" style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid #d1d5db' }} /></th>
                      <th>DATE</th>
                      <th>ID NUMBER</th>
                      <th>RESULT</th>
                      <th>TYPE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.length ? (
                      shown.map((row) => {
                        const isMatch = row.status === "SUCCESS";
                        const isLifetime = row.expiryDate?.toLowerCase() === "lifetime" || row.issueDate?.toLowerCase() === "lifetime";
                        
                        let typeLabel = "";
                        if (isMatch) {
                          if (isLifetime) typeLabel = "Lifetime";
                          else if (row.issueDate && row.issueDate !== "N/A") typeLabel = row.issueDate; 
                          else typeLabel = "Issue date"; 
                        }
                        
                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ paddingLeft: 20 }}><input type="checkbox" style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid #d1d5db' }} /></td>
                            <td style={{ color: '#6b7280', fontSize: 13 }}>{new Date(row.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                            <td style={{ fontFamily: 'monospace', color: '#374151', fontSize: 13 }}>{row.reference}</td>
                            <td><span style={{ color: isMatch ? '#10b981' : '#b91c1c', fontWeight: 600 }}>{isMatch ? 'MATCH' : 'MISMATCH'}</span></td>
                            <td style={{ color: '#6b7280', fontSize: 13 }}>{typeLabel}</td>
                            <td>
                              <div style={{ display: "flex", gap: "12px" }}>
                                <button onClick={() => { setEditingRow(row); setIsModalOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }} title="Edit">
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Delete">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                          No requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="svc-pagination" style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page + 1} of {totalPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ padding: '6px 16px', border: '1px solid #e5e5e5', borderRadius: 6, background: '#fff', color: page === 0 ? '#9ca3af' : '#374151', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}>Prev</button>
                  <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: '6px 16px', border: '1px solid #e5e5e5', borderRadius: 6, background: '#fff', color: page + 1 >= totalPages ? '#9ca3af' : '#374151', cursor: page + 1 >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Next</button>
                </div>
              </div>
            </div>
          ) : tab === "Bulk (Background)" ? (
            <div className="svc-body">
              <p className="svc-muted">Background verification requires an authorized provider and server worker.</p>
              <button type="button" className="svc-primary" onClick={() => { setJobs((prev) => [{ id: String(Date.now()), createdAt: new Date().toISOString(), status: "DRAFT - NOT PROCESSING", count: folderFiles.length }, ...prev]); setMsg("Local draft created."); }} style={{ marginTop: 16 }}><Plus size={16} /> New Bulk list</button>
              <div className="svc-history-head" style={{ marginTop: 18 }}><strong>Bulk Lists<small>{jobs.length}</small></strong></div>
              {jobs.length ? jobs.map((job) => <div className="svc-job" key={job.id} style={{ padding: 16, border: '1px solid #e8e5e0', borderRadius: 10, marginBottom: 10 }}>{job.status} · {new Date(job.createdAt).toLocaleString()}</div>) : <div className="svc-empty" style={{ padding: 40, textAlign: 'center', border: '1px dashed #e8e5e0', borderRadius: 10, color: '#888' }}>No background drafts yet.</div>}
              {msg && <p className="svc-message" role="status">{msg}</p>}
            </div>
          ) : tab === "Folder (Bulk)" ? (
            <div className="svc-body">
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>Scan Folder</label>
              <p className="svc-muted" style={{ marginBottom: 16 }}>Drag a folder of biometric scans onto the box below. The CNIC number is read from the file name.</p>
              <input ref={folder} type="file" multiple accept=".bmp,.png,.jpg,.jpeg,.wsq" className="svc-hidden" onChange={(e) => setFolderFiles(Array.from(e.target.files ?? []))} />
              <button type="button" className="svc-drop" onClick={() => folder.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFolderFiles(Array.from(e.dataTransfer.files)); }}>
                <FolderOpen size={28} color="#aaa" /><strong>Drag a folder here</strong>
              </button>
              <p className="svc-muted">{folderFiles.length} files selected.</p>
              
              <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", fontSize: 15, color: '#4b5563', fontWeight: 500 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1d1d1b' }} />
                I confirm I have permission.
              </label>

              <div className="svc-actions">
                <button type="button" className="svc-primary" disabled={busy || !consent || folderFiles.length === 0} onClick={() => void submit()}>
                  {busy ? "Processing..." : "Start Bulk Process"}
                </button>
              </div>

              {msg && <p className="svc-message" role="status">{msg}</p>}
              <Advanced advanced={advanced} setAdvanced={setAdvanced} invert={invert} setInvert={setInvert} flip={flip} setFlip={setFlip} />
            </div>
          ) : (
            <div className="svc-body">
              
              {/* SEARCH BAR FOR SINGLE TAB (NO IMAGE NEEDED) */}
              <div style={{ display: "flex", gap: 12, marginBottom: 32, background: "#FAF8F5", padding: 16, borderRadius: 12, border: "1px solid #e8e5e0" }}>
                <input 
                  type="text" 
                  value={searchCnic}
                  onChange={(e) => setSearchCnic(e.target.value)}
                  placeholder="Type 13-digit CNIC to fetch saved record..." 
                  style={{ flex: 1, padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button 
                  onClick={() => {
                    const cleanCnic = searchCnic.replace(/\D/g, "");
                    if (cleanCnic.length !== 13) return alert("Please enter a valid 13-digit CNIC.");
                    setBusy(true); setApiResult(null); setMsg("Searching database...");
                    
                    fetch(`/api/search?cnic=${cleanCnic}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          setApiResult(data.result);
                          setMsg("Record fetched from database.");
                        } else {
                          setApiResult({ cnic: cleanCnic, found: false, message: data.error || "Record not found." });
                          setMsg(data.error || "Record not found.");
                        }
                      })
                      .catch(() => setMsg("Search failed."))
                      .finally(() => setBusy(false));
                  }} 
                  disabled={busy}
                  style={{ background: "#1d1d1b", color: "white", padding: "0 24px", borderRadius: 8, border: "none", fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Search size={16} /> {busy ? "Searching..." : "Fetch Record"}
                </button>
                {apiResult && (
                  <button 
                    onClick={() => { setApiResult(null); setSearchCnic(""); }}
                    style={{ background: "transparent", color: "#b91c1c", padding: "0 16px", borderRadius: 8, border: "1px solid #fecaca", fontWeight: 600, cursor: "pointer" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "#e8e5e0" }} />
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Or verify with fingerprint</span>
                <div style={{ flex: 1, height: 1, background: "#e8e5e0" }} />
              </div>

              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>ID Number (13 digits)</label>
              <input className="svc-input" value={number} onChange={(e) => setNumber(e.target.value.replace(/[^\d-]/g, "").slice(0, 15))} placeholder="e. g. 4210112345671" />
              
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>Biometric Scans</label>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div className="svc-count">
                  <CheckCircle2 size={14} /> {loadedCount}/{activePositions.length} loaded
                </div>
              </div>

              <input ref={upload} className="svc-hidden" type="file" multiple accept=".bmp,.png,.jpg,.jpeg,.wsq" onChange={(e) => addFiles(e.target.files)} />
              <button type="button" className="svc-drop" onClick={() => upload.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
                <div style={{ background: '#fff', border: '1px solid #e5e5e5', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                  <Upload size={24} color="#6b7280" />
                </div>
                <strong style={{ fontSize: 15, color: '#111' }}>Drop or pick fingerprint files</strong>
              </button>

              <div className="mode-tabs">
                {[
                  { name: "Single Thumb", desc: "1 image, tries L then R.", icon: (active: boolean) => <Fingerprint size={24} color={active ? "#fff" : "#d97706"} /> },
                  { name: "2 Thumbs", desc: "Index 1 (R) + 6 (L).", icon: (active: boolean) => <Fingerprint size={24} color={active ? "#111" : "#d97706"} /> },
                  { name: "8 Fingers", desc: "No thumbs.", icon: (active: boolean) => <Hand size={24} color={active ? "#111" : "#d97706"} /> },
                  { name: "10 Fingers", desc: "All ten.", icon: (active: boolean) => <Hand size={24} color={active ? "#fff" : "#d97706"} /> }
                ].map((m) => {
                  const isActive = mode === m.name;
                  let activeClass = "";
                  if (isActive) {
                    if (m.name === "Single Thumb") activeClass = "active-orange";
                    else if (m.name === "10 Fingers") activeClass = "active-green";
                    else activeClass = "active-grey";
                  }
                  return (
                    <div key={m.name} onClick={() => setMode(m.name)} className={`mode-card ${activeClass}`}>
                      <div className="icon-row">
                        {m.icon(isActive)}
                        <strong>{m.name}</strong>
                      </div>
                      <p>{m.desc}</p>
                      {isActive && <div className="radio-circle" />}
                    </div>
                  );
                })}
              </div>

              {mode === "Single Thumb" && (
                <div className="svc-single-area">
                  <div className="svc-single-card">
                    <span className="svc-single-fingerprint"><Fingerprint size={42} /></span>
                    <strong>Single Thumb</strong>
                    <input 
                      ref={singleThumbUpload} 
                      className="svc-hidden" 
                      type="file" 
                      accept=".bmp,.png,.jpg,.jpeg,.wsq" 
                      onChange={(e) => { 
                        const file = e.target.files?.[0]; 
                        if (file) {
                          const cnicMatch = file.name.match(/(\d{13})/);
                          if (cnicMatch) setNumber(cnicMatch[1]);
                          setFiles((prev) => ({ ...prev, 0: file })); 
                        }
                        e.currentTarget.value = ""; 
                      }} 
                    />
                    <button type="button" className="svc-primary" style={{ padding: '8px 16px', fontSize: 13, marginTop: 8 }} onClick={() => singleThumbUpload.current?.click()}>{files[0] ? "Replace image" : "Upload image"}</button>
                    {files[0] && <small className="svc-file-name">{files[0].name}</small>}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{loadedCount === 0 ? "No scans uploaded yet." : `${loadedCount} scan(s) ready.`}</p>

              <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", fontSize: 15, color: '#4b5563', fontWeight: 500 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1d1d1b' }} />
                I confirm I have permission to check this private CNIC record.
              </label>

              <Advanced advanced={advanced} setAdvanced={setAdvanced} invert={invert} setInvert={setInvert} flip={flip} setFlip={setFlip} />

              <div className="svc-actions">
                <button type="button" className="svc-primary" disabled={busy || !consent || loadedCount === 0} onClick={() => void submit()}>
                  <Scan size={18} /> {busy ? "Checking..." : "Look Up Match"}
                </button>
              </div>
              
              {msg && <p className="svc-message" role="status">{msg}</p>}
              
              {apiResult && <ResultCard result={apiResult} />}

              {bulkResults.length > 0 && (
                <div style={{ 
                  marginTop: 20, 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', 
                  gap: 16 
                }}>
                  {bulkResults.map((res, idx) => (
                    <ResultCard key={idx} result={res} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ADMIN EDIT MODAL */}
      {isModalOpen && editingRow && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "20px", fontWeight: "bold" }}>Edit Record (Admin)</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Name (Urdu)</label>
                <input value={editingRow.nameUrdu || editingRow.name || ""} onChange={(e) => setEditingRow({ ...editingRow, nameUrdu: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Father Name</label>
                <input value={editingRow.fatherName || ""} onChange={(e) => setEditingRow({ ...editingRow, fatherName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Address</label>
                <input value={editingRow.address || ""} onChange={(e) => setEditingRow({ ...editingRow, address: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>DOB</label>
                <input value={editingRow.dob || ""} onChange={(e) => setEditingRow({ ...editingRow, dob: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }} />
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