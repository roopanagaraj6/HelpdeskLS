import axios from "axios";
import { LOCATIONS_API, VENDORS_API } from "../constants/api";

/**
 * Location and vendor CRUD handlers.
 */
export function useLocationHandlers(ctx) {
  const {
    locations, setLocations,
    vendors, setVendors,
    newLocation, setNewLocation,
    newVendor, setNewVendor,
    setShowAddVendorModal,
    setCustomAlert,
    setConfirmModal,
    currentUser,
    addDailyNotif,
    filteredProjects,
    selectedProjIds, setSelectedProjIds,
  } = ctx;

  // ── LOCATION MANAGEMENT ──
  const addLocation = async () => {
    if (!newLocation?.name?.trim()) {
      setCustomAlert({ show: true, message: "Location name required", type: "error" });
      return;
    }
    if (locations.some(l => l.name.trim().toLowerCase() === newLocation.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Location "${newLocation.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const loc = await axios.post(LOCATIONS_API, newLocation);
      setLocations([...locations, loc.data]);
      setNewLocation({ name: "" });
      setCustomAlert({ show: true, message: "✅ Location added!", type: "success" });
      addDailyNotif({ type: "location_added", icon: "📍", text: `${currentUser.name} added location "${loc.data.name}"`, by: currentUser.name });
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to add location", type: "error" });
    }
  };

  const deleteLocation = async (id) => {
    setConfirmModal({
      show: true, title: "Delete Location",
      confirmLabel: "Delete", confirmDanger: true, message: "Are you sure you want to delete this location?",
      onConfirm: async () => {
        try {
          await axios.delete(`${LOCATIONS_API}/${id}`);
          setLocations(locations.filter(l => l.id !== id));
          setCustomAlert({ show: true, message: "✅ Location deleted!", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to delete location", type: "error" });
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      },
      onCancel: () => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null })
    });
  };

  // ✅ NEW: Vendor Management Functions
  const addVendor = async () => {
    if (!newVendor?.name?.trim()) {
      setCustomAlert({ show: true, message: "Vendor name required", type: "error" });
      return;
    }
    if (vendors.some(v => v.name.trim().toLowerCase() === newVendor.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Vendor "${newVendor.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const vend = await axios.post(VENDORS_API, newVendor);
      setVendors([...vendors, vend.data]);
      setNewVendor({ name: "", email: "", phone: "", address: "" });
      setCustomAlert({ show: true, message: "✅ Vendor added!", type: "success" });
      addDailyNotif({ type: "vendor_added", icon: "🏭", text: `${currentUser.name} added vendor "${vend.data.name}"`, by: currentUser.name });
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to add vendor", type: "error" });
    }
  };

  const deleteVendor = async (id) => {
    setConfirmModal({
      show: true, title: "Delete Vendor",
      confirmLabel: "Delete", confirmDanger: true, message: "Are you sure you want to delete this vendor?",
      onConfirm: async () => {
        try {
          await axios.delete(`${VENDORS_API}/${id}`);
          setVendors(vendors.filter(v => v.id !== id));
          setCustomAlert({ show: true, message: "✅ Vendor deleted!", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to delete vendor", type: "error" });
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
      },
      onCancel: () => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null })
    });
  };

  const toggleProjSel = id => { const s = new Set(selectedProjIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedProjIds(s); };
  const toggleAllProj = () => (filteredProjects||[]).length > 0 && selectedProjIds.size === filteredProjects.length ? setSelectedProjIds(new Set()) : setSelectedProjIds(new Set((filteredProjects||[]).map(p => p.id)));
  const selProjects = (filteredProjects||[]).filter(p => selectedProjIds.has(p.id));  const addTicketCat = async () => {
    if (!newTicketCat.name) return;
    if (ticketCategories.some(c => c.name.trim().toLowerCase() === newTicketCat.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Category "${newTicketCat.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const res = await axios.post(CATEGORIES_API, newTicketCat);
      const created = res.data;
      setTicketCategories(prev => [...prev, created]);
      setCategories(prev => [...prev, created]);
      setNewTicketCat({ name: "", color: "#3b82f6" });
    } catch (e) { setCustomAlert({ show: true, message: "Failed to add category", type: "error" }); }
  };
  const addProjCat = async () => {
    if (!newProjCat.name) return;
    if (projectCategories.some(c => c.name.trim().toLowerCase() === newProjCat.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Category "${newProjCat.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const res = await axios.post(CATEGORIES_API, newProjCat);
      const created = res.data;
      setProjectCategories(prev => [...prev, created]);
      setCategories(prev => [...prev, created]);
      setNewProjCat({ name: "", color: "#8b5cf6" });
    } catch (e) { setCustomAlert({ show: true, message: "Failed to add project category", type: "error" }); }
  };
  const addTicketAttr = async () => {
    if (!newTicketAttr.name) return;
    if (ticketCustomAttrs.some(a => a.name.trim().toLowerCase() === newTicketAttr.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Attribute "${newTicketAttr.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const payload = { ...newTicketAttr, options: typeof newTicketAttr.options === "string" ? newTicketAttr.options.split(",").map(s => s.trim()).filter(Boolean) : [] };
      const res = await axios.post(CUSTOM_ATTRS_API, payload);
      const created = res.data;
      setTicketCustomAttrs(prev => [...prev, created]);
      setCustomAttrs(prev => [...prev, created]);
      setNewTicketAttr({ name: "", type: "text", options: "", required: false });
    } catch (e) { setCustomAlert({ show: true, message: "Failed to add attribute", type: "error" }); }
  };
  const addProjAttr = async () => {
    if (!newProjAttr.name) return;
    if (projectCustomAttrs.some(a => a.name.trim().toLowerCase() === newProjAttr.name.trim().toLowerCase())) {
      setCustomAlert({ show: true, message: `⚠️ Attribute "${newProjAttr.name.trim()}" already exists`, type: "error" });
      return;
    }
    try {
      const payload = { ...newProjAttr, options: typeof newProjAttr.options === "string" ? newProjAttr.options.split(",").map(s => s.trim()).filter(Boolean) : [] };
      const res = await axios.post(CUSTOM_ATTRS_API, payload);
      const created = res.data;
      setProjectCustomAttrs(prev => [...prev, created]);
      setCustomAttrs(prev => [...prev, created]);
      setNewProjAttr({ name: "", type: "text", options: "", required: false });
    } catch (e) { setCustomAlert({ show: true, message: "Failed to add project attribute", type: "error" }); }
  };


  return { addLocation,deleteLocation,addVendor,deleteVendor,addTicketCat,addProjCat,addTicketAttr,addProjAttr, };
}
