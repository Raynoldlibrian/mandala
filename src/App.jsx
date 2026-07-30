import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Building2, ClipboardCheck, LayoutDashboard, ChevronDown, LinkIcon, Check,
  CircleDot, Bell, X, ExternalLink, AlertTriangle, Loader2, Settings, RefreshCw, Lock,
  BookOpen, ClipboardList, BarChart3, FileText, ShieldCheck, ChevronRight, Download,
} from "lucide-react";
import { apiGet, apiPost, toRecordMap, localConfig, unlockStore } from "./api.js";
import logoImg from "./logo.png";

// URL Web App Apps Script bawaan — OPD tidak perlu mengisi ini secara manual.
// Tombol Settings (⚙️) di header tetap tersedia untuk mengganti sumber data bila diperlukan.
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxYXaN6FxqVs9A7VYLvRLYAj_6EWf0gTUEHtvQzalCrK8ofmE1X2Q1vaIVPjBn_ZKjM/exec";

const INSTANSI = "Bagian Organisasi Sekretariat Daerah Kabupaten Indragiri Hulu";
const FOOTER_TEXT = "Raynold — Bagian Organisasi Setda — 2026";

const GLOBAL_STYLE = `
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .mdl-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .mdl-nav-btn { flex-shrink: 0; white-space: nowrap; }
  @media (max-width: 560px) {
    .mdl-header { padding: 14px 16px !important; gap: 12px !important; }
    .mdl-logo { width: 52px !important; height: 52px !important; }
    .mdl-title { font-size: 17px !important; }
    .mdl-sub { font-size: 11.5px !important; }
    .mdl-tag { font-size: 10.5px !important; }
    .mdl-nav-btn { padding: 11px 14px !important; font-size: 12.5px !important; }
    .mdl-header-actions { gap: 6px !important; }
  }
`;

// ---------- Konstanta tampilan ----------
const STATUS_OPTIONS = [
  { value: "belum", label: "Belum Ada Progres", color: "#B3453A" },
  { value: "proses", label: "Dalam Proses", color: "#C9962F" },
  { value: "sesuai", label: "Sesuai Target", color: "#3C7A5F" },
];

const VERIF_OPTIONS = [
  { value: "sesuai", label: "Sudah Sesuai Rekomendasi" },
  { value: "perlu", label: "Belum Sesuai Rekomendasi" },
  { value: "ditolak", label: "Belum di_TL" },
];

const INK = "#1F2A28";
const PAPER = "#F6F5F0";
const PRIMARY = "#0F3D3A";
const PRIMARY_SOFT = "#E4ECE9";
const GOLD = "#C9962F";
const GOLD_SOFT = "#FBF1DE";
const LINE = "#DAD6C9";
const RED = "#B3453A";

// ---------- Small shared UI ----------
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 4 }}>{label}</label>
      {hint && <div style={{ fontSize: 12.5, color: "#7A776C", marginBottom: 8, lineHeight: 1.5 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", appearance: "none", background: disabled ? "#EFEEE8" : "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 38px 11px 12px", fontSize: 14.5, color: value ? INK : "#9A9788", cursor: disabled ? "not-allowed" : "pointer", outline: "none" }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <ChevronDown size={16} style={{ position: "absolute", right: 12, top: 13, color: "#9A9788", pointerEvents: "none" }} />
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ fontSize: 12, color: "#9A9788" }}>—</span>;
  const s = STATUS_OPTIONS.find((x) => x.value === status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: s.color, background: s.color + "1A", padding: "3px 10px", borderRadius: 999 }}>
      <CircleDot size={10} /> {s.label}
    </span>
  );
}

function RevisionTag() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "#8A5A15", background: GOLD_SOFT, padding: "3px 9px", borderRadius: 999, marginLeft: 6 }}>
      <AlertTriangle size={10} /> Perlu Direvisi
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#B9C4C0" : PRIMARY, color: "#fff", border: "none", borderRadius: 6, padding: "12px 22px", fontSize: 14.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,61,58,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, maxWidth: 460, width: "100%", maxHeight: "88vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: INK, paddingRight: 12 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A9788", padding: 2 }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ListRow({ onClick, left, right, flagged }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "#fff", border: `1px solid ${flagged ? GOLD : LINE}`, borderRadius: 8,
      padding: "13px 16px", marginBottom: 10, cursor: "pointer", textAlign: "left",
    }}>
      {left}
      {right}
    </button>
  );
}

