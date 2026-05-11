import axios from "axios";
import { TICKETS_API, IMPORT_API, BASE_URL, USERS_API, ORGS_API, CATEGORIES_API, NOTIFICATIONS_API } from "../constants/api";
import { exportCSV, exportJSON, exportPrint } from "../utils/exportHelpers";

/**
 * All ticket CRUD, import/export, selection, and status-change handlers.
 * Call from HelpDesk and spread the return value into local scope.
 *
 * @param {object} ctx  — destructure all needed state + setters from here
 */
export function useTicketHandlers(ctx) {
  const {
    tickets, setTickets,
    filtered,
    departments,
    users, orgs, categories, customAttrs, projects,
    currentUser,
    form, setForm,
    selectedIds, setSelectedIds,
    setCustomAlert,
    setSelTicket,
    setShowNewTicket, setShowAssigneeDD, setAssigneeSearch,
    setShowRemarkModal, setClosingTicketId, setPendingTicketStatus, setClosedBy,
    setTicketRemark, setClosedDate, setMinutes,
    setCcInput,
    setDeleteConfirmation,
    setTicketImage, setTicketImagePreview,
    exportFilterType, exportFilterValue, exportFormat, targetTable,
    advancedExportFilters,
  } = ctx;
  const allSortedTickets = filtered ?? [];
  const currentTickets = allSortedTickets;

  // ─── TICKET HANDLERS (v1 API) ──────────────────────────────────────────────
  const handleSelectiveImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let payload = [];
        const content = event.target.result;

        if (file.name.endsWith(".csv")) {
          const lines = content.split("\n").filter(l => l.trim() !== "");
          if (lines.length < 2) {
            setCustomAlert({ show: true, message: "CSV file is empty", type: "error" });
            return;
          }

          const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

          payload = lines.slice(1).map(line => {
            const values = line.split(",").map(v => v.trim());
            let row = {};

            // Parse each header and value
            headers.forEach((header, i) => {
              let val = values[i] || "";

              // Remove quotes if present
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
              }

              // Skip empty values and password
              if (val === "" || header === "password") return;

              // Map field names
              if (header === "organization") {
                row["org"] = val;
              } else if (header === "firstname") {
                row["firstName"] = val;
              } else if (header === "lastname") {
                row["lastName"] = val;
              } else if (header === "middlename") {
                row["middleName"] = val;
              } else if (header === "countrycode") {
                row["countryCode"] = val;
              } else {
                row[header] = val;
              }
            });

            // Apply defaults and validations for users
            if (targetTable === "users") {
              // ✅ FIXED: Generate password automatically if not provided
              if (!row.password) {
                row.password = "TempPass_" + Math.random().toString(36).slice(-10);
              }

              // ✅ Ensure required fields have defaults
              if (!row.name) {
                row.name = `${row.firstName || "User"} ${row.lastName || ""}`.trim() || "Imported User";
              }
              if (!row.email) {
                row.email = `user_${Date.now()}_${Math.random().toString(36).slice(-5)}@imported.local`;
              }

              // ✅ Validate role
              if (row.role) {
                const validRoles = ["Admin", "Manager", "Agent", "Viewer"];
                const cleaned = row.role.charAt(0).toUpperCase() + row.role.slice(1).toLowerCase();
                row.role = validRoles.includes(cleaned) ? cleaned : "Viewer";
              } else {
                row.role = "Viewer";
              }

              // ✅ Set defaults for optional fields
              if (row.active === undefined || row.active === "") row.active = true;
              if (row.status === undefined || row.status === "") row.status = "Off Duty";
              if (row.confirmed === undefined || row.confirmed === "") row.confirmed = true;
            }

            return row;
          }).filter(row => row && (row.email || row.name)); // Only include non-empty rows
        } else {
          // JSON import
          let cleaned = content.trim().replace(/^\uFEFF/, "").replace(/\0/g, "")
            .replace(/,(\s*\])/g, "$1")
            .replace(/,(\s*\})/g, "$1");
          payload = JSON.parse(cleaned);
          if (!Array.isArray(payload)) {
            payload = [payload];
          }

          // Apply same defaults for users in JSON
          if (targetTable === "users") {
            payload = payload.map(row => {
              if (!row.password) {
                row.password = "TempPass_" + Math.random().toString(36).slice(-10);
              }
              if (!row.name && row.firstName) {
                row.name = `${row.firstName} ${row.lastName || ""}`.trim();
              }
              if (!row.email) {
                row.email = `user_${Date.now()}_${Math.random().toString(36).slice(-5)}@imported.local`;
              }
              if (row.role) {
                const validRoles = ["Admin", "Manager", "Agent", "Viewer"];
                const cleaned = row.role.charAt(0).toUpperCase() + row.role.slice(1).toLowerCase();
                row.role = validRoles.includes(cleaned) ? cleaned : "Viewer";
              } else {
                row.role = "Viewer";
              }
              if (row.active === undefined) row.active = true;
              if (row.status === undefined) row.status = "Off Duty";
              if (row.confirmed === undefined) row.confirmed = true;
              return row;
            });
          }
        }

        // ✅ Map to direct API endpoints
        const IMPORT_TABLES = ["tickets", "webcasts", "projects"];
        const API_MAP = {
          tickets: `${BASE_URL}/import/tickets`,
          webcasts: `${BASE_URL}/import/webcasts`,
          projects: `${BASE_URL}/import/projects`,
          users: USERS_API,
          orgs: ORGS_API,
          categories: CATEGORIES_API,
          departments: `${BASE_URL}/departments`
        };

        const apiEndpoint = API_MAP[targetTable];
        if (!apiEndpoint) {
          setCustomAlert({ show: true, message: `Unknown table: ${targetTable}`, type: "error" });
          return;
        }

        // For departments: deduplicate — skip if same name + same orgName already exists
        if (targetTable === "departments") {
          const existingKeys = new Set(departments.map(d => `${(d.orgName || "General").toLowerCase()}::${d.name.trim().toLowerCase()}`));
          payload = payload.filter(row => {
            const key = `${(row.orgName || row.org_name || "General").toLowerCase()}::${(row.name || "").trim().toLowerCase()}`;
            return !existingKeys.has(key);
          });
          // Normalize field names
          payload = payload.map(row => ({
            name: (row.name || "").trim(),
            orgName: (row.orgName || row.org_name || row.org || "General").trim(),
          })).filter(row => row.name);
        }

        // Import each item individually to the database
        let successCount = 0;
        let failedCount = 0;

        if (IMPORT_TABLES.includes(targetTable)) {
          try {
            await axios.post(apiEndpoint, payload);
            successCount = payload.length;
          } catch (err) {
            console.error(`Failed to import:`, err);
            failedCount = payload.length;
          }
        } else {
          for (const item of payload) {
            try {
              await axios.post(apiEndpoint, item);
              successCount++;
            } catch (itemErr) {
              console.error(`Failed to import item:`, item, itemErr);
              failedCount++;
            }
          }
        }
        setCustomAlert({
          show: true,
          message: `✅ ${successCount}/${payload.length} ${targetTable} imported successfully!${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
          type: successCount > 0 ? "success" : "error"
        });

        if (successCount > 0) {
          loadData();
        }

        e.target.value = null;
      } catch (err) {
        console.error(err);
        setCustomAlert({
          show: true,
          message: "Import failed: " + (err.response?.data?.error || err.message),
          type: "error"
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    // Map target to the state variables you already have
    const DATA_MAP = {
      tickets: tickets,
      users: users,
      orgs: orgs,
      categories: categories,
      departments: departments
    };

    let dataToExport = DATA_MAP[targetTable] || [];

    // Apply filters based on export filter type
    if (targetTable === "tickets") {
      if (exportFilterType === "assignee" && exportFilterValue) {
        dataToExport = dataToExport.filter(t =>
          t.assignees?.some(a => a.id === exportFilterValue || a.name === exportFilterValue)
        );
      } else if (exportFilterType === "category" && exportFilterValue) {
        dataToExport = dataToExport.filter(t => t.category === exportFilterValue);
      } else if (exportFilterType === "type" && exportFilterValue) {
        if (exportFilterValue === "webcast") {
          dataToExport = dataToExport.filter(t => isTrueWebcast(t));
        } else if (exportFilterValue === "ticket") {
          dataToExport = dataToExport.filter(t => !isTrueWebcast(t));
        }
      }
    } else if (targetTable === "users" && exportFilterType === "role" && exportFilterValue) {
      dataToExport = dataToExport.filter(u => u.role === exportFilterValue);
    } else if (targetTable === "orgs" && exportFilterType === "domain" && exportFilterValue) {
      dataToExport = dataToExport.filter(o => o.domain === exportFilterValue);
    } else if (targetTable === "categories" && exportFilterType === "color" && exportFilterValue) {
      dataToExport = dataToExport.filter(c => c.color === exportFilterValue);
    } else if (targetTable === "departments" && exportFilterType === "org" && exportFilterValue) {
      dataToExport = dataToExport.filter(d => (d.orgName || "General") === exportFilterValue);
    }

    if (dataToExport.length === 0) {
      setCustomAlert({ show: true, message: `No ${targetTable} data found with selected filter`, type: "error" });
      return;
    }

    const exportReady = targetTable === "tickets"
      ? dataToExport.map(({ image, timeline, comments, ...rest }) => rest)
      : dataToExport;
    const blob = new Blob([JSON.stringify(exportReady, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetTable}_export_${exportFilterType !== "all" ? exportFilterValue + "_" : ""}${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ✅ NEW: Compress image to base64 with minimal size
  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxWidth = 640;
        const maxHeight = 480;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        callback(compressed);
      };
    };
  };

  const handleSubmit = async () => {
    if (!form.summary || !form.org || !form.priority || !form.category || !form.description?.trim()) return setCustomAlert({ show: true, message: "Organization, Summary, Priority, Category and Description are required", type: "error" });

    // ✅ NEW: Validate webcast fields if category is Webcast
    if (form.category === "Webcast") {
      if (!form.satsangType || !form.location) {
        return setCustomAlert({ show: true, message: "Satsang Type and Location are required for Webcast", type: "error" });
      }
    }

    // ✅ FIXED: Build ticket data with only valid fields
    const newT = {
      summary: form.summary.trim(),
      description: form.description || "",
      org: form.org.trim(),
      department: form.department || "",
      contact: form.contact || "",
      reportedBy: form.reportedBy || "",
      assignees: Array.isArray(form.assignees) ? form.assignees : [],
      cc: Array.isArray(form.cc) ? form.cc : [],
      priority: form.priority || "Medium",
      category: form.category || "",
      status: "Open",
      customAttrs: (typeof form.customAttrs === 'object' && !Array.isArray(form.customAttrs)) ? form.customAttrs : {},
      dueDate: form.dueDate || null,
      location: form.location || "",
      image: ticketImage || null,
      comments: [],
      timeline: [{ action: "Created", by: currentUser.name, date: new Date().toISOString(), note: "Ticket opened." + (ticketImage ? " [with image]" : "") }]
    };

    // ✅ FIXED: Only add webcast fields if category is Webcast
    if (form.category === "Webcast") {
      newT.isWebcast = true;
      newT.satsangType = form.satsangType || "";
      newT.location = form.location || "";
    }

    // ✅ NEW: If webcast, create separate entry and send to /api/webcasts
    if (form.category === "Webcast") {
      try {
        const baseWebcastData = {
          summary: form.summary,
          description: form.description,
          satsangType: form.satsangType,
          location: form.location,
          contact: form.contact,
          reportedBy: form.reportedBy,
          org: form.org,
          department: form.department,
          priority: form.priority,
          category: form.category,
          dueDate: form.dueDate || null,
          status: "Open",
          image: ticketImage || null,
          comments: [],
          timeline: [{ action: "Created", by: currentUser.name, date: new Date().toISOString(), note: "Webcast created." + (ticketImage ? " [with image]" : "") }]
        };

        const assigneeList = Array.isArray(form.assignees) && form.assignees.length > 0
          ? form.assignees
          : [null];
        const webcastsToCreate = assigneeList.length > 1
          ? assigneeList.map(a => ({ ...baseWebcastData, assignees: [a] }))
          : [{ ...baseWebcastData, assignees: form.assignees }];

        const createdWebcasts = [];
        for (const webcastData of webcastsToCreate) {
          const webcastRes = await axios.post(`${BASE_URL}/webcasts`, webcastData);
          const createdWebcast = webcastRes.data;
          createdWebcasts.push({
            ...createdWebcast,
            created: new Date(createdWebcast.createdAt || createdWebcast.created || new Date()),
            updated: new Date(createdWebcast.updatedAt || createdWebcast.updated || new Date())
          });
        }

        setTickets(prev => [...createdWebcasts, ...prev]);
        setSelTicket(createdWebcasts[0]);
        setShowNewTicket(false);
        setForm(emptyForm());
        setTicketImage(null);
        setTicketImagePreview(null);
        setAssigneeSearch("");
        setShowAssigneeDD(false);
        const msg = createdWebcasts.length > 1
          ? `✅ ${createdWebcasts.length} webcasts created (one per assignee)`
          : "✅ Webcast created successfully!";
        setCustomAlert({ show: true, message: msg, type: "success" });
        createdWebcasts.forEach(w => addDailyNotif({ type: "webcast_created", icon: "📡", text: `${currentUser.name} created webcast ${w.id}`, ticketId: w.id, by: currentUser.name }));
      } catch (e) {
        setCustomAlert({ show: true, message: "Failed to create webcast: " + (e.response?.data?.error || e.message), type: "error" });
      }
      return;
    }

    // ✅ Regular ticket creation
    // ✅ Regular ticket creation
    // If multiple assignees, create one ticket per assignee
    const assignees = Array.isArray(newT.assignees) ? newT.assignees : [];
    const ticketsToCreate = assignees.length > 1
      ? assignees.map(a => ({ ...newT, assignees: [a] }))
      : [newT];

    try {
      const createdTickets = [];
      for (const ticketData of ticketsToCreate) {
        const res = await axios.post(TICKETS_API, ticketData);
        const created = res.data;
        createdTickets.push({
          ...created,
          created: new Date(created.createdAt || created.created || new Date()),
          updated: new Date(created.updatedAt || created.updated || new Date())
        });
      }
      setTickets(prev => [...createdTickets, ...prev]);
      setSelTicket(createdTickets[0]);
      setShowNewTicket(false);
      setForm(emptyForm());
      setTicketImage(null);
      setTicketImagePreview(null);
      setAssigneeSearch("");
      setShowAssigneeDD(false);
      const msg = createdTickets.length > 1
        ? `✅ ${createdTickets.length} tickets created (one per assignee)`
        : "✅ Ticket created successfully!";
      setCustomAlert({ show: true, message: msg, type: "success" });
      createdTickets.forEach(t => addDailyNotif({ type: "ticket_created", icon: "🎫", text: `${currentUser.name} created ticket ${t.id}`, ticketId: t.id, by: currentUser.name }));
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to save ticket: " + (e.response?.data?.error || e.message), type: "error" });
    }
  };


  const deleteTicket = async (id) => {
    moveTicketToBin(id);
  };

  const toggleAssignee = u => { const e = form.assignees.find(a => a.id === u.id); setForm({ ...form, assignees: e ? form.assignees.filter(a => a.id !== u.id) : [...form.assignees, u] }); };
  const addCC = () => { if (ccInput && !form.cc.includes(ccInput)) { setForm({ ...form, cc: [...form.cc, ccInput] }); setCcInput(""); } };

  const updateStatus = async (id, status) => {
    // ✅ NEW: If closing ticket, ask for remark first
    if (status === "Closed" || status === "Open") {
      setClosingTicketId(id);
      setTicketRemark("");
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setClosedDate(now.toISOString().slice(0, 16));
      setShowRemarkModal(true);
      return;
    }

    const t = tickets.find(x => x.id === id); if (!t) return;
    try {
      const nowISO = new Date().toISOString();
      const newTimelineEvent = { action: `Status changed to ${status}`, by: currentUser.name, date: nowISO, note: "" };
      const updatedT = { ...t, status, updated: nowISO, timeline: [...(t.timeline || []), newTimelineEvent] };
      const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${id}` : `${TICKETS_API}/${id}`;
      await axios.put(apiUrl, updatedT);
      setTickets(p => p.map(x => x.id === id ? { ...updatedT, updated: new Date(nowISO) } : x));
      if (selTicket?.id === id) setSelTicket({ ...updatedT, updated: new Date(nowISO) });

      // ✅ NEW: Status-specific messages
      let statusMessage = "";
      switch (status) {
        case "Open":
          statusMessage = "📬 Ticket reopened";
          break;
        case "Bin":
          statusMessage = "🧹 Ticket moved to bin";
          break;
        default:
          statusMessage = "✅ Ticket status updated";
      }
      setCustomAlert({ show: true, message: statusMessage, type: "success" });

      // ✅ Reset pending status after successful update
      setPendingTicketStatus(null);

      if (status === "Closed" || status === "Bin") {
        addDailyNotif({ type: "ticket_closed", icon: "✅", text: `${currentUser.name} closed ticket ${id}`, ticketId: id, by: currentUser.name });
        // Notify all other assignees that ticket was closed
        const otherAssignees = (t.assignees || []).filter(a => a.id !== currentUser.id);
        for (const assignee of otherAssignees) {
          await axios.post(NOTIFICATIONS_API, {
            userId: assignee.id,
            type: "ticket_closed",
            title: `Ticket ${id} Closed`,
            message: `${currentUser.name} closed ticket "${t.summary}" which was also assigned to you.`,
            ticketId: id,
            read: false,
            createdAt: nowISO,
          }).catch(() => { });
        }
      } else {
        addDailyNotif({ type: "ticket_status", icon: "🔄", text: `${currentUser.name} changed ${id} to ${status}`, ticketId: id, by: currentUser.name });
      }
    } catch (e) { setCustomAlert({ show: true, message: "❌ Failed to update ticket", type: "error" }); }
  };

  // ✅ NEW: Close ticket with remark
    const closeTicketWithRemark = async () => {
    if (!ticketRemark.trim()) {
      setCustomAlert({ show: true, message: "⚠️ Remark is mandatory before closing the ticket", type: "error" });
      return;
    }
    const t = tickets.find(x => x.id === closingTicketId);
    const isReopening = t?.status === "Closed";
    if (!isReopening && !closedDate) {
      setCustomAlert({ show: true, message: "⚠️ Closed date is mandatory before closing the ticket", type: "error" });
      return;
    }
    if (!isReopening && !closedBy) {
      setCustomAlert({ show: true, message: "⚠️ Please select who closed this ticket", type: "error" });
      return;
    }

    if (!t) return;
    try {
      const nowISO = new Date().toISOString();
      const newStatus = t.status === "Closed" ? "Open" : "Closed";
      const closedByName = closedBy ? closedBy.name : currentUser.name;
      const newTimelineEvent = { action: `Status changed to ${newStatus}`, by: currentUser.name, date: nowISO, note: `Reason: ${ticketRemark}${closedBy ? ` · Closed by: ${closedBy.name}` : ""}${newStatus === "Closed" && closedDate ? ` · Closed Date: ${new Date(closedDate).toLocaleString()}` : ""}` };
      const updatedT = { ...t, status: newStatus, updated: nowISO, closedBy: newStatus === "Closed" ? closedByName : null, closedAt: newStatus === "Closed" ? (closedDate ? new Date(closedDate).toISOString() : nowISO) : null, timeline: [...(t.timeline || []), newTimelineEvent] };
      const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${closingTicketId}` : `${TICKETS_API}/${closingTicketId}`;
      await axios.put(apiUrl, updatedT);
      setTickets(p => p.map(x => x.id === closingTicketId ? { ...updatedT, updated: new Date(nowISO) } : x));
      if (selTicket?.id === closingTicketId) setSelTicket({ ...updatedT, updated: new Date(nowISO) });

      // Force re-fetch webcasts to ensure DB is in sync before next refresh
      try {
        const refreshed = await axios.get(`${BASE_URL}/webcasts/${closingTicketId}`);
        if (refreshed.data) {
          const fresh = { ...refreshed.data, created: new Date(refreshed.data.createdAt || refreshed.data.created), updated: new Date(refreshed.data.updatedAt || refreshed.data.updated) };
          setTickets(p => p.map(x => x.id === closingTicketId ? fresh : x));
        }
      } catch (_) { }
      addDailyNotif({ type: newStatus === "Closed" ? "ticket_closed" : "ticket_reopened", icon: newStatus === "Closed" ? "✅" : "🔄", text: `${currentUser.name} ${newStatus === "Closed" ? "closed" : "reopened"} ticket ${closingTicketId}`, ticketId: closingTicketId, by: currentUser.name });
      // Notify all other assignees that the ticket was closed
      const otherAssignees = (t.assignees || []).filter(a => a.id !== currentUser.id);
      for (const assignee of otherAssignees) {
        await axios.post(NOTIFICATIONS_API, {
          userId: assignee.id,
          type: newStatus === "Closed" ? "ticket_closed" : "ticket_reopened",
          title: `Ticket ${closingTicketId} ${newStatus === "Closed" ? "Closed" : "Reopened"}`,
          message: `${currentUser.name} ${newStatus === "Closed" ? "closed" : "reopened"} ticket "${t.summary}" which was also assigned to you.`,
          ticketId: closingTicketId,
          read: false,
          createdAt: nowISO,
        }).catch(() => { });
      }

      // Reset and close modals
      setShowRemarkModal(false);
      setClosingTicketId(null);
      setTicketRemark("");
      setClosedBy(null);
      setClosedDate("");
      setCustomAlert({ show: true, message: newStatus === "Closed" ? "✅ Ticket successfully closed" : "✅ Ticket successfully reopened", type: "success" });
      // Close the ticket details modal after 1 second to show the success message
      setTimeout(() => setSelTicket(null), 1000);
    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to close ticket", type: "error" });
      console.error(e);
    }
  };

  const toggleSel = id => { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s); };
  // Toggle only the tickets visible on the current page
  const toggleCurrentPage = () => {
    const pageIds = currentTickets.map(t => t.id);
    const allPageSelected = pageIds.every(id => selectedIds.has(id));
    const s = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach(id => s.delete(id));
    } else {
      pageIds.forEach(id => s.add(id));
    }
    setSelectedIds(s);
  };
  const clearAllTickets = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL tickets? This cannot be undone.")) return;
    try {
      await axios.delete(TICKETS_API);
      setTickets([]);
    } catch (err) {
      alert("Failed to clear tickets: " + (err.response?.data?.error || err.message));
    }
  };

  // Toggle all tickets in the current filtered/classified view (across all pages)
  const toggleAllFiltered = () => selectedIds.size === allSortedTickets.length && allSortedTickets.length > 0
    ? setSelectedIds(new Set())
    : setSelectedIds(new Set(allSortedTickets.map(t => t.id)));
  const toggleAll = () => selectedIds.size === filtered.length && filtered.length > 0 ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(t => t.id)));
  const selTickets = filtered.filter(t => selectedIds.has(t.id));

  const moveTicketToBin = async (id) => {
    const t = tickets.find(x => x.id === id);
    if (!t) return;

    setDeleteConfirmation({
      show: true,
      title: "Move to Bin?",
      message: `Move ticket "${t.summary}" to bin? It will be permanently deleted after 30 days.`,
      confirmLabel: "Move to Bin",
      confirmDanger: true,
      onConfirm: async () => {
        setDeleteConfirmation({ show: false });
        try {
          const nowISO = new Date().toISOString();
          const binTimelineEvent = { action: "Moved to Bin", by: currentUser.name, date: nowISO, note: `Previous status: ${t.status}` };
          const updatedT = { ...t, status: "Bin", updated: nowISO, timeline: [...(t.timeline || []), binTimelineEvent] };
          const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${id}` : `${TICKETS_API}/${id}`;
          await axios.put(apiUrl, updatedT);
          setTickets(p => p.map(x => x.id === id ? { ...updatedT, updated: new Date(nowISO) } : x));
          if (selTicket?.id === id) setSelTicket(null);
          setCustomAlert({ show: true, message: "✅ Ticket moved to bin", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to move ticket to bin", type: "error" });
        }
      },
      onCancel: () => setDeleteConfirmation({ show: false })
    });
  };

  const permanentlyDeleteTicket = async (id) => {
    setDeleteConfirmation({
      show: true,
      title: "Permanently Delete?",
      message: "⚠️ This action CANNOT be undone. The ticket will be permanently deleted from the system.",
      confirmLabel: "Delete Permanently",
      confirmDanger: true,
      onConfirm: async () => {
        setDeleteConfirmation({ show: false });
        try {
          const t = tickets.find(x => x.id === id);
          const apiUrl = isTrueWebcast(t) ? `${BASE_URL}/webcasts/${id}` : `${TICKETS_API}/${id}`;
          await axios.delete(apiUrl);
          setTickets(p => p.filter(x => x.id !== id));
          setCustomAlert({ show: true, message: "✅ Ticket permanently deleted", type: "success" });
        } catch (e) {
          setCustomAlert({ show: true, message: "Failed to delete ticket", type: "error" });
        }
      },
      onCancel: () => setDeleteConfirmation({ show: false })
    });
  };


  return { handleSelectiveImport, handleExport, handleSubmit, deleteTicket, toggleAssignee, addCC, updateStatus, toggleSel, toggleCurrentPage, toggleAllFiltered, toggleAll, compressImage };
}
