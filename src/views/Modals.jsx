import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../constants/api";

import { Modal, FF, Avatar, ConfirmationModal } from "../components/UIComponents";
import { PRIORITIES, STATUSES, PROJECT_STATUSES, PROJECT_PRIORITIES, iS, sS, bP, bG } from "../constants/constants";
/**
 * All application modal dialogs:
 * NewTicket, NewProject, TicketDetail, ProjectDetail,
 * Forward, Vendor, Timeline, Location, Remark/Close,
 * AttrLayout, ActivityLog, SessionHistory, AddUser, AddVendor.
 */
function WebcastFields({ f, setF, isProject, categories, locations }) {
  const webcastCat = (categories || []).find(c => c.name === "Webcast");
  const subcategories = webcastCat?.subcategories || [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Sub Category <span style={{ color: "#ef4444" }}>*</span></label>
        <select style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13 }}
          value={f.satsangType || ""} onChange={e => setF({ ...f, satsangType: e.target.value })}>
          <option value="">Select sub category…</option>
          {subcategories.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Location <span style={{ color: "#ef4444" }}>*</span></label>
        <select style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13 }}
          value={f.location || ""} onChange={e => setF({ ...f, location: e.target.value })}>
          <option value="">Select location…</option>
          {(locations || []).map(l => <option key={l.id || l.name} value={l.name}>{l.name}</option>)}
        </select>
      </div>
    </div>
  );
}
export function Modals(props) {
  const {
    // shared
    currentUser, users, orgs, categories, locations, vendors, customAttrs,
    tickets, projects,
    thStyle, tdStyle,
    isTrueWebcast,

    // new ticket modal
    showNewTicket, setShowNewTicket,
    form, setForm,
    handleSubmit,
    showDepartmentDD, setShowDepartmentDD,
    showCategoryDD, setShowCategoryDD,
    showLocationDD, setShowLocationDD,
    showAssigneeDD, setShowAssigneeDD,
    assigneeSearch, setAssigneeSearch,
    departments,

    // new project modal
    showNewProject, setShowNewProject,
    projForm, setProjForm,
    handleProjectSubmit,
    showProjCategoryDD, setShowProjCategoryDD,
    showProjAssigneeDD, setShowProjAssigneeDD,

    // ticket detail / edit
    selTicket, setSelTicket,
    ticketEditMode, setTicketEditMode,
    editForm, setEditForm,
    handleTicketEditSave,
    addCC, showTicketAssigneeDD, setShowTicketAssigneeDD,

    // project detail
    selProject, setSelProject,
    projEditMode, setProjEditMode,
    editProjForm, setEditProjForm,
    handleProjectEditSave,
    addProjCC,

    // forward
    showForward, setShowForward,
    selectedForwardAgent, setSelectedForwardAgent,
    forwardNote, setForwardNote,
    showForwardAgentDD, setShowForwardAgentDD,
    handleForward,
    handleForwardTicket,

    // vendor / repair
    showVendor, setShowVendor,
    vendorReturnNote, setVendorReturnNote,
    vendorReturnOutcome, setVendorReturnOutcome,
    handleSendForRepair, handleVendorReturn,

    // timeline
    showTimelineView, setShowTimelineView,
    showProjTimelineView, setShowProjTimelineView,

    // location modal
    showLocationModal, setShowLocationModal,
    showTicketDropdown, setShowTicketDropdown,
    updateStatusDirect,

    // remark/close
    showRemarkModal, setShowRemarkModal,
    closingTicketId, isReopenModal, setIsReopenModal, ticketRemark, setTicketRemark,
    pendingTicketStatus, setPendingTicketStatus, closedBy, setClosedBy, closedDate, setClosedDate, minutes,
    updateStatus,

    // attr layout
    showAttrLayoutModal, setShowAttrLayoutModal,
    draftLayout, setDraftLayout,
    saveLayoutDraft, updateAttrLayout,

    // activity log
    showActivityLog, setShowActivityLog,
    // session history
    showSessionHistory, setShowSessionHistory,

    // add user / vendor (in settings but rendered here)
    showAddUserModal, setShowAddUserModal,
    newUser, setNewUser, addUser,
    showAddVendorModal, setShowAddVendorModal,
    newVendor, setNewVendor, addVendor,

    // confirmation
    showConfirmation, setShowConfirmation,
    confirmationConfig,
    setConfirmModal,

    // print
    printFrameRef,

    // image attachments
    ticketImage, setTicketImage,
    ticketImagePreview, setTicketImagePreview,
    commentImage, setCommentImage,
    commentImagePreview, setCommentImagePreview,

    // comments
    newComment, setNewComment,
    newProjComment, setNewProjComment,
    commentVisibility, setCommentVisibility,

    // toasts
    toasts,

    // floating alerts
    floatingAlerts, setFloatingAlerts,
    inboxItems,
    acceptInboxForwardRequest,
    rejectInboxForwardRequest,

    // profile modals
    activityLogs,
    sessionHistory,

    // bin modals
    restoreModal, setRestoreModal,
    agentDetailModal, setAgentDetailModal,

    // ticket detail internal state
    editMode, setEditMode,
    editTicket, setEditTicket,
    editProjMode, setEditProjMode,
    editProject, setEditProject,
    fwdTargetAgent, setFwdTargetAgent,
    fwdReason, setFwdReason,
    vendorName, setVendorName,
    vendorEmail, setVendorEmail,
    showVendorReturn, setShowVendorReturn,
    timelineTab, setTimelineTab,
    closeTicketWithRemark,
    compressImage,
    toggleAssignee,
    showToast,
    addDailyNotif,
    setCustomAlert,
    PRIORITY_COLOR, STATUS_COLOR, Badge,
    STATUSES,
    TICKETS_API, PROJECTS_API, NOTIFICATIONS_API,
    ProgressBar,
    getProgressFromStatus,
    selAgent,
    currentTicketId, setCurrentTicketId,
    currentLocation, setCurrentLocation,
    USERS_API,
    setUsers, setTickets, setProjects,
  } = props;
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [projCategorySearch, setProjCategorySearch] = useState("");
  const [forwardAgentSearch, setForwardAgentSearch] = useState("");
  const [layoutDragOver, setLayoutDragOver] = useState(null);
  const [layoutDragIdx, setLayoutDragIdx] = useState(null);
  const projectCategories = categories || [];

  return (
    <>

      <Modal open={showNewTicket} onClose={() => { setShowNewTicket(false); setShowAssigneeDD(false); }} title="Create New Ticket" width={700}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
          <FF label="Organization" required><select style={sS} value={form.org} onChange={e => setForm({ ...form, org: e.target.value, department: "" })}><option value="">Select…</option>{orgs.map(o => <option key={o.id}>{o.name}</option>)}</select></FF>
          <FF label="Department">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder={form.org ? "Search department..." : "Select org first..."} value={departmentSearch ? departmentSearch : (form.department || "")} onChange={e => setDepartmentSearch(e.target.value)} onFocus={() => { setDepartmentSearch(""); setShowDepartmentDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showDepartmentDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowDepartmentDD(false); setDepartmentSearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 240, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search departments..." value={departmentSearch} onChange={e => setDepartmentSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {(() => {
                    const filtered = departments.filter(d =>
                      (!form.org || d.orgName === form.org) &&
                      (departmentSearch === "" || d.name.toLowerCase().includes(departmentSearch.toLowerCase()))
                    ).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                    if (filtered.length === 0) return <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>{form.org ? "No departments for this org" : "Select an org to filter departments"}</div>;
                    return filtered.map(d => (
                      <div key={d.id} onClick={() => { setForm({ ...form, department: d.name }); setShowDepartmentDD(false); setDepartmentSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                        {!form.org && <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.orgName}</div>}
                      </div>
                    ));
                  })()}
                </div>
              </>}
            </div>
          </FF>
          <FF label="POC(Point of Contact from Dept)"><input style={iS} placeholder="Ticket Requestor" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></FF>
          <FF label="Reported By (from Dept)"><input style={iS} placeholder="Who is raising this ticket?" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} /></FF>
          <FF label="Priority" required><select style={sS} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="">Select Priority…</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></FF>
          <FF label="Category" required>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search category..." value={categorySearch ? categorySearch : (form.category ? categories.find(c => c.name === form.category)?.name || "" : "")} onChange={e => setCategorySearch(e.target.value)} onFocus={() => { setCategorySearch(""); setShowCategoryDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showCategoryDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowCategoryDD(false); setCategorySearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search categories..." value={categorySearch} onChange={e => setCategorySearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {categories.filter(c => categorySearch === "" || c.name.toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                    <div key={c.id} onClick={() => { setForm({ ...form, category: c.name, subcategory: "" }); setShowCategoryDD(false); setCategorySearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                      </div>
                    </div>
                  ))}
                  {categories.filter(c => categorySearch === "" || c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No categories found</div>}
                </div>
              </>}
            </div>
          </FF>
          {(() => {
            const selCat = categories.find(c => c.name === form.category);
            if (!selCat || form.category === "Webcast") return null;
            const subs = selCat.subcategories || [];
            if (subs.length === 0) return null;
            return (
              <FF label="Sub Category">
                <select style={sS} value={form.subcategory || ""} onChange={e => setForm({ ...form, subcategory: e.target.value })}>
                  <option value="">Select Sub Category…</option>
                  {subs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FF>
            );
          })()}
          <FF label="Location / Venue">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search location..." value={locationSearch ? locationSearch : (form.location ? locations.find(l => l.name === form.location)?.name || "" : "")} onChange={e => setLocationSearch(e.target.value)} onFocus={() => { setLocationSearch(""); setShowLocationDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showLocationDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowLocationDD(false); setLocationSearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search locations..." value={locationSearch} onChange={e => setLocationSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {locations.filter(l => locationSearch === "" || l.name.toLowerCase().includes(locationSearch.toLowerCase())).map(l => (
                    <div key={l.id} onClick={() => { setForm({ ...form, location: l.name }); setShowLocationDD(false); setLocationSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</div>
                    </div>
                  ))}
                  {locations.filter(l => locationSearch === "" || l.name.toLowerCase().includes(locationSearch.toLowerCase())).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No locations found</div>}
                </div>
              </>}
            </div>
          </FF>
          <FF label="Due Date"><input type="date" style={iS} value={form.dueDate || ""} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></FF>
          {/* ── Custom Fields: Grid section (top area, inside 2-col grid) ── */}
          {customAttrs.filter(a => (a.section || "grid") === "grid").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(a => (
            <FF key={a.id} label={a.name} required={a.required}>
              {a.type === "select"
                ? <select style={sS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })}><option value="">Select…</option>{a.options?.map(o => <option key={o}>{o}</option>)}</select>
                : a.type === "checkbox"
                  ? <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><input type="checkbox" checked={!!form.customAttrs[a.name]} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.checked } })} />{a.name}</label>
                  : <input type={a.type === "date" ? "date" : "text"} style={iS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })} />}
            </FF>
          ))}
        </div>
        <FF label="Assignees">
          {(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? (
            <div style={{ position: "relative" }}>
              <div onClick={() => setShowAssigneeDD(!showAssigneeDD)} style={{ ...iS, cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, padding: form.assignees.length ? "6px 10px" : "9px 12px" }}>
                {!form.assignees.length && <span style={{ color: "#94a3b8" }}>Click to assign agents…</span>}
                {form.assignees.map(a => <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px 2px 3px", background: "#dbeafe", color: "#1d4ed8", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                  <Avatar name={a.name} size={17} />{a.name.split(" ")[0]}<span onClick={e => { e.stopPropagation(); toggleAssignee(a); }} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 2 }}>×</span>
                </span>)}
                <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 11 }}>▾</span>
              </div>
              {showAssigneeDD && <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                <div style={{ padding: 7, borderBottom: "1px solid #f1f5f9" }}><input style={{ ...iS, fontSize: 13 }} placeholder="Search agents…" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus /></div>
                {users.filter(u => u.active && u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => {
                  const sel = form.assignees.find(a => a.id === u.id); return (
                    <div key={u.id} onClick={() => { toggleAssignee(u); setShowAssigneeDD(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 13px", cursor: "pointer", background: sel ? "#eff6ff" : "#fff" }}>
                      <Avatar name={u.name} size={26} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div></div>
                      {sel && <span style={{ color: "#3b82f6", fontWeight: 700 }}>✓</span>}
                    </div>);
                })}
              </div>}
            </div>
          ) : (
            <div style={{ padding: "10px 12px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, color: "#1d4ed8", fontSize: 13 }}>
              Only Admins and Managers can assign users. Please create the ticket first, then assign users in ticket details.
            </div>
          )}
        </FF>
        {/* ── Custom Fields: Below Assignees section ── */}
        {customAttrs.filter(a => (a.section || "grid") === "below-assignees").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
            {customAttrs.filter(a => (a.section || "grid") === "below-assignees").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(a => (
              <FF key={a.id} label={a.name} required={a.required}>
                {a.type === "select"
                  ? <select style={sS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })}><option value="">Select…</option>{a.options?.map(o => <option key={o}>{o}</option>)}</select>
                  : a.type === "checkbox"
                    ? <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><input type="checkbox" checked={!!form.customAttrs[a.name]} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.checked } })} />{a.name}</label>
                    : <input type={a.type === "date" ? "date" : "text"} style={iS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })} />}
              </FF>
            ))}
          </div>
        )}
        {form.category === "Webcast" && <WebcastFields f={form} setF={setForm} isProject={false} categories={categories} locations={locations} />}
        <FF label="Summary" required><input style={iS} placeholder="Brief description of the issue" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></FF>
        <FF label="Description" required><textarea style={{ ...iS, height: 88, resize: "vertical" }} placeholder="Detailed description…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FF>
        {/* Attachment: Image */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"} onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}>
              📷 Add Image
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    compressImage(file, (compressed) => {
                      setTicketImage(compressed);
                      setTicketImagePreview(compressed);
                    });
                  }
                }}
              />
            </label>
            {ticketImagePreview && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={ticketImagePreview} style={{ height: 42, width: 42, objectFit: "cover", borderRadius: 8, border: "1.5px solid #e2e8f0" }} alt="preview" />
                <button onClick={() => { setTicketImage(null); setTicketImagePreview(null); }} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>×</button>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Attach an image to the ticket description (Max 1)</div>
          </div>
        </div>
        {customAttrs.filter(a => (a.section || "grid") === "bottom").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9, marginTop: 4 }}>Custom Fields</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
              {customAttrs.filter(a => (a.section || "grid") === "bottom").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(a => (
                <FF key={a.id} label={a.name} required={a.required}>
                  {a.type === "select"
                    ? <select style={sS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })}><option value="">Select…</option>{a.options?.map(o => <option key={o}>{o}</option>)}</select>
                    : a.type === "checkbox"
                      ? <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><input type="checkbox" checked={!!form.customAttrs[a.name]} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.checked } })} />{a.name}</label>
                      : <input type={a.type === "date" ? "date" : "text"} style={iS} value={form.customAttrs[a.name] || ""} onChange={e => setForm({ ...form, customAttrs: { ...form.customAttrs, [a.name]: e.target.value } })} />}
                </FF>
              ))}
            </div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 6 }}>
          <button onClick={() => { setShowNewTicket(false); setShowAssigneeDD(false); }} style={bG}>Cancel</button>
          <button onClick={handleSubmit} style={bP}>Create Ticket</button>
        </div>
      </Modal>

      {/* ── NEW PROJECT MODAL ── */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="Create New Project" width={700}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
          <FF label="Organization" required><select style={sS} value={projForm.org} onChange={e => setProjForm({ ...projForm, org: e.target.value, department: "" })}><option value="">Select…</option>{orgs.map(o => <option key={o.id}>{o.name}</option>)}</select></FF>
          <FF label="Department">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder={projForm.org ? "Search department..." : "Select org first..."} value={departmentSearch ? departmentSearch : (projForm.department || "")} onChange={e => setDepartmentSearch(e.target.value)} onFocus={() => { setDepartmentSearch(""); setShowDepartmentDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showDepartmentDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowDepartmentDD(false); setDepartmentSearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 240, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search departments..." value={departmentSearch} onChange={e => setDepartmentSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {(() => {
                    const filtered = departments.filter(d =>
                      (!projForm.org || d.orgName === projForm.org) &&
                      (departmentSearch === "" || d.name.toLowerCase().includes(departmentSearch.toLowerCase()))
                    ).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                    if (filtered.length === 0) return <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>{projForm.org ? "No departments for this org" : "Select an org to filter departments"}</div>;
                    return filtered.map(d => (
                      <div key={d.id} onClick={() => { setProjForm({ ...projForm, department: d.name }); setShowDepartmentDD(false); setDepartmentSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                        {!projForm.org && <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.orgName}</div>}
                      </div>
                    ));
                  })()}
                </div>
              </>}
            </div>
          </FF>
          <FF label="Reported By (from Dept)"><input style={iS} value={projForm.reportedBy} onChange={e => setProjForm({ ...projForm, reportedBy: e.target.value })} /></FF>
          <FF label="Priority"><select style={sS} value={projForm.priority} onChange={e => setProjForm({ ...projForm, priority: e.target.value })}>{PROJECT_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></FF>
          <FF label="Category">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search category..." value={projCategorySearch ? projCategorySearch : (projForm.category ? projectCategories.find(c => c.name === projForm.category)?.name || "" : "")} onChange={e => setProjCategorySearch(e.target.value)} onFocus={() => { setProjCategorySearch(""); setShowProjCategoryDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showProjCategoryDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowProjCategoryDD(false); setProjCategorySearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search categories..." value={projCategorySearch} onChange={e => setProjCategorySearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {projectCategories.filter(c => projCategorySearch === "" || c.name.toLowerCase().includes(projCategorySearch.toLowerCase())).map(c => (
                    <div key={c.id} onClick={() => { setProjForm({ ...projForm, category: c.name }); setShowProjCategoryDD(false); setProjCategorySearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                      </div>
                    </div>
                  ))}
                  {projectCategories.filter(c => projCategorySearch === "" || c.name.toLowerCase().includes(projCategorySearch.toLowerCase())).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No categories found</div>}
                </div>
              </>}
            </div>
          </FF>
          <FF label="Location">
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search location..." value={locationSearch ? locationSearch : (projForm.location ? locations.find(l => l.name === projForm.location)?.name || "" : "")} onChange={e => setLocationSearch(e.target.value)} onFocus={() => { setLocationSearch(""); setShowLocationDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
              {showLocationDD && <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowLocationDD(false); setLocationSearch(""); }} />
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                    <input type="text" placeholder="Search locations..." value={locationSearch} onChange={e => setLocationSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  {locations.filter(l => locationSearch === "" || l.name.toLowerCase().includes(locationSearch.toLowerCase())).map(l => (
                    <div key={l.id} onClick={() => { setProjForm({ ...projForm, location: l.name }); setShowLocationDD(false); setLocationSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</div>
                    </div>
                  ))}
                  {locations.filter(l => locationSearch === "" || l.name.toLowerCase().includes(locationSearch.toLowerCase())).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No locations found</div>}
                </div>
              </>}
            </div>
          </FF>
          <FF label="Due Date"><input type="date" style={iS} value={projForm.dueDate} onChange={e => setProjForm({ ...projForm, dueDate: e.target.value })} /></FF>
        </div>
        <FF label="Assignees">
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowAssigneeDD(!showAssigneeDD)} style={{ ...iS, cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, padding: projForm.assignees.length ? "6px 10px" : "9px 12px" }}>
              {!projForm.assignees.length && <span style={{ color: "#94a3b8" }}>Click to assign users…</span>}
              {projForm.assignees.map(a => <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px 2px 3px", background: "#f5f3ff", color: "#6d28d9", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                <Avatar name={a.name} size={17} />{a.name.split(" ")[0]}<span onClick={e => { e.stopPropagation(); setProjForm({ ...projForm, assignees: projForm.assignees.filter(x => x.id !== a.id) }); }} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 2 }}>×</span>
              </span>)}
              <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 11 }}>▾</span>
            </div>
            {showAssigneeDD && <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", maxHeight: 300, overflowY: "auto" }}>
              <div style={{ padding: 7, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}><input style={{ ...iS, fontSize: 13 }} placeholder="Search users…" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus /></div>
              {users.filter(u => u.active && u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => {
                const sel = projForm.assignees.find(a => a.id === u.id); return (
                  <div key={u.id} onClick={() => { setProjForm({ ...projForm, assignees: sel ? projForm.assignees.filter(a => a.id !== u.id) : [...projForm.assignees, u] }); setShowAssigneeDD(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 13px", cursor: "pointer", background: sel ? "#eff6ff" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
                    <Avatar name={u.name} size={26} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div></div>
                    {sel && <span style={{ color: "#8b5cf6", fontWeight: 700 }}>✓</span>}
                  </div>);
              })}
            </div>}
          </div>
        </FF>
        {projForm.category === "Webcast" && <WebcastFields f={projForm} setF={setProjForm} isProject={true} categories={categories} locations={locations} />}
        <FF label="Project Title" required><input style={iS} placeholder="Brief project name" value={projForm.title} onChange={e => setProjForm({ ...projForm, title: e.target.value })} /></FF>
        <FF label="Description" required><textarea style={{ ...iS, height: 88, resize: "vertical" }} placeholder="Detailed description…" value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} /></FF>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 6 }}>
          <button onClick={() => setShowNewProject(false)} style={bG}>Cancel</button>
          <button onClick={handleProjectSubmit} style={{ ...bP, background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>Create Project</button>
        </div>
      </Modal>

      {/* ── TICKET DETAIL MODAL (v1 full - timeline, forward, custom attrs, vendor) ── */}
      <Modal open={!!selTicket} onClose={() => { setSelTicket(null); setPendingTicketStatus(null); setShowForward(false); setFwdReason(""); setEditMode(false); setEditTicket(null); setCommentVisibility("external"); }} title={selTicket?.id || ""} width={720}>
        {selTicket && <div>
          {/* Edit/View Toggle Button - Admin/Manager Only */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            {(currentUser?.role === "Admin" || currentUser?.role === "Manager") && !editMode && (
              <button onClick={() => { setEditMode(true); setEditTicket({ ...selTicket }); }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: "#3b82f6", color: "#fff" }}>Edit Ticket</button>
            )}
            {editMode && (
              <>
                <button onClick={() => { setEditMode(false); setEditTicket(null); }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#64748b" }}>Cancel</button>
                <button onClick={async () => {
                  const missing = [];
                  if (!editTicket.summary?.trim()) missing.push("Summary");
                  if (!editTicket.description?.trim()) missing.push("Description");
                  if (!editTicket.org?.trim()) missing.push("Organization");
                  if (!editTicket.priority) missing.push("Priority");
                  if (!editTicket.category) missing.push("Category");
                  if (missing.length > 0) { showToast(`Required: ${missing.join(", ")}`, "error"); return; }                  
                  try { await axios.put(`${TICKETS_API}/${selTicket.id}`, { ...editTicket, updated: new Date().toISOString() }); setTickets(t => t.map(x => x.id === selTicket.id ? { ...editTicket, updated: new Date() } : x)); setSelTicket(editTicket); setEditMode(false); setEditTicket(null); showToast("Ticket updated successfully ✓", "success"); addDailyNotif({ type: "ticket_edited", icon: "", text: `${currentUser.name} edited ticket ${selTicket.id}`, ticketId: selTicket.id, by: currentUser.name }); } catch (e) { showToast("Failed to save ticket", "error"); }
                }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: "#22c55e", color: "#fff" }}>💾 Save Changes</button>              </>
            )}
          </div>

          {editMode && editTicket ? (
            /* ── EDIT MODE ── */
            <>
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Summary *</label>
                <input type="text" value={editTicket.summary} onChange={e => setEditTicket({ ...editTicket, summary: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Description <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea value={editTicket.description || ""} onChange={e => setEditTicket({ ...editTicket, description: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13, height: 100, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Organization *</label>
                  <select value={editTicket.org} onChange={e => setEditTicket({ ...editTicket, org: e.target.value, department: "" })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    <option value="">Select…</option>
                    {orgs.map(o => <option key={o.id}>{o.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Department</label>
                  <select value={editTicket.department} onChange={e => setEditTicket({ ...editTicket, department: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    <option value="">Select…</option>
                    {departments.filter(d => !editTicket.org || d.orgName === editTicket.org).map(d => <option key={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Contact</label>
                  <input type="text" value={editTicket.contact} onChange={e => setEditTicket({ ...editTicket, contact: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Reported By</label>
                  <input type="text" value={editTicket.reportedBy} onChange={e => setEditTicket({ ...editTicket, reportedBy: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Category <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={editTicket.category} onChange={e => setEditTicket({ ...editTicket, category: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    <option value="">Select…</option>
                    {categories.map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {(() => {
                  const selCat = categories.find(c => c.name === editTicket.category);
                  if (!selCat) return null;
                  const subs = selCat.subcategories || [];
                  if (subs.length === 0) return null;
                  const isWebcastCat = editTicket.category === "Webcast";
                  const label = "Sub Category" + (isWebcastCat ? " *" : "");
                  const value = isWebcastCat ? (editTicket.satsangType || "") : (editTicket.subcategory || "");
                  const onChange = isWebcastCat
                    ? e => setEditTicket({ ...editTicket, satsangType: e.target.value })
                    : e => setEditTicket({ ...editTicket, subcategory: e.target.value });
                  return (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>
                      <select value={value} onChange={onChange} style={{ ...iS, width: "100%", fontSize: 13 }}>
                        <option value="">Select Sub Category…</option>
                        {subs.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  );
                })()}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Location</label>
                  <select value={editTicket.location || ""} onChange={e => setEditTicket({ ...editTicket, location: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    <option value="">Select…</option>
                    {locations.map(l => <option key={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Priority <span style={{ color: "#ef4444" }}>*</span></label>                  <select value={editTicket.priority} onChange={e => setEditTicket({ ...editTicket, priority: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Due Date</label>
                  <input type="date" value={editTicket.dueDate ? new Date(editTicket.dueDate).toISOString().split('T')[0] : ""} onChange={e => setEditTicket({ ...editTicket, dueDate: e.target.value ? new Date(e.target.value).toISOString() : "" })} style={{ ...iS, width: "100%", fontSize: 13 }} />
                </div>
              </div>
            </div>
            {/* Attachment management */}
            <div style={{ marginTop: 14, padding: "11px 13px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Attachment</div>
              {editTicket.image ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <img src={editTicket.image} style={{ height: 48, width: 48, objectFit: "cover", borderRadius: 7, border: "1px solid #e2e8f0" }} alt="current" />
                  <label style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 6, border: "1.5px dashed #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    🔄 Replace
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) compressImage(file, compressed => setEditTicket({ ...editTicket, image: compressed })); }} />
                  </label>
                  <button onClick={() => setEditTicket({ ...editTicket, image: null })} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑 Remove</button>
                </div>
              ) : (
                <label style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 6, border: "1.5px dashed #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  📷 Add Image
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) compressImage(file, compressed => setEditTicket({ ...editTicket, image: compressed })); }} />
                </label>
              )}
            </div>
            {customAttrs && customAttrs.length > 0 && (
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {customAttrs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(a => {
                  const val = (editTicket.customAttrs || {})[a.name];
                  return (
                    <div key={a.id}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                        {a.name}{a.required && <span style={{ color: "#ef4444" }}> *</span>}
                      </label>
                      {a.type === "select"
                        ? <select style={{ ...iS, width: "100%", fontSize: 13 }} value={val || ""} onChange={e => setEditTicket({ ...editTicket, customAttrs: { ...(editTicket.customAttrs || {}), [a.name]: e.target.value } })}>
                            <option value="">Select…</option>
                            {(a.options || []).map(o => <option key={o}>{o}</option>)}
                          </select>
                        : a.type === "checkbox"
                          ? <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                              <input type="checkbox" checked={!!val} onChange={e => setEditTicket({ ...editTicket, customAttrs: { ...(editTicket.customAttrs || {}), [a.name]: e.target.checked } })} />
                              {a.name}
                            </label>
                          : <input type={a.type === "date" ? "date" : "text"} style={{ ...iS, width: "100%", fontSize: 13 }} value={val || ""} onChange={e => setEditTicket({ ...editTicket, customAttrs: { ...(editTicket.customAttrs || {}), [a.name]: e.target.value } })} />
                      }
                    </div>
                  );
                })}
              </div>
            )}
            </>
          ) : (
            /* ── VIEW MODE ── */
            <div>
              <div style={{ display: "flex", gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
                <Badge label={selTicket.status} style={{ ...STATUS_COLOR[selTicket.status], padding: "4px 12px", fontSize: 12 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: PRIORITY_COLOR[selTicket.priority] }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{selTicket.priority} Priority</span></div>
                {selTicket.category === "Webcast" && <Badge label="📡 Webcast" style={{ background: "#fff7ed", color: "#f97316" }} />}
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Created {new Date(selTicket.created).toLocaleString()}</span>
              </div>
              <h2 style={{ margin: "0 0 9px", fontSize: 17, fontWeight: 700, color: "#1e293b" }}>
                {selTicket.summary}
              </h2>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
                {selTicket.description}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
                {[
                  { l: "Organization", v: selTicket.org },
                  { l: "Department", v: selTicket.department || "—" },
                  { l: "POC (Point of Contact)", v: selTicket.contact || "—" },
                  { l: "Reported By", v: selTicket.reportedBy || "—" },
                  { l: "Category", v: selTicket.category || "—" },
                  ...(selTicket.category === "Webcast" && selTicket.satsangType
                    ? [{ l: "Sub Category", v: selTicket.satsangType }]
                    : selTicket.subcategory
                      ? [{ l: "Sub Category", v: selTicket.subcategory }]
                      : []),
                  { l: "Location", v: selTicket.location || "—" },
                  { l: "Due Date", v: selTicket.dueDate ? new Date(selTicket.dueDate).toLocaleDateString() : "—" },
                  { l: "Priority", v: selTicket.priority },
                  ...(selTicket.status === "Closed" ? [
                    { l: "Closed Date", v: selTicket.closedAt ? new Date(selTicket.closedAt).toLocaleDateString() : ((() => { const e = (selTicket.timeline||[]).slice().reverse().find(e=>e.action?.includes("Status changed to Closed")); return e?.date ? new Date(e.date).toLocaleDateString() : "—"; })()) },
                    { l: "Closed By", v: selTicket.closedBy || "—" }
                    ] : [])
                ].map(f => (
                  <div key={f.l} style={{ background: "#f8fafc", padding: "9px 13px", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{f.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!editMode && selTicket.customAttrs && Object.keys(typeof selTicket.customAttrs === "string" ? JSON.parse(selTicket.customAttrs) : selTicket.customAttrs).length > 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
            {Object.entries(typeof selTicket.customAttrs === "string" ? JSON.parse(selTicket.customAttrs) : selTicket.customAttrs).map(([k, v]) => <div key={k} style={{ background: "#f8fafc", padding: "9px 13px", borderRadius: 9}}><div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 500 }}>{String(v) || "-"}</div></div>)}
          </div>}
          <div style={{ marginBottom: 14, padding: "11px 13px", background: "#f8fafc", borderRadius: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 7 }}>Assignees</div>
            {(currentUser?.role === "Admin" || currentUser?.role === "Manager") && editMode ? (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                  {(Array.isArray(editTicket?.assignees) ? editTicket.assignees : []).map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#dbeafe", padding: "5px 9px", borderRadius: 7, border: "1px solid #bfdbfe" }}><Avatar name={a.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{a.role}</div></div><span onClick={() => setEditTicket(prev => prev ? { ...prev, assignees: (prev.assignees || []).filter(x => x.id !== a.id) } : prev)} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 4, color: "#ef4444" }}>×</span></div>)}
                  {!editTicket?.assignees?.length && <span style={{ fontSize: 13, color: "#94a3b8" }}>Unassigned</span>}
                </div>
                {(editTicket?.assignees?.length || 0) >= 1

                  ? <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Remove current assignee to assign a different one.</div>
                  : <div style={{ position: "relative" }}>
                  <input type="text" placeholder="Add assignee..." value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onFocus={() => { setAssigneeSearch(""); setShowTicketAssigneeDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
                  {showTicketAssigneeDD && <><div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowTicketAssigneeDD(false); setAssigneeSearch(""); }} />
                    <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                      <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                        <input type="text" placeholder="Search assignees..." value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                      </div>
                      {users.filter(u => u.active != false && (assigneeSearch === "" || u.name.toLowerCase().includes(assigneeSearch.toLowerCase())) && !editTicket?.assignees?.find(a => a.id === u.id || String(a.id) === String(u.id))).map(u => (
                        <div key={u.id} onClick={async () => { if (editMode) { setEditTicket(prev => prev ? { ...prev, assignees: [u] } : prev); setAssigneeSearch(""); setShowTicketAssigneeDD(false); return; } const updated = { ...selTicket, assignees: [u], updated: new Date().toISOString() }; try { const apiUrl = isTrueWebcast(selTicket) ? `${BASE_URL}/webcasts/${selTicket.id}` : `${TICKETS_API}/${selTicket.id}`; await axios.put(apiUrl, updated); setTickets(t => t.map(x => x.id === selTicket.id ? { ...updated, updated: new Date(updated.updated) } : x)); setSelTicket(updated); setAssigneeSearch(""); setShowTicketAssigneeDD(false); setCustomAlert({ show: true, message: `✅ Ticket ${selTicket.id} assigned to ${u.name}`, type: "success" }); } catch (e) { setCustomAlert({ show: true, message: "Failed to add assignee", type: "error" }); } }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                          <Avatar name={u.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div></div>
                        </div>
                      ))}
                      {users.filter(u => u.active != false && (assigneeSearch === "" || u.name.toLowerCase().includes(assigneeSearch.toLowerCase())) && !editTicket?.assignees?.find(a => a.id === u.id || String(a.id) === String(u.id))).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No available users</div>}
                    </div>
                  </>}
                </div>}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {(Array.isArray(selTicket.assignees) ? selTicket.assignees : []).map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", padding: "5px 9px", borderRadius: 7, border: "1px solid #e2e8f0" }}><Avatar name={a.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{a.role}</div></div></div>)}
                {!selTicket.assignees?.length && <span style={{ fontSize: 13, color: "#94a3b8" }}>Unassigned</span>}
              </div>
            )}
            {selTicket.vendor && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Vendor</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selTicket.vendor.name} <span style={{ color: "#64748b", fontWeight: 400 }}>({selTicket.vendor.email})</span></div>
              </div>
            )}
          </div>

          {/* Forward Ticket Button */}
          {selTicket.status !== "Closed" && (
            <button onClick={() => setShowForward(true)} style={{ ...bG, padding: "6px 14px", marginBottom: 14, fontSize: 12 }}>Forward Ticket ➦</button>
          )}

          {/* Timeline View Button */}
          <button onClick={() => { setShowTimelineView(true); setTimelineTab("external"); }} style={{ ...bG, padding: "6px 14px", marginBottom: 14, marginLeft: 8, fontSize: 12, background: "#f3e8ff", color: "#7c3aed" }}>📜 View Timeline</button>

          {/* Send to Vendor Button */}
          <button onClick={() => setShowVendor(true)} style={{ ...bG, padding: "6px 14px", marginBottom: 14, marginLeft: 8, fontSize: 12, background: "#fff7ed", color: "#ea580c" }}>Send to Vendor 🏭</button>

          {/* Forward Ticket Modal - Role-based */}
          {showForward && (
            <div style={{ marginBottom: 14, padding: "14px", background: "#eff6ff", borderRadius: 9, border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 10 }}>
                {(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? "➦ Forward Ticket" : "📬 Request Forward"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, fontStyle: "italic" }}>
                {(currentUser?.role === "Admin" || currentUser?.role === "Manager")
                  ? "✓ Direct forward (no approval needed)"
                  : "✓ Request will be sent to Admin for approval"}
              </div>

              {/* Filter out: currently assigned users */}
              <FF label="Select Agent (currently assigned excluded)" required>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search agent..."
                    value={fwdTargetAgent ? users.find(u => u.id === fwdTargetAgent)?.name || "" : forwardAgentSearch}
                    onChange={e => setForwardAgentSearch(e.target.value)}
                    onFocus={() => { setForwardAgentSearch(""); setShowForwardAgentDD(true); }}
                    style={{ ...iS, width: "100%", fontSize: 12 }}
                  />
                  {showForwardAgentDD && <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowForwardAgentDD(false); setForwardAgentSearch(""); }} />
                    <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                      <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                        <input type="text" placeholder="Search agents..." value={forwardAgentSearch} onChange={e => setForwardAgentSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                      </div>
                      {users.filter(u =>
                        u.active &&
                        u.role === "Agent" &&
                        !selTicket.assignees?.find(a => a.id === u.id) &&
                        (forwardAgentSearch === "" || u.name.toLowerCase().includes(forwardAgentSearch.toLowerCase()))
                      ).map(u => (
                        <div key={u.id} onClick={() => { setFwdTargetAgent(u.id); setShowForwardAgentDD(false); setForwardAgentSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                          <Avatar name={u.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div></div>
                        </div>
                      ))}
                      {users.filter(u =>
                        u.active &&
                        !selTicket.assignees?.find(a => a.id === u.id) &&
                        (forwardAgentSearch === "" || u.name.toLowerCase().includes(forwardAgentSearch.toLowerCase()))
                      ).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No available agents</div>}
                    </div>
                  </>}
                </div>
              </FF>

              <FF label="Reason for Forwarding" required>
                <textarea
                  style={{ ...iS, height: 50, resize: "none" }}
                  value={fwdReason}
                  onChange={e => setFwdReason(e.target.value)}
                  placeholder="Why is this ticket being forwarded?"
                />
              </FF>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button onClick={() => { setShowForward(false); setFwdReason(""); setFwdTargetAgent(""); }} style={bG}>Cancel</button>
                <button
                  onClick={() => handleForwardTicket(fwdTargetAgent)}
                  style={{
                    ...bP,
                    background: (currentUser?.role === "Admin" || currentUser?.role === "Manager") ? "#2563eb" : "#f59e0b",
                    boxShadow: `0 2px 6px rgba(${(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? "37,99,235" : "245,158,11"},0.3)`
                  }}
                >
                  {(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? "Forward Ticket ➦" : "Send Request to Admin ✉️"}
                </button>
              </div>
            </div>
          )}

          {/* Send to Vendor Modal */}
          {showVendor && (
            <div style={{ marginBottom: 14, padding: "14px", background: "#fff7ed", borderRadius: 9, border: "1px solid #fed7aa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 10 }}>🏭 Send to Vendor</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                {/* Vendor Dropdown - Auto-fill email on select */}
                <FF label="Select Vendor" required>
                  <select
                    style={iS}
                    value={vendorName}
                    onChange={e => {
                      setVendorName(e.target.value);
                      // ✅ Auto-fill email when vendor selected
                      const selectedVendor = vendors.find(v => v.name === e.target.value);
                      if (selectedVendor) {
                        setVendorEmail(selectedVendor.email || "");
                      } else {
                        setVendorEmail("");
                      }
                    }}
                  >
                    <option value="">Select vendor…</option>
                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                </FF>
                {/* Email auto-filled from vendor */}
                <FF label="Vendor Email (auto-filled)">
                  <input
                    type="email"
                    style={iS}
                    value={vendorEmail}
                    onChange={e => setVendorEmail(e.target.value)}
                    placeholder="Auto-filled from vendor details"
                    readOnly
                  />
                </FF>
              </div>
              <FF label="Reason for Sending to Vendor" required>
                <textarea
                  style={{ ...iS, height: 50, resize: "none" }}
                  value={fwdReason}
                  onChange={e => setFwdReason(e.target.value)}
                  placeholder="Why is this ticket being sent to vendor?"
                />
              </FF>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button onClick={() => { setShowVendor(false); setVendorName(""); setVendorEmail(""); setFwdReason(""); }} style={bG}>Cancel</button>
                <button onClick={() => { handleSendForRepair(vendorName, vendorEmail); setShowVendor(false); setVendorName(""); setVendorEmail(""); setFwdReason(""); }} style={{ ...bP, background: "#ea580c", boxShadow: "0 2px 6px rgba(234,88,12,0.3)" }}>Confirm Send</button>
              </div>
            </div>
          )}

          {/* Vendor Return */}
          {selTicket.status === "Pending" && selTicket.timeline?.some(ev => ev.action?.includes("Sent for Repair")) && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && (
            <div style={{ marginBottom: 14 }}>
              {!showVendorReturn ? (
                <button onClick={() => setShowVendorReturn(true)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "#22c55e", color: "#fff" }}>📦 Mark as Returned from Vendor</button>
              ) : (
                <div style={{ padding: "14px", background: "#f0fdf4", borderRadius: 9, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 10 }}>📦 Item Returned from Vendor</div>
                  <FF label="Outcome" required>
                    <select style={iS} value={vendorReturnOutcome} onChange={e => setVendorReturnOutcome(e.target.value)}>
                      <option value="fixed">✅ Fixed — Close ticket</option>
                      <option value="not_fixed">❌ Not Fixed — Reopen ticket</option>
                    </select>
                  </FF>
                  <FF label="Return Note">
                    <textarea style={{ ...iS, height: 50, resize: "none" }} value={vendorReturnNote} onChange={e => setVendorReturnNote(e.target.value)} placeholder="Any notes about the return or repair outcome…" />
                  </FF>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setShowVendorReturn(false); setVendorReturnNote(""); setVendorReturnOutcome("fixed"); }} style={bG}>Cancel</button>
                    <button onClick={handleVendorReturn} style={{ ...bP, background: "#22c55e" }}>Confirm Return</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Update */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 7 }}>UPDATE STATUS</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
              {selTicket.status === "Closed" ? (
                <>
                  {(currentUser?.role === "Admin" || currentUser?.role === "Manager") && (
                    <button onClick={() => updateStatus(selTicket.id, "Reopened")} style={{ padding: "5px 13px", borderRadius: 7, border: "1.5px solid #3b82f6", background: pendingTicketStatus === "Open" ? "#3b82f6" : "#eff6ff", color: pendingTicketStatus === "Open" ? "#fff" : "#1d4ed8", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>🔄 Reopen Ticket</button>
                  )}
                  {(currentUser?.role === "Agent" || currentUser?.role === "Viewer") && (
                    <button onClick={() => {
                      setConfirmModal({
                        show: true,
                        title: "Request Reopen",
                        message: "Enter a remark explaining why this ticket should be reopened. Admins/Managers will review this before approving.",
                        fields: [
                          { name: "remark", label: "📝 Reopen Remark", type: "textarea", placeholder: "Explain why this ticket needs to be reopened…", value: "" }
                        ],
                        confirmLabel: "🔄 Send Reopen Request",
                        confirmDanger: false,
                        onConfirm: async (data) => {
                          const remark = (data.remark || "").trim();
                          if (!remark) {
                            setCustomAlert({ show: true, message: "⚠️ Please enter a reopen remark before proceeding", type: "error" });
                            return;
                          }
                          const nowISO = new Date().toISOString();
                          try {
                            const newTimelineEvent = { action: "Reopen Requested", by: currentUser.name, date: nowISO, note: remark, visibility: "internal" };
                            const update = { ...selTicket, timeline: [...(selTicket.timeline || []), newTimelineEvent] };
                            const apiUrl = isTrueWebcast(selTicket) ? `${BASE_URL}/webcasts/${selTicket.id}` : `${TICKETS_API}/${selTicket.id}`;
                            await axios.put(apiUrl, update);
                            setTickets(p => p.map(x => x.id === selTicket.id ? { ...update, updated: new Date(nowISO) } : x));
                            setSelTicket({ ...update, updated: new Date(nowISO) });

                            const admins = (Array.isArray(users) ? users : []).filter(u => u.active && (u.role === "Admin" || u.role === "Manager"));
                            for (const admin of admins) {
                              await axios.post(NOTIFICATIONS_API, { userId: admin.id, type: "reopen_request", icon: "🔄", title: "Reopen Request", message: `${currentUser.name} requested to reopen ticket "${selTicket.summary}" (${selTicket.id}): ${remark}`, ticketId: selTicket.id, read: false, alerted: false, resolved: null }).catch(() => {});
                            }
                            setConfirmModal({ show: false });
                            setCustomAlert({ show: true, message: "✅ Reopen request sent to admins for approval", type: "success" });
                          } catch (e) {
                            setCustomAlert({ show: true, message: "Failed to send reopen request. Please try again.", type: "error" });
                          }
                        },
                        onCancel: () => setConfirmModal({ show: false })
                      });
                    }} style={{ padding: "5px 13px", borderRadius: 7, border: "1.5px solid #f59e0b", background: "#fffbeb", color: "#b45309", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>🔄 Request Reopen</button>
                  )}
                </>
              ) : (
                STATUSES.filter(s => s !== "Bin" || currentUser?.role === "Admin").map(s => <button key={s} onClick={() => s === "Closed" ? updateStatus(selTicket.id, s) : setPendingTicketStatus(s)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: (pendingTicketStatus === s || selTicket.status === s) ? (STATUS_COLOR[s]?.text || "#64748b") : "#f1f5f9", color: (pendingTicketStatus === s || selTicket.status === s) ? "#fff" : "#64748b", opacity: pendingTicketStatus === s && selTicket.status !== s ? 0.7 : 1 }}>{s}</button>)
              )}
            </div>
            {/* Save button for pending status changes */}
            {pendingTicketStatus && pendingTicketStatus !== selTicket.status && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => updateStatus(selTicket.id, pendingTicketStatus)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: "#22c55e", color: "#fff" }}>✓ Save Status</button>
                <button onClick={() => setPendingTicketStatus(null)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: "#fff", color: "#64748b" }}>Cancel</button>
              </div>
            )}
          </div>

          {/* Comments Display */}
          {(() => {
            const isPrivileged = currentUser?.role !== "Viewer";
            const visibleComments = (selTicket.comments || []).filter(c => {
              if (!c.visibility || c.visibility === "external") return true;
              // internal comments: only admin, manager, or assigned agents see them
              return isPrivileged;
            });
            return visibleComments.length > 0 && (
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 10 }}>COMMENTS ({visibleComments.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {visibleComments.map((comment, idx) => (
                    <div key={idx} style={{
                      padding: 12,
                      background: comment.visibility === "internal" ? "#faf5ff" : "#f8fafc",
                      borderRadius: 8,
                      border: `1px solid ${comment.visibility === "internal" ? "#e9d5ff" : "#e2e8f0"}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#1f2937" }}>{comment.by}</div>
                          {comment.visibility === "internal" && (
                            <span style={{ fontSize: 10, background: "#ede9fe", color: "#7c3aed", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>🔒 Internal</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(comment.date).toLocaleString()}</div>
                      </div>
                      {comment.text && (
                        <div style={{ fontSize: 13, color: "#475569", marginBottom: comment.image ? 8 : 0, lineHeight: 1.5 }}>
                          {comment.text}
                        </div>
                      )}
                      {comment.image && (
                        <div style={{ marginTop: 8 }}>
                          <img src={comment.image} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }} alt="comment" onClick={() => { window.open(comment.image, "_blank"); }} title="Click to view full image" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Comment */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 13 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 7 }}>ADD COMMENT</div>
            {/* Internal / External toggle — only for privileged users */}
            {(currentUser?.role !== "Viewer") && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button
                  onClick={() => setCommentVisibility("external")}
                  style={{
                    padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: commentVisibility === "external" ? "#dbeafe" : "#f1f5f9",
                    color: commentVisibility === "external" ? "#1d4ed8" : "#64748b",
                    transition: "all 0.15s"
                  }}
                >🌐 External</button>
                <button
                  onClick={() => setCommentVisibility("internal")}
                  style={{
                    padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: commentVisibility === "internal" ? "#ede9fe" : "#f1f5f9",
                    color: commentVisibility === "internal" ? "#7c3aed" : "#64748b",
                    transition: "all 0.15s"
                  }}
                >🔒 Internal</button>
              </div>
            )}
            {commentVisibility === "internal" && (currentUser?.role !== "Viewer") && (
              <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 8, background: "#faf5ff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e9d5ff" }}>
                🔒 This note is internal — only visible to Admins, Managers, and assigned Agents.
              </div>
            )}
            <textarea style={{ ...iS, height: 68, resize: "none", borderColor: commentVisibility === "internal" ? "#c4b5fd" : undefined }} placeholder={commentVisibility === "internal" ? "Add an internal note (not visible to ticket creator)…" : "Add a note or reply…"} value={newComment} onChange={e => setNewComment(e.target.value)} />
            {/* Image attachment */}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              {selTicket.image ? (
                <div title="Ticket already has an attachment. Use Edit Ticket to replace or remove it." style={{ cursor: "not-allowed", padding: "6px 12px", borderRadius: 6, border: "1.5px dashed #cbd5e1", background: "#f1f5f9", color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, userSelect: "none" }}>
                  📷 Add Image
                </div>
              ) : !commentImagePreview ? (
                <label style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 6, border: "1.5px dashed #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  📷 Add Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        compressImage(file, async (compressed) => {
                          const updated = { ...selTicket, image: compressed, updated: new Date().toISOString() };
                          try {
                            await axios.put(`${TICKETS_API}/${selTicket.id}`, updated);
                            setTickets(t => t.map(x => x.id === selTicket.id ? { ...updated, updated: new Date() } : x));
                            setSelTicket({ ...updated, updated: new Date() });
                          } catch (e) { showToast("Failed to attach image", "error"); }
                        });
                      }
                    }}
                  />
                </label>
              ) : (
                <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Remove</button>
              )}
              {selTicket.image && (
                <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Use Edit Ticket to replace or remove attachment</span>
              )}
            </div>
            {/* Image preview */}
            {commentImagePreview && (
              <div style={{ marginTop: 8, maxWidth: 200 }}>
                <img src={commentImagePreview} style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, border: "1px solid #e2e8f0" }} alt="preview" />
              </div>
            )}
            <button onClick={async () => {
              if (!newComment.trim() && !commentImage) return;
              const nowISO = new Date().toISOString();
              const comment = {
                by: currentUser.name,
                date: nowISO,
                text: newComment.trim(),
                image: commentImage || null,
                visibility: commentVisibility
              };
              const timelineNote = newComment.trim() + (commentImage ? " [with image]" : "");
              const timelineEvent = { action: "Comment added", by: currentUser.name, date: nowISO, note: timelineNote, visibility: commentVisibility };
              const updatedT = { ...selTicket, updated: nowISO, comments: [...(selTicket.comments || []), comment], timeline: [...(selTicket.timeline || []), timelineEvent] };
              try {
                await axios.put(`${TICKETS_API}/${selTicket.id}`, updatedT);
                setTickets(p => p.map(x => x.id === selTicket.id ? { ...updatedT, updated: new Date(nowISO) } : x));
                setSelTicket({ ...updatedT, updated: new Date(nowISO) });
                setNewComment("");
                setCommentImage(null);
                setCommentImagePreview(null);
              } catch (e) { setCustomAlert({ show: true, message: "Failed to post comment", type: "error" }); }
            }} style={{ ...bP, marginTop: 7, padding: "7px 15px", fontSize: 13, background: commentVisibility === "internal" ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
              {commentVisibility === "internal" ? "🔒 Post Internal Note" : "🌐 Post Comment"}
            </button>
          </div>
          {selTicket.image && (
            <a href={selTicket.image} download={`${selTicket.id}-attachment.jpg`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 7, background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#1d4ed8", fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 10 }}>
              📎 {selTicket.id}-attachment.jpg <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 400 }}>↓ Download</span>
            </a>
          )}
        </div>}
      </Modal>

      {/* ✅ UPDATED: TIMELINE VIEW MODAL — Internal / External tabs */}
      <Modal open={showTimelineView} onClose={() => setShowTimelineView(false)} title={`📜 Ticket Timeline - ${selTicket?.id || ""}`} width={640}>
        {selTicket && (() => {
          const isPrivileged = currentUser?.role !== "Viewer";

          // External events: only public events (no internal-tagged ones) — what ticket creator sees
          const externalEvents = (selTicket.timeline || []).filter(e => e.visibility !== "internal");

          // Internal timeline = ALL events (public + internal), so agents see the complete picture
          const allEvents = selTicket.timeline || [];
          const internalOnlyCount = allEvents.filter(e => e.visibility === "internal").length;

          const renderEntry = (entry, idx, arr) => (
            <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: idx < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {/* dot */}
                <div style={{
                  width: 32, height: 32, minWidth: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                  background: entry.visibility === "internal" ? "#ede9fe" : "#dbeafe"
                }}>
                  {entry.action.includes("Created") && "✨"}
                  {entry.action.includes("Forwarded") && "➦"}
                  {entry.action.includes("Sent") && "🏭"}
                  {entry.action.includes("Reopened") && "🔄"}
                  {entry.action.includes("Closed") && "✓"}
                  {entry.action.includes("Updated") && "✏️"}
                  {entry.action.includes("Comment") && (entry.visibility === "internal" ? "🔒" : "💬")}
                  {!entry.action.includes("Created") && !entry.action.includes("Forwarded") && !entry.action.includes("Sent") && !entry.action.includes("Reopened") && !entry.action.includes("Closed") && !entry.action.includes("Updated") && !entry.action.includes("Comment") && "📝"}
                </div>
                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{entry.action}</div>
                    {entry.visibility === "internal" && <span style={{ fontSize: 10, background: "#ede9fe", color: "#7c3aed", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>🔒 Internal</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    By <strong>{entry.by}</strong> • {new Date(entry.date).toLocaleString()}
                  </div>
                  {entry.note && (
                    <div style={{ fontSize: 12, color: "#475569", background: entry.visibility === "internal" ? "#faf5ff" : "#f8fafc", padding: "8px 10px", borderRadius: 6, borderLeft: `3px solid ${entry.visibility === "internal" ? "#7c3aed" : "#3b82f6"}`, marginTop: 6 }}>
                      {entry.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <div>
              {/* Tab bar — internal tab only for privileged users */}
              <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
                <button
                  onClick={() => setTimelineTab("external")}
                  style={{
                    padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "none",
                    color: timelineTab === "external" ? "#1d4ed8" : "#94a3b8",
                    borderBottom: timelineTab === "external" ? "2px solid #3b82f6" : "2px solid transparent",
                    marginBottom: -2, transition: "all 0.15s"
                  }}
                >🌐 External Timeline</button>
                {isPrivileged && (
                  <button
                    onClick={() => setTimelineTab("internal")}
                    style={{
                      padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "none",
                      color: timelineTab === "internal" ? "#7c3aed" : "#94a3b8",
                      borderBottom: timelineTab === "internal" ? "2px solid #7c3aed" : "2px solid transparent",
                      marginBottom: -2, transition: "all 0.15s"
                    }}
                  >🔒 Internal Timeline {internalOnlyCount > 0 && <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 99, padding: "0 6px", fontSize: 11 }}>+{internalOnlyCount} internal</span>}</button>
                )}
              </div>

              {/* External timeline */}
              {timelineTab === "external" && (
                <div style={{ maxHeight: 520, overflowY: "auto" }}>
                  {externalEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                      <div style={{ fontSize: 14, marginBottom: 8 }}>📭 No external events yet</div>
                      <div style={{ fontSize: 12 }}>Ticket creation, status changes and public comments appear here</div>
                    </div>
                  ) : (
                    <div>{[...externalEvents].reverse().map((e, i, arr) => renderEntry(e, i, arr))}</div>
                  )}
                </div>
              )}

              {/* Internal timeline — privileged only, shows ALL events with internal ones highlighted */}
              {timelineTab === "internal" && isPrivileged && (
                <div style={{ maxHeight: 520, overflowY: "auto" }}>
                  <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 14, background: "#faf5ff", padding: "8px 12px", borderRadius: 7, border: "1px solid #e9d5ff" }}>
                    🔒 Full internal view — includes all public events plus internal notes, forwards, and agent actions not visible to the ticket creator.
                  </div>
                  {allEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                      <div style={{ fontSize: 14, marginBottom: 8 }}>📭 No events yet</div>
                      <div style={{ fontSize: 12 }}>All ticket activity will appear here</div>
                    </div>
                  ) : (
                    <div>{[...allEvents].reverse().map((e, i, arr) => renderEntry(e, i, arr))}</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Forward requests now handled via Inbox (✉️) and floating alerts */}

      {/* ── PROJECT DETAIL MODAL ── */}
      <Modal open={!!selProject} onClose={() => { setSelProject(null); setEditProjMode(false); setEditProject(null); }} title={selProject?.id || ""} width={720}>        
        {selProject && <div>
          <div style={{ display: "flex", gap: 9, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Badge label={selProject.status} style={{ ...STATUS_COLOR[selProject.status], padding: "4px 12px", fontSize: 12 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: PRIORITY_COLOR[selProject.priority] }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{selProject.priority} Priority</span></div>
            {selProject.category === "Webcast" && <Badge label="📡 Webcast" style={{ background: "#fff7ed", color: "#f97316" }} />}
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Created {selProject.created.toLocaleString()}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
              {(currentUser?.role === "Admin" || currentUser?.role === "Manager") && !editProjMode && (
                <button onClick={() => { setEditProjMode(true); setEditProject({ ...selProject }); }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: "#8b5cf6", color: "#fff" }}>Edit Project</button>
              )}
              {editProjMode && (
                <>
                  <button onClick={() => { setEditProjMode(false); setEditProject(null); }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#64748b" }}>Cancel</button>
                  <button onClick={async () => {
                    try {
                      const nowISO = new Date().toISOString();
                      const fields = ["title","description","org","department","priority","category","reportedBy","dueDate","location"];
                      const changes = fields.filter(f => String(editProject[f]||"") !== String(selProject[f]||"")).map(f => `${f}: "${selProject[f]||""}" → "${editProject[f]||""}"`);
                      const timelineEvent = { action: "Project edited", by: currentUser.name, date: nowISO, note: changes.length ? changes.join(", ") : "No field changes" };
                      const updated = { ...editProject, updated: nowISO, timeline: [...(selProject.timeline || []), timelineEvent] };
                      await axios.put(`${PROJECTS_API}/${selProject.id}`, updated);
                      setProjects(p => p.map(x => x.id === selProject.id ? { ...updated, updated: new Date(updated.updated), created: selProject.created } : x));
                      setSelProject({ ...updated, updated: new Date(updated.updated), created: selProject.created });
                      setEditProjMode(false);
                      setEditProject(null);
                      showToast("Project updated successfully ✓", "success");
                    } catch (e) { showToast("Failed to save project", "error"); }
                  }} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: "#22c55e", color: "#fff" }}>💾 Save Changes</button>
                </>
              )}
              <button onClick={() => setShowProjTimelineView(true)} style={{ ...bG, padding: "6px 14px", fontSize: 12, background: "#f3e8ff", color: "#7c3aed" }}>📜 View Timeline</button>
            </div>
          </div>

          {editProjMode && editProject ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Title</label>
                <input value={editProject.title} onChange={e => setEditProject({ ...editProject, title: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={editProject.description || ""} onChange={e => setEditProject({ ...editProject, description: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13, height: 80, resize: "vertical" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Organization</label>
                  <select value={editProject.org} onChange={e => setEditProject({ ...editProject, org: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    {orgs.map(o => <option key={o.id}>{o.name}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Department</label>
                  <input value={editProject.department || ""} onChange={e => setEditProject({ ...editProject, department: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
                  <select value={editProject.priority} onChange={e => setEditProject({ ...editProject, priority: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    {PROJECT_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Category</label>
                  <select value={editProject.category || ""} onChange={e => setEditProject({ ...editProject, category: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }}>
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Reported By</label>
                  <input value={editProject.reportedBy || ""} onChange={e => setEditProject({ ...editProject, reportedBy: e.target.value })} style={{ ...iS, width: "100%", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Due Date</label>
                  <input type="date" value={editProject.dueDate ? new Date(editProject.dueDate).toISOString().split('T')[0] : ""} onChange={e => setEditProject({ ...editProject, dueDate: e.target.value ? new Date(e.target.value).toISOString() : "" })} style={{ ...iS, width: "100%", fontSize: 13 }} /></div>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ margin: "0 0 9px", fontSize: 17, fontWeight: 700 }}>{selProject.title}</h2>
              <div style={{ marginBottom: 14, padding: "11px 14px", background: "#f8fafc", borderRadius: 9 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Progress (Based on Status)</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>{getProgressFromStatus(selProject.status)}%</span>
                </div>
                <ProgressBar value={getProgressFromStatus(selProject.status)} color={getProgressFromStatus(selProject.status) > 70 ? "#22c55e" : getProgressFromStatus(selProject.status) > 40 ? "#f59e0b" : "#ef4444"} />
              </div>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{selProject.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
                {[{ l: "Organization", v: selProject.org }, { l: "Department", v: selProject.department }, { l: "Reported By", v: selProject.reportedBy }, { l: "Category", v: selProject.category }, { l: "Location", v: selProject.location }, { l: "Due Date", v: selProject.dueDate?.toLocaleDateString() || "-" }].map(f => (
                  <div key={f.l} style={{ background: "#f8fafc", padding: "9px 13px", borderRadius: 9 }}><div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{f.l}</div><div style={{ fontSize: 13, fontWeight: 500 }}>{f.v || "-"}</div></div>
                ))}
              </div>
            </>
          )}
          <div style={{ marginBottom: 14, padding: "11px 13px", background: "#f8fafc", borderRadius: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 7 }}>Assignees</div>
            {(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                  {(Array.isArray(selProject.assignees) ? selProject.assignees : []).map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#dbeafe", padding: "5px 9px", borderRadius: 7, border: "1px solid #bfdbfe" }}><Avatar name={a.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{a.role}</div></div><span onClick={async () => { const nowISO = new Date().toISOString(); const timelineEvent = { action: `Assignee removed: ${a.name}`, by: currentUser.name, date: nowISO, note: "" }; const updated = { ...selProject, assignees: selProject.assignees.filter(x => x.id !== a.id), updated: nowISO, timeline: [...(selProject.timeline || []), timelineEvent] }; try { await axios.put(`${PROJECTS_API}/${selProject.id}`, updated); setProjects(p => p.map(x => x.id === selProject.id ? { ...updated, updated: new Date(nowISO) } : x)); setSelProject(updated); } catch (e) { setCustomAlert({ show: true, message: "Failed to remove assignee", type: "error" }); } }} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 4, color: "#ef4444" }}>×</span></div>)}
                  {!selProject.assignees?.length && <span style={{ fontSize: 13, color: "#94a3b8" }}>Unassigned</span>}
                </div>
                <div style={{ position: "relative" }}>
                  <input type="text" placeholder="Add assignee..." value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onFocus={() => { setAssigneeSearch(""); setShowProjAssigneeDD(true); }} style={{ ...iS, width: "100%", fontSize: 12 }} />
                  {showProjAssigneeDD && <><div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowProjAssigneeDD(false); setAssigneeSearch(""); }} />
                    <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                      <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff" }}>
                        <input type="text" placeholder="Search assignees..." value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ ...iS, width: "100%", fontSize: 12 }} />
                      </div>
                      {users.filter(u => u.active && (assigneeSearch === "" || u.name.toLowerCase().includes(assigneeSearch.toLowerCase())) && !selProject.assignees?.find(a => a.id === u.id)).map(u => (
                        <div key={u.id} onClick={async () => { const nowISO = new Date().toISOString(); const timelineEvent = { action: `Assignee added: ${u.name}`, by: currentUser.name, date: nowISO, note: "" }; const updated = { ...selProject, assignees: [...(selProject.assignees || []), u], updated: nowISO, timeline: [...(selProject.timeline || []), timelineEvent] }; try { await axios.put(`${PROJECTS_API}/${selProject.id}`, updated); setProjects(p => p.map(x => x.id === selProject.id ? { ...updated, updated: new Date(nowISO) } : x)); setSelProject(updated); setAssigneeSearch(""); setShowProjAssigneeDD(false); } catch (e) { setCustomAlert({ show: true, message: "Failed to add assignee", type: "error" }); } }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                          <Avatar name={u.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div></div>
                        </div>
                      ))}
                      {users.filter(u => u.active && (assigneeSearch === "" || u.name.toLowerCase().includes(assigneeSearch.toLowerCase())) && !selProject.assignees?.find(a => a.id === u.id)).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No available users</div>}
                    </div>
                  </>}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {(Array.isArray(selProject.assignees) ? selProject.assignees : []).map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", padding: "5px 9px", borderRadius: 7, border: "1px solid #e2e8f0" }}><Avatar name={a.name} size={24} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{a.role}</div></div></div>)}
                {!selProject.assignees?.length && <span style={{ fontSize: 13, color: "#94a3b8" }}>Unassigned</span>}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 7 }}>UPDATE STATUS</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{PROJECT_STATUSES.map(s => <button key={s} onClick={() => updateProjectStatus(selProject.id, s)} style={{ padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: selProject.status === s ? STATUS_COLOR[s].text : "#f1f5f9", color: selProject.status === s ? "#fff" : "#64748b" }}>{s}</button>)}</div>
          </div>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 13 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 7 }}>ADD COMMENT</div>
            <textarea style={{ ...iS, height: 68, resize: "none" }} placeholder="Add a note or reply…" value={newProjComment} onChange={e => setNewProjComment(e.target.value)} />
            <button onClick={async () => {
              if (!newProjComment.trim()) return;
              const nowISO = new Date().toISOString();
              const comment = { by: currentUser.name, date: nowISO, text: newProjComment.trim() };
              const timelineEvent = { action: "Comment added", by: currentUser.name, date: nowISO, note: newProjComment.trim() };
              const updatedP = { ...selProject, updated: nowISO, comments: [...(selProject.comments || []), comment], timeline: [...(selProject.timeline || []), timelineEvent] };
              try {
                await axios.put(`${PROJECTS_API}/${selProject.id}`, updatedP);
                setProjects(p => p.map(x => x.id === selProject.id ? { ...updatedP, updated: new Date(nowISO) } : x));
                setSelProject({ ...updatedP, updated: new Date(nowISO) });
                setNewProjComment("");
              } catch (e) { setCustomAlert({ show: true, message: "Failed to post comment", type: "error" }); }
            }} style={{ ...bP, marginTop: 7, padding: "7px 15px", fontSize: 13, background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>Post Comment</button>
          </div>

        </div>}
      </Modal>
      
      <Modal open={showProjTimelineView} onClose={() => setShowProjTimelineView(false)} title={`📜 Project Timeline - ${selProject?.id || ""}`} width={640}>
        {selProject && (() => {
          const events = selProject.timeline || [];
          return events.length === 0
            ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>No timeline events yet.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...events].reverse().map((ev, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{ev.action}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(ev.date).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      <span style={{ fontWeight: 600 }}>{ev.by}</span>
                      {ev.note && <span> · {ev.note}</span>}
                    </div>
                  </div>
                ))}
              </div>;
        })()}
      </Modal>

      {/* ── Floating 30-sec Action Alerts (forward requests / responses) ── */}
      <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10005, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", pointerEvents: "none", width: "100%", maxWidth: 480, padding: "0 16px" }}>
        {floatingAlerts.map(alert => (
          <div key={alert.alertId} style={{ width: "100%", background: "#faf8f4", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: alert.type === "forward_request" ? "2px solid #f59e0b" : alert.status === "Approved" ? "2px solid #22c55e" : alert.status === "Rejected" ? "2px solid #ef4444" : "2px solid #3b82f6", overflow: "hidden", pointerEvents: "auto", animation: "floatIn 0.35s ease-out" }}>
            {/* Progress bar countdown */}
            <div style={{ height: 3, background: alert.type === "forward_request" ? "#fef3c7" : "#f0fdf4", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", background: alert.type === "forward_request" ? "#f59e0b" : alert.status === "Approved" ? "#22c55e" : "#ef4444", animation: "shrink30 30s linear forwards" }} />
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>
                  {alert.type === "forward_request" ? "📬" : alert.type === "forward_response" ? (alert.status === "Approved" ? "✅" : "❌") : alert.type === "ticket_assigned" ? "🎫" : "📩"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{alert.message}</div>
                  {alert.ticketId && <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace", marginTop: 4 }}>{alert.ticketId}</div>}
                  {/* Accept / Reject buttons only for forward_request type and admins/managers and not yet resolved */}
                  {alert.type === "forward_request" && (() => {
                    // Always use live inboxItems resolved state, not the frozen alert snapshot
                    const liveItem = inboxItems.find(i => i.id === alert.id);
                    const liveResolved = liveItem?.resolved || alert.resolved;
                    if (liveResolved) {
                      return (
                        <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, background: liveResolved === "Approved" ? "#dcfce7" : "#fee2e2", color: liveResolved === "Approved" ? "#15803d" : "#991b1b", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                          ✓ Already {liveResolved}
                        </div>
                      );
                    }
                    if (!liveResolved && (currentUser?.role === "Admin" || currentUser?.role === "Manager")) {
                      return (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={() => { acceptInboxForwardRequest(alert); setFloatingAlerts(prev => prev.filter(a => a.alertId !== alert.alertId)); }}
                            style={{ flex: 1, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>✓ Approve</button>
                          <button onClick={() => { rejectInboxForwardRequest(alert); setFloatingAlerts(prev => prev.filter(a => a.alertId !== alert.alertId)); }}
                            style={{ flex: 1, padding: "7px 12px", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>✕ Reject</button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <button onClick={() => setFloatingAlerts(prev => prev.filter(a => a.alertId !== alert.alertId))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, flexShrink: 0, padding: 0 }}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ NEW: Update Agent Activity Modal */}
      <Modal open={showLocationModal} onClose={() => { setShowLocationModal(false); setShowTicketDropdown(false); }} title="Update Agent Activity" width={500}>
        {selAgent && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>🎫 Select Ticket</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Click to select ticket..."
                  value={currentTicketId}
                  onFocus={() => setShowTicketDropdown(true)}
                  onChange={e => setCurrentTicketId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b" }}
                />
                {/* Show dropdown only when focused */}
                {showTicketDropdown && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: 250, overflowY: "auto", zIndex: 100, marginTop: 2 }}>
                    {tickets.filter(t =>
                      t.assignees?.some(a => a.id === selAgent.id) &&
                      (currentTicketId === "" || t.id.includes(currentTicketId.toUpperCase()) || t.summary.toLowerCase().includes(currentTicketId.toLowerCase()))
                    ).map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setCurrentTicketId(t.id);
                          setShowTicketDropdown(false);
                        }}
                        style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 12, color: "#1e293b", transition: "background 0.2s", background: currentTicketId === t.id ? "#e0e7ff" : "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                        onMouseLeave={e => e.currentTarget.style.background = currentTicketId === t.id ? "#e0e7ff" : "#fff"}
                      >
                        <div style={{ fontWeight: 600 }}>{t.id}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{t.summary}</div>
                      </div>
                    ))}
                    {tickets.filter(t =>
                      t.assignees?.some(a => a.id === selAgent.id) &&
                      (currentTicketId === "" || t.id.includes(currentTicketId.toUpperCase()) || t.summary.toLowerCase().includes(currentTicketId.toLowerCase()))
                    ).length === 0 && (
                        <div style={{ padding: "12px 12px", fontSize: 12, color: "#94a3b8" }}>No assigned tickets</div>
                      )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>📍 Location</label>
              <select
                value={currentLocation}
                onChange={e => setCurrentLocation(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b" }}
              >
                <option value="">Select Location</option>
                {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
              {/* ✅ NEW: Back to Office button - clears location and sets On Duty */}
              {currentLocation && (
                <button onClick={async () => {
                  try {
                    const u = users.find(x => x.id === selAgent.id);
                    const updated = {
                      ...u,
                      currentTicketId: null,
                      currentLocation: null,
                      status: "On Duty"  // ✅ Auto set to On Duty
                    };
                    await axios.put(`${USERS_API}/${selAgent.id}`, updated);
                    setUsers(users.map(x => x.id === selAgent.id ? updated : x));
                    setSelAgent(updated);
                    setCustomAlert({ show: true, message: "✅ Welcome back to office! On Duty", type: "success" });
                    setCurrentTicketId("");
                    setCurrentLocation("");
                    setShowLocationModal(false);
                  } catch (e) {
                    setCustomAlert({ show: true, message: "Failed to update", type: "error" });
                  }
                }} style={{ padding: "10px 12px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>🏢 Back to Office - On Duty</button>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  try {
                    const u = users.find(x => x.id === selAgent.id);
                    // ✅ NEW: Auto set to "On Ticket" if location is assigned
                    const newStatus = currentLocation ? "On Ticket" : u.status;
                    const updated = {
                      ...u,
                      currentTicketId: currentTicketId || null,
                      currentLocation: currentLocation || null,
                      status: newStatus  // ✅ Auto-update status based on location
                    };
                    await axios.put(`${USERS_API}/${selAgent.id}`, updated);
                    setUsers(users.map(x => x.id === selAgent.id ? updated : x));
                    setSelAgent(updated);
                    const statusMsg = currentLocation ? " - Now On Ticket" : "";
                    setCustomAlert({ show: true, message: `✅ Agent activity updated${statusMsg}`, type: "success" });
                    setCurrentTicketId("");
                    setCurrentLocation("");
                    setShowLocationModal(false);
                  } catch (e) {
                    setCustomAlert({ show: true, message: "Failed to update", type: "error" });
                  }
                }} style={{ flex: 1, padding: "10px 12px", background: "#10b981", border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>💾 Save Activity</button>
                <button onClick={() => {
                  setShowLocationModal(false);
                  setCurrentTicketId("");
                  setCurrentLocation("");
                }} style={{ flex: 1, padding: "10px 12px", background: "#f3f4f6", border: "none", borderRadius: 6, color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ✅ NEW: Close Ticket with Remark Modal */}
      <Modal open={showRemarkModal} onClose={() => { setShowRemarkModal(false); setTicketRemark(""); setClosedBy(null); }} title={isReopenModal ? "Reopen Ticket - Add Reason" : "Close Ticket - Add Remark"} width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>{isReopenModal ? "🔄 Why are you reopening? (Mandatory)" : "📝 What have you done? (Mandatory)"}</label>
            <textarea
              value={ticketRemark}
              onChange={e => setTicketRemark(e.target.value)}
              placeholder={isReopenModal ? "Explain why this ticket needs to be reopened..." : "Describe what you did to resolve this ticket..."}
              style={{
                width: "100%",
                minHeight: 120,
                padding: "12px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#1e293b",
                fontFamily: "'DM Sans', sans-serif",
                resize: "vertical"
              }}
            />
            {!ticketRemark.trim() && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>{isReopenModal ? "⚠️ Reason is mandatory before reopening" : "⚠️ Remark is mandatory before closing"}</div>
            )}
          </div>
          
          {/* Closed Date — only shown when closing (not reopening) */}
          {!isReopenModal && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>📅 Closed Date <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="datetime-local"
                value={closedDate}
                onChange={e => setClosedDate(e.target.value)}
                style={{ ...iS }}
              />
              {!closedDate && <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444" }}>⚠️ Closed date is mandatory</div>}
            </div>
          )}

          {/* Closed By — only shown when closing (not reopening) */}
          {!isReopenModal && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>👤 Closed By <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <select
                  value={closedBy ? String(closedBy.id) : ""}
                  onChange={e => {
                    const selected = users.find(u => String(u.id) === e.target.value);
                    setClosedBy(selected || null);
                  }}
                  style={{ ...iS, cursor: "pointer" }}
                >
                  <option value="">— Select who closed this ticket —</option>
                  {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              {!closedBy && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444" }}>⚠️ Closed By is mandatory before closing</div>
              )}
              {closedBy && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac" }}>
                  <Avatar name={closedBy.name} size={24} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>Closing as: {closedBy.name}</span>
                  <button onClick={() => setClosedBy(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "#94a3b8", lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => closeTicketWithRemark && closeTicketWithRemark(isReopenModal, ticketRemark, closingTicketId, closedDate, closedBy)}
              disabled={!ticketRemark.trim()}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: ticketRemark.trim() ? "#22c55e" : "#cbd5e1",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 600,
                cursor: ticketRemark.trim() ? "pointer" : "not-allowed",
                fontSize: 12
              }}
            >
              ✅ {isReopenModal ? "Reopen Ticket" : "Close & Save Remark"}
            </button>
            <button
              onClick={() => {
                setShowRemarkModal(false);
                setTicketRemark("");
                setClosedBy(null);
                setClosedDate("");
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: 6,
                color: "#374151",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Custom Attributes Layout Designer Modal ── */}
      {showAttrLayoutModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16, backdropFilter: "blur(3px)" }}>
          <div style={{ background: "#faf8f4", borderRadius: 18, width: "100%", maxWidth: 780, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 70px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>📐 Form Layout Designer</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>Drag fields between sections to set where they appear in the New Ticket form. Changes save on click.</p>
              </div>
              <button onClick={() => setShowAttrLayoutModal(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* LEFT — New Ticket Preview */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Live Preview — New Ticket Form</div>
                <div style={{ border: "2px solid #e2e8f0", borderRadius: 4, overflow: "hidden", background: "#f8fafc" }}>
                  {/* Mock window bar */}
                  <div style={{ padding: "8px 12px", background: "#fff", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6, fontWeight: 600 }}>Create New Ticket</span>
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Fixed grid fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      {["Organization *", "Department", "POC", "Reported By", "Priority", "Category", "Location", "Due Date"].map(f => (
                        <div key={f} style={{ padding: "5px 8px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 5, fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>{f}</div>
                      ))}
                      {/* Grid section custom fields */}
                      {draftLayout.filter(a => (a.section || "grid") === "grid").map(a => (
                        <div key={a.id} style={{ padding: "5px 8px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 5, fontSize: 10, color: "#1d4ed8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 9, color: "#6366f1" }}>⠿</span>{a.name}{a.required && <span style={{ color: "#ef4444" }}>*</span>}
                        </div>
                      ))}
                    </div>
                    {/* Assignees */}
                    <div style={{ padding: "5px 8px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 5, fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>Assignees</div>
                    {/* Below-assignees custom fields */}
                    {draftLayout.filter(a => (a.section || "grid") === "below-assignees").length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {draftLayout.filter(a => (a.section || "grid") === "below-assignees").map(a => (
                          <div key={a.id} style={{ padding: "5px 8px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 5, fontSize: 10, color: "#92400e", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9 }}>⠿</span>{a.name}{a.required && <span style={{ color: "#ef4444" }}>*</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Summary + Description */}
                    <div style={{ padding: "5px 8px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 5, fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>Summary *</div>
                    <div style={{ padding: "5px 8px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 5, fontSize: 10, color: "#94a3b8", fontWeight: 500, height: 28 }}>Description</div>
                    {/* Bottom custom fields */}
                    {draftLayout.filter(a => (a.section || "grid") === "bottom").length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {draftLayout.filter(a => (a.section || "grid") === "bottom").map(a => (
                          <div key={a.id} style={{ padding: "5px 8px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 5, fontSize: 10, color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9 }}>⠿</span>{a.name}{a.required && <span style={{ color: "#ef4444" }}>*</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT — Drag zones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Drag Fields Into Sections</div>

                {[
                  { key: "grid", label: "📋 Grid (top area)", subtitle: "Appears in the 2-column grid alongside Org, Priority, etc.", bg: "#eff6ff", border: "#bfdbfe", pillBg: "#dbeafe", pillText: "#1d4ed8" },
                  { key: "below-assignees", label: "👥 Below Assignees", subtitle: "Appears right after the Assignees field.", bg: "#fffbeb", border: "#fde68a", pillBg: "#fef3c7", pillText: "#92400e" },
                  { key: "bottom", label: "⬇️ After Description", subtitle: "Appears after the Description textarea.", bg: "#f0fdf4", border: "#bbf7d0", pillBg: "#dcfce7", pillText: "#166534" },
                ].map(zone => (
                  <div
                    key={zone.key}
                    onDragOver={e => { e.preventDefault(); setLayoutDragOver(zone.key); }}
                    onDragLeave={() => setLayoutDragOver(null)}
                    onDrop={e => {
                      e.preventDefault();
                      setLayoutDragOver(null);
                      if (layoutDragIdx === null) return;
                      const updated = draftLayout.map((a, i) =>
                        i === layoutDragIdx ? { ...a, section: zone.key } : a
                      );
                      setDraftLayout(updated);
                      setLayoutDragIdx(null);
                    }}
                    style={{ borderRadius: 10, border: `2px dashed ${layoutDragOver === zone.key ? "#3b82f6" : zone.border}`, background: layoutDragOver === zone.key ? "#eff6ff" : zone.bg, padding: 10, minHeight: 70, transition: "all 0.15s" }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 2 }}>{zone.label}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>{zone.subtitle}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 28 }}>
                      {draftLayout.filter(a => (a.section || "grid") === zone.key).length === 0 && (
                        <span style={{ fontSize: 11, color: "#cbd5e1", alignSelf: "center" }}>Drop fields here</span>
                      )}
                      {draftLayout
                        .map((a, idx) => ({ ...a, _idx: idx }))
                        .filter(a => (a.section || "grid") === zone.key)
                        .map(a => (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={e => { e.stopPropagation(); setLayoutDragIdx(a._idx); }}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: zone.pillBg, color: zone.pillText, borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "grab", userSelect: "none", border: `1px solid ${zone.border}` }}
                          >
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>⠿</span>
                            {a.name}{a.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                            <span style={{ fontSize: 9, background: "rgba(0,0,0,0.08)", padding: "1px 4px", borderRadius: 3, marginLeft: 2 }}>{a.type}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                {/* Reorder within section note */}
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 11, color: "#64748b" }}>
                  💡 Drag a field from one section to another to move it. Order within a section follows the list below.
                </div>

                {/* Order list */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.04em" }}>Field Order (drag to reorder)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {draftLayout.map((a, idx) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={() => setLayoutDragIdx(idx)}
                        onDragOver={e => { e.preventDefault(); setLayoutDragOver(`order-${idx}`); }}
                        onDragLeave={() => setLayoutDragOver(null)}
                        onDrop={e => {
                          e.preventDefault();
                          setLayoutDragOver(null);
                          if (layoutDragIdx === null || layoutDragIdx === idx) return;
                          const arr = [...draftLayout];
                          const moved = arr.splice(layoutDragIdx, 1)[0];
                          arr.splice(idx, 0, moved);
                          setDraftLayout(arr);
                          setLayoutDragIdx(null);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: layoutDragOver === `order-${idx}` ? "#eff6ff" : "#fafafa", border: `1.5px solid ${layoutDragOver === `order-${idx}` ? "#3b82f6" : "#f1f5f9"}`, borderRadius: 7, cursor: "grab", userSelect: "none", transition: "all 0.1s" }}
                      >
                        <span style={{ color: "#cbd5e1", fontSize: 14 }}>⠿</span>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{a.name}{a.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{a.type}</span>
                        {(() => {
                          const sc = a.section || "grid";
                          const c = sc === "grid" ? "#6366f1" : sc === "below-assignees" ? "#f59e0b" : "#10b981";
                          const lbl = sc === "grid" ? "Grid" : sc === "below-assignees" ? "Below Assignees" : "After Description";
                          return <span style={{ fontSize: 10, fontWeight: 700, color: c, background: c + "18", padding: "2px 7px", borderRadius: 99 }}>{lbl}</span>;
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 9, flexShrink: 0, background: "#fff" }}>
              <button onClick={() => setShowAttrLayoutModal(false)} style={bG}>Cancel</button>
              <button onClick={saveLayoutDraft} style={bP}>💾 Save Layout</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Activity Log Modal */}
      {showActivityLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#faf8f4", borderRadius: 4, width: "90%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>📋 Activity Log</h2>
              <button onClick={() => setShowActivityLog(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {activityLogs && activityLogs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activityLogs.slice().reverse().map((log, idx) => (
                    <div key={idx} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{log.action}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {log.details && Object.entries(log.details).map(([key, val]) => (
                          val && <div key={key}><strong>{key}:</strong> {String(val)}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  No activity logged yet
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowActivityLog(false)} style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#334155" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Session History Modal */}
      {showSessionHistory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#faf8f4", borderRadius: 4, width: "90%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>⏱️ Session History</h2>
              <button onClick={() => setShowSessionHistory(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {sessionHistory && sessionHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sessionHistory.slice().reverse().map((session, idx) => (
                    <div key={idx} style={{ padding: 12, background: "#f3e8ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: "#6b21a8" }}>Session {idx + 1}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          Login: {new Date(session.loginTime).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div><strong>Duration:</strong> {session.duration || "Active"}</div>
                        <div><strong>Status at Logout:</strong> {session.logoutStatus || "N/A"}</div>
                        <div><strong>Location:</strong> {session.lastLocation || "Not Set"}</div>
                        {session.logoutReason && <div><strong>Logout Reason:</strong> {session.logoutReason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  No session history available
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSessionHistory(false)} style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#334155" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notifications ── */}
      <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 280,
              animation: "slideIn 0.3s ease-out",
              background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#15803d" : "#991b1b",
              border: `1.5px solid ${toast.type === "success" ? "#86efac" : "#fca5a5"}`
            }}
          >
            <span style={{ fontSize: 16 }}>{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(-18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shrink30 {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes strikeThrough {
          0% {
            textDecoration: none;
            transform: scaleX(0);
            opacity: 1;
          }
          50% {
            textDecoration: line-through;
            transform: scaleX(1);
            opacity: 1;
          }
          100% {
            textDecoration: line-through;
            transform: scaleX(1);
            opacity: 0.6;
          }
        }
      `}</style>

      {restoreModal.show && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
              <div style={{ background: "#faf8f4", borderRadius: 4, width: 440, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>🔄 Restore Ticket</h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Restoring <strong>{restoreModal.ticket?.id}</strong> to its previous status:&nbsp;
                  <strong>{(() => { const prev = [...(restoreModal.ticket?.timeline || [])].reverse().find(e => e.action === "Moved to Bin"); const match = prev?.note?.match(/Previous status: (.+)/); return match ? match[1] : "Open"; })()}</strong>
                </p>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Restore Remark *</label>
                <textarea value={restoreModal.remark} onChange={e => setRestoreModal(m => ({ ...m, remark: e.target.value }))} placeholder="Reason for restoring this ticket..." style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, minHeight: 80, resize: "vertical", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button onClick={() => setRestoreModal({ show: false, ticket: null, remark: "" })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                  <button onClick={async () => {
                    if (!restoreModal.remark.trim()) { setCustomAlert({ show: true, message: "Remark is required to restore", type: "error" }); return; }
                    const t = restoreModal.ticket;
                    const prevEntry = [...(t.timeline || [])].reverse().find(e => e.action === "Moved to Bin");
                    const match = prevEntry?.note?.match(/Previous status: (.+)/);
                    const restoreStatus = match ? match[1] : "Open";
                    const nowISO = new Date().toISOString();
                    const restoreEvent = { action: "Restored from Bin", by: currentUser.name, date: nowISO, note: restoreModal.remark.trim() };
                    const updated = { ...t, status: restoreStatus, updated: nowISO, timeline: [...(t.timeline || []), restoreEvent] };
                    try {
                      const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${t.id}` : `${TICKETS_API}/${t.id}`;
                      await axios.put(apiUrl, updated);
                      setTickets(p => p.map(x => x.id === t.id ? { ...updated, updated: new Date(nowISO) } : x));
                      setRestoreModal({ show: false, ticket: null, remark: "" });
                      setCustomAlert({ show: true, message: `✅ Ticket restored to ${restoreStatus}`, type: "success" });
                    } catch { setCustomAlert({ show: true, message: "Failed to restore ticket", type: "error" }); }
                  }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Restore</button>
                </div>
              </div>
            </div>
          )}
         {agentDetailModal.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#faf8f4", borderRadius: 4, width: 360, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>🟦 {agentDetailModal.user?.name} — On Ticket</h3>
              <button onClick={() => setAgentDetailModal({ show: false, user: null })} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ padding: 12, background: "#cffafe", borderRadius: 8 }}><span style={{ fontWeight: 700, color: "#0e7490" }}>🎫 Ticket: </span><span style={{ color: "#0e7490" }}>{agentDetailModal.user?.currentTicketId || "N/A"}</span></div>
              <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8 }}><span style={{ fontWeight: 700, color: "#15803d" }}>📍 Location: </span><span style={{ color: "#15803d" }}>{agentDetailModal.user?.currentLocation || "N/A"}</span></div>
            </div>
          </div>
        </div>
      )}
    <iframe ref={printFrameRef} style={{ display:"none" }} title="print-frame" />
    </>
  );
}