// ---------- Gerbang kode akses OPD ----------
function AccessGate({ opd, onVerifyAccess, onUnlocked }) {
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setChecking(true);
    try {
      const valid = await onVerifyAccess(opd, pin);
      if (valid) {
        unlockStore.unlock(opd);
        onUnlocked();
      } else {
        setError("Kode akses salah, coba lagi.");
        setPin("");
      }
    } catch (err) {
      setError(err.message || "Gagal memeriksa kode akses.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "32px 24px", textAlign: "center", maxWidth: 340, margin: "20px auto" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: PRIMARY_SOFT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Lock size={19} color={PRIMARY} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>{opd}</div>
      <div style={{ fontSize: 12.5, color: "#7A776C", marginBottom: 18 }}>Masukkan kode akses OPD untuk mulai mengisi progres.</div>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) handleSubmit(); }}
        placeholder="••••"
        inputMode="numeric"
        maxLength={4}
        style={{ width: 120, textAlign: "center", letterSpacing: 8, fontSize: 20, fontWeight: 700, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 0", color: INK, marginBottom: 14 }}
      />
      {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
      <PrimaryButton disabled={pin.length !== 4 || checking} onClick={handleSubmit}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {checking && <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />}
        {checking ? "Memeriksa..." : "Buka Akses"}
      </PrimaryButton>
    </div>
  );
}

// ---------- Input OPD (list + modal) ----------
function InputOPDScreen({ records, opdList, tahunList, currentYear, onSubmitProgres, onVerifyAccess }) {
  const [opd, setOpd] = useState("");
  const [tahun, setTahun] = useState(currentYear);
  const [activeKode, setActiveKode] = useState(null);
  const [, forceUpdate] = useState(0);

  const list = useMemo(
    () => Object.values(records).filter((r) => r.opd === opd && r.tahun === tahun && r.verifikasi !== "sesuai"),
    [records, opd, tahun]
  );
  const active = activeKode ? records[activeKode] : null;
  const unlocked = opd && unlockStore.isUnlocked(opd);

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <Field label="OPD"><Select value={opd} onChange={setOpd} options={opdList} placeholder="Pilih perangkat daerah Anda" /></Field>
        </div>
        <div style={{ minWidth: 140 }}>
          <Field label="Tahun"><Select value={tahun} onChange={setTahun} options={tahunList} placeholder="Tahun" /></Field>
        </div>
      </div>

      {!opd && <div style={{ color: "#9A9788", fontSize: 13.5, padding: "20px 0" }}>Pilih OPD untuk menampilkan daftar rekomendasi.</div>}

      {opd && !unlocked && (
        <AccessGate opd={opd} onVerifyAccess={onVerifyAccess} onUnlocked={() => forceUpdate((n) => n + 1)} />
      )}

      {opd && unlocked && list.length === 0 && <div style={{ color: "#9A9788", fontSize: 13.5, padding: "20px 0" }}>Tidak ada rekomendasi untuk OPD dan tahun ini.</div>}

      {opd && unlocked && list.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7A776C", marginBottom: 10 }}>
            Daftar Rekomendasi ({list.length}) — klik untuk mengisi progres
          </div>
          {list.map((r) => {
            const flagged = r.verifikasi === "perlu" || r.verifikasi === "ditolak";
            return (
              <ListRow key={r.kode} flagged={flagged} onClick={() => setActiveKode(r.kode)}
                left={
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{r.kode}</div>
                    <div style={{ fontSize: 12.5, color: "#7A776C", marginTop: 2, maxWidth: 320 }}>{r.teks}</div>
                  </div>
                }
                right={
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                    <StatusBadge status={r.status} />
                    {flagged && <RevisionTag />}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {active && (
        <InputModal record={active} onClose={() => setActiveKode(null)}
          onSave={(patch) => onSubmitProgres(active, patch).then(() => setActiveKode(null))} />
      )}
    </div>
  );
}

function InputModal({ record, onClose, onSave }) {
  const [status, setStatus] = useState(record.status || "");
  const [estimasi, setEstimasi] = useState(record.estimasi || "");
  const [link, setLink] = useState(record.link || "");
  const [catatanOpd, setCatatanOpd] = useState(record.catatanOpd || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsRevision = record.verifikasi === "perlu" || record.verifikasi === "ditolak";

  const handleSave = () => {
    setError("");
    setSaving(true);
    Promise.resolve(onSave({ status, estimasi, link, catatanOpd }))
      .catch((err) => setError(err.message || "Gagal menyimpan, coba lagi."))
      .finally(() => setSaving(false));
  };

  return (
    <Modal title={record.kode} onClose={onClose}>
      {needsRevision && (
        <div style={{ background: GOLD_SOFT, border: `1px solid ${GOLD}`, borderRadius: 6, padding: "10px 12px", fontSize: 12.5, color: "#8A5A15", marginBottom: 16, lineHeight: 1.5 }}>
          <strong>Perlu direvisi.</strong> Catatan APIP: {record.catatan || "—"}
        </div>
      )}
      <div style={{ background: "#F6F5F0", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#514E43", marginBottom: 18, lineHeight: 1.5 }}>
        {record.teks}
      </div>

      <Field label="Progres Tindak Lanjut">
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="Pilih status progres" />
      </Field>

      {status === "proses" && (
        <Field label="Estimasi Tanggal Penyelesaian">
          <input type="date" value={estimasi} onChange={(e) => setEstimasi(e.target.value)}
            style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px", fontSize: 14.5, color: INK }} />
        </Field>
      )}

      <Field label="Link Bukti Dukung" hint={status === "sesuai" ? "Wajib diisi untuk status Sesuai Target." : "Opsional — bisa dilengkapi belakangan kalau belum ada."}>
        <div style={{ position: "relative" }}>
          <LinkIcon size={15} style={{ position: "absolute", left: 12, top: 13, color: "#9A9788" }} />
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…"
            style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px 11px 36px", fontSize: 14, color: INK }} />
        </div>
      </Field>

      <Field label="Catatan" hint="Opsional — jelaskan konteks tambahan untuk APIP, misalnya lokasi bukti atau progres yang sudah dilakukan.">
        <textarea value={catatanOpd} onChange={(e) => setCatatanOpd(e.target.value)} rows={3}
          style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px", fontSize: 14, color: INK, resize: "vertical", fontFamily: "inherit" }} />
      </Field>

      {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <PrimaryButton disabled={!status || (status === "proses" && !estimasi) || (status === "sesuai" && !link) || saving}
        onClick={handleSave} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {saving && <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />}
        {saving ? "Menyimpan..." : "Kirim Progres"}
      </PrimaryButton>
    </Modal>
  );
}

// ---------- Verifikasi APIP (list + modal) ----------
function VerifikasiScreen({ records, apipList, onSubmitVerifikasi }) {
  const [verifikator, setVerifikator] = useState("");
  const [activeKode, setActiveKode] = useState(null);
  const pending = useMemo(() => Object.values(records).filter((r) => r.submitted && !r.verifikasi), [records]);
  const active = activeKode ? records[activeKode] : null;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 20 }}>
        <Field label="Anda login sebagai" hint="Dipilih sekali, berlaku untuk semua verifikasi di sesi ini.">
          <Select value={verifikator} onChange={setVerifikator} options={apipList} placeholder="Pilih nama Anda" />
        </Field>
      </div>

      {!verifikator ? (
        <div style={{ color: "#9A9788", fontSize: 13.5, padding: "20px 0" }}>Pilih nama Anda dulu untuk mulai memverifikasi.</div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7A776C", marginBottom: 10 }}>
            Tindak Lanjut Baru — menunggu verifikasi ({pending.length})
          </div>
          {pending.length === 0 && <div style={{ color: "#9A9788", fontSize: 13.5, padding: "20px 0" }}>Tidak ada tindak lanjut yang perlu diverifikasi saat ini.</div>}
          {pending.map((r) => (
            <ListRow key={r.kode} onClick={() => setActiveKode(r.kode)}
              left={
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{r.opd}</div>
                  <div style={{ fontSize: 12.5, color: "#7A776C", marginTop: 2 }}>{r.kode}</div>
                </div>
              }
              right={<StatusBadge status={r.status} />}
            />
          ))}
        </>
      )}

      {active && (
        <VerifikasiModal record={active} verifikator={verifikator} onClose={() => setActiveKode(null)}
          onSave={(patch) => onSubmitVerifikasi(active, patch).then(() => setActiveKode(null))} />
      )}
    </div>
  );
}

function VerifikasiModal({ record, verifikator, onClose, onSave }) {
  const [hasil, setHasil] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    setSaving(true);
    Promise.resolve(onSave({ verifikasi: hasil, catatan, verifikator }))
      .catch((err) => setError(err.message || "Gagal menyimpan, coba lagi."))
      .finally(() => setSaving(false));
  };

  return (
    <Modal title="Verifikasi Tindak Lanjut" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, fontSize: 13.5 }}>
        <div><span style={{ color: "#7A776C" }}>Verifikator</span><div style={{ fontWeight: 700, color: PRIMARY }}>{verifikator}</div></div>
        <div><span style={{ color: "#7A776C" }}>OPD</span><div style={{ fontWeight: 700, color: INK }}>{record.opd}</div></div>
        <div><span style={{ color: "#7A776C" }}>Kode Rekomendasi</span><div style={{ fontWeight: 700, color: INK }}>{record.kode}</div></div>
        <div><span style={{ color: "#7A776C" }}>Uraian Rekomendasi</span><div style={{ color: "#514E43", lineHeight: 1.5 }}>{record.teks}</div></div>
        <div><span style={{ color: "#7A776C" }}>Status Progres</span><div style={{ marginTop: 3 }}><StatusBadge status={record.status} /></div></div>
        <div>
          <span style={{ color: "#7A776C" }}>Bukti Dukung</span>
          <div style={{ marginTop: 3 }}>
            {record.link
              ? <a href={record.link} target="_blank" rel="noreferrer" style={{ color: PRIMARY, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>Buka tautan Drive <ExternalLink size={13} /></a>
              : <span style={{ color: RED }}>Belum dilampirkan</span>}
          </div>
        </div>
        {record.catatanOpd && (
          <div>
            <span style={{ color: "#7A776C" }}>Catatan dari OPD</span>
            <div style={{ color: "#514E43", lineHeight: 1.5, marginTop: 3 }}>{record.catatanOpd}</div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
        <Field label="Hasil Verifikasi">
          <Select value={hasil} onChange={setHasil} options={VERIF_OPTIONS} placeholder="Pilih hasil verifikasi" />
        </Field>
        <Field label="Catatan Perbaikan" hint={hasil === "sesuai" ? "Opsional." : "Wajib diisi bila hasil Perlu Perbaikan / Ditolak."}>
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
            style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px", fontSize: 14, color: INK, resize: "vertical", fontFamily: "inherit" }} />
        </Field>
        {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <PrimaryButton disabled={!hasil || (hasil !== "sesuai" && !catatan) || saving} onClick={handleSave}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving && <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />}
          {saving ? "Menyimpan..." : "Simpan Verifikasi"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function DetailModal({ record, onClose, onEdit }) {
  const canEdit = record.status !== "sesuai";
  return (
    <Modal title="Detail Tindak Lanjut" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, fontSize: 13.5 }}>
        <div><span style={{ color: "#7A776C" }}>OPD</span><div style={{ fontWeight: 700, color: INK }}>{record.opd}</div></div>
        <div><span style={{ color: "#7A776C" }}>Kode Rekomendasi</span><div style={{ fontWeight: 700, color: INK }}>{record.kode}</div></div>
        <div><span style={{ color: "#7A776C" }}>Tahun Penilaian</span><div style={{ color: INK }}>{record.tahun}</div></div>
        <div><span style={{ color: "#7A776C" }}>Uraian Rekomendasi</span><div style={{ color: "#514E43", lineHeight: 1.5 }}>{record.teks}</div></div>
        <div><span style={{ color: "#7A776C" }}>Status Progres</span><div style={{ marginTop: 3 }}><StatusBadge status={record.status} /></div></div>
        {record.status === "proses" && record.estimasi && (
          <div><span style={{ color: "#7A776C" }}>Estimasi Penyelesaian</span><div style={{ color: INK }}>{record.estimasi}</div></div>
        )}
        <div>
          <span style={{ color: "#7A776C" }}>Bukti Dukung</span>
          <div style={{ marginTop: 3 }}>
            {record.link
              ? <a href={record.link} target="_blank" rel="noreferrer" style={{ color: PRIMARY, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>Buka tautan Drive <ExternalLink size={13} /></a>
              : <span style={{ color: RED }}>Belum dilampirkan</span>}
          </div>
        </div>
        {record.catatanOpd && (
          <div><span style={{ color: "#7A776C" }}>Catatan dari OPD</span><div style={{ color: "#514E43", lineHeight: 1.5 }}>{record.catatanOpd}</div></div>
        )}
        <div>
          <span style={{ color: "#7A776C" }}>Verifikasi APIP</span>
          <div style={{ marginTop: 3 }}>
            {record.verifikasi
              ? <span style={{ color: record.verifikasi === "sesuai" ? "#3C7A5F" : record.verifikasi === "perlu" ? "#8A5A15" : RED, fontWeight: 700 }}>
                  {VERIF_OPTIONS.find((v) => v.value === record.verifikasi)?.label}
                </span>
              : <span style={{ color: "#9A9788" }}>Belum Diverifikasi</span>}
          </div>
        </div>
        {record.catatan && (
          <div><span style={{ color: "#7A776C" }}>Catatan APIP</span><div style={{ color: "#514E43", lineHeight: 1.5 }}>{record.catatan}</div></div>
        )}
      </div>

      {canEdit && (
        <PrimaryButton onClick={onEdit} style={{ width: "100%" }}>
          Input Progres
        </PrimaryButton>
      )}
    </Modal>
  );
}

// ---------- Kamus ----------
const KOMPONEN_ORDER = [
  { key: "Perencanaan Kinerja", icon: ClipboardList },
  { key: "Pengukuran Kinerja", icon: BarChart3 },
  { key: "Pelaporan Kinerja", icon: FileText },
  { key: "Evaluasi Akuntabilitas Kinerja Internal", icon: ShieldCheck },
];

function KamusDetailModal({ item, onClose }) {
  return (
    <Modal title="Detail Kamus" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13.5 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7A776C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Rekomendasi</div>
          <div style={{ color: INK, fontWeight: 600, lineHeight: 1.5 }}>{item.rekomendasi}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7A776C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Keterangan / Catatan Tindak Lanjut</div>
          <div style={{ color: "#514E43", lineHeight: 1.6 }}>{item.keterangan || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7A776C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Bukti Dukung</div>
          <div style={{ background: GOLD_SOFT, border: `1px solid ${GOLD}`, borderRadius: 6, padding: "10px 12px", color: "#8A5A15", lineHeight: 1.5 }}>
            {item.bukti_dukung || "—"}
          </div>
        </div>
        {item.link_contoh_format && (
          <a href={item.link_contoh_format} target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start",
            background: PRIMARY_SOFT, color: PRIMARY, fontWeight: 600, fontSize: 13,
            padding: "9px 14px", borderRadius: 7, textDecoration: "none",
          }}>
            <LinkIcon size={14} /> Lihat Contoh Format <ExternalLink size={13} />
          </a>
        )}
      </div>
    </Modal>
  );
}

function KamusScreen({ kamusList }) {
  const [expanded, setExpanded] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const grouped = useMemo(() => {
    const map = {};
    (kamusList || []).forEach((k) => {
      const key = (k.komponen_sakip || "Lainnya").trim();
      map[key] = map[key] || [];
      map[key].push(k);
    });
    return map;
  }, [kamusList]);

  const orderedKeys = useMemo(() => {
    const known = KOMPONEN_ORDER.map((k) => k.key).filter((k) => grouped[k]);
    const extra = Object.keys(grouped).filter((k) => !KOMPONEN_ORDER.some((o) => o.key === k));
    return [...known, ...extra];
  }, [grouped]);

  if (!kamusList || kamusList.length === 0) {
    return (
      <div style={{ color: "#9A9788", fontSize: 13.5, padding: "40px 0", textAlign: "center" }}>
        Kamus belum berisi data. Hubungi admin untuk melengkapi panduan tindak lanjut.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {orderedKeys.map((key) => {
        const meta = KOMPONEN_ORDER.find((k) => k.key === key);
        const Icon = meta?.icon || BookOpen;
        const items = grouped[key];
        const isOpen = expanded === key;
        return (
          <div key={key} style={{ marginBottom: 14 }}>
            <button onClick={() => setExpanded(isOpen ? null : key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left",
              background: "#fff", border: `1px solid ${isOpen ? PRIMARY : LINE}`, borderRadius: 10,
              padding: "16px 18px", cursor: "pointer",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: PRIMARY_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={PRIMARY} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{key}</div>
                <div style={{ fontSize: 12, color: "#7A776C", marginTop: 1 }}>{items.length} rekomendasi</div>
              </div>
              <ChevronRight size={18} color="#9A9788" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {isOpen && (
              <div style={{ paddingTop: 10, paddingLeft: 4 }}>
                {items.map((item, idx) => (
                  <ListRow key={idx} onClick={() => setActiveItem(item)}
                    left={<div style={{ fontSize: 13.5, color: INK, maxWidth: 560 }}>{item.rekomendasi}</div>}
                    right={<ChevronRight size={15} color="#B7B3A3" style={{ flexShrink: 0, marginLeft: 12 }} />}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {activeItem && <KamusDetailModal item={activeItem} onClose={() => setActiveItem(null)} />}
    </div>
  );
}

// ---------- Dashboard ----------
function DashboardScreen({ records, opdList, tahunList, currentYear, onSubmitProgres, onCetakLaporan, goToVerifikasi }) {
  const [filterOpd, setFilterOpd] = useState("");
  const [filterTahun, setFilterTahun] = useState(currentYear);
  const [detailKode, setDetailKode] = useState(null);
  const [editKode, setEditKode] = useState(null);
  const [cetakLoading, setCetakLoading] = useState(false);
  const [cetakError, setCetakError] = useState("");

  const handleCetak = async () => {
    setCetakError("");
    setCetakLoading(true);
    try {
      await onCetakLaporan(filterOpd, filterTahun);
    } catch (err) {
      setCetakError(err.message || "Gagal membuat laporan, coba lagi.");
    } finally {
      setCetakLoading(false);
    }
  };

  const all = Object.values(records);
  const filtered = useMemo(
    () => all.filter((r) => (!filterOpd || r.opd === filterOpd) && (!filterTahun || r.tahun === filterTahun)),
    [records, filterOpd, filterTahun]
  );
  const pendingVerifikasi = all.filter((r) => r.submitted && !r.verifikasi);

  const total = filtered.length;
  const sesuai = filtered.filter((r) => r.status === "sesuai").length;
  const proses = filtered.filter((r) => r.status === "proses").length;
  const belum = total - sesuai - proses;
  const pct = total ? Math.round((sesuai / total) * 100) : 0;

  const pieData = [
    { name: "Sesuai Target", value: sesuai, color: "#3C7A5F" },
    { name: "Dalam Proses", value: proses, color: "#C9962F" },
    { name: "Belum Ada Progres", value: belum, color: RED },
  ];

  const verifSesuai = filtered.filter((r) => r.verifikasi === "sesuai").length;
  const verifPerlu = filtered.filter((r) => r.verifikasi === "perlu").length;
  const verifDitolak = filtered.filter((r) => r.verifikasi === "ditolak").length;
  const verifBelum = total - verifSesuai - verifPerlu - verifDitolak;
  const verifPieData = [
    { name: "Sudah Sesuai Rekomendasi", value: verifSesuai, color: "#3C7A5F" },
    { name: "Belum Sesuai Rekomendasi", value: verifPerlu, color: "#C9962F" },
    { name: "Belum di_TL", value: verifDitolak, color: RED },
    { name: "Belum Diverifikasi", value: verifBelum, color: "#B7B3A3" },
  ];

  const opdRanking = useMemo(() => {
    const byOpd = {};
    filtered.forEach((r) => {
      byOpd[r.opd] = byOpd[r.opd] || { opd: r.opd, total: 0, sesuai: 0 };
      byOpd[r.opd].total += 1;
      if (r.status === "sesuai") byOpd[r.opd].sesuai += 1;
    });
    return Object.values(byOpd).map((o) => ({ ...o, pct: Math.round((o.sesuai / o.total) * 100) })).sort((a, b) => b.pct - a.pct);
  }, [filtered]);

  const StatCard = ({ label, value, accent }) => (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: "16px 18px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#7A776C", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || INK }}>{value}</div>
    </div>
  );
  const rankColor = (p) => (p >= 70 ? "#3C7A5F" : p >= 30 ? "#C9962F" : RED);

  return (
    <div>
      <button onClick={goToVerifikasi} disabled={pendingVerifikasi.length === 0} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left",
        background: pendingVerifikasi.length ? GOLD_SOFT : "#fff", border: `1px solid ${pendingVerifikasi.length ? GOLD : LINE}`,
        borderRadius: 8, padding: "16px 18px", marginBottom: 22, cursor: pendingVerifikasi.length ? "pointer" : "default",
      }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: pendingVerifikasi.length ? "#fff" : PRIMARY_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bell size={17} color={pendingVerifikasi.length ? GOLD : "#9A9788"} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>
            {pendingVerifikasi.length > 0 ? `${pendingVerifikasi.length} Tindak Lanjut Baru` : "Tidak ada tindak lanjut baru"}
          </div>
          <div style={{ fontSize: 12.5, color: "#7A776C", marginTop: 1 }}>
            {pendingVerifikasi.length > 0 ? "Menunggu verifikasi APIP — klik untuk memproses" : "Semua tindak lanjut sudah diverifikasi"}
          </div>
        </div>
        {pendingVerifikasi.length > 0 && (
          <span style={{ background: GOLD, color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 11px" }}>{pendingVerifikasi.length}</span>
        )}
      </button>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7A776C", marginBottom: 5 }}>OPD</div>
          <Select value={filterOpd} onChange={setFilterOpd} options={opdList} placeholder="Semua OPD" />
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7A776C", marginBottom: 5 }}>Tahun</div>
          <Select value={filterTahun} onChange={setFilterTahun} options={tahunList} placeholder="Semua tahun" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <PrimaryButton disabled={!filterOpd || !filterTahun || cetakLoading} onClick={handleCetak}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px" }}>
            {cetakLoading ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <Download size={15} />}
            {cetakLoading ? "Membuat laporan..." : "Cetak Laporan"}
          </PrimaryButton>
        </div>
      </div>
      {cetakError && (
        <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{cetakError}</div>
      )}
      {!filterOpd && (
        <div style={{ color: "#9A9788", fontSize: 12, marginTop: -12, marginBottom: 16 }}>Pilih OPD tertentu dulu untuk mengaktifkan tombol Cetak Laporan.</div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="OPD Terpantau" value={opdRanking.length} />
        <StatCard label="Total Rekomendasi" value={total} />
        <StatCard label="% Penyelesaian" value={`${pct}%`} accent={PRIMARY} />
        <StatCard label="Sesuai Target" value={sesuai} accent="#3C7A5F" />
        <StatCard label="Belum Ada Progres" value={belum} accent={RED} />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 18, flex: "1 1 260px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>Persentase Rekomendasi</div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 18, flex: "1 1 260px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>Hasil Verifikasi APIP</div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verifPieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
                  {verifPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 18, flex: "1 1 260px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12 }}>OPD Berdasarkan Tingkat Kepatuhan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 268, overflowY: "auto", paddingRight: 6 }}>
            {opdRanking.map((o) => (
              <div key={o.opd}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: INK, fontWeight: 600 }}>{o.opd}</span>
                  <span style={{ color: rankColor(o.pct), fontWeight: 700 }}>{o.pct}%</span>
                </div>
                <div style={{ background: "#EFEEE8", borderRadius: 999, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${o.pct}%`, background: rankColor(o.pct), height: "100%", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10 }}>Matriks Monitoring Tindak Lanjut</div>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: PRIMARY_SOFT, textAlign: "left" }}>
              {["OPD", "Kode", "Tahun", "Progres", "Verifikasi APIP", "Evidence"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 700, color: PRIMARY, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "18px 14px", textAlign: "center", color: "#9A9788" }}>Tidak ada data untuk filter ini.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.kode} onClick={() => setDetailKode(r.kode)} style={{ borderTop: `1px solid ${LINE}`, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "10px 14px", color: INK }}>{r.opd}</td>
                <td style={{ padding: "10px 14px", color: "#7A776C" }}>{r.kode}</td>
                <td style={{ padding: "10px 14px", color: "#7A776C" }}>{r.tahun}</td>
                <td style={{ padding: "10px 14px" }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: "10px 14px", color: r.verifikasi ? (r.verifikasi === "sesuai" ? "#3C7A5F" : r.verifikasi === "perlu" ? "#8A5A15" : RED) : "#9A9788" }}>
                  {r.verifikasi ? VERIF_OPTIONS.find((v) => v.value === r.verifikasi)?.label : "Belum Diverifikasi"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {r.link ? <a href={r.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: PRIMARY }}>Lihat</a> : <span style={{ color: RED }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailKode && records[detailKode] && (
        <DetailModal record={records[detailKode]} onClose={() => setDetailKode(null)}
          onEdit={() => { setEditKode(detailKode); setDetailKode(null); }} />
      )}

      {editKode && records[editKode] && (
        <InputModal record={records[editKode]} onClose={() => setEditKode(null)}
          onSave={(patch) => onSubmitProgres(records[editKode], patch).then(() => setEditKode(null))} />
      )}
    </div>
  );
}

// ---------- Config screen ----------
function ConfigScreen({ initialValue, onSubmit, error, loading }) {
  const [value, setValue] = useState(initialValue || "");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: PAPER, fontFamily: "'Manrope', 'Segoe UI', sans-serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <img src={logoImg} alt="Logo MANDALA" style={{ width: 40, height: 40, borderRadius: 8, background: "#FBF8EF" }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: INK }}>MANDALA</div>
        </div>
        <div style={{ fontSize: 12.5, color: "#7A776C", marginBottom: 18, lineHeight: 1.5 }}>
          Tempel URL Web App Apps Script (berakhiran <code>/exec</code>) untuk menyambungkan aplikasi ini ke Google Sheet.
        </div>
        <Field label="URL Web App">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"
            style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px", fontSize: 13.5, color: INK }} />
        </Field>
        {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
        <PrimaryButton disabled={!value || loading} onClick={() => onSubmit(value.trim())}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading && <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />}
          {loading ? "Menghubungkan..." : "Simpan & Muat Data"}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---------- App shell ----------
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [apiUrl, setApiUrl] = useState(localConfig.get() || DEFAULT_API_URL);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const [opdList, setOpdList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [apipList, setApipList] = useState([]);
  const [kamusList, setKamusList] = useState([]);
  const [records, setRecords] = useState({});

  const currentYear = tahunList.length ? tahunList[tahunList.length - 1] : "";

  useEffect(() => {
    if (apiUrl) loadAll(apiUrl);
  }, [apiUrl]);

  async function loadAll(url) {
    setLoading(true);
    setLoadError("");
    try {
      const [opdData, apipData, recordsData, kamusData] = await Promise.all([
        apiGet(url, "opd"),
        apiGet(url, "apip"),
        apiGet(url, "records"),
        apiGet(url, "kamus"),
      ]);
      setOpdList(opdData.map((o) => o.nama_opd));
      setApipList(apipData.map((a) => a.nama_verifikator));
      setKamusList(kamusData);
      const tahunSet = Array.from(new Set(recordsData.map((r) => r.tahun))).sort();
      setTahunList(tahunSet);
      setRecords(toRecordMap(recordsData));
      setShowConfig(false);
    } catch (err) {
      setLoadError(err.message || "Gagal memuat data dari Web App. Cek kembali URL dan pastikan deployment aktif.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveApiUrl(url) {
    setConfigError("");
    setLoading(true);
    try {
      await apiGet(url, "opd");
      localConfig.set(url);
      setApiUrl(url);
    } catch (err) {
      setConfigError("Gagal terhubung ke URL ini. Pastikan deployment Apps Script sudah benar dan bisa diakses. (" + (err.message || "") + ")");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAccess(opd, pin) {
    const res = await apiGet(apiUrl, "verifyAccess", { opd, pin });
    return !!res.valid;
  }

  async function submitProgres(record, patch) {
    await apiPost(apiUrl, "submitProgres", {
      kode_rekomendasi: record.kode,
      opd: record.opd,
      status: patch.status,
      estimasi_tanggal: patch.estimasi || "",
      link_bukti: patch.link || "",
      catatan_opd: patch.catatanOpd || "",
    });
    await loadAll(apiUrl);
  }

  async function submitVerifikasi(record, patch) {
    await apiPost(apiUrl, "submitVerifikasi", {
      nama_verifikator: patch.verifikator,
      kode_rekomendasi: record.kode,
      opd: record.opd,
      hasil_verifikasi: patch.verifikasi,
      catatan: patch.catatan || "",
    });
    await loadAll(apiUrl);
  }

  async function cetakLaporan(opd, tahun) {
    const res = await apiPost(apiUrl, "laporanOpd", { opd, tahun });
    const byteChars = atob(res.fileBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename || "Laporan_MANDALA.docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "input", label: "Input OPD", icon: Building2 },
    { key: "verifikasi", label: "Verifikasi APIP", icon: ClipboardCheck },
    { key: "kamus", label: "Kamus", icon: BookOpen },
  ];

  if (!apiUrl || showConfig) {
    return <ConfigScreen initialValue={apiUrl} onSubmit={handleSaveApiUrl} error={configError} loading={loading} />;
  }

  return (
    <div style={{ fontFamily: "'Manrope', 'Segoe UI', sans-serif", background: PAPER, minHeight: "100vh", color: INK }}>
      <style>{GLOBAL_STYLE}</style>
      <div className="mdl-header" style={{ background: PRIMARY, color: "#fff", padding: "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img src={logoImg} alt="Logo MANDALA" className="mdl-logo" style={{ width: 74, height: 74, borderRadius: 10, background: "#FBF8EF", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="mdl-title" style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.2 }}>MANDALA</div>
            <div className="mdl-sub" style={{ fontSize: 13, color: "#D7E6E1", marginTop: 2, lineHeight: 1.3 }}>Monitoring Pelaksanaan Tindak Lanjut</div>
            <div className="mdl-tag" style={{ fontSize: 12, fontStyle: "italic", color: "#9FC3B8", marginTop: 2, lineHeight: 1.3 }}>Pusat kendali tindak lanjut, wujudkan SAKIP berkualitas</div>
          </div>
          <div className="mdl-header-actions" style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={() => loadAll(apiUrl)} title="Muat ulang data" style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: 9, cursor: "pointer", color: "#fff" }}>
              <RefreshCw size={16} style={loading ? { animation: "spin 0.8s linear infinite" } : {}} />
            </button>
            <button onClick={() => setShowConfig(true)} title="Ganti URL API" style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: 9, cursor: "pointer", color: "#fff" }}>
              <Settings size={16} />
            </button>
          </div>
        </div>
        <div className="mdl-instansi" style={{ fontSize: 10.5, color: "#B7CFC8", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{INSTANSI}</div>
      </div>

      <div className="mdl-nav" style={{ display: "flex", borderBottom: `1px solid ${LINE}`, background: "#fff" }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button key={n.key} onClick={() => setTab(n.key)} className="mdl-nav-btn"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 20px", fontSize: 13.5, fontWeight: 600, color: active ? PRIMARY : "#8A8778", background: "none", border: "none", cursor: "pointer", borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent" }}>
              <Icon size={15} /> {n.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "28px 24px" }}>
        {loadError && (
          <div style={{ background: "#FDECEA", border: `1px solid ${RED}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: RED, marginBottom: 20 }}>
            {loadError}
          </div>
        )}
        {loading && Object.keys(records).length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#7A776C", fontSize: 13.5, padding: "40px 0" }}>
            <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Memuat data...
          </div>
        ) : (
          <>
            {tab === "dashboard" && (
              <DashboardScreen records={records} opdList={opdList} tahunList={tahunList} currentYear={currentYear}
                onSubmitProgres={submitProgres} onCetakLaporan={cetakLaporan} goToVerifikasi={() => setTab("verifikasi")} />
            )}
            {tab === "input" && (
              <InputOPDScreen records={records} opdList={opdList} tahunList={tahunList} currentYear={currentYear}
                onSubmitProgres={submitProgres} onVerifyAccess={verifyAccess} />
            )}
            {tab === "verifikasi" && (
              <VerifikasiScreen records={records} apipList={apipList} onSubmitVerifikasi={submitVerifikasi} />
            )}
            {tab === "kamus" && <KamusScreen kamusList={kamusList} />}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "18px 16px", fontSize: 11.5, color: "#9A9788", borderTop: `1px solid ${LINE}` }}>
        {FOOTER_TEXT}
      </div>
    </div>
  );
}
