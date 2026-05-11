import React from "react";
import { Avatar, Badge, FilterableHeader } from "../components/UIComponents";
import { PRIORITY_COLOR, iS, sS, bP, bG } from "../constants/constants";
import { applySort } from "../utils/sortHelpers";

/**
 * Webcast/Satsang ticket table (filtered subset of tickets).
 */
export function WebcastView(props) {
  const {
    tickets, users, currentUser,
    webcastFilter, setWebcastFilter,
    webcastSort, setWebcastSort,
    webcastPage, setWebcastPage,
    setSelTicket, setShowRemarkModal,
    setClosingTicketId, setPendingTicketStatus,
    updateStatus, deleteTicket,
    setShowNewTicket,
    thStyle, tdStyle,
  } = props;

          {view === "webcast" && <>
            {/* Webcast Stats Cards */}
            {(() => {
              const isAdminOrManager = currentUser?.role === "Admin" || currentUser?.role === "Manager";
              const allWebcasts = tickets.filter(t => isTrueWebcast(t));
              const myWebcasts = allWebcasts.filter(t => t.assignees?.some(a => a.id === currentUser?.id));
              const webcastBase = isAdminOrManager ? allWebcasts : myWebcasts;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 9, marginBottom: 16 }}>
                  {[
                    { label: isAdminOrManager ? "Total Webcasts" : "My Webcasts", value: webcastBase.length, color: "#f97316", icon: "📡", filter: null },
                    { label: "Open", value: webcastBase.filter(t => t.status === "Open").length, color: "#3b82f6", icon: "📂", filter: "open" },
                    { label: "Closed", value: webcastBase.filter(t => t.status === "Closed").length, color: "#64748b", icon: "✅", filter: "closed" },
                    { label: "Critical", value: webcastBase.filter(t => t.priority === "Critical" && t.status !== "Closed").length, color: "#ef4444", icon: "🔥", filter: "critical" },
                    { label: "Unassigned", value: allWebcasts.filter(t => (!t.assignees || t.assignees.length === 0) && t.status !== "Closed").length, color: "#a855f7", icon: "🔸", filter: "unassigned" },
                  ].map(s => (
                    <div key={s.label} onClick={() => setWebcastFilter(webcastFilter === s.filter ? null : s.filter)} style={{ background: "#faf8f4", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `3px solid ${s.color}`, cursor: "pointer", transition: "all 0.2s", transform: webcastFilter === s.filter ? "scale(1.05)" : "scale(1)", opacity: webcastFilter === s.filter ? 1 : 0.8 }}>
                      <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Webcast Table - Only show tickets assigned to current user (or all for Admin) */}
            <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>{webcastFilter === "unassigned" ? "⚠️ Unassigned Webcast Tickets" : (currentUser?.role === "Admin" || currentUser?.role === "Manager") ? "All Webcast Tickets" : "My Webcast Tickets"}</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    <FilterableHeader label="ID" field="id" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <FilterableHeader label="Summary" field="summary" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <FilterableHeader label="Location" field="location" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <FilterableHeader label="Satsang Type" field="satsangType" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <FilterableHeader label="Priority" field="priority" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <FilterableHeader label="Status" field="status" data={tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager"))} filters={webcastSort} onFilter={setWebcastSort} style={thStyle} />
                    <th style={thStyle}>Action</th>
                  </tr></thead>
                  <tbody>{applySort(tickets.filter(t => {
                    if (!isTrueWebcast(t)) return false;
                    if (webcastFilter === "unassigned") return (!t.assignees || t.assignees.length === 0) && t.status !== "Closed";
                    if (!t.assignees?.some(a => a.id === currentUser?.id) && currentUser?.role !== "Admin" && currentUser?.role !== "Manager") return false;
                    if (webcastFilter === null) return true;
                    if (webcastFilter === "open") return t.status === "Open";
                    if (webcastFilter === "closed") return t.status === "Closed";
                    if (webcastFilter === "critical") return t.priority === "Critical" && t.status !== "Closed";
                    return true;
                  }), webcastSort).slice(0, 10).map((t, i) => (
                    <tr key={t.id + i} className="rh" onClick={() => setSelTicket(t)} style={{ cursor: "pointer" }}>
                      <td style={tdStyle}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: "#3b82f6" }}>{t.id}</span></td>
                      <td style={{ ...tdStyle, maxWidth: 200 }}><div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.summary}</div></td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: "#64748b" }}>{t.location || "—"}</span></td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: "#64748b" }}>{t.satsangType || "—"}</span></td>
                      <td style={tdStyle}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLOR[t.priority], display: "inline-block" }} />{t.priority}</div></td>
                      <td style={tdStyle}><Badge label={t.status} style={{ ...STATUS_COLOR[t.status] }} /></td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)} style={{ ...sS, width: 115, fontSize: 12, padding: "4px 7px" }}>
                          {STATUSES.filter(s => s !== "Bin").map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                    {tickets.filter(t => isTrueWebcast(t) && (t.assignees?.some(a => a.id === currentUser?.id) || currentUser?.role === "Admin" || currentUser?.role === "Manager")).length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No webcast tickets assigned to you yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

          {/* ── REPORTS (v1 charts) ── */}
}
