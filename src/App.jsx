import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Building2, ClipboardCheck, LayoutDashboard, ChevronDown, LinkIcon, Check,
  CircleDot, Bell, X, ExternalLink, AlertTriangle, Loader2, Settings, RefreshCw,
} from "lucide-react";
import { apiGet, apiPost, toRecordMap, localConfig } from "./api.js";
import logoImg from "./logo.png";

// URL Web App Apps Script bawaan — OPD tidak perlu mengisi ini secara manual.
// Tombol Settings (⚙️) di header tetap tersedia untuk mengganti sumber data bila diperlukan.
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxYXaN6FxqVs9A7VYLvRLYAj_6EWf0gTUEHtvQzalCrK8ofmE1X2Q1vaIVPjBn_ZKjM/exec";

// ---------- Konstanta tampilan ----------
const STATUS_OPTIONS = [
  { value: "belum", label: "Belum Ada Progres", color: "#B3453A" },
  { value: "proses", label: "Dalam Proses", color: "#C9962F" },
  { value: "sesuai", label: "Sesuai Target", color: "#3C7A5F" },
];

const VERIF_OPTIONS = [
  { value: "sesuai", label: "Sesuai" },
  { value: "perlu", label: "Perlu Perbaikan" },
  { value: "ditolak", label: "Ditolak" },
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

// ---------- Input OPD (list + modal) ----------
function InputOPDScreen({ records, opdList, tahunList, currentYear, onSubmitProgres }) {
  const [opd, setOpd] = useState("");
  const [tahun, setTahun] = useState(currentYear);
  const [activeKode, setActiveKode] = useState(null);

  const list = useMemo(
    () => Object.values(records).filter((r) => r.opd === opd && r.tahun === tahun && r.verifikasi !== "sesuai"),
    [records, opd, tahun]
  );
  const active = activeKode ? records[activeKode] : null;

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
      {opd && list.length === 0 && <div style={{ color: "#9A9788", fontSize: 13.5, padding: "20px 0" }}>Tidak ada rekomendasi untuk OPD dan tahun ini.</div>}

      {opd && list.length > 0 && (
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsRevision = record.verifikasi === "perlu" || record.verifikasi === "ditolak";

  const handleSave = () => {
    setError("");
    setSaving(true);
    Promise.resolve(onSave({ status, estimasi, link }))
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

      <Field label="Link Bukti Dukung" hint="Tempel link folder/dokumen Google Drive yang dapat diakses.">
        <div style={{ position: "relative" }}>
          <LinkIcon size={15} style={{ position: "absolute", left: 12, top: 13, color: "#9A9788" }} />
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…"
            style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 6, padding: "11px 12px 11px 36px", fontSize: 14, color: INK }} />
        </div>
      </Field>

      {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      <PrimaryButton disabled={!status || !link || (status === "proses" && !estimasi) || saving}
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

// ---------- Dashboard ----------
function DashboardScreen({ records, opdList, tahunList, currentYear, onSubmitProgres, goToVerifikasi }) {
  const [filterOpd, setFilterOpd] = useState("");
  const [filterTahun, setFilterTahun] = useState(currentYear);
  const [detailKode, setDetailKode] = useState(null);
  const [editKode, setEditKode] = useState(null);

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
    { name: "Sesuai", value: verifSesuai, color: "#3C7A5F" },
    { name: "Perlu Perbaikan", value: verifPerlu, color: "#C9962F" },
    { name: "Ditolak", value: verifDitolak, color: RED },
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
      </div>

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
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <img src={logoImg} alt="Logo MANDALA" style={{ width: 40, height: 40, borderRadius: 8, background: "#FBF8EF" }} />
          <div style={{ fontSize: 19, fontWeight: 700, color: INK }}>MANDALA</div>
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
  const [records, setRecords] = useState({});

  const currentYear = tahunList.length ? tahunList[tahunList.length - 1] : "";

  useEffect(() => {
    if (apiUrl) loadAll(apiUrl);
  }, [apiUrl]);

  async function loadAll(url) {
    setLoading(true);
    setLoadError("");
    try {
      const [opdData, apipData, recordsData] = await Promise.all([
        apiGet(url, "opd"),
        apiGet(url, "apip"),
        apiGet(url, "records"),
      ]);
      setOpdList(opdData.map((o) => o.nama_opd));
      setApipList(apipData.map((a) => a.nama_verifikator));
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

  async function submitProgres(record, patch) {
    await apiPost(apiUrl, "submitProgres", {
      kode_rekomendasi: record.kode,
      opd: record.opd,
      status: patch.status,
      estimasi_tanggal: patch.estimasi || "",
      link_bukti: patch.link,
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

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "input", label: "Input OPD", icon: Building2 },
    { key: "verifikasi", label: "Verifikasi APIP", icon: ClipboardCheck },
  ];

  if (!apiUrl || showConfig) {
    return <ConfigScreen initialValue={apiUrl} onSubmit={handleSaveApiUrl} error={configError} loading={loading} />;
  }

  return (
    <div style={{ fontFamily: "'Manrope', 'Segoe UI', sans-serif", background: PAPER, minHeight: "100vh", color: INK }}>
      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
      <div style={{ background: PRIMARY, color: "#fff", padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <img src={logoImg} alt="Logo MANDALA" style={{ width: 74, height: 74, borderRadius: 10, background: "#FBF8EF", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.2 }}>MANDALA</div>
          <div style={{ fontSize: 13, color: "#D7E6E1", marginTop: 2, lineHeight: 1.3 }}>Monitoring Pelaksanaan Tindak Lanjut</div>
          <div style={{ fontSize: 12, fontStyle: "italic", color: "#9FC3B8", marginTop: 2, lineHeight: 1.3 }}>Pusat kendali tindak lanjut, wujudkan SAKIP berkualitas</div>
        </div>
        <button onClick={() => loadAll(apiUrl)} title="Muat ulang data" style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: 9, cursor: "pointer", color: "#fff" }}>
          <RefreshCw size={16} style={loading ? { animation: "spin 0.8s linear infinite" } : {}} />
        </button>
        <button onClick={() => setShowConfig(true)} title="Ganti URL API" style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: 9, cursor: "pointer", color: "#fff" }}>
          <Settings size={16} />
        </button>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${LINE}`, background: "#fff" }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button key={n.key} onClick={() => setTab(n.key)}
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
                onSubmitProgres={submitProgres} goToVerifikasi={() => setTab("verifikasi")} />
            )}
            {tab === "input" && (
              <InputOPDScreen records={records} opdList={opdList} tahunList={tahunList} currentYear={currentYear}
                onSubmitProgres={submitProgres} />
            )}
            {tab === "verifikasi" && (
              <VerifikasiScreen records={records} apipList={apipList} onSubmitVerifikasi={submitVerifikasi} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
