import { useState } from "react";
import axios from "axios";
import { ORGS_API, CATEGORIES_API, USERS_API, CUSTOM_ATTRS_API, BASE_URL } from "../constants/api";
/**
 * Organisation, category, user, and custom-attribute CRUD handlers.
 */
export function useSettingsHandlers(ctx) {
  const {
    orgs, setOrgs,
    categories, setCategories,
    users, setUsers,
    customAttrs, setCustomAttrs,
    currentUser,
    newOrg, setNewOrg,
    newCat, setNewCat,
    newUser, setNewUser,
    newAttr, setNewAttr,
    attrLayout, setAttrLayout,
    showAttrLayoutModal, setShowAttrLayoutModal,
    draftLayout, setDraftLayout,
    setCustomAlert,
    setConfirmModal,
    setTickets,
    setTicketCategories,
    addDailyNotif,
    departments,setDepartments,
    newSubcategory, setNewSubcategory,
    newSubcatCatId, setNewSubcatCatId,
    passwordForm, setPasswordForm,
    setShowChangePassword,
  } = ctx;

  // ─── SETTINGS HANDLERS (v1 API) ────────────────────────────────────────────
  const [editingOrgId, setEditingOrgId] = useState(null);
  const [editingOrgData, setEditingOrgData] = useState({ domain: "", phone: "" });
  const addOrg = async () => {
    if (!newOrg.name) return;
    if (orgs.some(o => o.name.trim().toLowerCase() === newOrg.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Organization "${newOrg.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const res = await axios.post(ORGS_API, newOrg);
      const created = res.data; // ✅ Extract the actual data
      setOrgs([...orgs, created]);
      setNewOrg({ name: "", domain: "", phone: "" });
      addDailyNotif({ type: "org_added", icon: "🏢", text: `${currentUser.name} added organization "${created.name}"`, by: currentUser.name });
    } catch (err) { setCustomAlert({ show: true, message: "Failed to add organization", type: "error" }); }
  };

  const addCat = async () => {
    if (!newCat.name) return;
    if (categories.some(c => c.name.trim().toLowerCase() === newCat.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Category "${newCat.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const res = await axios.post(CATEGORIES_API, newCat);
      const created = res.data; // ✅ Extract the actual data
      setCategories([...categories, created]);
      setNewCat({ name: "", color: "#3b82f6" });
      addDailyNotif({ type: "category_added", icon: "🏷", text: `${currentUser.name} added category "${created.name}"`, by: currentUser.name });
    } catch (err) { setCustomAlert({ show: true, message: "Failed to add category", type: "error" }); }
  };
  const updateCatSubcategories = async (catId, subcategories) => {
    try {
      const res = await axios.put(`${CATEGORIES_API}/${catId}`, { subcategories });
      setCategories(categories.map(c => c.id === catId ? { ...c, subcategories } : c));
    } catch { setCustomAlert({ show: true, message: "Failed to update subcategories", type: "error" }); }
  };
  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setCustomAlert({ show: true, message: "Name, email, and password are required", type: "error" });
      return;
    }
    if (newUser.password.length < 6) {
      setCustomAlert({ show: true, message: "Password must be at least 6 characters", type: "error" });
      return;
    }
    if (users.some(u => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ A user with email "${newUser.email.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      // Admin is setting the password for the user
      const response = await axios.post(USERS_API, {
        ...newUser,
        active: true,
        status: "Off Duty"
      });

      const created = response.data;
      setUsers([...users, created]);

      // ✅ Custom success alert instead of system alert
      setCustomAlert({ show: true, message: `User "${created.name}" created successfully with temporary password`, type: "success" });
      addDailyNotif({ type: "user_added", icon: "👤", text: `${currentUser.name} added user "${created.name}" (${created.role})`, by: currentUser.name });

      // Reset form
      setNewUser({ name: "", email: "", password: "", role: "Viewer" });

      // Auto-hide success alert after 3 seconds
    } catch (err) {
      console.error("Error adding user:", err);
      const msg = err.response?.data?.error || err.message || "Failed to add user";
      setCustomAlert({ show: true, message: msg, type: "error" });
    }
  };

  // ✅ NEW: Change Password Function
  const changePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setCustomAlert({ show: true, message: "All password fields are required", type: "error" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setCustomAlert({ show: true, message: "New passwords do not match", type: "error" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setCustomAlert({ show: true, message: "Password must be at least 6 characters", type: "error" });
      return;
    }

    // ✅ Show custom confirmation modal instead of window.confirm
    setConfirmModal({
      show: true,
      title: "Change Password?",
      confirmLabel: "Change Password",
      message: "Are you sure you want to change your password? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.put(`${USERS_API}/${currentUser.id}`, {
            ...currentUser,
            password: passwordForm.newPassword,
            oldPassword: passwordForm.oldPassword
          });

          setCustomAlert({ show: true, message: "Password changed successfully!", type: "success" });
          setShowChangePassword(false);
          setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });

          // Auto-hide success alert after 3 seconds
        } catch (err) {
          console.error("Error changing password:", err);
          setCustomAlert({ show: true, message: err.message || "Failed to change password", type: "error" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      }
    });
  };
  // --- ORGANIZATIONS ---
  const deleteOrg = async (id) => {
    setConfirmModal({
      show: true,
      title: "Delete Organization?",
      confirmLabel: "Delete", confirmDanger: true,
      message: "Are you sure you want to delete this organization? All associated data will be permanently removed. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const orgToDelete = orgs.find(o => o.id === id);
          const deptsToDelete = orgToDelete ? departments.filter(d => d.orgName === orgToDelete.name) : [];
          for (const dept of deptsToDelete) {
            await axios.delete(`${BASE_URL}/departments/${dept.id}`);
          }
          await axios.delete(`${ORGS_API}/${id}`);
          setOrgs(prev => prev.filter(o => o.id !== id));
          if (orgToDelete) setDepartments(prev => prev.filter(d => d.orgName !== orgToDelete.name));
          setCustomAlert({ show: true, message: "Organization deleted successfully", type: "success" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        } catch (err) {
          console.error("Error deleting organization:", err);
          setCustomAlert({ show: true, message: "Failed to delete organization", type: "error" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      }
    });
  };

  // --- CATEGORIES ---
  const deleteCat = async (id) => {
    if (!id || typeof id === 'object') {
      setCustomAlert({ show: true, message: "Cannot delete: This category has no valid ID. It is likely corrupted data.", type: "error" });
      return;
    }

    setConfirmModal({
      show: true,
      title: "Delete Category?",
      confirmLabel: "Delete", confirmDanger: true,
      message: "Are you sure you want to delete this category? All tickets associated with this category will be affected. This action cannot be undone.",
      onConfirm: async () => {
        try {
          const deletedCatName = categories.find(c => c.id === id || c._id === id)?.name;
          await axios.delete(`${CATEGORIES_API}/${id}`);
          setCategories(prev => prev.filter(c => c.id !== id && c._id !== id));
          setTicketCategories(prev => prev.filter(c => c.id !== id && c._id !== id));
          if (deletedCatName) {
            setTickets(prev => prev.map(t => t.category === deletedCatName ? { ...t, category: "Uncategorised" } : t));
          }
          setCustomAlert({ show: true, message: "Category deleted successfully", type: "success" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        } catch (err) {
          console.error("Error deleting category:", err);
          setCustomAlert({ show: true, message: "Failed to delete category", type: "error" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      }
    });
  };

  // --- USERS ---
  const deleteUser = async (id) => {
    const user = users.find(u => u.id === id);
    if (!["Admin", "Manager"].includes(currentUser?.role)) {
      setCustomAlert({ show: true, message: "You don't have permission to delete users.", type: "error" });
      return;
    }
    setConfirmModal({
      show: true,
      title: `Delete ${user?.name}?`,
      confirmLabel: "Delete", confirmDanger: true,
      message: `Delete ${user?.name}? Tickets unassigned. All personal data removed. Cannot undo.`,
      onConfirm: async () => {
        try {
          // ✅ 1. Unassign all tickets
          const ticketsToUpdate = tickets.filter(t => t.assignees?.some(a => a.id === id));
          for (const ticket of ticketsToUpdate) {
            const updatedAssignees = (ticket.assignees || []).filter(a => a.id !== id);
            await axios.put(`${TICKETS_API}/${ticket.id}`, { ...ticket, assignees: updatedAssignees });
          }

          // ✅ 2. Delete personal notifications
          try {
            const personalNotifs = await axios.get(`${NOTIFICATIONS_API}?userId=${id}`);
            for (const notif of personalNotifs.data || []) {
              await axios.delete(`${NOTIFICATIONS_API}/${notif.id}`).catch(() => { });
            }
          } catch (e) { }

          // ✅ 3. Delete user
          await axios.delete(`${USERS_API}/${id}`);

          // Update local state
          setUsers(prev => prev.filter(u => u.id !== id));
          setTickets(tickets.map(t =>
            ticketsToUpdate.some(tu => tu.id === t.id)
              ? { ...t, assignees: (t.assignees || []).filter(a => a.id !== id) }
              : t
          ));

          setCustomAlert({ show: true, message: `✅ ${user?.name} deleted. ${ticketsToUpdate.length} ticket(s) unassigned.`, type: "success" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        } catch (err) {
          console.error("Error deleting user:", err);
          setCustomAlert({ show: true, message: "Failed to delete user", type: "error" });
          setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
        }
      },
      onCancel: () => {
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      }
    });
  };

  // ✅ NEW: Admin can edit user name and password
  const editUser = async () => {
    if (!editUserForm.name) {
      setCustomAlert({ show: true, message: "⚠️ Name is required", type: "error" });
      return;
    }
    if (editUserForm.password && editUserForm.password.length < 6) {
      setCustomAlert({ show: true, message: "⚠️ Password must be at least 6 characters", type: "error" });
      return;
    }
    // Guard: only Admin/Manager can edit users
    if (!["Admin", "Manager"].includes(currentUser?.role)) {
      setCustomAlert({ show: true, message: "You don't have permission to edit users.", type: "error" });
      return;
    }

    try {
      const updates = {
        name: editUserForm.name,
        email: editUserForm.email,
        _isSystemUpdate: true
      };
      // Only send password if it was changed
      if (editUserForm.password) {
        updates.password = editUserForm.password;
      }

      await axios.put(`${USERS_API}/${editUserOpen.id}`, updates);
      setUsers(users.map(u => u.id === editUserOpen.id ? { ...u, ...updates } : u));

      setCustomAlert({ show: true, message: `✅ ${editUserForm.name}'s profile has been updated`, type: "success" });
      setEditUserOpen(null);
      setEditUserForm({ name: "", email: "", password: "" });
    } catch (err) {
      console.error("Error editing user:", err);
      setCustomAlert({ show: true, message: "Failed to update user", type: "error" });
    }
  };

  const addAttr = async () => {
    if (!newAttr.name) return;
    try {
      const payload = {
        ...newAttr,
        options: typeof newAttr.options === "string"
          ? newAttr.options.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        section: newAttr.section || "grid",
        sortOrder: customAttrs.length
      };
      const response = await axios.post(CUSTOM_ATTRS_API, payload);
      const created = response.data;
      const updated = [...customAttrs, created];
      setCustomAttrs(updated);
      setNewAttr({ name: "", type: "text", options: "", required: false, section: "grid", sortOrder: 0 });
      // Open layout modal with a draft copy
      setDraftLayout(updated.map((a, i) => ({ ...a, sortOrder: a.sortOrder ?? i })));
      setShowAttrLayoutModal(true);
    } catch (err) {
      console.error("Error adding attribute:", err);
      setCustomAlert({ show: true, message: "Failed to add attribute", type: "error" });
    }
  };

  const saveLayoutDraft = async () => {
    // Assign sortOrders based on current draft order and persist
    const withOrders = draftLayout.map((a, i) => ({ ...a, sortOrder: i }));
    try {
      await Promise.all(withOrders.map(a => axios.put(`${CUSTOM_ATTRS_API}/${a.id}`, a)));
      setCustomAttrs(withOrders);
      setShowAttrLayoutModal(false);
      setCustomAlert({ show: true, message: "✅ Field layout saved!", type: "success" });
    } catch (err) {
      console.error("Error saving layout:", err);
      setCustomAlert({ show: true, message: "Failed to save layout", type: "error" });
    }
  };

  // Update a custom attr's section/sortOrder (layout designer)
  const updateAttrLayout = async (id, changes) => {
    try {
      const attr = customAttrs.find(a => a.id === id);
      if (!attr) return;
      const updated = { ...attr, ...changes };
      await axios.put(`${CUSTOM_ATTRS_API}/${id}`, updated);
      setCustomAttrs(customAttrs.map(a => a.id === id ? updated : a));
    } catch (err) {
      console.error("Error updating attribute layout:", err);
      setCustomAlert({ show: true, message: "Failed to update field layout", type: "error" });
    }
  };

  // Reorder attrs by dragging (persists all sortOrders)
  const reorderAttrs = async (fromIdx, toIdx) => {
    const arr = [...customAttrs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const moved = arr.splice(fromIdx, 1)[0];
    arr.splice(toIdx, 0, moved);
    const updated = arr.map((a, i) => ({ ...a, sortOrder: i }));
    setCustomAttrs(updated);
    try {
      await Promise.all(updated.map(a => axios.put(`${CUSTOM_ATTRS_API}/${a.id}`, a)));
    } catch (err) {
      console.error("Error reordering attributes:", err);
    }
  };

  // ✅ NEW: Delete Custom Attribute
  const deleteAttr = async (id) => {
    setConfirmModal({
      show: true, title: "Delete Attribute",
      confirmLabel: "Delete", confirmDanger: true, message: "Are you sure you want to delete this custom attribute? This cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${CUSTOM_ATTRS_API}/${id}`);
          setCustomAttrs(customAttrs.filter(a => a.id !== id));
          setCustomAlert({ show: true, message: "✅ Attribute deleted!", type: "success" });
        } catch (err) {
          console.error("Error deleting attribute:", err);
          setCustomAlert({ show: true, message: "Failed to delete attribute", type: "error" });
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      },
      onCancel: () => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null })
    });
  };


  return { addOrg,addCat,updateCatSubcategories,addUser,deleteOrg,deleteCat,deleteUser,addAttr,saveLayoutDraft,updateAttrLayout,deleteAttr,changePassword,editUser, };

}
