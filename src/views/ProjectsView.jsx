import React from "react";
import axios from "axios";
import { Avatar, Badge, FilterableHeader, ProgressBar } from "../components/UIComponents";
import { PRIORITY_COLOR, STATUS_COLOR, PROJECT_STATUSES, PROJECT_PRIORITIES, iS, sS, bP, bG } from "../constants/constants";
import { applySort } from "../utils/sortHelpers";
import { exportJSON } from "../utils/exportHelpers";
import { PROJECTS_API } from "../constants/api";
const ALL_PROJ_COLS = ["id","created","title","org","department","assignees","priority","category","status","progress","dueDate"];

export function ProjectsView(props) {
  const {
    projects, users, orgs, categories, currentUser,
    filteredProjects, pvFilter, setPvFilter,
    projFilters, setProjFilters,
    projPage, setProjPage,
    projSort, setProjSort,
    activeProjFilterDD, setActiveProjFilterDD,
    showProjExportDD, setShowProjExportDD,
    showProjColPicker, setShowProjColPicker,
    visibleProjCols, setVisibleProjCols,
    updateProjectStatus, deleteProject,
    setSelProject,
    setShowNewProject,
    setProjForm,
    dashboardOrg,
    getProgressFromStatus,
    setConfirmModal,
    setCustomAlert,
    setProjects,
    showProjColExport, setShowProjColExport,
    projExportCols, setProjExportCols,
    projExportMode, setProjExportMode,
   } = props;

  const {
    projSearch, setProjSearch,
    projFilterStatus, setProjFilterStatus,
    projFilterAssignment, setProjFilterAssignment,
    projFilterAssignee, setProjFilterAssignee,
    projFilterAssigneeSearch, setProjFilterAssigneeSearch,
    projFilterCategory, setProjFilterCategory,
    projFilterCategorySearch, setProjFilterCategorySearch,
    projFilterPriority, setProjFilterPriority,
  } = props;

  const [projColDDPos, setProjColDDPos] = React.useState({ top: 0, right: 0 });
  const projExportBtnRef = React.useRef(null);
  const projColBtnRef = React.useRef(null);
  const [selectedProjIds, setSelectedProjIds] = React.useState(new Set());
  const toggleProjSel = id => { setSelectedProjIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); };
  const toggleAllProj = () => { if (selectedProjIds.size === (filteredProjects||[]).length) { setSelectedProjIds(new Set()); } else { setSelectedProjIds(new Set((filteredProjects||[]).map(p => p.id))); } };
  const thStyle = { padding: "9px 11px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #94a3b8", border: "1px solid #94a3b8", whiteSpace: "nowrap", background: "#f8fafc" };
  const tdStyle = { padding: "9px 11px", fontSize: 12, color: "#334155", borderBottom: "1px solid #f1f5f9", border: "1px solid #e2e8f0", verticalAlign: "middle" };
  const projFilterStatusRef = React.useRef(null);
  const projFilterAssignmentRef = React.useRef(null);
  const projFilterAssigneeRef = React.useRef(null);
  const projFilterCategoryRef = React.useRef(null);
  const projFilterPriorityRef = React.useRef(null);

  return <div style={{ background: "#faf8f4", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

            {/* Project action bar */}
            <div style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search projects…" value={projSearch} onChange={e => setProjSearch(e.target.value)} style={{ ...iS, width: 200, fontSize: 13, padding: "7px 10px" }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>{applySort(filteredProjects, projSort).length} projects</span>
              {activeProjFilterDD && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setActiveProjFilterDD(null)} />}

              {/* STATUS */}
              <div style={{ position: "relative" }} ref={projFilterStatusRef}>
                <button onClick={() => setActiveProjFilterDD(v => v === "status" ? null : "status")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${projFilterStatus.length ? "#3b82f6" : "#e2e8f0"}`, background: projFilterStatus.length ? "#eff6ff" : "#f8fafc", color: projFilterStatus.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Status{projFilterStatus.length ? ` (${projFilterStatus.length})` : ""} ▾
                </button>
                {activeProjFilterDD === "status" && (
                  <div style={{ position: "fixed", top: (projFilterStatusRef.current?.getBoundingClientRect().bottom || 0) + 4, left: projFilterStatusRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 160, padding: 10 }}>
                    {[{id:"open",label:"🟢 Open"},{id:"closed",label:"✅ Closed"},{id:"pastdue",label:"🔴 Past Due"}].map(f => (
                      <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={projFilterStatus.includes(f.id)} onChange={() => setProjFilterStatus(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} />
                        {f.label}
                      </label>
                    ))}
                    {projFilterStatus.length > 0 && <div onClick={() => setProjFilterStatus([])} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* ASSIGNMENT */}
              <div style={{ position: "relative" }} ref={projFilterAssignmentRef}>
                <button onClick={() => setActiveProjFilterDD(v => v === "assignment" ? null : "assignment")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${projFilterAssignment.length ? "#3b82f6" : "#e2e8f0"}`, background: projFilterAssignment.length ? "#eff6ff" : "#f8fafc", color: projFilterAssignment.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Assignment{projFilterAssignment.length ? ` (${projFilterAssignment.length})` : ""} ▾
                </button>
                {activeProjFilterDD === "assignment" && (
                  <div style={{ position: "fixed", top: (projFilterAssignmentRef.current?.getBoundingClientRect().bottom || 0) + 4, left: projFilterAssignmentRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 180, padding: 10 }}>
                    {[{id:"assigned",label:"🙋 Assigned"},{id:"unassigned",label:"🔸 Unassigned"}].map(f => (
                      <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={projFilterAssignment.includes(f.id)} onChange={() => setProjFilterAssignment(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} />
                        {f.label}
                      </label>
                    ))}
                    {projFilterAssignment.length > 0 && <div onClick={() => setProjFilterAssignment([])} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* ASSIGNEE */}
              <div style={{ position: "relative" }} ref={projFilterAssigneeRef}>
                <button onClick={() => setActiveProjFilterDD(v => v === "assignee" ? null : "assignee")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${projFilterAssignee.length ? "#3b82f6" : "#e2e8f0"}`, background: projFilterAssignee.length ? "#eff6ff" : "#f8fafc", color: projFilterAssignee.length ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Assignee{projFilterAssignee.length ? ` (${projFilterAssignee.length})` : ""} ▾
                </button>
                {activeProjFilterDD === "assignee" && (
                  <div style={{ position: "fixed", top: (projFilterAssigneeRef.current?.getBoundingClientRect().bottom || 0) + 4, left: projFilterAssigneeRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 210, padding: 10 }}>
                    <input autoFocus placeholder="Search assignee…" value={projFilterAssigneeSearch} onChange={e => setProjFilterAssigneeSearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                    <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                      {(Array.isArray(users) ? users : []).filter(u => (!projFilterAssigneeSearch || u.name?.toLowerCase().includes(projFilterAssigneeSearch.toLowerCase()))).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(u => {
                        const sel = projFilterAssignee.includes(u.name);
                        return (
                          <div key={u.id} onClick={() => setProjFilterAssignee(p => sel ? p.filter(x => x !== u.name) : [...p, u.name])} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: sel ? "#1d4ed8" : "#374151", background: sel ? "#eff6ff" : "transparent", fontWeight: sel ? 600 : 400 }}>
                            <span style={{ width: 14, height: 14, border: `1.5px solid ${sel ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 3, background: sel ? "#3b82f6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                            {u.name}
                          </div>
                        );
                      })}
                    </div>
                    {projFilterAssignee.length > 0 && <div onClick={() => { setProjFilterAssignee([]); setProjFilterAssigneeSearch(""); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* CATEGORY */}
              <div style={{ position: "relative" }} ref={projFilterCategoryRef}>
                <button onClick={() => setActiveProjFilterDD(v => { if (v !== "category") setProjFilterCategorySearch(""); return v === "category" ? null : "category"; })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${projFilterCategory ? "#3b82f6" : "#e2e8f0"}`, background: projFilterCategory ? "#eff6ff" : "#f8fafc", color: projFilterCategory ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Category{projFilterCategory ? `: ${projFilterCategory}` : ""} ▾
                </button>
                {activeProjFilterDD === "category" && (
                  <div style={{ position: "fixed", top: (projFilterCategoryRef.current?.getBoundingClientRect().bottom || 0) + 4, left: projFilterCategoryRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 210, padding: 10 }}>
                    <input autoFocus placeholder="Search category…" value={projFilterCategorySearch} onChange={e => setProjFilterCategorySearch(e.target.value)} style={{ width: "100%", padding: "6px 9px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                    <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 6 }}>
                      {(Array.isArray(categories) ? categories : []).filter(c => !projFilterCategorySearch || c.name?.toLowerCase().includes(projFilterCategorySearch.toLowerCase())).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map(c => (
                        <div key={c.id} onClick={() => { setProjFilterCategory(c.name); setActiveProjFilterDD(null); }} style={{ padding: "5px 4px", fontSize: 13, cursor: "pointer", borderRadius: 5, color: projFilterCategory === c.name ? "#1d4ed8" : "#374151", background: projFilterCategory === c.name ? "#eff6ff" : "transparent", fontWeight: projFilterCategory === c.name ? 600 : 400 }}>
                          {c.name}
                        </div>
                      ))}
                    </div>
                    {projFilterCategory && <div onClick={() => setProjFilterCategory("")} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* PRIORITY */}
              <div style={{ position: "relative" }} ref={projFilterPriorityRef}>
                <button onClick={() => setActiveProjFilterDD(v => v === "priority" ? null : "priority")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${projFilterPriority !== "All" ? "#3b82f6" : "#e2e8f0"}`, background: projFilterPriority !== "All" ? "#eff6ff" : "#f8fafc", color: projFilterPriority !== "All" ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  Priority{projFilterPriority !== "All" ? `: ${projFilterPriority}` : ""} ▾
                </button>
                {activeProjFilterDD === "priority" && (
                  <div style={{ position: "fixed", top: (projFilterPriorityRef.current?.getBoundingClientRect().bottom || 0) + 4, left: projFilterPriorityRef.current?.getBoundingClientRect().left || 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 160, padding: 10 }}>
                    {["Critical","High","Standard","Medium"].map(p => (
                      <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                        <input type="radio" name="projPriorityFilterDD" checked={projFilterPriority === p} onChange={() => setProjFilterPriority(p)} />
                        {p}
                      </label>
                    ))}
                    {projFilterPriority !== "All" && <div onClick={() => { setProjFilterPriority("All"); setActiveProjFilterDD(null); }} style={{ borderTop: "1px solid #f1f5f9", marginTop: 4, paddingTop: 6, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Clear</div>}
                  </div>
                )}
              </div>

              {/* Clear all */}
              {(projFilterStatus.length > 0 || projFilterAssignment.length > 0 || projFilterAssignee.length > 0 || projFilterCategory || projFilterPriority !== "All") && (
                <span onClick={() => { setProjFilterStatus([]); setProjFilterAssignment([]); setProjFilterAssignee([]); setProjFilterAssigneeSearch(""); setProjFilterCategory(""); setProjFilterPriority("All"); }} style={{ padding: "5px 8px", fontSize: 11, color: "#ef4444", cursor: "pointer", fontWeight: 600, borderRadius: 6, border: "1px solid #fecaca", background: "#fff1f2" }}>✕ Clear all</span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <button ref={projExportBtnRef} onClick={() => setShowProjExportDD(v => !v)} style={{ ...bG, padding: "5px 11px", fontSize: 12 }}>⬇ Export</button>
                  {showProjExportDD && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 499 }} onClick={() => setShowProjExportDD(false)} />
                      <div style={{ position: "fixed", top: (projExportBtnRef.current?.getBoundingClientRect().bottom || 0) + 4, right: window.innerWidth - (projExportBtnRef.current?.getBoundingClientRect().right || 0), background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 500, minWidth: 160, padding: 8 }}>
                        <div onClick={() => { setShowProjExportDD(false); setProjExportCols(new Set(ALL_PROJ_COLS)); setProjExportMode("csv"); setShowProjColExport(true); }} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151" }}>📄 Export CSV</div>
                        <div onClick={() => { exportJSON(applySort(filteredProjects, projSort), "projects"); setShowProjExportDD(false); }} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151" }}>📦 Export JSON</div>
                        <div onClick={() => { setShowProjExportDD(false); setProjExportCols(new Set(ALL_PROJ_COLS)); setProjExportMode("print"); setShowProjColExport(true); }} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, color: "#374151" }}>🖨 Print</div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <button ref={projColBtnRef} onClick={() => { const r = projColBtnRef.current?.getBoundingClientRect(); if (r) setProjColDDPos({ top: r.bottom + 4, right: window.innerWidth - r.right }); setShowProjColPicker(v => !v); }} style={{ ...bG, padding: "5px 11px", fontSize: 12 }}>⚙ Columns</button>
                  {showProjColPicker && <>
                    <div data-col-picker="proj" style={{ position: "fixed", top: projColDDPos.top, right: projColDDPos.right, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.13)", zIndex: 500, padding: 10, minWidth: 180, maxHeight: "60vh", overflowY: "auto" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 7 }}>Show / Hide Columns</div>
                      {ALL_PROJ_COLS.map(col => (
                        <label key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13 }}>
                          <input type="checkbox" checked={visibleProjCols.has(col)} onChange={() => setVisibleProjCols(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; })} />
                          {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                        </label>
                      ))}
                    </div>
                  </>}
                </div>
                {selectedProjIds.size > 0 && <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, background: "#eff6ff", padding: "4px 10px", borderRadius: 99 }}>{selectedProjIds.size} selected</span>}
                {(currentUser?.role === "Admin" || currentUser?.role === "Manager") && <button onClick={() => { setProjForm({ org: dashboardOrg !== "all" ? dashboardOrg : "", department: "", reportedBy: "", title: "", description: "", assignees: [], priority: "", category: "", status: "Open", location: "", dueDate: "", satsangType: "", progress: 0, customAttrs: {}, webcastId: null }); setShowNewProject(true); }} style={{ ...bP, padding: "7px 13px", fontSize: 13, background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>+ New Project</button>}
              </div>
            </div>
            <div style={{ overflowX: "auto", border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  <th style={thStyle}></th>
                  {visibleProjCols.has("id") && <FilterableHeader label="ID" field="id" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("title") && <FilterableHeader label="Title" field="title" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("org") && <FilterableHeader label="Org" field="org" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("department") && <FilterableHeader label="Dept" field="department" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("assignees") && <FilterableHeader label="Assignees" field="assignees" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("priority") && <FilterableHeader label="Priority" field="priority" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("category") && <FilterableHeader label="Category" field="category" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("status") && <FilterableHeader label="Status" field="status" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("progress") && <FilterableHeader label="Progress" field="progress" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  {visibleProjCols.has("dueDate") && <FilterableHeader label="Due Date" field="dueDate" data={filteredProjects} filters={projSort} onFilter={setProjSort} style={thStyle} />}
                  <th style={thStyle}>Action</th>
                </tr></thead>
                <tbody>{applySort(filteredProjects, projSort).map(p => (
                  <tr key={p.id} className="rh" style={{ cursor: "pointer", background: selectedProjIds.has(p.id) ? "#f5f3ff" : "#fff" }}>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedProjIds.has(p.id)} onChange={() => toggleProjSel(p.id)} style={{ cursor: "pointer" }} /></td>
                    {visibleProjCols.has("id") && <td style={tdStyle} onClick={() => setSelProject(p)}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: "#8b5cf6", fontWeight: 500 }}>{p.id}</span></td>}
                    {visibleProjCols.has("title") && <td style={{ ...tdStyle, maxWidth: 180 }} onClick={() => setSelProject(p)}><div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div></td>}
                    {visibleProjCols.has("org") && <td style={tdStyle} onClick={() => setSelProject(p)}><div style={{ fontSize: 12, fontWeight: 500 }}>{p.org}</div></td>}
                    {visibleProjCols.has("department") && <td style={tdStyle} onClick={() => setSelProject(p)}><div style={{ fontSize: 12, color: "#64748b" }}>{p.department || "—"}</div></td>}
                    {visibleProjCols.has("assignees") && <td style={tdStyle} onClick={() => setSelProject(p)}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {(p.assignees || []).map((a) => (
                          <span key={a.id} style={{ fontSize: 11, background: "#f3e8ff", color: "#6d28d9", borderRadius: 99, padding: "2px 7px", fontWeight: 600, whiteSpace: "nowrap" }}>{a.name}</span>
                        ))}
                        {!p.assignees?.length && <span style={{ fontSize: 11, color: "#94a3b8" }}>None</span>}
                      </div>
                    </td>}
                    {visibleProjCols.has("priority") && <td style={tdStyle} onClick={() => setSelProject(p)}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLOR[p.priority], display: "inline-block" }} /><span style={{ fontSize: 12 }}>{p.priority}</span></div></td>}
                    {visibleProjCols.has("category") && <td style={tdStyle} onClick={() => setSelProject(p)}><span style={{ fontSize: 12, color: "#64748b" }}>{p.category || "—"}</span></td>}
                    {visibleProjCols.has("status") && <td style={tdStyle} onClick={() => setSelProject(p)}><Badge label={p.status} style={{ ...STATUS_COLOR[p.status] }} /></td>}
                    {visibleProjCols.has("progress") && <td style={tdStyle} onClick={() => setSelProject(p)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <ProgressBar value={getProgressFromStatus(p.status)} color={getProgressFromStatus(p.status) > 70 ? "#22c55e" : getProgressFromStatus(p.status) > 40 ? "#f59e0b" : "#ef4444"} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 28 }}>{getProgressFromStatus(p.status)}%</span>
                      </div>
                    </td>}
                    {visibleProjCols.has("dueDate") && <td style={tdStyle} onClick={() => setSelProject(p)}><span style={{ fontSize: 11, color: "#94a3b8" }}>{p.dueDate?.toLocaleDateString() || "—"}</span></td>}
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      {p.status === "Closed" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <button onClick={() => updateProjectStatus(p.id, "Open")} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #f59e0b", background: "#fffbeb", color: "#b45309", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>🔄 Reopen</button>
                          {p.closedBy && <span style={{ fontSize: 10, color: "#64748b" }}>by {p.closedBy}</span>}
                        </div>
                      ) : p.status === "Bin" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => updateProjectStatus(p.id, "Open")} style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid #22c55e", background: "#f0fdf4", color: "#15803d", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Restore</button>
                          <button onClick={() => { setConfirmModal({ show: true, title: "Delete Project Permanently", message: "This cannot be undone.", confirmLabel: "Delete", confirmDanger: true, onConfirm: async () => { try { await axios.delete(`${PROJECTS_API}/${p.id}`); setProjects(prev => prev.filter(x => x.id !== p.id)); setCustomAlert({ show: true, message: "✅ Project permanently deleted", type: "success" }); } catch(e) { setCustomAlert({ show: true, message: "Failed to delete", type: "error" }); } setConfirmModal({ show: false }); }, onCancel: () => setConfirmModal({ show: false }) }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid #ef4444", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                        </div>
                      ) : (
                        <select value={p.status} onChange={e => {
                          const newStatus = e.target.value;
                          if (newStatus === "Bin") {
                            updateProjectStatus(p.id, "Bin");
                          } else if (newStatus === "Closed") {
                            updateProjectStatus(p.id, "Closed");
                          } else {
                            updateProjectStatus(p.id, newStatus);
                          }
                        }} style={{ ...sS, width: 108, fontSize: 12, padding: "4px 7px" }}>{PROJECT_STATUSES.filter(s => s !== "Bin" || (currentUser?.role !== "Agent" && currentUser?.role !== "Viewer")).map(s => <option key={s}>{s}</option>)}</select>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {filteredProjects.length === 0 && <div style={{ padding: 36, textAlign: "center", color: "#94a3b8" }}>No projects found</div>}
            </div>
          </div>
  ;
}
