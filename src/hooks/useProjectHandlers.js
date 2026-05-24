import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { USERS_API, BASE_URL, PROJECTS_API } from "../constants/api";
import { saveSession, clearSession } from "../utils/session";
/**
 * Project CRUD, department management, and status-change handlers.
 */
export function useProjectHandlers(ctx) {
  const {
    projects, setProjects,
    orgs, users, categories, currentUser,
    projForm, setProjForm,
    selProject, setSelProject,
    setShowNewProject, setShowProjAssigneeDD,
    setCustomAlert, setConfirmModal,
    addDailyNotif,
    departments, setDepartments,
    newDept, setNewDept,
  } = ctx;

  const emptyProjectForm = { org: "", department: "", reportedBy: "", title: "", description: "", assignees: [], priority: "", category: "", status: "Open", location: "", dueDate: "", satsangType: "", progress: 0, customAttrs: {}, webcastId: null };

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

    // ✅ All projects (including Webcast category) go through /api/projects
    try {
      const res = await axios.post(PROJECTS_API, newP);
      const created = res.data;
      const projectWithDates = { ...created, created: new Date(created.createdAt || created.created), updated: new Date(created.updatedAt || created.updated), dueDate: created.dueDate ? new Date(created.dueDate) : null };
      setProjects(prev => [projectWithDates, ...prev]);
      setSelProject(projectWithDates);
      setShowNewProject(false);
      setProjForm(emptyProjectForm);
      const isWebcast = projForm.category === "Webcast";
      setCustomAlert({ show: true, message: isWebcast ? "✅ Webcast project created successfully!" : "✅ Project created successfully!", type: "success" });
      addDailyNotif({
        type: isWebcast ? "webcast_created" : "project_created",
        icon: isWebcast ? "📡" : "📁",
        text: `${currentUser.name} created ${isWebcast ? "webcast project" : "project"} "${projectWithDates.title || projectWithDates.id}"`,
        by: currentUser.name
      });
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
      // Only send fields the Project model has — no closedBy/timeline (not in schema)
      const payload = {
        status,
        ...(status === "Closed" ? { closedAt: nowISO } : {}),
        ...(status === "Open"   ? { closedAt: null }   : {}),
      };
      await axios.put(`${PROJECTS_API}/${id}`, payload);
      const updatedLocal = { ...p, ...payload, updated: new Date(nowISO) };
      setProjects(prev => prev.map(x => x.id === id ? updatedLocal : x));
      if (selProject?.id === id) setSelProject(updatedLocal);
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to update project status: " + (e.response?.data?.error || e.message), type: "error" });
    }
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