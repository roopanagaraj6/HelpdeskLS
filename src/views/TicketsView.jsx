import React from "react";
import axios from "axios";
import { AlertsView } from "./AlertsView";
import { Avatar, Badge, FilterableHeader } from "../components/UIComponents";
import { PRIORITY_COLOR, STATUS_COLOR, STATUSES, iS, sS, bP, bG } from "../constants/constants";
import { applySort } from "../utils/sortHelpers";
import { exportJSON } from "../utils/exportHelpers";
import { BASE_URL, TICKETS_API } from "../constants/api";

/**
 * Ticket list table with filters, pagination, bulk actions, and row actions.
 */
export const TicketsView = React.memo(function TicketsView(props) {
  const {
    tickets, users, orgs, categories, currentUser,
    filtered, tvFilter, setTvFilter,
    ticketFilters, setTicketFilters,
    ticketPage, setTicketPage,
    selectedIds, setSelectedIds,
    ticketSort, setTicketSort,
    activeFilterDD, setActiveFilterDD,
    showTicketExport, setShowTicketExport,
    showTicketColPicker, setShowTicketColPicker,
    visibleTicketCols, setVisibleTicketCols,
    toggleSel, toggleCurrentPage, toggleAllFiltered,
    updateStatus, deleteTicket,
    setSelTicket, setShowRemarkModal, setClosingTicketId,
    setPendingTicketStatus, setClosedBy,
    setShowForward, setShowVendor,
    handleNotificationClick,
    importRef, handleSelectiveImport, handleExport,
    setShowNewTicket,
  } = props;

  const search = props.ticketSearch || "";
  const setSearch = props.setTicketSearch || (() => {});
  const ticketDateFrom = props.ticketDateFrom || "";
  const setTicketDateFrom = props.setTicketDateFrom || (() => {});
  const ticketDateTo = props.ticketDateTo || "";
  const setTicketDateTo = props.setTicketDateTo || (() => {});
  const filterCreatedRef = React.useRef(null);
  const filterStatus = props.filterStatus || [];
  const setFilterStatus = props.setFilterStatus || (() => {});
  const filterAssignment = props.filterAssignment || [];
  const setFilterAssignment = props.setFilterAssignment || (() => {});
  const filterAssignee = props.filterAssignee || [];
  const setFilterAssignee = props.setFilterAssignee || (() => {});
  const filterCategory = props.filterCategory || "";
  const setFilterCategory = props.setFilterCategory || (() => {});
  const priorityF = props.priorityF || "All";
  const setPriorityF = props.setPriorityF || (() => {});
  const [filterAssigneeSearch, setFilterAssigneeSearch] = React.useState("");
  const [filterCategorySearch, setFilterCategorySearch] = React.useState("");
  const filterStatusRef = React.useRef(null);
  const filterAssignmentRef = React.useRef(null);
  const filterAssigneeRef = React.useRef(null);
  const filterCategoryRef = React.useRef(null);
  const filterPriorityRef = React.useRef(null);
  const ticketExportBtnRef = React.useRef(null);
  const ticketColBtnRef = React.useRef(null);
  const [ticketColDDPos, setTicketColDDPos] = React.useState({ top: 0, right: 0 });
  const isLoading = props.ticketsLoading || false;
  const {
    showTicketColExport, setShowTicketColExport,
    ticketExportCols, setTicketExportCols,
    ticketExportMode, setTicketExportMode,
    setForm, emptyForm, dashboardOrg,
    setConfirmModal, setCustomAlert, setTickets, isTrueWebcast,
    alertNotifs, inboxUnread,
    acceptInboxForwardRequest, rejectInboxForwardRequest,
  } = props;

  const allSortedTickets = filtered || [];
  const skeletonStyle = {
    height: 13, borderRadius: 4, background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%", animation: "tkt-shimmer 1.4s ease-in-out infinite",
  };
  const currentPage = ticketPage || 1;
  const setCurrentPage = setTicketPage;
  const currentTickets = allSortedTickets; // server returns correct page already
  const totalPages = Math.ceil((props.ticketTotalCount || allSortedTickets.length) / 25);
  const thStyle = { padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 12px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle" };
  const ALL_TICKET_COLS = ["id","created","summary","org","department","reportedBy","assignees","priority","category","status"];

  return (
    <>
    <div style={{ background: "#faf8f4", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...iS, width: 200, fontSize: 13, padding: "7px 10px" }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>{props.ticketTotalCount || allSortedTickets.length} tickets</span>
              {/* Active filter chips */}
              {/* ── Per-category filter buttons ── */}
              {activeFilterDD && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setActiveFilterDD(null)} />}

              {/* STATUS */}
              <div style={{ position: "relative" }} ref={filterStatusRef}>
                <button onClick={() => setActiveFilterDD(v => v === "status" ? null : "status")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${filterStatus.length ? "#3b82f6" : "#e2e8f0"}`, background: filterStatus.length ? "#eff6ff" : "#f8fafc", color: filterStatus.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Status{filterStatus.length ? ` (${filterStatus.length})` : ""} ▾
                </button>
                {activeFilterDD === "status" && (
                  <div style={{ position: "fixed", top: (filterStatusRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterStatusRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 170, padding: 10 }}>
                    {[{id:"open",label:"🟢 Open"},{id:"closed",label:"✅ Closed"},{id:"pastdue",label:"🔴 Past Due"}].map(f => (
                      <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={filterStatus.includes(f.id)} onChange={() => setFilterStatus(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} />
                        {f.label}
                      </label>
                    ))}
                    {filterStatus.length > 0 && <div onClick={() => setFilterStatus([])} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* ASSIGNMENT */}
              <div style={{ position: "relative" }} ref={filterAssignmentRef}>
                <button onClick={() => setActiveFilterDD(v => v === "assignment" ? null : "assignment")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${filterAssignment.length ? "#3b82f6" : "#e2e8f0"}`, background: filterAssignment.length ? "#eff6ff" : "#f8fafc", color: filterAssignment.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Assignment{filterAssignment.length ? ` (${filterAssignment.length})` : ""} ▾
                </button>
                {activeFilterDD === "assignment" && (
                  <div style={{ position: "fixed", top: (filterAssignmentRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterAssignmentRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 190, padding: 10 }}>
                    {[{id:"assigned",label:"🙋 Assigned"},{id:"unassigned",label:"🔸 Unassigned"},{id:"vendor",label:"🏭 Sent to Vendor"}].map(f => (
                      <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={filterAssignment.includes(f.id)} onChange={() => setFilterAssignment(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} />
                        {f.label}
                      </label>
                    ))}
                    {filterAssignment.length > 0 && <div onClick={() => setFilterAssignment([])} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* ASSIGNEE */}
              <div style={{ position: "relative" }} ref={filterAssigneeRef}>
                <button onClick={() => setActiveFilterDD(v => v === "assignee" ? null : "assignee")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${filterAssignee.length ? "#3b82f6" : "#e2e8f0"}`, background: filterAssignee.length ? "#eff6ff" : "#f8fafc", color: filterAssignee.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Assignee{filterAssignee.length ? ` (${filterAssignee.length})` : ""} ▾
                </button>

                {activeFilterDD === "assignee" && (
                  <div style={{ position: "fixed", top: (filterAssigneeRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterAssigneeRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 210, padding: 10 }}>
                    <input autoFocus placeholder="Search assignee…" value={filterAssigneeSearch} onChange={e => setFilterAssigneeSearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                    <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                      {(Array.isArray(users) ? users : []).filter(u => (!filterAssigneeSearch || u.name?.toLowerCase().includes(filterAssigneeSearch.toLowerCase()))).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(u => {
                        const sel = filterAssignee.includes(u.name);
                        return (
                          <div key={u.id} onClick={() => setFilterAssignee(p => sel ? p.filter(x => x !== u.name) : [...p, u.name])} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: sel ? "#1d4ed8" : "#374151", background: sel ? "#eff6ff" : "transparent", fontWeight: sel ? 600 : 400 }}>
                            <span style={{ width: 14, height: 14, border: `1.5px solid ${sel ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 3, background: sel ? "#3b82f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                            {u.name}{!u.active ? " (inactive)" : ""}
                          </div>
                        );
                      })}
                    </div>
                    {filterAssignee.length > 0 && <div onClick={() => { setFilterAssignee([]); setFilterAssigneeSearch(""); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* CATEGORY */}
              <div style={{ position: "relative" }} ref={filterCategoryRef}>
                <button onClick={() => setActiveFilterDD(v => { if (v !== "category") setFilterCategorySearch(""); return v === "category" ? null : "category"; })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${filterCategory ? "#3b82f6" : "#e2e8f0"}`, background: filterCategory ? "#eff6ff" : "#f8fafc", color: filterCategory ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Category{filterCategory ? `: ${filterCategory}` : ""} ▾
                </button>
                {activeFilterDD === "category" && (
                  <div style={{ position: "fixed", top: (filterCategoryRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterCategoryRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 210, padding: 10 }}>
                    <input autoFocus placeholder="Search category…" value={filterCategorySearch} onChange={e => setFilterCategorySearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                    <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                      {(Array.isArray(categories) ? categories : []).filter(c => !filterCategorySearch || c.name?.toLowerCase().includes(filterCategorySearch.toLowerCase())).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(c => (
                        <div key={c.id} onClick={() => { setFilterCategory(c.name); setActiveFilterDD(null); }} style={{ padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: filterCategory === c.name ? "#1d4ed8" : "#374151", background: filterCategory === c.name ? "#eff6ff" : "transparent", fontWeight: filterCategory === c.name ? 600 : 400 }}>
                          {c.name}
                        </div>
                      ))}
                    </div>
                    {filterCategory && <div onClick={() => setFilterCategory("")} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* PRIORITY */}
              <div style={{ position: "relative" }} ref={filterPriorityRef}>
                <button onClick={() => setActiveFilterDD(v => v === "priority" ? null : "priority")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${priorityF !== "All" ? "#3b82f6" : "#e2e8f0"}`, background: priorityF !== "All" ? "#eff6ff" : "#f8fafc", color: priorityF !== "All" ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Priority{priorityF !== "All" ? `: ${priorityF}` : ""} ▾
                </button>
                {activeFilterDD === "priority" && (
                  <div style={{ position: "fixed", top: (filterPriorityRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterPriorityRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 160, padding: 10 }}>
                    {["Critical","High","Standard","Medium"].map(p => (
                      <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="radio" name="priorityFilterDD" checked={priorityF === p} onChange={() => setPriorityF(p)} />
                        {p}
                      </label>
                    ))}
                    {priorityF !== "All" && <div onClick={() => { setPriorityF("All"); setActiveFilterDD(null); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* CREATED DATE */}
              <div style={{ position: "relative" }} ref={filterCreatedRef}>
                <button onClick={() => setActiveFilterDD(v => v === "created" ? null : "created")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${(ticketDateFrom || ticketDateTo) ? "#3b82f6" : "#e2e8f0"}`, background: (ticketDateFrom || ticketDateTo) ? "#eff6ff" : "#f8fafc", color: (ticketDateFrom || ticketDateTo) ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Created{ticketDateFrom || ticketDateTo ? " ●" : ""} ▾
                </button>
                {activeFilterDD === "created" && (
                  <div style={{ position: "fixed", top: (filterCreatedRef.current?.getBoundingClientRect().bottom || 0) + 4, left: filterCreatedRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 240, padding: 12 }}>
                    {/* Quick options */}
                    {[
                      { label: "📅 Today", action: () => { const d = new Date(); const pad = n => String(n).padStart(2,"0"); const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; setTicketDateFrom(s); setTicketDateTo(s); setActiveFilterDD(null); } },
                      { label: "📅 Yesterday", action: () => { const d = new Date(); d.setDate(d.getDate()-1); const pad = n => String(n).padStart(2,"0"); const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; setTicketDateFrom(s); setTicketDateTo(s); setActiveFilterDD(null); } },
                    ].map(opt => (
                      <div key={opt.label} onClick={opt.action} style={{ padding: "7px 8px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151", marginBottom: 2 }}
                        onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        {opt.label}
                      </div>
                    ))}
                    {/* Custom range */}
                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Custom Range</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>From</div>
                          <input type="date" value={ticketDateFrom} onChange={e => setTicketDateFrom(e.target.value)} style={{ width: "100%", padding: "5px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>To</div>
                          <input type="date" value={ticketDateTo} onChange={e => setTicketDateTo(e.target.value)} style={{ width: "100%", padding: "5px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                    </div>
                    {(ticketDateFrom || ticketDateTo) && <div onClick={() => { setTicketDateFrom(""); setTicketDateTo(""); setActiveFilterDD(null); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, paddingTop: 8, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* Clear all if any active */}
              {(filterStatus.length > 0 || filterAssignment.length > 0 || filterAssignee.length > 0 || filterCategory || priorityF !== "All" || search || ticketDateFrom || ticketDateTo) && (
                <span onClick={() => { setFilterStatus([]); setFilterAssignment([]); setFilterAssignee([]); setFilterAssigneeSearch(""); setFilterCategory(""); setPriorityF("All"); setSearch(""); setTicketDateFrom(""); setTicketDateTo(""); setActiveFilterDD(null); }} style={{ padding: "5px 8px", fontSize: 11, color: "#ef4444", cursor: "pointer", fontWeight: 600, borderRadius: 6, border: "1px solid #fecaca", background: "#fff1f2" }}>✕ Clear all</span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <button ref={ticketExportBtnRef} onClick={() => setShowTicketExport(v => !v)} style={{ ...bG, padding: "5px 11px", fontSize: 12 }}>⬇ Export</button>
                  {showTicketExport && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 499 }} onClick={() => setShowTicketExport(false)} />
                      <div style={{ position: "fixed", top: (ticketExportBtnRef.current?.getBoundingClientRect().bottom || 0) + 4, right: window.innerWidth - (ticketExportBtnRef.current?.getBoundingClientRect().right || 0), background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 500, minWidth: 160, padding: 8 }}>
                        <div onClick={() => { setShowTicketExport(false); setTicketExportCols(new Set(ALL_TICKET_COLS)); setShowTicketColExport(true); setTicketExportMode("csv"); }} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151" }}>📄 Export CSV</div>
                        <div onClick={async () => {
                          setShowTicketExport(false);
                          try {
                            props.setCustomAlert && props.setCustomAlert({ show: true, message: "⏳ Fetching all tickets for export...", type: "success" });
                            const isAgentRole = props.currentUser?.role === "Agent" || props.currentUser?.role === "Viewer";
                            const reportUrl = isAgentRole ? `${BASE_URL}/tickets/report?assignee=${encodeURIComponent(props.currentUser.name)}` : `${BASE_URL}/tickets/report`;
                            const res = await axios.get(reportUrl);
                            const data = (res.data.tickets || []).sort((a, b) => {
                              const na = parseInt((a.id || "").replace(/\D/g, ""), 10) || 0;
                              const nb = parseInt((b.id || "").replace(/\D/g, ""), 10) || 0;
                              return nb - na;
                            });
                            if (!data.length) { props.setCustomAlert && props.setCustomAlert({ show: true, message: "No tickets to export", type: "error" }); return; }
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `tickets_export_${new Date().toISOString().split("T")[0]}.json`;
                            a.click();
                            props.setCustomAlert && props.setCustomAlert({ show: true, message: `✅ Exported ${data.length} tickets`, type: "success" });
                          } catch (e) {
                            props.setCustomAlert && props.setCustomAlert({ show: true, message: "Export failed: " + e.message, type: "error" });
                          }
                        }} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151" }}>📦 Export JSON</div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <button ref={ticketColBtnRef} onClick={() => { const r = ticketColBtnRef.current?.getBoundingClientRect(); if (r) setTicketColDDPos({ top: r.bottom + 4, right: window.innerWidth - r.right }); setShowTicketColPicker(v => !v); }} style={{ ...bG, padding: "5px 11px", fontSize: 12 }}>⚙ Columns</button>
                  {showTicketColPicker && <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 499, pointerEvents: "none" }} onClick={() => setShowTicketColPicker(false)} />                    
                      <div data-col-picker="ticket" style={{ position: "fixed", top: ticketColDDPos.top, right: ticketColDDPos.right, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.13)", zIndex: 500, padding: 10, minWidth: 180, maxHeight: "60vh", overflowY: "auto" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 7 }}>Show / Hide Columns</div>
                      {ALL_TICKET_COLS.map(col => (
                        <label key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                          <input type="checkbox" checked={visibleTicketCols.has(col)} onChange={() => setVisibleTicketCols(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; })} />
                          {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                        </label>
                      ))}
                    </div>
                  </>}
                </div>
                {tvFilter !== "closed" && (
                  <button onClick={() => { setForm({ ...emptyForm(), org: dashboardOrg !== "all" ? dashboardOrg : "" }); setShowNewTicket(true); }} style={{ ...bP, padding: "7px 13px", fontSize: 12 }}>+ New Ticket</button>
                )}
                {selectedIds.size > 0 && <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, background: "#eff6ff", padding: "4px 10px", borderRadius: 99 }}>{selectedIds.size} selected</span>}

                {/* ── Bulk Close - ADMIN ONLY, hidden in closed view ── */}
                {(() => {
                  const openSelected = tickets.filter(t => selectedIds.has(t.id) && t.status !== "Closed");
                  return openSelected.length > 0 && ["Admin", "Manager"].includes(currentUser?.role) && tvFilter !== "closed" && (
                  <button onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: `Close ${openSelected.length} Ticket(s)?`,
                      message: `Enter one closing reason — it will be applied to all ${openSelected.length} selected open ticket(s).`,
                      fields: [
                        { name: "remark", label: "📝 Closing Reason", type: "textarea", placeholder: "Describe what was done or why these tickets are being closed…", value: "" }
                      ],
                      confirmLabel: `Close ${openSelected.length} Ticket(s)`,
                      confirmDanger: false,
                      onConfirm: async (data) => {
                        const remark = (data.remark || "").trim();
                        if (!remark) {
                          setCustomAlert({ show: true, message: "⚠️ Please enter a closing reason before proceeding", type: "error" });
                          return;
                        }
                        const nowISO = new Date().toISOString();
                        const count = openSelected.length;
                        try {
                        for (const id of openSelected.map(t => t.id)) {
                            const t = tickets.find(x => x.id === id);
                            if (t) {
                              const newTimelineEvent = { action: "Status changed to Closed", by: currentUser.name, date: nowISO, note: `Remark: ${remark}` };
                              const update = { ...t, status: "Closed", updated: nowISO, timeline: [...(t.timeline || []), newTimelineEvent] };
                              const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${id}` : `${TICKETS_API}/${id}`;
                              await axios.put(apiUrl, update);
                            }
                          }
                          setTickets(p => p.map(x => selectedIds.has(x.id) ? { ...x, status: "Closed", updated: new Date(nowISO) } : x));
                          setSelectedIds(new Set());
                          setConfirmModal({ show: false });
                          setCustomAlert({ show: true, message: `✅ ${count} ticket(s) closed successfully`, type: "success" });
                        } catch (e) {
                          setCustomAlert({ show: true, message: "Failed to close tickets. Please try again.", type: "error" });
                        }
                      },
                      onCancel: () => setConfirmModal({ show: false })
                    });
                  }} style={{ ...bP, padding: "7px 13px", fontSize: 12, background: "#22c55e", color: "#fff" }}>✓ Close {openSelected.length} Ticket(s)</button>
                  );
                })()}

                {/* ── Bulk Reopen - shown in closed view when tickets are selected ── */}
                {selectedIds.size > 0 && tvFilter === "closed" && (
                  <button onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: `Reopen ${selectedIds.size} Ticket(s)?`,
                      message: `Enter a remark — it will be applied to all ${selectedIds.size} selected ticket(s).`,
                      fields: [
                        { name: "remark", label: "📝 Reopen Reason", type: "textarea", placeholder: "Explain why these tickets are being reopened…", value: "" }
                      ],
                      confirmLabel: `🔄 Reopen ${selectedIds.size} Ticket(s)`,
                      confirmDanger: false,
                      onConfirm: async (data) => {
                        const remark = (data.remark || "").trim();
                        if (!remark) {
                          setCustomAlert({ show: true, message: "⚠️ Please enter a reopen reason before proceeding", type: "error" });
                          return;
                        }
                        const nowISO = new Date().toISOString();
                        const count = selectedIds.size;
                        try {
                          for (const id of selectedIds) {
                            const t = tickets.find(x => x.id === id);
                            if (t) {
                              const newTimelineEvent = { action: "Reopened", by: currentUser.name, date: nowISO, note: `Reason: ${remark}` };
                              const update = { ...t, status: "Open", updated: nowISO, timeline: [...(t.timeline || []), newTimelineEvent] };
                              const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${id}` : `${TICKETS_API}/${id}`;
                              await axios.put(apiUrl, update);
                            }
                          }
                          setTickets(p => p.map(x => selectedIds.has(x.id) ? { ...x, status: "Open", updated: new Date(nowISO) } : x));
                          setSelectedIds(new Set());
                          setConfirmModal({ show: false });
                          setCustomAlert({ show: true, message: `✅ ${count} ticket(s) reopened successfully`, type: "success" });
                        } catch (e) {
                          setCustomAlert({ show: true, message: "Failed to reopen tickets. Please try again.", type: "error" });
                        }
                      },
                      onCancel: () => setConfirmModal({ show: false })
                    });
                  }} style={{ ...bP, padding: "7px 13px", fontSize: 12, background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff" }}>🔄 Reopen {selectedIds.size} Ticket(s)</button>
                )}

              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              {/* Select-all-filtered banner — shown when current page is fully selected but more exist */}
              {["Admin", "Manager"].includes(currentUser?.role) && (() => {
                const pageIds = currentTickets.map(t => t.id);
                const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
                const allFilteredSelected = allSortedTickets.length > 0 && allSortedTickets.every(t => selectedIds.has(t.id));
                const hasMorePages = allSortedTickets.length > currentTickets.length;
                if (!allPageSelected || !hasMorePages) return null;
                return (
                  <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "9px 16px", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                    {allFilteredSelected ? (
                      <>
                        <span style={{ color: "#1d4ed8", fontWeight: 600 }}>✓ All {allSortedTickets.length} tickets in this view are selected.</span>
                        <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Clear selection</button>
                      </>
                    ) : (
                      <>
                        <span style={{ color: "#1d4ed8" }}>All <strong>{pageIds.length}</strong> tickets on this page are selected.</span>
                        <button onClick={toggleAllFiltered} style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                          Select all {allSortedTickets.length} tickets in this view
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {/* Checkbox column — Admin only: checks/unchecks current page */}
                  {["Admin", "Manager"].includes(currentUser?.role) && (() => {
                    const pageIds = currentTickets.map(t => t.id);
                    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
                    const somePageSelected = pageIds.some(id => selectedIds.has(id));
                    return (
                      <th style={{ ...thStyle, width: 40 }} title="Select / deselect this page">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                          onChange={toggleCurrentPage}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                    );
                  })()}
                  {visibleTicketCols.has("id") && <th style={thStyle}>ID</th>}
                  {visibleTicketCols.has("created") && (
                    <th style={{ ...thStyle, userSelect: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                      onClick={() => setTicketSort(s => ({ _sortField: "created", _sortDir: s._sortField === "created" && s._sortDir === "desc" ? "asc" : "desc" }))}>
                      Created
                      <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: ticketSort._sortField === "created" ? "#3b82f6" : "#94a3b8" }}>
                        {ticketSort._sortField === "created" ? (ticketSort._sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                  )}
                  {visibleTicketCols.has("summary") && <th style={thStyle}>Summary</th>}
                  {visibleTicketCols.has("org") && <th style={thStyle}>Org</th>}
                  {visibleTicketCols.has("department") && <th style={thStyle}>Dept</th>}
                  {visibleTicketCols.has("reportedBy") && <th style={thStyle}>Reported By</th>}
                  {visibleTicketCols.has("assignees") && <th style={thStyle}>Assignees</th>}
                  {visibleTicketCols.has("priority") && <th style={thStyle}>Priority</th>}
                  {visibleTicketCols.has("category") && <th style={thStyle}>Category</th>}
                  {visibleTicketCols.has("status") && <th style={thStyle}>Status</th>}
                  <th style={thStyle}>Action</th>
                </tr></thead>
                <tbody>{isLoading ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    {["Admin", "Manager"].includes(currentUser?.role) && <td style={tdStyle}><div style={{ ...skeletonStyle, width: 16, height: 16, borderRadius: 3 }} /></td>}
                    {[...visibleTicketCols].map(k => (
                      <td key={k} style={tdStyle}>
                        <div style={{ ...skeletonStyle, width: k === "summary" ? "80%" : k === "id" ? 70 : k === "assignees" ? 90 : k === "status" ? 60 : k === "created" ? 80 : "60%", animationDelay: `${i * 60}ms` }} />
                      </td>
                    ))}
                    <td style={tdStyle}><div style={{ ...skeletonStyle, width: 80, animationDelay: `${i * 60}ms` }} /></td>
                  </tr>
                )) : currentTickets.map((t, rowIdx) => (
                  <tr key={t.id} className="rh tkt-row" style={{ cursor: "pointer", background: selectedIds.has(t.id) ? "#eff6ff" : "#fff", animationDelay: `${Math.min(rowIdx * 20, 200)}ms` }}>
                    {/* ✅ Checkboxes only for Admin */}
                    {["Admin", "Manager"].includes(currentUser?.role) && (
                      <td style={tdStyle} onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSel(t.id)} style={{ cursor: "pointer" }} /></td>
                    )}
                    {visibleTicketCols.has("id") && <td style={tdStyle} onClick={() => setSelTicket(t)}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: "#3b82f6", fontWeight: 500 }}>{t.id}</span>{t.category === "Webcast" && <span style={{ marginLeft: 5, fontSize: 10, background: "#fff7ed", color: "#f97316", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>📡</span>}</td>}
                    {visibleTicketCols.has("created") && <td style={tdStyle} onClick={() => setSelTicket(t)}><span style={{ fontSize: 11, color: "#94a3b8" }}>{t.created ? new Date(String(t.created)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}</span></td>}
                    {visibleTicketCols.has("summary") && <td style={{ ...tdStyle, maxWidth: 180 }} onClick={() => setSelTicket(t)}><div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.summary}</div></td>}
                    {visibleTicketCols.has("org") && <td style={tdStyle} onClick={() => setSelTicket(t)}><div style={{ fontSize: 12, fontWeight: 500 }}>{t.org}</div></td>}
                    {visibleTicketCols.has("department") && <td style={tdStyle} onClick={() => setSelTicket(t)}><div style={{ fontSize: 12, color: "#64748b" }}>{t.department || "—"}</div></td>}
                    {visibleTicketCols.has("reportedBy") && <td style={tdStyle} onClick={() => setSelTicket(t)}><span style={{ fontSize: 12, color: "#64748b" }} title={t.reportedBy || "—"}>{t.reportedBy ? t.reportedBy.split(" ")[0] : "—"}</span></td>}
                    {visibleTicketCols.has("assignees") && <td style={tdStyle} onClick={() => setSelTicket(t)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        {(Array.isArray(t.assignees) ? t.assignees : []).map((a, i) => (
                          <div key={a.id ?? `${t.id}-a-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Avatar name={a.name} size={18} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{a.name.split(" ")[0]}</span>
                          </div>
                        ))}
                        {!(Array.isArray(t.assignees) && t.assignees.length) && <span style={{ fontSize: 11, color: "#94a3b8" }}>None</span>}
                      </div>
                    </td>}
                    {visibleTicketCols.has("priority") && <td style={tdStyle} onClick={() => setSelTicket(t)}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLOR[t.priority], display: "inline-block" }} /><span style={{ fontSize: 12 }}>{t.priority}</span></div></td>}
                    {visibleTicketCols.has("category") && <td style={tdStyle} onClick={() => setSelTicket(t)}><span style={{ fontSize: 12, color: "#64748b" }}>{t.category || "—"}</span></td>}
                    {visibleTicketCols.has("status") && <td style={tdStyle} onClick={() => setSelTicket(t)}><Badge label={t.status} style={{ ...STATUS_COLOR[t.status] }} /></td>}
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      {t.status === "Closed" ? (
                        <button
                          onClick={() => updateStatus(t.id, "Reopened")}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #f59e0b", background: "#fffbeb", color: "#b45309", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}
                        >🔄 Reopen</button>
                      ) : (
                        <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)} style={{ ...sS, width: 108, fontSize: 12, padding: "4px 7px" }}>{STATUSES.filter(s => s !== "Bin" || (currentUser?.role !== "Agent" && currentUser?.role !== "Viewer")).map(s => <option key={s}>{s}</option>)}</select>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>

              {allSortedTickets.length === 0 && <div style={{ padding: 36, textAlign: "center", color: "#94a3b8" }}>No tickets found</div>}

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    Showing {((currentPage - 1) * 25) + 1} to {Math.min(currentPage * 25, props.ticketTotalCount || allSortedTickets.length)} of {props.ticketTotalCount || allSortedTickets.length} tickets
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: 4, backgroundColor: currentPage === 1 ? "#f1f5f9" : "#fff", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 13 }} >Previous</button>
                    <span style={{ fontSize: 13, color: "#334155", padding: "6px 0" }}>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: 4, backgroundColor: currentPage === totalPages ? "#f1f5f9" : "#fff", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 13 }} >Next</button>
                  </div>
                </div>
              )}

            </div>
          </div>
          {/* ── Active Alerts: Notifications + Inbox panels ── */}
          {tvFilter === "alerts" ? (
            <AlertsView
              alertNotifs={alertNotifs}
              inboxItems={inboxItems}
              inboxUnread={inboxUnread}
              currentUser={currentUser}
              handleNotificationClick={handleNotificationClick}
              acceptInboxForwardRequest={acceptInboxForwardRequest}
              rejectInboxForwardRequest={rejectInboxForwardRequest}
            />
          ) : null}
    </>
  );
});