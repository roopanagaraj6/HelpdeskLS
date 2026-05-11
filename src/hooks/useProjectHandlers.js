import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { USERS_API, BASE_URL } from "../constants/api";
import { saveSession, clearSession } from "../utils/session";
/**
 * Project CRUD, department management, and status-change handlers.
 */
export function useProjectHandlers(ctx) {
  const {
    projects, setProjects,
    orgs, users, categories, currentUser,
    projForm, setProjForm,
    setSelProject,
    setShowNewProject, setShowProjAssigneeDD,
    setCustomAlert,
    addDailyNotif,
    departments, setDepartments,
    newDept, setNewDept,
  } = ctx;

  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState("");

  // ─── PROJECT HANDLERS (v1 API) ────────────────────────────────────────────
  const handleProjectSubmit = async () => {
    if (!projForm.title || !projForm.org) return setCustomAlert({ show: true, message: "Organization and Title are required", type: "error" });

    // ✅ NEW: Validate webcast fields if category is Webcast
    if (projForm.category === "Webcast") {
      if (!projForm.satsangType || !projForm.location) {
        return setCustomAlert({ show: true, message: "Satsang Type and Location are required for Webcast", type: "error" });
      }
    }

    const newP = {
      ...projForm,
      status: projForm.status || "Open",
      dueDate: projForm.dueDate || null,
      comments: [],
      progress: projForm.progress || 0,
      tasks: projForm.tasks || [],
      timeline: [{ action: "Created", by: currentUser.name, date: new Date().toISOString(), note: "Project opened." }]
    };

    // ✅ NEW: If webcast, create separate entry and send to /api/webcasts
    if (projForm.category === "Webcast") {
      try {
        // Generate unique webcast ID
        const webcastData = {
          // id intentionally omitted — server will generate WEB-XXXX
          title: projForm.title,
          description: projForm.description,
          satsangType: projForm.satsangType,
          location: projForm.location,
          reportedBy: projForm.reportedBy,
          org: projForm.org,
          department: projForm.department,
          priority: projForm.priority,
          assignees: projForm.assignees,
          category: projForm.category,
          dueDate: projForm.dueDate || null,
          status: projForm.status || "Open",
          progress: projForm.progress || 0,
          comments: [],
          timeline: [{ action: "Created", by: currentUser.name, date: new Date().toISOString(), note: "Webcast created." }]
        };

        const webcastRes = await axios.post(`${BASE_URL}/webcasts`, webcastData);
        const createdWebcast = webcastRes.data;
        const webcastWithDates = { ...createdWebcast, created: new Date(createdWebcast.createdAt || createdWebcast.created), updated: new Date(createdWebcast.updatedAt || createdWebcast.updated) };

        setProjects(prev => [webcastWithDates, ...prev]);
        setSelProject(webcastWithDates);
        setShowNewProject(false);
        setProjForm(emptyProjectForm);
        setCustomAlert({ show: true, message: "✅ Webcast project created successfully!", type: "success" });
        addDailyNotif({ type: "webcast_created", icon: "📡", text: `${currentUser.name} created webcast project ${createdWebcast.id}`, ticketId: createdWebcast.id, by: currentUser.name });
        return;
      } catch (e) {
        setCustomAlert({ show: true, message: "Failed to create webcast: " + (e.response?.data?.error || e.message), type: "error" });
      }
      return;
    }

    // ✅ Regular project creation
    try {
      const res = await axios.post(PROJECTS_API, newP);
      const created = res.data;
      const projectWithDates = { ...created, created: new Date(created.createdAt || created.created), updated: new Date(created.updatedAt || created.updated), dueDate: created.dueDate ? new Date(created.dueDate) : null };
      setProjects(prev => [projectWithDates, ...prev]);
      setSelProject(projectWithDates);  // ✅ Auto-open project details
      setShowNewProject(false);
      setProjForm(emptyProjectForm);
      setCustomAlert({ show: true, message: "✅ Project created successfully!", type: "success" });
      addDailyNotif({ type: "project_created", icon: "📁", text: `${currentUser.name} created project "${projectWithDates.title || projectWithDates.id}"`, by: currentUser.name });
      // ✅ Animation handles fade-out automatically (3.5s)
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to save project: " + (e.response?.data?.error || e.message), type: "error" });
    }
  };
  const addProjCC = () => { if (projCcInput && !projForm.cc.includes(projCcInput)) { setProjForm({ ...projForm, cc: [...projForm.cc, projCcInput] }); setProjCcInput(""); } };
  const updateProjectStatus = async (id, status, closedByName) => {
    const p = projects.find(x => x.id === id); if (!p) return;
    if (status === "Closed" && !closedByName) {
      setConfirmModal({
        show: true, title: "Close Project", message: "Who is closing this project?",
        fields: [{ name: "closedBy", label: "Closed By", type: "select", options: [...users].sort((a,b) => a.name.localeCompare(b.name)).map(u => ({ value: u.name, label: `${u.name} (${u.role})` })) }],
        confirmLabel: "Close Project", confirmDanger: false,
        onConfirm: async (data) => {
          setConfirmModal({ show: false });
          await updateProjectStatus(id, "Closed", data.closedBy || currentUser.name);
        },
        onCancel: () => setConfirmModal({ show: false })
      });
      return;
    }
     try {
      const nowISO = new Date().toISOString();
      const timelineEvent = { action: `Status changed to ${status}`, by: currentUser.name, date: nowISO, note: status === "Closed" ? `Closed by: ${closedByName}` : "" };
      const updated = { ...p, status, updated: nowISO, ...(status === "Closed" ? { closedBy: closedByName } : {}), timeline: [...(p.timeline || []), timelineEvent] };
      await axios.put(`${PROJECTS_API}/${id}`, updated);
      setProjects(prev => prev.map(x => x.id === id ? { ...updated, updated: new Date(nowISO) } : x));
      if (selProject?.id === id) setSelProject(s => ({ ...updated, updated: new Date(nowISO) }));
    } catch (e) { setCustomAlert({ show: true, message: "Failed to update project status", type: "error" }); }
  };

  const deleteProject = async (id) => {
    setConfirmModal({
      show: true, title: "Delete Project",
      confirmLabel: "Delete", confirmDanger: true, message: "Are you sure you want to delete this project? This cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${PROJECTS_API}/${id}`);
          setProjects(prev => prev.filter(p => p.id !== id));
          setSelProject(null);
          setCustomAlert({ show: true, message: "✅ Project deleted!", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to delete project: " + (e.response?.data?.error || e.message), type: "error" });
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      },
      onCancel: () => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null })
    });
  };

  // ✅ NEW: Department management functions
  const addDept = async () => {
    if (!newDept?.name?.trim()) {
      setCustomAlert({ show: true, message: "Department name required", type: "error" });
      return;
    }
    if (!newDept?.orgName?.trim()) {
      setCustomAlert({ show: true, message: "Please select an organization for this department", type: "error" });
      return;
    }
    if (departments.some(d => d.name.trim().toLowerCase() === newDept.name.trim().toLowerCase() && d.orgName === newDept.orgName.trim())) {
      setCustomAlert({ show: true, message: `⚠️ Department "${newDept.name.trim()}" already exists under ${newDept.orgName.trim()}`, type: "error" });
      return;
    }
    try {
      const dept = await axios.post(`${BASE_URL}/departments`, { name: newDept.name.trim(), orgName: newDept.orgName.trim() });
      setDepartments([...departments, dept.data]);
      setNewDept({ name: "", orgName: "" });
      setCustomAlert({ show: true, message: "✅ Department added!", type: "success" });
      addDailyNotif({ type: "dept_added", icon: "🏛", text: `${currentUser.name} added department "${dept.data.name}" under ${dept.data.orgName}`, by: currentUser.name });
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to add department", type: "error" });
    }
  };

  const deleteDept = async (id) => {
    setConfirmModal({
      show: true, title: "Delete Department",
      confirmLabel: "Delete", confirmDanger: true, message: "Are you sure you want to delete this department?",
      onConfirm: async () => {
        try {
          await axios.delete(`${BASE_URL}/departments/${id}`);
          setDepartments(departments.filter(d => d.id !== id));
          setCustomAlert({ show: true, message: "✅ Department deleted!", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to delete department", type: "error" });
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      },
      onCancel: () => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null })
    });
  };

  return { handleProjectSubmit,addProjCC,updateProjectStatus,deleteProject,addDept,deleteDept, };
}
