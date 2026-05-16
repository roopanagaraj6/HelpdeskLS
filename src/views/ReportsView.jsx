import React, { useState } from "react";
import axios from "axios";
import { SmartChart, HorizontalBarChart } from "../components/Charts";
import { Avatar } from "../components/UIComponents";
import { PRIORITIES, PROJECT_PRIORITIES, STATUSES, PROJECT_STATUSES } from "../constants/constants";
import { exportCSV, exportJSON, exportPrint } from "../utils/exportHelpers";
import { BASE_URL } from "../constants/api";

/**
 * Report builder — filters, column picker, table, and chart output.
 */
export function ReportsView(props) {
  const {
    tickets, projects, users, orgs, categories, currentUser,
    reportFilters, setReportFilters,
    activeReportFilterDD, setActiveReportFilterDD,
    reportTimeRange, setReportTimeRange,
    savedReports, setSavedReports,
    dashboardOrg,
    getDefaultCols,
  } = props;

  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [reportPreview, setReportPreview] = useState([]);
  const [reportName, setReportName] = useState("");
  const [saveReportDialogOpen, setSaveReportDialogOpen] = useState(false);
  const [reportCategorySearch, setReportCategorySearch] = useState("");
  const [reportAssigneeSearch, setReportAssigneeSearch] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoadingMsg, setReportLoadingMsg] = useState("");

  const prbr = projects || [];
  const fbr = tickets || [];

  return (() => {
            const ALL_COLUMNS = {
              tickets: [
                { key: "id", label: "ID" }, { key: "summary", label: "Summary" },
                { key: "status", label: "Status" }, { key: "priority", label: "Priority" },
                { key: "category", label: "Category" }, { key: "org", label: "Organization" },
                { key: "department", label: "Department" }, { key: "contact", label: "Contact" },
                { key: "reportedBy", label: "Reported By" },
                { key: "assignees", label: "Assignees" }, { key: "location", label: "Location" },
                { key: "createdAt", label: "Created Date" },
                { key: "updatedAt", label: "Updated Date" },
                { key: "dueDate", label: "Due Date" },
                { key: "closedAt", label: "Closed Date" },
                { key: "closedBy", label: "Closed By" },
              ],
              projects: [
                { key: "id", label: "ID" }, { key: "title", label: "Title" },
                { key: "status", label: "Status" }, { key: "priority", label: "Priority" },
                { key: "category", label: "Category" }, { key: "org", label: "Organization" },
                { key: "department", label: "Department" }, { key: "reportedBy", label: "Reported By" },
                { key: "assignees", label: "Assignees" }, { key: "progress", label: "Progress" },
                { key: "dueDate", label: "Due Date" }, { key: "createdAt", label: "Created" },
                { key: "closedAt", label: "Closed Date" },{ key: "closedBy", label: "Closed By" },
              ],
            };
            
            const ALWAYS_EXCLUDE = ["department", "contact", "reportedBy", "location","updatedAt","closedBy","closedAt"];
            const DEFAULT_COLS = {
              tickets: {
                Open: ALL_COLUMNS.tickets.filter(c => !["reportedBy","closedAt","contact","department","location","updatedAt","closedBy","closedAt"].includes(c.key)).map(c => c.key),
                Closed: ALL_COLUMNS.tickets.filter(c => !["reportedBy","createdAt","updatedAt","dueDate","department","location","contact"].includes(c.key)).map(c => c.key),
              },
              projects: {
                Open: ALL_COLUMNS.projects.filter(c => !["reportedBy","closedAt","contact","department","location"].includes(c.key)).map(c => c.key),
                Closed: ALL_COLUMNS.projects.filter(c => !["reportedBy","createdAt","updatedAt","dueDate","department","location","contact"].includes(c.key)).map(c => c.key),
              },
            };
            const getDefaultCols = (src, statuses) => {
              const s = statuses.length === 1 ? statuses[0] : null;
              if (s) return DEFAULT_COLS[src]?.[s] || ALL_COLUMNS[src].map(c => c.key);
              return ALL_COLUMNS[src].filter(c => !ALWAYS_EXCLUDE.includes(c.key)).map(c => c.key);
            };
            const availableCols = ALL_COLUMNS[reportFilters.dataSource] || ALL_COLUMNS.tickets;
            const sourceData = reportFilters.dataSource === "projects" ? prbr : fbr;

            const getClosedDate = (row) => {
              if (row.closedAt) return new Date(row.closedAt);
              const e = (row.timeline || []).slice().reverse().find(e => e.action?.includes("Status changed to Closed"));
              return e?.date ? new Date(e.date) : null;
            };

            const applyFilters = (data) => {
              let result = data.filter(r => r.status !== "Bin");
              if (reportFilters.org) result = result.filter(r => r.org === reportFilters.org);
              if (reportFilters.status.length) result = result.filter(r => reportFilters.status.includes(r.status));              
              if (reportFilters.priority.length) result = result.filter(r => reportFilters.priority.includes(r.priority));
              if (reportFilters.category.length) result = result.filter(r => reportFilters.category.includes(r.category));
              if (reportFilters.assignee) result = result.filter(r => (r.assignees || []).some(a => a.name?.toLowerCase().includes(reportFilters.assignee.toLowerCase())));
              const onlyClosed = reportFilters.status.length === 1 && reportFilters.status[0] === "Closed";
              const getRelevantDate = (r) => {
                if (r.status === "Closed") { const d = getClosedDate(r); if (d) return d; }
                return r.created instanceof Date ? r.created : new Date(r.created);
              };
              if (reportFilters.dateFrom) {
                const from = new Date(reportFilters.dateFrom + "T00:00:00");
                if (onlyClosed) result = result.filter(r => { const d = getClosedDate(r); return d && d >= from; });
                else result = result.filter(r => getRelevantDate(r) >= from);
              }
              if (reportFilters.dateTo) {
                const to = new Date(reportFilters.dateTo + "T23:59:59");
                if (onlyClosed) result = result.filter(r => { const d = getClosedDate(r); return d && d <= to; });
                else result = result.filter(r => getRelevantDate(r) <= to);
              }
              return result;
            };

            const getCellValue = (row, key) => {
              if (key === "assignees") return (row.assignees || []).map(a => a.name).join(", ");
              if (key === "createdAt" || key === "updatedAt" || key === "dueDate") return row[key] ? new Date(row[key]).toLocaleDateString() : "—";
              if (key === "closedAt") {
                if (row.closedAt) return new Date(row.closedAt).toLocaleDateString();
                const closeEvent = (row.timeline || []).slice().reverse().find(e => e.action?.includes("Status changed to Closed"));
                return closeEvent?.date ? new Date(closeEvent.date).toLocaleDateString() : "—";
              }
              if (key === "closedBy") {
                if (row.closedBy) return row.closedBy;
                const closeEvent = (row.timeline || []).slice().reverse().find(e => e.action?.includes("Status changed to Closed"));
                const match = closeEvent?.note?.match(/Closed by:\s*([^·\n]+)/);
                return match ? match[1].trim() : "—";
              }
              if (key === "progress") return row[key] != null ? `${row[key]}%` : "—";
              return row[key] || "—";
            };

            // Build query params from active filters — only pass what user actually set
            const buildParams = (f) => {
              const p = new URLSearchParams();
              if (f.status.length === 1 && f.status[0])     p.set("status",    f.status[0]);
              if (f.priority.length === 1 && f.priority[0]) p.set("priority",  f.priority[0]);
              if (f.org && f.org !== "all")                  p.set("org",       f.org);
              if (f.category.length === 1 && f.category[0]) p.set("category",  f.category[0]);
              if (f.assignee && f.assignee.trim())           p.set("assignee",  f.assignee.trim());
              if (f.dateFrom)                                p.set("dateFrom",  f.dateFrom);
              if (f.dateTo)                                  p.set("dateTo",    f.dateTo);
              if (f.dateFrom || f.dateTo)
                p.set("dateField", f.status.length === 1 && f.status[0] === "Closed" ? "closedAt" : "createdAt");
              return p.toString();
            };

            // Fetch only the rows matching current filters from DB
            const fetchFiltered = async (f, onCount) => {
              const params = buildParams(f);
              const res = await axios.get(`${BASE_URL}/tickets/report?${params}`);
              const tickets = res.data.tickets || [];
              if (onCount) onCount(tickets.length);
              return tickets.map(t => ({
                ...t,
                created: new Date(t.createdAt || t.created),
                updated: new Date(t.updatedAt || t.updated),
              }));
            };

            const runReport = async () => {
              setReportLoading(true);
              setReportPreview([]);
              setReportLoadingMsg("Counting records…");
              try {
                let result;
                if (reportFilters.dataSource === "tickets") {
                  const rows = await fetchFiltered(reportFilters, (total) =>
                    setReportLoadingMsg(`Fetching ${total.toLocaleString()} tickets…`)
                  );
                  // server filtered by status/priority/org/category/date already
                  // only re-filter client-side if multi-value arrays used (UI currently single-select, future-proof)
                  result = (reportFilters.status.length > 1 || reportFilters.priority.length > 1)
                    ? applyFilters(rows)
                    : rows.filter(r => r.status !== "Bin");
                } else {
                  result = applyFilters(prbr);
                }
                setReportPreview(result);
              } catch (e) {
                alert("Failed to run report. Check connection.");
              } finally {
                setReportLoading(false);
                setReportLoadingMsg("");
              }
            };

            const saveReport = () => {
              if (!reportName.trim()) { alert("Enter a report name"); return; }
              const name = reportName.trim();
              axios.post(`${BASE_URL}/saved-reports`, {
                name,
                filters: { ...reportFilters },
                rowCount: reportPreview.length,
                savedBy: currentUser?.name || "Unknown",
              })
                .then(r => {
                  setSavedReports(prev => [r.data, ...prev]);
                  setReportName("");
                  setSaveReportDialogOpen(false);
                  setReportBuilderOpen(false);
                  alert(`Report "${name}" saved.`);
                })
                .catch(() => alert("Failed to save report"));
            };

            const downloadReport = async (reportOrLive, label) => {
              let data;
              if (reportOrLive === "live") {
                data = reportPreview;
              } else {
                // saved report card "⬇ CSV" — re-fetch with that report's filters
                const f = reportOrLive?.filters || reportFilters;
                if (f.dataSource === "tickets") {
                  try {
                    data = await fetchFiltered(f);
                    if (f.status.length > 1 || f.priority.length > 1) data = applyFilters(data);
                    else data = data.filter(r => r.status !== "Bin");
                  } catch (_) { data = []; }
                } else {
                  data = applyFilters(prbr);
                }
              }
              const cols = reportFilters.columns.length ? reportFilters.columns : availableCols.map(c => c.key);
              const headers = cols.map(k => availableCols.find(c => c.key === k)?.label || k);
              const rows = data.map(row => cols.map(k => `"${String(getCellValue(row, k)).replace(/"/g, '""')}"`));
              const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a.download = `${label || "report"}_${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
            };

            const deleteReport = (id) => {
              axios.delete(`${BASE_URL}/saved-reports/${id}`)
                .then(() => setSavedReports(prev => prev.filter(r => r.id !== id)))
                .catch(() => alert("Failed to delete report"));
            };

            const loadReport = async (r) => {
              const f = { ...r.filters };
              setReportFilters(f);
              setReportBuilderOpen(true);
              setReportLoading(true);
              setReportPreview([]);
              setReportLoadingMsg("Loading saved report…");
              try {
                let result;
                if (f.dataSource === "tickets") {
                  const rows = await fetchFiltered(f, (total) =>
                    setReportLoadingMsg(`Fetching ${total.toLocaleString()} tickets…`)
                  );
                  result = (f.status.length > 1 || f.priority.length > 1)
                    ? applyFilters(rows)
                    : rows.filter(r => r.status !== "Bin");
                } else {
                  result = applyFilters(prbr);
                }
                setReportPreview(result);
              } catch (_) {
                alert("Failed to load report.");
              } finally {
                setReportLoading(false);
                setReportLoadingMsg("");
              }
            };

            const btn = (label, onClick, color = "#3b82f6", ghost = false) => (
              <button onClick={onClick} style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: ghost ? "transparent" : color, color: ghost ? color : "#fff",
                border: ghost ? `1.5px solid ${color}` : "none",
              }}>{label}</button>
            );

            const chip = (val, active, onClick) => (
              <span onClick={onClick} key={val} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", userSelect: "none",
                background: active ? "#3b82f6" : "#f1f5f9", color: active ? "#fff" : "#334155",
                border: active ? "none" : "1px solid #e2e8f0", fontWeight: 500,
              }}>{val}</span>
            );

            const toggleArr = (field, val) => setReportFilters(f => ({
              ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
            }));
            const toggleCol = (k) => setReportFilters(f => {
              if (f.columns.includes(k)) return { ...f, columns: f.columns.filter(x => x !== k) };
              const allKeys = availableCols.map(c => c.key);
              const originalIndex = allKeys.indexOf(k);
              const newCols = [...f.columns];
              const insertAt = newCols.findIndex(col => allKeys.indexOf(col) > originalIndex);
              if (insertAt === -1) newCols.push(k); else newCols.splice(insertAt, 0, k);
              return { ...f, columns: newCols };
            });

            const allCategories = [...new Set(sourceData.map(r => r.category).filter(Boolean))];
            const activeCols = reportFilters.columns.length ? reportFilters.columns : availableCols.map(c => c.key);

            return (
              <div style={{ padding: "0 0 40px 0", maxWidth: 1100 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>📊 Reports</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Build, save, and export reports from your data.</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!reportBuilderOpen && btn("＋ New Report", () => {
                      setReportPreview([]);
                      setReportName("");
                      setReportFilters({ dataSource: "tickets", status: [], priority: [], category: [], assignee: "", org: dashboardOrg === "all" ? "" : dashboardOrg, dateFrom: "", dateTo: "", columns: getDefaultCols("tickets", []) });
                      setReportCategorySearch(""); setReportAssigneeSearch(""); setActiveReportFilterDD(null);
                      setReportBuilderOpen(true);
                    })}
                    {reportBuilderOpen && (
                      <button onClick={() => {
                        setReportFilters({ dataSource: "tickets", status: [], priority: [], category: [], assignee: "", org: dashboardOrg === "all" ? "" : dashboardOrg, dateFrom: "", dateTo: "", columns: getDefaultCols("tickets", []) });
                        setReportCategorySearch(""); setReportAssigneeSearch(""); setActiveReportFilterDD(null);
                        setReportPreview([]);
                      }} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fff1f2", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                        ↺ Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Saved Reports History */}
                {!reportBuilderOpen && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 10 }}>Saved Reports</h3>
                    {savedReports.length === 0 ? (
                      <div style={{ padding: 32, textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
                        No saved reports yet. Click <strong>+ New Report</strong> to create one.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {savedReports.map((r, i) => (
                          <div key={r.id} className="rpt-row-anim" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animationDelay: `${i * 40}ms` }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{r.name}</div>
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                                {r.filters.dataSource} · {r.rowCount} rows · {new Date(r.createdAt).toLocaleDateString()}{r.savedBy ? ` · Saved by: ${r.savedBy}` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {btn("Load", () => loadReport(r), "#6366f1", true)}
                              {btn("⬇ CSV", () => downloadReport(r, r.name), "#10b981", true)}
                              {btn("✕", () => deleteReport(r.id), "#ef4444", true)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Report Builder */}
                {reportBuilderOpen && (
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>🔧 Report Builder</h3>
                      {btn("← Back to Reports", () => setReportBuilderOpen(false), "#64748b", true)}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      {/* Data Source */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>DATA SOURCE</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["tickets", "projects"].map(s => chip(s.charAt(0).toUpperCase() + s.slice(1), reportFilters.dataSource === s, () => setReportFilters(f => ({ ...f, dataSource: s, status: [], priority: [], category: [], org: dashboardOrg === "all" ? "" : dashboardOrg, columns: getDefaultCols(s, []) }))))}
                        </div>
                      </div>
                      {/* Date Range */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                          DATE RANGE
                          <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>
                            ({reportFilters.status[0] === "Closed" ? "filters by closed date" : "filters by created date"})
                          </span>
                        </label>                        
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="date" value={reportFilters.dateFrom} max={reportFilters.dateTo || new Date().toISOString().split("T")[0]} onChange={e => setReportFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ flex: 1, padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13 }} />
                          <input type="date" value={reportFilters.dateTo} min={reportFilters.dateFrom || undefined} max={new Date().toISOString().split("T")[0]} onChange={e => setReportFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ flex: 1, padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13 }} />
                        </div>
                      </div>
                    </div>

                    {/* Filters Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>STATUS</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(reportFilters.dataSource === "projects" ? PROJECT_STATUSES : STATUSES).filter(s => s !== "Bin").map(s => chip(s, reportFilters.status[0] === s, () => {
                            const newStatus = reportFilters.status[0] === s ? [] : [s];
                            setReportFilters(f => ({ ...f, status: newStatus, columns: getDefaultCols(f.dataSource, newStatus) }));
                          }))}

                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>PRIORITY</label>
                        <select value={reportFilters.priority[0] || ""} onChange={e => setReportFilters(f => ({ ...f, priority: e.target.value ? [e.target.value] : [] }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, background: "#fff", color: "#334155" }}>
                          <option value="">All Priorities</option>
                          {(reportFilters.dataSource === "projects" ? PROJECT_PRIORITIES : PRIORITIES).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ position: "relative" }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>CATEGORY</label>
                        <button onClick={() => setActiveReportFilterDD(v => { if (v !== "category") setReportCategorySearch(""); return v === "category" ? null : "category"; })} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${reportFilters.category[0] ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 7, fontSize: 13, background: reportFilters.category[0] ? "#eff6ff" : "#fff", color: reportFilters.category[0] ? "#1d4ed8" : "#334155", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>{reportFilters.category[0] || "All Categories"}</span>
                          <span>▾</span>
                        </button>
                        {activeReportFilterDD === "category" && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setActiveReportFilterDD(null); setReportCategorySearch(""); }} />
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, padding: 10, marginTop: 2 }}>
                              <input autoFocus placeholder="Search category…" value={reportCategorySearch} onChange={e => setReportCategorySearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                              <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                                {[...categories].filter(c => !reportCategorySearch || c.name?.toLowerCase().includes(reportCategorySearch.toLowerCase())).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(c => (
                                  <div key={c.id} onClick={() => { setReportFilters(f => ({ ...f, category: [c.name] })); setActiveReportFilterDD(null); setReportCategorySearch(""); }} style={{ padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: reportFilters.category[0] === c.name ? "#1d4ed8" : "#374151", background: reportFilters.category[0] === c.name ? "#eff6ff" : "transparent", fontWeight: reportFilters.category[0] === c.name ? 600 : 400 }}>
                                    {c.name}
                                  </div>
                                ))}
                              </div>
                              {reportFilters.category[0] && <div onClick={() => { setReportFilters(f => ({ ...f, category: [] })); setActiveReportFilterDD(null); setReportCategorySearch(""); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ position: "relative" }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>ASSIGNEE</label>
                        <button onClick={() => setActiveReportFilterDD(v => { if (v !== "assignee") setReportAssigneeSearch(""); return v === "assignee" ? null : "assignee"; })} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${reportFilters.assignee ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 7, fontSize: 13, background: reportFilters.assignee ? "#eff6ff" : "#fff", color: reportFilters.assignee ? "#1d4ed8" : "#334155", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>{reportFilters.assignee || "All Assignees"}</span>
                          <span>▾</span>
                        </button>
                        {activeReportFilterDD === "assignee" && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setActiveReportFilterDD(null); setReportAssigneeSearch(""); }} />
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, padding: 10, marginTop: 2 }}>
                              <input autoFocus placeholder="Search assignee…" value={reportAssigneeSearch} onChange={e => setReportAssigneeSearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                              <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                                {[...users].filter(u => !reportAssigneeSearch || u.name?.toLowerCase().includes(reportAssigneeSearch.toLowerCase())).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(u => (
                                  <div key={u.id} onClick={() => { setReportFilters(f => ({ ...f, assignee: u.name })); setActiveReportFilterDD(null); setReportAssigneeSearch(""); }} style={{ padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: reportFilters.assignee === u.name ? "#1d4ed8" : "#374151", background: reportFilters.assignee === u.name ? "#eff6ff" : "transparent", fontWeight: reportFilters.assignee === u.name ? 600 : 400 }}>
                                    {u.name}{!u.active ? " (inactive)" : ""}
                                  </div>
                                ))}
                              </div>
                              {reportFilters.assignee && <div onClick={() => { setReportFilters(f => ({ ...f, assignee: "" })); setActiveReportFilterDD(null); setReportAssigneeSearch(""); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>ORGANIZATION</label>
                        <select value={reportFilters.org} onChange={e => setReportFilters(f => ({ ...f, org: e.target.value }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, background: "#fff", color: "#334155" }}>
                          <option value="">All Organizations</option>
                          {orgs.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Columns */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>COLUMNS TO EXPORT</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {availableCols.map(c => chip(c.label, activeCols.includes(c.key), () => toggleCol(c.key)))}
                      </div>
                    </div>

                    {/* Actions */}
                    <style>{`
                      @keyframes rpt-spin { to { transform: rotate(360deg); } }
                      @keyframes rpt-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
                      @keyframes rpt-row-in { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
                      @keyframes rpt-pulse-bar { 0%,100%{opacity:.4} 50%{opacity:1} }
                      .rpt-row-anim { animation: rpt-row-in 0.22s ease both; }
                      .rpt-results-wrap { animation: rpt-fade-in 0.28s ease both; }
                      @keyframes tkt-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                      @keyframes tkt-row-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
                      .tkt-row { animation: tkt-row-in 0.18s ease both; }
                    `}</style>

                    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
                      <button
                        onClick={runReport}
                        disabled={reportLoading}
                        style={{
                          padding: "7px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: reportLoading ? "not-allowed" : "pointer",
                          background: reportLoading ? "#93c5fd" : "#3b82f6", color: "#fff", border: "none",
                          display: "flex", alignItems: "center", gap: 8,
                          transition: "background 0.2s",
                        }}
                      >
                        {reportLoading
                          ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "rpt-spin 0.7s linear infinite" }} />
                          : "▶"}
                        {reportLoading ? reportLoadingMsg : "Run Report"}
                      </button>
                      {reportPreview.length > 0 && !reportLoading && btn("⬇ Export CSV", () => downloadReport("live", reportName || "report"), "#10b981")}
                    </div>

                    {reportLoading && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ height: 4, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: "60%", borderRadius: 4, background: "#3b82f6",
                            animation: "rpt-pulse-bar 1.1s ease-in-out infinite",
                            transformOrigin: "left",
                          }} />
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{reportLoadingMsg}</div>
                      </div>
                    )}
                    
                    {saveReportDialogOpen && (
                      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
                        <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>💾 Save Report</h3>
                          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Report Name *</label>
                          <input autoFocus value={reportName} onChange={e => setReportName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveReport(); if (e.key === "Escape") setSaveReportDialogOpen(false); }} placeholder="Enter report name…" style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, boxSizing: "border-box", marginBottom: 20 }} />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button onClick={() => { setSaveReportDialogOpen(false); setReportName(""); }} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                            <button onClick={saveReport} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {reportPreview.length > 0 && (
                      <div className="rpt-results-wrap">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{reportPreview.length} rows</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {btn("💾 Save Report", () => setSaveReportDialogOpen(true), "#6366f1")}
                          </div>
                        </div>
                        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: "#f8fafc" }}>
                                {activeCols.map(k => (
                                  <th key={k} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                                    {availableCols.find(c => c.key === k)?.label || k}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {reportPreview.slice(0, 100).map((row, i) => (
                                <tr key={row.id || i} className="rpt-row-anim" style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa", animationDelay: `${Math.min(i * 12, 300)}ms` }}>
                                  {activeCols.map(k => (
                                    <td key={k} style={{ padding: "8px 12px", color: "#334155", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {getCellValue(row, k)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {reportPreview.length > 100 && (
                            <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>Showing first 100 rows. Export CSV for full data.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
  })();
}
