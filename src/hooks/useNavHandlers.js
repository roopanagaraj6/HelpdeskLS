import axios from "axios";
import { NOTIFICATIONS_API, TICKETS_API } from "../constants/api";

/**
 * Notification click, inbox read/accept/reject,
 * sideNav config, and page-title helpers.
 */
export function useNavHandlers(ctx) {
  const {
    currentUser,
    dailyNotifs, setBellUnread,
    setShowBellPanel, setShowInboxPanel,
    inboxItems, setInboxItems, setInboxUnread,
    seenActivityIds,
    setView, setTvFilter, setPvFilter, setSettingsTab,
    setSelTicket, setSelProject,
    tickets, setTickets, projects,
    users,
    setCustomAlert, addDailyNotif,
    view, cvd, cpv,
    switchView,
  } = ctx;

  // ─── NAVIGATION HELPERS ────────────────────────────────────────────────────

  const markBellRead = () => {
    // DO NOT auto-mark as read when bell is opened
    // Only mark as read when user actually CLICKS on the notification
  };

  // ✅ NEW: Mark a specific notification as read AND navigate to the source
  const handleNotificationClick = async (notification) => {
    // Mark this specific notification as read
    seenActivityIds.current.add(notification.dbId);
    try {
      localStorage.setItem("seenActivityIds", JSON.stringify(Array.from(seenActivityIds.current)));
    } catch (e) {
      console.error("Failed to save seenActivityIds:", e);
    }

    // Update bell unread count
    const unseenCount = dailyNotifs.filter(b => !seenActivityIds.current.has(b.dbId)).length;
    setBellUnread(unseenCount);

    // Close bell panel
    setShowBellPanel(false);

    // Navigate based on notification type (broadcastType)
    const notificationType = notification.type;

    try {
      switch (notificationType) {
        // ── TICKET EVENTS ──
        case "ticket_created":
        case "ticket_closed":
        case "ticket_status":
        case "ticket_edited":
        case "ticket_forwarded":
        case "forward_approved":
        case "forward_rejected":
          if (notification.ticketId) {
            let ticket = tickets.find(t => t.id === notification.ticketId);
            if (!ticket) {
              try {
                const res = await axios.get(`${TICKETS_API}/${notification.ticketId}`);
                ticket = res.data;
              } catch { }
            }
            if (ticket) {
              setSelTicket(ticket);
            } else {
              setCustomAlert({ show: true, message: "Ticket not found", type: "error" });
            }
          }
          break;

        // ── PROJECT EVENTS ──
        case "project_created":
          switchView("projects");
          break;

        // ── SETTINGS EVENTS (Department, Category, Organization, Location, Vendor, User) ──
        case "dept_added":
          switchView("settings");
          setSettingsTab("departments");
          break;

        case "category_added":
          switchView("settings");
          setSettingsTab("categories");
          break;

        case "org_added":
          switchView("settings");
          setSettingsTab("organizations");
          break;

        case "location_added":
          switchView("settings");
          setSettingsTab("locations");
          break;

        case "vendor_added":
          switchView("settings");
          setSettingsTab("vendors");
          break;

        case "user_added":
          switchView("settings");
          setSettingsTab("users");
          break;

        default:
          // Generic fallback - no popup, just silent
          break;
      }
    } catch (error) {
      console.error("Error navigating from notification:", error);
    }
  };

  const markInboxRead = async () => {
    setInboxUnread(0);
    const unread = inboxItems.filter(i => !i.read);
    setInboxItems(prev => prev.map(i => ({ ...i, read: true })));
    for (const item of unread) {
      try { await axios.put(`${NOTIFICATIONS_API}/${item.id}`, { ...item, read: true }); } catch { }
    }
  };

  // Accept a forward request from inbox (Admin/Manager action)
  const acceptInboxForwardRequest = async (item) => {
    try {
      let ticket = tickets.find(t => t.id === item.ticketId);
      if (!ticket) {
        const res = await axios.get(`${TICKETS_API}/${item.ticketId}`);
        ticket = res.data;
      }
      if (!ticket) return;
      const agent = typeof item.toAgent === "string" ? JSON.parse(item.toAgent) : item.toAgent;
      const nowISO = new Date().toISOString();
      const update = {
        ...ticket, assignees: [agent], updated: nowISO,
        timeline: [...(ticket.timeline || []), {
          action: `✉️ Forwarded to Agent: ${agent.name}`,
          by: currentUser.name, date: nowISO,
          note: `Inbox approval. From: ${item.fromUser}. Reason: ${item.reason}`,
          visibility: "internal"
        }]
      };
      await axios.put(`${TICKETS_API}/${ticket.id}`, update);
      setTickets(p => p.map(x => x.id === ticket.id ? { ...update, updated: new Date(nowISO) } : x));
      await axios.put(`${NOTIFICATIONS_API}/${item.id}`, { ...item, read: true, alerted: true, resolved: "Approved" });
      // Resolve all other admins' pending forward_request notifications for same ticket
      try {
        const otherNotifs = inboxItems.filter(i =>
          i.type === "forward_request" &&
          i.ticketId === item.ticketId &&
          !i.resolved &&
          i.id !== item.id
        );
        await Promise.all(otherNotifs.map(n =>
          axios.put(`${NOTIFICATIONS_API}/${n.id}`, { ...n, resolved: "Approved", read: true, alerted: true })
        ));
      } catch { }
      setInboxItems(prev => prev.map(i =>
        i.type === "forward_request" && i.ticketId === item.ticketId && !i.resolved
          ? { ...i, read: true, resolved: "Approved" }
          : i
      ));
      addDailyNotif({ type: "forward_approved", icon: "✅", text: `${currentUser.name} approved forward of ${item.ticketId} to ${agent.name}`, ticketId: item.ticketId, by: currentUser.name });
      // Notify requester
      const requesterId = users.find(u => u.name === item.fromUser)?.id;
      if (requesterId) {
        await axios.post(NOTIFICATIONS_API, {
          userId: requesterId, type: "forward_response", read: false, alerted: false,
          title: `Forward Request Approved: ${item.ticketId}`,
          message: `${currentUser.name} approved your request to forward ${item.ticketId} to ${agent.name}.`,
          ticketId: item.ticketId, from: currentUser.name, status: "Approved", createdAt: nowISO
        });
      }
      // Notify assigned agent
      await axios.post(NOTIFICATIONS_API, {
        userId: agent.id, type: "ticket_assigned", read: false, alerted: false,
        title: `Ticket Assigned: ${item.ticketId}`,
        message: `${item.fromUser}'s forward request was approved. Ticket ${item.ticketId} is now assigned to you.`,
        ticketId: item.ticketId, from: currentUser.name, createdAt: nowISO
      });
      setCustomAlert({ show: true, message: "✅ Forward approved and ticket reassigned!", type: "success" });
    } catch (e) {
      console.error("acceptInboxForwardRequest error:", e);
      setCustomAlert({ show: true, message: "Failed to approve forward: " + e.message, type: "error" });
    }
  };

  const rejectInboxForwardRequest = async (item) => {
    try {
      const nowISO = new Date().toISOString();
      await axios.put(`${NOTIFICATIONS_API}/${item.id}`, { ...item, read: true, alerted: true, resolved: "Rejected" });
      setInboxItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true, resolved: "Rejected" } : i));
      addDailyNotif({ type: "forward_rejected", icon: "❌", text: `${currentUser.name} rejected forward of ${item.ticketId}`, ticketId: item.ticketId, by: currentUser.name });
      const requesterId = users.find(u => u.name === item.fromUser)?.id;
      if (requesterId) {
        await axios.post(NOTIFICATIONS_API, {
          userId: requesterId, type: "forward_response", read: false, alerted: false,
          title: `Forward Request Rejected: ${item.ticketId}`,
          message: `${currentUser.name} rejected your request to forward ${item.ticketId} to ${item.toAgent?.name}.`,
          ticketId: item.ticketId, from: currentUser.name, status: "Rejected", createdAt: nowISO
        });
      }
      setCustomAlert({ show: true, message: "Forward request rejected.", type: "success" });
    } catch {
      setCustomAlert({ show: true, message: "Failed to reject forward", type: "error" });
    }
  };

  const sideNav = (currentUser?.role === "Admin" || currentUser?.role === "Manager") ? [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "tickets", label: "All Tickets", icon: "📝" },
  { id: "projects", label: "All Projects", icon: "📁" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  ] : [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "tickets", label: "All Tickets", icon: "📝" },
  { id: "projects", label: "All Projects", icon: "📁" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  ];
  const stabs = currentUser?.role === "Admin" ? [
    { id: "organisations", label: "Orgs & Departments", icon: "" },
    { id: "categories", label: "Categories", icon: "" },
    { id: "locations", label: "Locations", icon: "" },
    { id: "vendors", label: "Vendors", icon: "" },
    { id: "usermgmt", label: "User Management", icon: "" },
    { id: "customattrs", label: "Ticket Form", icon: "" },
    { id: "dbmgmt", label: "Database Mgmt", icon: "" },
  ] : currentUser?.role === "Manager" ? [
    { id: "organisations", label: "Orgs & Departments", icon: "" },
    { id: "categories", label: "Categories", icon: "" },
    { id: "locations", label: "Locations", icon: "" },
    { id: "vendors", label: "Vendors", icon: "" },
    { id: "usermgmt", label: "User Management", icon: "" },
    { id: "customattrs", label: "Ticket Form", icon: "" },
  ] : currentUser?.role === "Agent" ? [
    { id: "profile", label: "My Profile", icon: "" },
  ] : [
  ];
  const getPageTitle = () => {
    if (view === "dashboard") return "Dashboard";
    if (view === "tickets") return cvd.label;
    if (view === "projects") return cpv.label;
    if (view === "webcast") return "Webcast";
    if (view === "reports") return "Reports";
    if (view === "settings") return "Settings";
    return "";
  };

  const thStyle = { padding: "9px 11px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #94a3b8", border: "1px solid #94a3b8", whiteSpace: "nowrap", background: "#f8fafc" };

  const tdStyle = { padding: "9px 11px", fontSize: 12, color: "#334155", borderBottom: "1px solid #f1f5f9", border: "1px solid #e2e8f0", verticalAlign: "middle" };

  return { markBellRead,handleNotificationClick,markInboxRead,acceptInboxForwardRequest,rejectInboxForwardRequest,sideNav,stabs,getPageTitle,thStyle,tdStyle };
}
