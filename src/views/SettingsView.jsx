import React, { useState } from "react";
import axios from "axios";
import { Avatar, FF, Modal, ProgressBar, FilterableHeader, Badge } from "../components/UIComponents";
import { ROLES, iS, sS, bP, bG } from "../constants/constants";
import { applySort } from "../utils/sortHelpers";
import { BASE_URL, ORGS_API, CATEGORIES_API, LOCATIONS_API, VENDORS_API } from "../constants/api";
/**
 * Settings panel with tabbed sub-views:
 * Organisations, Departments, Categories, Locations, Vendors,
 * User Management, Custom Attributes, DB Management, Profile.
 */

// --- Scheduled Tasks Tab Component ---
const SCHED_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FREQ_LABELS = { daily: "Daily", weekly: "Weekly", biweekly: "Bi-Weekly", monthly: "Monthly" };

function ScheduledTasksTab({ currentUser, orgs, categories, users, locations, departments, setCustomAlert }) {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editTask, setEditTask] = React.useState(null);
  const [assigneeSearch, setAssigneeSearch] = React.useState("");
  const [showAssigneeDD, setShowAssigneeDD] = React.useState(false);

  const emptyForm = () => ({
    name: "", summary: "", description: "", org: "", department: "",
    priority: "Standard", category: "", assignees: [], location: "",
    reportedBy: currentUser?.name || "",
    frequency: "weekly", dayOfWeek: 1, daysOfWeek: [1, 4], dayOfMonth: 1, timeOfDay: "09:00", active: true,
  });
  const [form, setForm] = React.useState(emptyForm());

  React.useEffect(() => {
    axios.get(BASE_URL + "/scheduled-tasks")
      .then(r => { setTasks(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openAdd = () => { setForm(emptyForm()); setEditTask(null); setShowModal(true); };
  const openEdit = (t) => { setForm({ ...t, daysOfWeek: t.daysOfWeek && t.daysOfWeek.length ? t.daysOfWeek : [1, 4] }); setEditTask(t); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return setCustomAlert({ show: true, message: "Task name is required", type: "error" });
    if (!form.summary.trim()) return setCustomAlert({ show: true, message: "Ticket summary is required", type: "error" });
    if (!form.org.trim()) return setCustomAlert({ show: true, message: "Organisation is required", type: "error" });
    try {
      if (editTask) {
        const r = await axios.put(BASE_URL + "/scheduled-tasks/" + editTask.id, form);
        setTasks(prev => prev.map(t => t.id === editTask.id ? r.data : t));
        setCustomAlert({ show: true, message: "Task updated", type: "success" });
      } else {
        const r = await axios.post(BASE_URL + "/scheduled-tasks", { ...form, createdBy: currentUser?.name });
        setTasks(prev => [r.data, ...prev]);
        setCustomAlert({ show: true, message: "Scheduled task created", type: "success" });
      }
      setShowModal(false);
    } catch (e) { setCustomAlert({ show: true, message: "Failed to save: " + e.message, type: "error" }); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this scheduled task?")) return;
    await axios.delete(BASE_URL + "/scheduled-tasks/" + id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setCustomAlert({ show: true, message: "Task deleted", type: "success" });
  };

  const toggle = async (t) => {
    const r = await axios.put(BASE_URL + "/scheduled-tasks/" + t.id, { ...t, active: !t.active });
    setTasks(prev => prev.map(x => x.id === t.id ? r.data : x));
  };

  const toggleAssignee = (u) => {
    const exists = form.assignees.some(a => a.id === u.id);
    setForm(f => ({ ...f, assignees: exists ? f.assignees.filter(a => a.id !== u.id) : [...f.assignees, { id: u.id, name: u.name, role: u.role }] }));
  };

  const orgDepts = (departments || []).filter(d => !form.org || d.orgName === form.org);

  return (
    <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700 }}>Scheduled Tasks ({tasks.length})</h3>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Auto-create tickets on a recurring schedule</p>
        </div>
        <button onClick={openAdd} style={{ ...bP, padding: "8px 16px", fontSize: 12 }}>+ New Task</button>
      </div>

      {loading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Loading...</div>}

      {!loading && tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#9200;</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No scheduled tasks yet</div>
          <div style={{ fontSize: 12 }}>Create a task to auto-generate tickets on a recurring schedule</div>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{t.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: t.active ? "#dcfce7" : "#f1f5f9", color: t.active ? "#15803d" : "#94a3b8" }}>
                    {t.active ? "Active" : "Paused"}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#eff6ff", color: "#3b82f6", fontWeight: 600 }}>
                    {FREQ_LABELS[t.frequency] || t.frequency}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Ticket: </span>{t.summary}
                  {t.org && <span style={{ marginLeft: 10, color: "#94a3b8" }}>&#8226; {t.org}</span>}
                  {t.priority && <span style={{ marginLeft: 8, color: "#f59e0b", fontWeight: 600 }}>&#8226; {t.priority}</span>}
                  {t.category && <span style={{ marginLeft: 8, color: "#94a3b8" }}>&#8226; {t.category}</span>}
                </div>
                {t.assignees && t.assignees.length > 0 && (
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    Assignees: {t.assignees.map(a => a.name).join(", ")}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span>
                    &#128336; {t.timeOfDay}
                    {t.frequency === "weekly" && " every " + (SCHED_DAYS[t.dayOfWeek] || "")}
                    {t.frequency === "biweekly" && " twice/week on " + (t.daysOfWeek || []).map(d => SCHED_DAYS[d]).join(" & ")}
                    {t.frequency === "monthly" && " on day " + t.dayOfMonth + " of month"}
                    {t.frequency === "daily" && " daily"}
                  </span>
                  {t.nextRunAt && <span>Next: {new Date(t.nextRunAt).toLocaleString()}</span>}
                  {t.lastRunAt && <span>Last ran: {new Date(t.lastRunAt).toLocaleString()}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => toggle(t)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: t.active ? "#f59e0b" : "#22c55e" }}>
                  {t.active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => openEdit(t)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: "#3b82f6" }}>Edit</button>
                <button onClick={() => remove(t.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", cursor: "pointer", color: "#ef4444" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 580, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editTask ? "Edit Scheduled Task" : "New Scheduled Task"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>&#x2715;</button>
            </div>

            <FF label="Task Name *">
              <input style={iS} placeholder="e.g. Weekly Backup Check" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FF>

            <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 12 }}>Schedule</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                <FF label="Frequency">
                  <select style={sS} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </FF>
                <FF label="Time of Day">
                  <input type="time" style={iS} value={form.timeOfDay}
                    onChange={e => setForm(f => ({ ...f, timeOfDay: e.target.value }))} />
                </FF>
                {form.frequency === "weekly" && (
                  <FF label="Day of Week">
                    <select style={sS} value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: parseInt(e.target.value) }))}>
                      {SCHED_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </FF>
                )}
                {form.frequency === "biweekly" && (
                  <FF label="Days of Week (pick 2)">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {SCHED_DAYS.map((d, i) => {
                        const checked = (form.daysOfWeek || []).includes(i);
                        return (
                          <label key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer",
                            padding: "3px 10px", borderRadius: 99, border: "1.5px solid " + (checked ? "#3b82f6" : "#e2e8f0"),
                            background: checked ? "#eff6ff" : "#fff", color: checked ? "#3b82f6" : "#64748b", fontWeight: checked ? 700 : 400 }}>
                            <input type="checkbox" checked={checked} style={{ display: "none" }}
                              onChange={() => {
                                const cur = form.daysOfWeek || [];
                                const next = checked ? cur.filter(x => x !== i) : cur.length < 2 ? [...cur, i].sort((a,b)=>a-b) : cur;
                                setForm(f => ({ ...f, daysOfWeek: next }));
                              }} />
                            {d}
                          </label>
                        );
                      })}
                    </div>
                  </FF>
                )}
                {form.frequency === "monthly" && (
                  <FF label="Day of Month">
                    <select style={sS} value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value) }))}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </FF>
                )}
              </div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Ticket Details</div>
              <FF label="Summary *">
                <input style={iS} placeholder="Ticket summary when auto-created" value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
              </FF>
              <FF label="Description">
                <textarea style={{ ...iS, minHeight: 70, resize: "vertical" }} placeholder="Optional description"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </FF>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                <FF label="Organisation *">
                  <select style={sS} value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value, department: "" }))}>
                    <option value="">-- Select Org --</option>
                    {(orgs || []).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                </FF>
                <FF label="Department">
                  <select style={sS} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">-- Select Dept --</option>
                    {orgDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </FF>
                <FF label="Priority">
                  <select style={sS} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {["Critical","High","Standard","Medium"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </FF>
                <FF label="Category">
                  <select style={sS} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">-- Select Category --</option>
                    {(categories || []).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </FF>
                <FF label="Location">
                  <select style={sS} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                    <option value="">-- Select Location --</option>
                    {(locations || []).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </FF>
                <FF label="Reported By">
                  <input style={iS} value={form.reportedBy}
                    onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))} />
                </FF>
              </div>

              <FF label="Assignees">
                <div style={{ position: "relative" }}>
                  <input style={iS} placeholder="Search to add assignees..." value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    onFocus={() => setShowAssigneeDD(true)}
                    onBlur={() => setTimeout(() => setShowAssigneeDD(false), 200)} />
                  {showAssigneeDD && (
                    <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 200, overflowY: "auto" }}>
                      {(users || []).filter(u => !assigneeSearch || u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                        <div key={u.id} onMouseDown={e => { e.preventDefault(); toggleAssignee(u); }}
                          style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: form.assignees.some(a => a.id === u.id) ? "#eff6ff" : "transparent", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: 13, fontWeight: form.assignees.some(a => a.id === u.id) ? 700 : 400, color: form.assignees.some(a => a.id === u.id) ? "#3b82f6" : "#1e293b" }}>{u.name}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{u.role}</span>
                          {form.assignees.some(a => a.id === u.id) && <span style={{ color: "#3b82f6" }}>&#10003;</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {form.assignees.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {form.assignees.map(a => (
                      <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "#eff6ff", borderRadius: 99, fontSize: 11, fontWeight: 600, color: "#3b82f6" }}>
                        {a.name}
                        <button onClick={() => setForm(f => ({ ...f, assignees: f.assignees.filter(x => x.id !== a.id) }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, lineHeight: 1, padding: 0 }}>&#x2715;</button>
                      </span>
                    ))}
                  </div>
                )}
              </FF>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ ...bG, padding: "9px 18px" }}>Cancel</button>
              <button onClick={save} style={{ ...bP, padding: "9px 18px" }}>{editTask ? "Save Changes" : "Create Task"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsView(props) {
  const {
    currentUser,
    orgs, setOrgs,
    categories, setCategories,
    users, setUsers,
    customAttrs, setCustomAttrs,
    locations, vendors,setVendors,
    departments,
    attrLayout, draftLayout, setDraftLayout,
    settingsTab, setSettingsTab,
    newOrg, setNewOrg,
    newCat, setNewCat,
    newUser, setNewUser,
    newAttr, setNewAttr,
    newLocation, setNewLocation,
    newVendor, setNewVendor,
    newDept, setNewDept,
    newSubcategory, setNewSubcategory,
    newSubcatCatId, setNewSubcatCatId,
    showAddUserModal, setShowAddUserModal,
    showAddVendorModal, setShowAddVendorModal,
    userEditModal, setUserEditModal,
    showAttrLayoutModal, setShowAttrLayoutModal,
    addOrg, deleteOrg,
    addCat, deleteCat, updateCatSubcategories,
    addUser, deleteUser,
    addAttr, deleteAttr, updateAttrLayout, saveLayoutDraft,
    addLocation, deleteLocation,
    addVendor, deleteVendor,
    addDept, deleteDept,
    thStyle, tdStyle,
    // profile tab
    agentUser, setAgentUser,
    passwordForm, setPasswordForm,
    showChangePassword, setShowChangePassword,
    handleProfileUpdate, handlePasswordChange,
    setConfirmModal,
    setCustomAlert,
    agentDetailModal, setAgentDetailModal,
    setProjects,
    PROJECTS_API,
    tickets,
    dashboardOrg,
    handleExport,
    handleSelectiveImport,
    importRef,
} = props;

  const [userStatusFilter, setUserStatusFilter] = React.useState("all");
  const [agentStats, setAgentStats] = React.useState({ assigned: {}, closed: {}, open: {} });
  React.useEffect(() => {
    const fetchStats = () => axios.get(`${BASE_URL}/stats/agents`).then(res => setAgentStats(res.data)).catch(() => {});
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusOpts = [
    { l: "On Duty", c: "#15803d" },
    { l: "On Ticket", c: "#2563eb" },
    { l: "Idle", c: "#d97706" },
    { l: "On Lunch", c: "#7c3aed" },
    { l: "Off Duty", c: "#64748b" },
  ];

  const stabs = currentUser?.role === "Admin" ? [
    { id: "organisations", label: "Orgs & Departments", icon: "" },
    { id: "categories", label: "Categories", icon: "" },
    { id: "locations", label: "Locations", icon: "" },
    { id: "vendors", label: "Vendors", icon: "" },
    { id: "usermgmt", label: "User Management", icon: "" },
    { id: "customattrs", label: "Ticket Form", icon: "" },
    { id: "dbmgmt", label: "Database Mgmt", icon: "" },
    { id: "scheduledtasks", label: "Scheduled Tasks", icon: "" },
  ] : currentUser?.role === "Manager" ? [
    { id: "organisations", label: "Orgs & Departments", icon: "" },
    { id: "categories", label: "Categories", icon: "" },
    { id: "locations", label: "Locations", icon: "" },
    { id: "vendors", label: "Vendors", icon: "" },
    { id: "usermgmt", label: "User Management", icon: "" },
    { id: "customattrs", label: "Ticket Form", icon: "" },
    { id: "scheduledtasks", label: "Scheduled Tasks", icon: "" },
  ] : currentUser?.role === "Agent" ? [
    { id: "profile", label: "My Profile", icon: "" },
  ] : [];

  const [pendingDepartments, setPendingDepartments] = React.useState([]);
  const [orgSort, setOrgSort] = React.useState({});
  const [userSort, setUserSort] = React.useState({});
  const [vendorSort, setVendorSort] = React.useState({});
  const [editingOrgId, setEditingOrgId] = React.useState(null);
  const [editingOrgData, setEditingOrgData] = React.useState({});
  const [editingLocationId, setEditingLocationId] = React.useState(null);
  const [editingLocationName, setEditingLocationName] = React.useState("");
  const [editingVendorId, setEditingVendorId] = React.useState(null);
  const [editingVendorData, setEditingVendorData] = React.useState({});
  const [expandedCatId, setExpandedCatId] = React.useState(null);
  const [targetTable, setTargetTable] = React.useState("tickets");
  const [exportFilterType, setExportFilterType] = React.useState("all");
  const [exportFilterValue, setExportFilterValue] = React.useState("");
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div style={{ width: 194, background: "#faf8f4", borderRadius: 12, padding: 9, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
              {stabs.map(t => (
                <button key={t.id} onClick={() => { setSettingsTab(t.id); setNewSubcategory(""); setNewSubcatCatId(""); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 11px", borderRadius: 7, border: "none", cursor: "pointer", background: settingsTab === t.id ? "#eff6ff" : "transparent", color: settingsTab === t.id ? "#3b82f6" : "#374151", fontSize: 12.5, fontWeight: settingsTab === t.id ? 600 : 400, textAlign: "left", fontFamily: "'DM Sans',sans-serif", marginBottom: 2 }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              {(settingsTab === "organisations" || settingsTab === "departments") && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700 }}>Organizations & Departments</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Each organization expands to show its departments. Drag departments to reorder.</p>

                {currentUser?.role === "Admin" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                    {/* Add Org row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", minWidth: 80 }}>Add Org</span>
                      <input style={{ ...iS, flex: 1 }} placeholder="Name *" value={newOrg.name || ""} onChange={e => setNewOrg({ ...newOrg, name: e.target.value })} />
                      <input style={{ ...iS, flex: 1 }} placeholder="Domain" value={newOrg.domain} onChange={e => setNewOrg({ ...newOrg, domain: e.target.value })} />
                      <input style={{ ...iS, flex: 1 }} placeholder="Phone" value={newOrg.phone} onChange={e => setNewOrg({ ...newOrg, phone: e.target.value })} />
                      <button onClick={addOrg} style={bP}>Add</button>
                    </div>
                    {/* Add Dept row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", minWidth: 80 }}>Add Dept</span>
                      <input style={{ ...iS, flex: 2 }} placeholder="Department name *" value={newDept?.name || ""} onChange={e => setNewDept({ ...newDept, name: e.target.value })} />
                      <select style={{ ...sS, flex: 1 }} value={newDept?.orgName || ""} onChange={e => setNewDept({ ...newDept, orgName: e.target.value })}>
                        <option value="">Select organization *</option>
                        {[...orgs].sort((a, b) => a.name.localeCompare(b.name)).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                      </select>
                      <button onClick={addDept} style={bP}>Add</button>
                    </div>
                  </div>
                ) : <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: Management is restricted to Admins.</div>}

                {pendingDepartments.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <button onClick={async () => {
                      try {
                        const orders = [];
                        const g2 = {};
                        pendingDepartments.forEach(d => { const org = d.orgName || "General"; if (!g2[org]) g2[org] = []; g2[org].push(d); });
                        Object.keys(g2).forEach(org => { g2[org].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); g2[org].forEach((d, i) => orders.push({ id: d.id, orgName: d.orgName, sortOrder: i + 1 })); });
                        await axios.put(`${BASE_URL}/departments/reorder`, { orders });
                        setDepartments(pendingDepartments);
                        setPendingDepartments([]);
                        setCustomAlert({ show: true, message: "Departments updated", type: "success" });
                      } catch { setCustomAlert({ show: true, message: "Failed to save", type: "error" }); }
                    }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Save Changes</button>
                    <button onClick={() => setPendingDepartments([])} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                  </div>
                )}

                {/* Unified table */}
                {(() => {
                  const deptSource = pendingDepartments.length > 0 ? pendingDepartments : departments;
                  const grouped = {};
                  deptSource.forEach(d => { const org = d.orgName || "General"; if (!grouped[org]) grouped[org] = []; grouped[org].push(d); });
                  Object.keys(grouped).forEach(org => grouped[org].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
                  return (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={thStyle}>Organization</th>
                          <th style={thStyle}>Domain</th>
                          <th style={thStyle}>Phone</th>
                          <th style={thStyle}>Departments</th>
                          {currentUser?.role === "Admin" && <th style={thStyle}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {applySort(orgs, orgSort).map(o => {
                          const depts = grouped[o.name] || [];
                          return (
                            <tr key={o.id} className="rh" style={{ verticalAlign: "top" }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                const raw = e.dataTransfer.getData("text/plain");
                                if (!raw) return;
                                const src = JSON.parse(raw);
                                if (src.orgName === o.name) return;
                                const updated = (pendingDepartments.length > 0 ? pendingDepartments : departments).map(d => d.id === src.id ? { ...d, orgName: o.name } : d);
                                setPendingDepartments(updated);
                              }}>
                              <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{o.name}</td>
                                {editingOrgId === o.id ? (
                                  <>
                                    <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingOrgData.domain} onChange={e => setEditingOrgData({ ...editingOrgData, domain: e.target.value })} placeholder="Domain" /></td>
                                    <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingOrgData.phone} onChange={e => setEditingOrgData({ ...editingOrgData, phone: e.target.value })} placeholder="Phone" /></td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{o.domain || "—"}</td>
                                    <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{o.phone || "—"}</td>
                                  </>
                                )}
                              <td style={{ ...tdStyle }}>
                                {depts.length === 0
                                  ? <span style={{ fontSize: 12, color: "#cbd5e1" }}>No departments</span>
                                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                      {[...depts].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((d, idx) => (
                                        <span key={d.id}
                                          draggable={currentUser?.role === "Admin"}
                                          onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", JSON.stringify({ id: d.id, orgName: o.name, idx })); }}
                                          onDragOver={e => e.preventDefault()}
                                          onDrop={e => {
                                            e.preventDefault(); e.stopPropagation();
                                            const raw = e.dataTransfer.getData("text/plain");
                                            if (!raw) return;
                                            const src = JSON.parse(raw);
                                            if (src.orgName !== o.name || src.id === d.id) return;
                                            const grp = [...depts];
                                            const fromIdx = grp.findIndex(x => x.id === src.id);
                                            if (fromIdx === idx) return;
                                            const moved = grp.splice(fromIdx, 1)[0];
                                            grp.splice(idx, 0, moved);
                                            const orders = grp.map((x, i) => ({ id: x.id, sortOrder: i + 1 }));
                                            const updated = (pendingDepartments.length > 0 ? pendingDepartments : departments).map(dep => { const ord = orders.find(x => x.id === dep.id); return ord && dep.orgName === o.name ? { ...dep, sortOrder: ord.sortOrder } : dep; });
                                            setPendingDepartments(updated);
                                          }}
                                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#374151", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "2px 8px", cursor: currentUser?.role === "Admin" ? "grab" : "default", userSelect: "none" }}>
                                          {d.name}
                                          {currentUser?.role === "Admin" && <span onClick={e => { e.stopPropagation(); deleteDept(d.id); }} style={{ color: "#ef4444", cursor: "pointer", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>×</span>}
                                        </span>
                                      ))}
                                    </div>
                                }
                              </td>
                              {currentUser?.role === "Admin" && <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                                {editingOrgId === o.id ? (
                                  <>
                                    <button onClick={() => setEditingOrgId(null)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Cancel</button>
                                    <button onClick={async () => {
                                      try {
                                        const res = await axios.put(`${ORGS_API}/${o.id}`, editingOrgData);
                                        setOrgs(orgs.map(x => x.id === o.id ? { ...x, ...res.data } : x));
                                        setEditingOrgId(null);
                                        setCustomAlert({ show: true, message: "✅ Organisation updated!", type: "success" });
                                      } catch (err) { setCustomAlert({ show: true, message: err.response?.data?.error || "Failed to update organisation", type: "error" }); }
                                    }} style={{ border: "none", background: "#22c55e", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingOrgId(o.id); setEditingOrgData({ domain: o.domain || "", phone: o.phone || "" }); }} style={{ border: "none", background: "#dbeafe", color: "#2563eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Edit</button>
                                    <button onClick={() => deleteOrg(o.id)} style={{ border: "none", background: "none", color: "#ef4444", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                                  </>
                                )}
                              </td>}
                            </tr>
                          );
                        })}
                        {orgs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 28, fontSize: 13 }}>No organizations yet. Add one above.</td></tr>}
                      </tbody>
                    </table>
                  );
                })()}
              </div>}
              {settingsTab === "categories" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700 }}>Categories & Subcategories</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Each category expands to show its subcategories.</p>
                {currentUser?.role === "Admin" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", minWidth: 110 }}>Add Category</span>
                      <input style={{ ...iS, flex: 1 }} placeholder="Category name *" value={newCat.name || ""} onChange={e => setNewCat({ ...newCat, name: e.target.value })} onKeyPress={e => e.key === "Enter" && addCat()} />
                      <button onClick={addCat} style={bP}>Add</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", minWidth: 110 }}>Add Subcategory</span>
                      <input style={{ ...iS, flex: 2 }} placeholder="Subcategory name *" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} onKeyPress={e => { if (e.key === "Enter" && newSubcategory.trim() && newSubcatCatId) { const cat = categories.find(c => c.id === newSubcatCatId); if (cat) { updateCatSubcategories(cat.id, [...(cat.subcategories || []), newSubcategory.trim()]); setNewSubcategory(""); }}}} />
                      <select style={{ ...sS, flex: 1 }} value={newSubcatCatId || ""} onChange={e => setNewSubcatCatId(e.target.value)}>
                        <option value="">Select category *</option>
                        {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                      <button onClick={() => { if (!newSubcategory.trim() || !newSubcatCatId) return; const cat = categories.find(c => String(c.id) === String(newSubcatCatId)); if (cat) { updateCatSubcategories(cat.id, [...(cat.subcategories || []), newSubcategory.trim()]); setNewSubcategory(""); }}} style={bP}>Add</button>
                    </div>
                  </div>
                ) : <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: Category management is restricted to Admins.</div>}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Subcategories</th>
                      <th style={thStyle}>Tickets</th>
                      {currentUser?.role === "Admin" && <th style={thStyle}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...categories].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(c => (
                      <tr key={c.id} className="rh" style={{ verticalAlign: "top" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{expandedCatId === c.id ? <input style={{ ...iS, fontSize: 12, padding: "4px 8px", width: 160 }} value={c.name} onChange={e => setCategories(categories.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} autoFocus /> : c.name}</td>
                        <td style={tdStyle}>
                          {(c.subcategories || []).length === 0
                            ? <span style={{ fontSize: 12, color: "#cbd5e1" }}>None</span>
                            : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {[...(c.subcategories || [])].sort((a, b) => a.localeCompare(b)).map(sub => (
                                  <span key={sub} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0369a1", background: "#e0f2fe", borderRadius: 99, padding: "2px 9px", fontWeight: 500 }}>
                                    {sub}
                                    {currentUser?.role === "Admin" && (
                                      <span onClick={() => setDeleteConfirmation({
                                        show: true,
                                        title: "Delete Subcategory?",
                                        message: `Are you sure you want to delete "${sub}"? All tickets associated with this subcategory will be affected. This action cannot be undone.`,
                                        confirmLabel: "Delete",
                                        confirmDanger: true,
                                        onConfirm: async () => { setDeleteConfirmation({ show: false }); updateCatSubcategories(c.id, (c.subcategories || []).filter(s => s !== sub)); },
                                        onCancel: () => setDeleteConfirmation({ show: false })
                                      })} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 2 }}>×</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                          }
                        </td>
                        <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{(props.tickets || []).filter(t => t.category === c.name && (dashboardOrg === "all" || t.org === dashboardOrg)).length}</td>
                        {currentUser?.role === "Admin" && <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          {expandedCatId === c.id ? (
                            <>
                              <button onClick={async () => {
                                try {
                                  const oldName = categories.find(x => x.id === c.id)?._originalName || c.name;
                                  await axios.put(`${CATEGORIES_API}/${c.id}`, { name: c.name });
                                  setExpandedCatId(null);
                                  // Update tickets in local state to reflect renamed category
                                  setTickets(prev => prev.map(t => t.category === oldName ? { ...t, category: c.name } : t));
                                  setCustomAlert({ show: true, message: "✅ Category updated!", type: "success" });
                                } catch { setCustomAlert({ show: true, message: "Failed to update category", type: "error" }); }
                              }} style={{ border: "none", background: "#22c55e", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 4 }}>Save</button>
                              <button onClick={() => setExpandedCatId(null)} style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setExpandedCatId(c.id);
                                // Store original name so we can propagate rename to tickets
                                setCategories(prev => prev.map(x => x.id === c.id ? { ...x, _originalName: c.name } : x));
                              }} style={{ border: "none", background: "#dbeafe", color: "#2563eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Edit</button>
                              <button onClick={e => { e.stopPropagation(); deleteCat(c.id); }} style={{ border: "none", background: "none", color: "#ef4444", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                            </>
                          )}
                        </td>}
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: 28, fontSize: 13 }}>No categories yet. Add one above.</td></tr>}
                  </tbody>
                </table>
              </div>}

              {/* ✅ NEW: Locations Management */}
              {settingsTab === "locations" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Locations ({locations.length})</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Manage ticket and project locations/venues.</p>
                {currentUser?.role === "Admin" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                    <input
                      style={iS}
                      placeholder="Location name *"
                      value={newLocation?.name || ""}
                      onChange={e => setNewLocation({ name: e.target.value })}
                    />
                    <button onClick={addLocation} style={bP}>Add</button>
                  </div>
                ) : <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: Adding or removing locations is restricted to Admins.</div>}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#f8fafc" }}>
                    <th style={thStyle}>Name</th>
                    {currentUser?.role === "Admin" && <th style={thStyle}></th>}
                  </tr></thead>
                  <tbody>{[...locations].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(l => (
                    <tr key={l.id} className="rh">
                      {editingLocationId === l.id ? (
                        <>
                          <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingLocationName} onChange={e => setEditingLocationName(e.target.value)} /></td>
                          <td style={tdStyle}>
                            <button onClick={() => setEditingLocationId(null)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Cancel</button>
                            <button onClick={async () => {
                              if (!editingLocationName.trim()) { setCustomAlert({ show: true, message: "Location name is required", type: "error" }); return; }
                              try {
                                const oldName = l.name;
                                const res = await axios.put(`${LOCATIONS_API}/${l.id}`, { name: editingLocationName.trim() });
                                setLocations(locations.map(x => x.id === l.id ? res.data : x));
                                setTickets(prev => prev.map(t => t.location === oldName ? { ...t, location: editingLocationName.trim() } : t));
                                setEditingLocationId(null);
                                setCustomAlert({ show: true, message: "✅ Location updated!", type: "success" });
                              } catch (err) { setCustomAlert({ show: true, message: err.response?.data?.error || "Failed to update location", type: "error" }); }
                            }} style={{ border: "none", background: "#22c55e", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tdStyle}><span style={{ fontSize: 13, color: "#1f2937" }}>{l.name}</span></td>
                          {currentUser?.role === "Admin" && <td style={tdStyle}>
                            <button onClick={e => { e.stopPropagation(); setEditingLocationId(l.id); setEditingLocationName(l.name); }} style={{ border: "none", background: "#dbeafe", color: "#2563eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Edit</button>
                            <button onClick={e => { e.stopPropagation(); deleteLocation(l.id); }} style={{ border: "none", background: "none", color: "#ef4444", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                          </td>}
                        </>
                      )}
                    </tr>
                  ))}</tbody>
                </table>
                {locations.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 28 }}>No locations yet. Add one to get started.</div>}
              </div>}

              {settingsTab === "vendors" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Vendors ({vendors.length})</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Manage vendors with contact information for sending tickets.</p>
                {currentUser?.role === "Admin" ? (
                  <div style={{ marginBottom: 18, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowAddVendorModal(true); setNewVendor({ name: "", email: "", phone: "", address: "" }); }} style={{ ...bP, padding: "10px 20px", fontSize: 13, background: "linear-gradient(135deg,#3b82f6,#1e40af)", color: "#fff" }}>+ Add New Vendor</button>
                  </div>
                ) : <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: Adding or removing vendors is restricted to Admins.</div>}

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <FilterableHeader label="Name" field="name" data={vendors} filters={vendorSort} onFilter={setVendorSort} style={thStyle} />
                    <FilterableHeader label="Email" field="email" data={vendors} filters={vendorSort} onFilter={setVendorSort} style={thStyle} />
                    <FilterableHeader label="Phone" field="phone" data={vendors} filters={vendorSort} onFilter={setVendorSort} style={thStyle} />
                    <FilterableHeader label="Address" field="address" data={vendors} filters={vendorSort} onFilter={setVendorSort} style={thStyle} />
                    {currentUser?.role === "Admin" && <th style={thStyle}></th>}
                  </tr></thead>
                  <tbody>{applySort(vendors, vendorSort).map(v => (
                    <tr key={v.id} className="rh">
                      {editingVendorId === v.id ? (
                        <>
                          <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingVendorData.name} onChange={e => setEditingVendorData({ ...editingVendorData, name: e.target.value })} /></td>
                          <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingVendorData.email} onChange={e => setEditingVendorData({ ...editingVendorData, email: e.target.value })} /></td>
                          <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingVendorData.phone} onChange={e => setEditingVendorData({ ...editingVendorData, phone: e.target.value })} /></td>
                          <td style={tdStyle}><input style={{ ...iS, fontSize: 12, padding: "4px 8px" }} value={editingVendorData.address} onChange={e => setEditingVendorData({ ...editingVendorData, address: e.target.value })} /></td>
                          <td style={tdStyle}>
                            <button onClick={() => { setEditingVendorId(null); }} style={{ border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Cancel</button>
                            <button onClick={async () => {
                              if (!editingVendorData.name?.trim()) { setCustomAlert({ show: true, message: "Vendor name is required", type: "error" }); return; }
                              try {
                                const res = await axios.put(`${VENDORS_API}/${v.id}`, editingVendorData);
                                setVendors(vendors.map(x => x.id === v.id ? res.data : x));
                                setEditingVendorId(null);
                                setCustomAlert({ show: true, message: "✅ Vendor updated!", type: "success" });
                              } catch (err) { setCustomAlert({ show: true, message: err.response?.data?.error || "Failed to update vendor", type: "error" }); }
                            }} style={{ border: "none", background: "#22c55e", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tdStyle}><span style={{ fontSize: 13, color: "#1f2937" }}>{v.name}</span></td>
                          <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{v.email || "—"}</td>
                          <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{v.phone || "—"}</td>
                          <td style={{ ...tdStyle, color: "#64748b", fontSize: 12, maxWidth: 200 }}><div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.address || "—"}</div></td>
                          {currentUser?.role === "Admin" && <td style={tdStyle}>
                            <button onClick={() => { setEditingVendorId(v.id); setEditingVendorData({ name: v.name, email: v.email || "", phone: v.phone || "", address: v.address || "" }); }} style={{ border: "none", background: "#dbeafe", color: "#2563eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Edit</button>
                            <button onClick={() => deleteVendor(v.id)} style={{ border: "none", background: "#fee2e2", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete</button>
                          </td>}
                        </>
                      )}
                    </tr>
                  ))}</tbody>
                </table>
                {vendors.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 28 }}>No vendors yet. Add one to get started.</div>}
              </div>}

              {settingsTab === "bin" && false && (
                <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>🧹 Bin</h3>
                  <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Manage deleted tickets and projects. Auto-deleted after 30 days.</p>

                  {/* Tickets bin */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🎫 Tickets ({tickets.filter(t => t.status === "Bin").length})</div>
                    {tickets.filter(t => t.status === "Bin").length === 0 ? (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, background: "#f8fafc", borderRadius: 8 }}>No tickets in bin</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {tickets.filter(t => t.status === "Bin").map(t => {
                          const deletedDate = new Date(t.updatedAt);
                          const daysInBin = Math.floor((new Date() - deletedDate) / (1000 * 60 * 60 * 24));
                          const daysLeft = Math.max(0, 30 - daysInBin);
                          return (
                            <div key={t.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{t.id}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{t.summary}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                  {(() => { const prev = [...(t.timeline || [])].reverse().find(e => e.action === "Moved to Bin"); const match = prev?.note?.match(/Previous status: (.+)/); return match ? `Prev status: ${match[1]}` : ""; })()}
                                </div>
                                <div style={{ fontSize: 11, color: daysLeft === 0 ? "#ef4444" : "#94a3b8", marginTop: 2 }}>
                                  {daysLeft === 0 ? "⚠️ Deleting today" : `🕐 Auto-delete in ${daysLeft} days`}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                                <button onClick={() => setRestoreModal({ show: true, ticket: t, remark: "" })} style={{ padding: "6px 12px", background: "#22c55e", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Restore</button>
                                <button onClick={() => permanentlyDeleteTicket(t.id)} style={{ padding: "6px 12px", background: "#ef4444", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete Now</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Projects bin */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>📁 Projects ({projects.filter(p => p.status === "Bin").length})</div>
                    {projects.filter(p => p.status === "Bin").length === 0 ? (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, background: "#f8fafc", borderRadius: 8 }}>No projects in bin</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {projects.filter(p => p.status === "Bin").map(p => {
                          const deletedDate = new Date(p.updatedAt || p.updated);
                          const daysInBin = Math.floor((new Date() - deletedDate) / (1000 * 60 * 60 * 24));
                          const daysLeft = Math.max(0, 30 - daysInBin);
                          return (
                            <div key={p.id} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.id}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: daysLeft === 0 ? "#ef4444" : "#94a3b8", marginTop: 4 }}>
                                  {daysLeft === 0 ? "⚠️ Deleting today" : `🕐 Auto-delete in ${daysLeft} days`}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                                <button onClick={() => updateProjectStatus(p.id, "Open")} style={{ padding: "6px 12px", background: "#22c55e", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Restore</button>
                                <button onClick={() => { setConfirmModal({ show: true, title: "Delete Project Permanently", message: "This cannot be undone.", confirmLabel: "Delete", confirmDanger: true, onConfirm: async () => { try { await axios.delete(`${PROJECTS_API}/${p.id}`); setProjects(prev => prev.filter(x => x.id !== p.id)); setCustomAlert({ show: true, message: "✅ Project permanently deleted", type: "success" }); } catch(e) { setCustomAlert({ show: true, message: "Failed to delete", type: "error" }); } setConfirmModal({ show: false }); }, onCancel: () => setConfirmModal({ show: false }) }); }} style={{ padding: "6px 12px", background: "#ef4444", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete Now</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsTab === "usermgmt" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>User Management ({users.length} users)</h3>
                {(currentUser?.role === "Admin") ? (
                  <div style={{ marginBottom: 18, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowAddUserModal(true); setNewUser({ name: "", email: "", password: "", role: "Viewer" }); }} style={{ ...bP, padding: "10px 20px", fontSize: 13, background: "linear-gradient(135deg,#3b82f6,#1e40af)", color: "#fff" }}>+ Add New User</button>
                  </div>
                ) : currentUser?.role === "Manager" ? (
                  <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>View Only: Managers can view users but cannot add, delete, or change roles.</div>
                ) : (
                  <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: User management is restricted to Admins.</div>
                )}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { key: "all", label: "All" },
                    { key: "On Duty", label: "On Duty" },
                    { key: "On Ticket", label: "On Ticket" },
                    { key: "Idle", label: "Idle" },
                    { key: "On Lunch", label: "On Lunch" },
                    { key: "off", label: "Off Duty" },
                  ].map(s => (
                    <button key={s.key} onClick={() => setUserStatusFilter(s.key)}
                      style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${userStatusFilter === s.key ? "#3b82f6" : "#e2e8f0"}`, background: userStatusFilter === s.key ? "#eff6ff" : "#fff", color: userStatusFilter === s.key ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: userStatusFilter === s.key ? 700 : 400, cursor: "pointer" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <FilterableHeader label="Name" field="name" data={users} filters={userSort} onFilter={setUserSort} style={thStyle} />
                    <FilterableHeader label="Email" field="email" data={users} filters={userSort} onFilter={setUserSort} style={thStyle} />
                    <FilterableHeader label="Role" field="role" data={users} filters={userSort} onFilter={setUserSort} style={thStyle} />
                    <FilterableHeader label="Status" field="status" data={users} filters={userSort} onFilter={setUserSort} style={thStyle} />
                    <FilterableHeader label="Account" field="active" data={users} filters={userSort} onFilter={setUserSort} style={thStyle} getVal={(row, f) => row.active ? "Activated" : "Deactivated"} />
                    <th style={thStyle}>Assigned</th>
                    <th style={thStyle}>Closed</th>
                    <th style={thStyle}>Open</th>
                    <th style={thStyle}>Rate</th>
                    {(currentUser?.role === "Admin") && <th style={thStyle}>Actions</th>}
                  </tr></thead>
                  <tbody>{applySort(users.filter(u => {
                    if (userStatusFilter === "all") return true;
                    const s = u.status || "Off Duty";
                    if (userStatusFilter === "On Duty") return s === "On Duty" || s === "On Ticket";
                    if (userStatusFilter === "off") return s !== "On Duty" && s !== "On Ticket" && s !== "Idle" && s !== "On Lunch";
                    return s === userStatusFilter;
                  }), userSort).map(u => (
                    <tr key={u.id} className="rh">
                      <td style={tdStyle}><span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span></td>
                      <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>{u.email}</td>
                      <td style={tdStyle}><span style={{ fontSize: 13, color: "#6d28d9", fontWeight: 500 }}>{u.role}</span></td>
                      <td style={tdStyle}>{(() => {
                        const statusValue = u.status || "Off Duty";
                        const sStyle = statusOpts.find(s => s.l === statusValue);
                        return <span style={{ fontSize: 12, color: sStyle?.c || "#f59e0b" }}>{sStyle?.l || "Off Duty"}</span>;
                      })()}</td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: u.active ? "#15803d" : "#ef4444", fontWeight: 500 }}>{u.active ? "Activated" : "Deactivated"}</span></td>
                      <td style={{ ...tdStyle, textAlign: "center", fontSize: 13 }}>{agentStats.assigned[u.name] || 0}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontSize: 13 }}>{agentStats.closed[u.name] || 0}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontSize: 13 }}>{agentStats.open?.[u.name] || 0}</td>
                      {(() => { const assigned = agentStats.assigned[u.name] || 0; const closed = agentStats.closed[u.name] || 0; const rate = assigned ? Math.round(closed / assigned * 100) : 0; return <td style={{ ...tdStyle, fontSize: 12, color: rate > 70 ? "#15803d" : rate > 40 ? "#b45309" : "#b91c1c" }}>{rate}%</td>; })()}
                      {(currentUser?.role === "Admin") && (
                        <td style={tdStyle}><div style={{ display: "flex", gap: 6 }}> 
                          <button onClick={() => { setUserEditModal({ show: true, user: u, newRole: u.role, editName: u.name || "", editEmail: u.email || "", editPhone: u.phone || "", editPassword: "" }); }} style={{ border: "none", background: "#dbeafe", color: "#1e40af", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Manage</button>
                          {u.status === "On Ticket" && (
                            <button onClick={() => setAgentDetailModal({ show: true, user: u })} style={{ border: "none", background: "#cffafe", color: "#0e7490", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Details</button>
                          )}
                        </div></td>
                      )}
                    </tr>
                  ))}</tbody>
                </table>
              </div></div>} 
              {settingsTab === "customattrs" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Ticket Form</h3>
                <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>Add custom fields to the New Ticket form. After adding, configure placement in the layout designer.</p>

                {currentUser?.role === "Admin" ? (
                  <div style={{ marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 10, border: "1.5px solid #e2e8f0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Add New Field</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr auto auto", gap: 8, alignItems: "end" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Field Name *</div>
                        <input style={iS} placeholder="e.g. Serial Number" value={newAttr.name} onChange={e => setNewAttr({ ...newAttr, name: e.target.value })} onKeyDown={e => e.key === "Enter" && addAttr()} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Type</div>
                        <select style={sS} value={newAttr.type} onChange={e => setNewAttr({ ...newAttr, type: e.target.value })}>
                          {["text", "number", "select", "date", "checkbox"].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{newAttr.type === "select" ? "Options (comma-separated)" : <>&nbsp;</>}</div>
                        {newAttr.type === "select"
                          ? <input style={iS} placeholder="Option A, Option B" value={newAttr.options} onChange={e => setNewAttr({ ...newAttr, options: e.target.value })} />
                          : <div style={{ height: 38 }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>&nbsp;</div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, height: 38, fontSize: 13, color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
                          <input type="checkbox" checked={newAttr.required} onChange={e => setNewAttr({ ...newAttr, required: e.target.checked })} style={{ width: 15, height: 15 }} />
                          Required
                        </label>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>&nbsp;</div>
                        <button onClick={addAttr} style={bP}>+ Add Field</button>
                      </div>
                    </div>
                  </div>
                ) : <div style={{ marginBottom: 18, padding: "10px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Read Only: Attribute management is restricted to Admins.</div>}

                {/* Field list */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Fields ({customAttrs.length})</div>
                  {customAttrs.length > 0 && currentUser?.role === "Admin" && (
                    <button onClick={() => { setLayoutDraft([...customAttrs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))); setShowAttrLayoutModal(true); }} style={{ ...bP, padding: "6px 14px", fontSize: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>📐 Edit Layout</button>
                  )}
                </div>

                {customAttrs.length === 0 && (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: 32, background: "#f8fafc", borderRadius: 10, border: "1.5px dashed #e2e8f0" }}>No custom attributes yet. Add one above.</div>
                )}
                {[...customAttrs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(a => {
                  const sectionLabel = a.section === "below-assignees" ? "Below Assignees" : a.section === "bottom" ? "After Description" : "Grid (top)";
                  const sectionColor = a.section === "below-assignees" ? { bg: "#fffbeb", text: "#92400e", border: "#fde68a" } : a.section === "bottom" ? { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" } : { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 9, border: "1.5px solid #f1f5f9", marginBottom: 7, background: "#fafafa" }}>
                      <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, fontWeight: 700, color: "#6366f1" }}>
                        {a.type === "text" ? "Aa" : a.type === "number" ? "#" : a.type === "select" ? "≡" : a.type === "date" ? "📅" : "☑"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}{a.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Type: {a.type}{a.options?.length ? ` · ${a.options.join(", ")}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: sectionColor.bg, color: sectionColor.text, border: `1px solid ${sectionColor.border}`, whiteSpace: "nowrap" }}>{sectionLabel}</span>
                      {currentUser?.role === "Admin" && (
                        <button onClick={() => deleteAttr(a.id)} style={{ border: "none", background: "#fee2e2", color: "#ef4444", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Delete</button>
                      )}
                    </div>
                  );
                })}
              </div>}
              {settingsTab === "dbmgmt" && <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Database Management</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Export and import data from the database.</p>

                {/* Data Type Selection */}
                <div style={{ marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Select Data Type</div>
                  <select
                    value={targetTable}
                    onChange={(e) => { setTargetTable(e.target.value); setExportFilterType("all"); setExportFilterValue(""); }}
                    style={{ ...sS, minWidth: 160, fontSize: 13, padding: "7px 10px" }}
                  >
                    <option value="tickets">Tickets</option>
                    <option value="users">Users</option>
                    <option value="orgs">Organizations</option>
                    <option value="categories">Categories</option>
                    <option value="departments">Departments</option>
                  </select>
                </div>

                {/* Classification/Filter Selection */}
                <div style={{ marginBottom: 18, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Classify/Filter for Export</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <select
                      value={exportFilterType}
                      onChange={(e) => { setExportFilterType(e.target.value); setExportFilterValue(""); }}
                      style={{ ...sS, fontSize: 13, padding: "7px 10px" }}
                    >
                      <option value="all">All Data</option>
                      {targetTable === "tickets" && (
                        <>
                          <option value="assignee">By Assignee</option>
                          <option value="category">By Category</option>
                          <option value="type">By Type (Ticket/Webcast)</option>
                        </>
                      )}
                      {targetTable === "users" && <option value="role">By Role</option>}
                      {targetTable === "orgs" && <option value="domain">By Domain</option>}
                      {targetTable === "categories" && <option value="color">By Color</option>}
                      {targetTable === "departments" && <option value="org">By Organization</option>}
                    </select>

                    {exportFilterType !== "all" && (
                      <select
                        value={exportFilterValue}
                        onChange={(e) => setExportFilterValue(e.target.value)}
                        style={{ ...sS, fontSize: 13, padding: "7px 10px" }}
                      >
                        <option value="">Select {exportFilterType}</option>
                        {exportFilterType === "assignee" && tickets.flatMap(t => t.assignees || []).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                        {exportFilterType === "category" && categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {exportFilterType === "type" && (
                          <>
                            <option value="ticket">Tickets Only</option>
                            <option value="webcast">Webcasts Only</option>
                          </>
                        )}
                        {exportFilterType === "role" && ["Admin", "Manager", "Agent", "Viewer"].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                        {exportFilterType === "domain" && orgs.map(o => (
                          <option key={o.id} value={o.domain}>{o.domain || "No Domain"}</option>
                        ))}
                        {exportFilterType === "color" && categories.map(c => (
                          <option key={c.id} value={c.color} style={{ background: c.color }}>{c.color}</option>
                        ))}
                        {exportFilterType === "org" && [...orgs].sort((a, b) => a.name.localeCompare(b.name)).map(o => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Export/Import Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#f8fafc", borderRadius: 9 }}>
                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    style={{ ...bP, padding: "8px 16px", fontSize: 13, background: "#22c55e", color: "#fff", fontWeight: 600 }}
                  >
                    📥 Export {targetTable}{exportFilterType !== "all" ? ` (${exportFilterType})` : ""}
                  </button>

                  {/* Import Button */}
                  <label style={{ ...bP, padding: "8px 16px", fontSize: 13, background: "#3b82f6", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", fontWeight: 600 }}>
                    📤 Import {targetTable}
                    <input type="file" accept=".csv,.json" onChange={handleSelectiveImport} style={{ display: "none" }} />
                  </label>
                </div>
              </div>}

              {settingsTab === "scheduledtasks" && (
                <ScheduledTasksTab
                  currentUser={currentUser}
                  orgs={orgs} categories={categories} users={users}
                  locations={locations} departments={departments}
                  setCustomAlert={setCustomAlert}
                />
              )}
              {settingsTab === "profile" && currentUser?.role === "Agent" && (
                <div style={{ background: "#faf8f4", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>My Profile</h3>
                  {[
                    { l: "Name", v: currentUser.name },
                    { l: "Email", v: currentUser.email },
                    { l: "Role", v: currentUser.role },
                    { l: "Status", v: currentUser.status || "Off Duty" },
                    { l: "Phone", v: currentUser.phone || "—" },
                  ].map(f => (
                    <div key={f.l} style={{ background: "#fff", padding: "10px 14px", borderRadius: 8, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{f.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{f.v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
  );
}
