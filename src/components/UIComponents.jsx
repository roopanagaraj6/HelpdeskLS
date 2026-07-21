import React, { useState } from "react";
import { iS } from "../constants/constants";

// ─── AVATAR ────────────────────────────────────────────────────────────────────
export const Avatar = ({ name, size = 28 }) => {
  const cols = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#22c55e"];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: cols[(name?.charCodeAt(0) || 0) % cols.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
    </div>
  );
};

// ─── BADGE ─────────────────────────────────────────────────────────────────────
export const Badge = ({ label, style = {} }) => (
  <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, ...style }}>{label}</span>
);

// ─── MODAL ─────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, width = 640, children }) => {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, backdropFilter: "blur(2px)" }}
    >
      <div style={{ background: "#faf8f4", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── FORM FIELD WRAPPER ────────────────────────────────────────────────────────
export const FF = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#000", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Arial Hebrew', sans-serif" }}>
      {label}
      {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

// ─── CUSTOM ALERT ──────────────────────────────────────────────────────────────
export const CustomAlert = ({ show, message, type, onDismiss }) => {
  if (!show) return null;

  const bgColor = type === "success" ? "#dcfce7" : "#fee2e2";
  const borderColor = type === "success" ? "#86efac" : "#fca5a5";
  const textColor = type === "success" ? "#166534" : "#b91c1c";
  const icon = type === "success" ? "✓" : "✕";

  return (
    <>
      <style>{`
        @keyframes slideInFade {
          0%   { opacity: 0; transform: translateY(-20px); }
          5%   { opacity: 1; transform: translateY(0); }
          95%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .custom-alert { animation: slideInFade 3.5s ease-in-out forwards; }
      `}</style>
      <div
        className="custom-alert"
        onAnimationEnd={onDismiss}
        style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: bgColor, border: `2px solid ${borderColor}`, color: textColor, padding: "14px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 12000, maxWidth: "400px", wordBreak: "break-word" }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>{icon}</span>
        <span>{message}</span>
      </div>
    </>
  );
};

// ─── SEARCHABLE SELECT ────────────────────────────────────────────────────────
export const SearchableSelect = ({ field, fieldValues, setFieldValues }) => {
  const [search, setSearch] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const options = Array.isArray(field.options) ? field.options : [];
  const filtered = options.filter(o => o.label?.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === fieldValues[field.name]);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        placeholder={selected ? `✓ ${selected.label}` : `Search ${field.label}...`}
        value={search}
        onChange={e => { setSearch(e.target.value); if (!e.target.value) setFieldValues({ ...fieldValues, [field.name]: "" }); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#1e293b", boxSizing: "border-box", outline: "none" }}
      />
      {focused && (
        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, border: "1.5px solid #e2e8f0", borderRadius: 8, maxHeight: 200, overflowY: "auto", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", background: "#fff" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8" }}>No tickets found</div>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.value}
                onMouseDown={() => { setFieldValues({ ...fieldValues, [field.name]: opt.value }); setSearch(""); setFocused(false); }}
                style={{ padding: "9px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#1e293b", background: fieldValues[field.name] === opt.value ? "#ede9fe" : "#fff", fontWeight: fieldValues[field.name] === opt.value ? 600 : 400 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={e => (e.currentTarget.style.background = fieldValues[field.name] === opt.value ? "#ede9fe" : "#fff")}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── CONFIRMATION MODAL ───────────────────────────────────────────────────────
export const ConfirmationModal = ({ show, title, message, onConfirm, onCancel, fields, showLunchButton, onLunch, confirmLabel, confirmDanger }) => {
  const [fieldValues, setFieldValues] = React.useState({});

  React.useEffect(() => {
    if (fields) {
      const initial = {};
      fields.forEach(f => { initial[f.name] = f.value || ""; });
      setFieldValues(initial);
    }
  }, [fields]);

  if (!show) return null;

  const visibleFields = fields ? fields.filter(f => {
    if (f.name === "location") return fieldValues.logoutReason === "Going for ticket";
    if (f.name === "ticketId") return fieldValues.logoutReason === "Going for ticket";
    return true;
  }) : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 500, width: "90%", boxShadow: "0 25px 80px rgba(0,0,0,0.3)", animation: "slideDown 0.3s ease-out", maxHeight: "80vh", overflow: "auto" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{message}</p>

        {visibleFields.length > 0 && (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleFields.map(field => (
              <div key={field.name}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{field.label}</label>
                {field.type === "searchable-select" ? (
                  <SearchableSelect field={field} fieldValues={fieldValues} setFieldValues={setFieldValues} />
                ) : field.type === "select" ? (
                  <select value={fieldValues[field.name] || ""} onChange={e => setFieldValues({ ...fieldValues, [field.name]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#1e293b", cursor: "pointer" }}>
                    <option value="">Select {field.label}</option>
                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <input type={field.type || "text"} placeholder={field.placeholder} value={fieldValues[field.name] || ""} onChange={e => setFieldValues({ ...fieldValues, [field.name]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#1e293b", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {showLunchButton && (
            <button onClick={() => onLunch?.()} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #f59e0b", background: "#fef3c7", color: "#92400e", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              🍽️ Going for Lunch
            </button>
          )}
          <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(fieldValues)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: confirmDanger ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            {fieldValues.logoutReason === "Going for ticket" ? "Mark On Duty & Logout" : confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// ─── FILTERABLE HEADER (sortable table header) ────────────────────────────────
export const FilterableHeader = ({ label, field, filters, onFilter, style = {} }) => {
  const active = filters._sortField === field;
  const dir = active ? filters._sortDir : null;

  const toggle = () => {
    if (!active) {
      onFilter({ ...filters, _sortField: field, _sortDir: "asc" });
    } else if (dir === "asc") {
      onFilter({ ...filters, _sortField: field, _sortDir: "desc" });
    } else {
      onFilter({ ...filters, _sortField: field, _sortDir: "asc" });
    }
  };

  return (
    <th style={{ ...style, userSelect: "none", whiteSpace: "nowrap" }}>
      <div onClick={toggle} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "2px 4px", borderRadius: 5, background: active ? "#eff6ff" : "transparent", color: active ? "#3b82f6" : "inherit" }}>
        <span style={{ fontSize: "inherit", fontWeight: "inherit" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#3b82f6" : "#94a3b8" }}>{!active ? "↕" : dir === "asc" ? "↑" : "↓"}</span>
      </div>
    </th>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, color = "#3b82f6" }) => (
  <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
    <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
  </div>
);
