import React from "react";

export function BinView(props) {
  const {
    tickets, projects,
    restoreTicket, restoreProject,
    permanentDeleteTicket, permanentDeleteProject,
  } = props;

  return (
    <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>🧹 Bin</h3>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Manage deleted tickets and projects. Auto-deleted after 30 days.</p>

      {/* Tickets bin */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🎫 Tickets ({tickets.filter(t => t.status === "Bin").length})</div>
        {tickets.filter(t => t.status === "Bin").length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8", padding: "18px 0" }}>No deleted tickets.</div>
        ) : tickets.filter(t => t.status === "Bin").map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "#f8fafc", marginBottom: 7, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{t.id}</span>
            <span style={{ color: "#64748b", flex: 1, margin: "0 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title || t.summary}</span>
            <button onClick={() => restoreTicket(t.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontWeight: 600, marginRight: 6 }}>Restore</button>
            <button onClick={() => permanentDeleteTicket(t.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Delete</button>
          </div>
        ))}
      </div>

      {/* Projects bin */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>📁 Projects ({projects.filter(p => p.status === "Bin").length})</div>
        {projects.filter(p => p.status === "Bin").length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, background: "#f8fafc", borderRadius: 8 }}>No projects in bin</div>
        ) : projects.filter(p => p.status === "Bin").map(p => {
          const daysLeft = Math.max(0, 30 - Math.floor((new Date() - new Date(p.updatedAt || p.updated)) / 86400000));
          return (
            <div key={p.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.id}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: daysLeft === 0 ? "#ef4444" : "#94a3b8", marginTop: 4 }}>{daysLeft === 0 ? "⚠️ Deleting today" : `🕐 Auto-delete in ${daysLeft} days`}</div>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                <button onClick={() => restoreProject(p.id)} style={{ padding: "6px 12px", background: "#22c55e", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Restore</button>
                <button onClick={() => permanentDeleteProject(p.id)} style={{ padding: "6px 12px", background: "#ef4444", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete Now</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}