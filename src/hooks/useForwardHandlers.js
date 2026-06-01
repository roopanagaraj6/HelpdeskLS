import axios from "axios";
import { TICKETS_API, VENDORS_API, BASE_URL, NOTIFICATIONS_API } from "../constants/api";

/**
 * Forward ticket, send-for-repair, and vendor-return handlers.
 */
export function useForwardHandlers(ctx) {
  const {
    tickets, setTickets,
    users, vendors, currentUser,
    selectedForwardAgent, setSelectedForwardAgent,
    forwardNote, setForwardNote,
    showForward, setShowForward,
    showVendor, setShowVendor,
    selTicket, setSelTicket,
    vendorReturnNote, vendorReturnOutcome,
    setVendorReturnNote, setVendorReturnOutcome,
    setCustomAlert,
    addDailyNotif,
    forwardNote: fwdReason, setForwardNote: setFwdReason,
    selectedForwardAgent: fwdTargetAgent, setSelectedForwardAgent: setFwdTargetAgent,
    forwardRequests, setForwardRequests,
    inboxItems, setInboxItems,
  } = ctx;

  // ─── FORWARD TICKET (v3 - ROLE-BASED) ───────────────────────────────────────────────────

  // ✅ Main forward handler - checks role
  const handleForwardTicket = async (agentId) => {
    if (!fwdReason.trim()) return setCustomAlert({ show: true, message: "Reason is required", type: "error" });
    if (!agentId) return setCustomAlert({ show: true, message: "Please select an agent", type: "error" });

    const agent = users.find(u => u.id === agentId);
    const nowISO = new Date().toISOString();

    // ✅ If Admin or Manager - forward directly
    if (currentUser?.role === "Admin" || currentUser?.role === "Manager") {
      try {
        const update = {
          ...selTicket,
          assignees: [agent],
          updated: nowISO,
          timeline: [
            ...(selTicket.timeline || []),
            {
              action: `✉️ Forwarded to Agent: ${agent.name}`,
              by: currentUser.name,
              date: nowISO,
              note: `Role: ${currentUser.role} | Reason: ${fwdReason}`,
              visibility: "internal"
            }
          ]
        };

        await axios.put(`${TICKETS_API}/${selTicket.id}`, update);
        setTickets(p => p.map(x => x.id === selTicket.id ? { ...update, updated: new Date(nowISO) } : x));
        setSelTicket({ ...update, updated: new Date(nowISO) });
        setShowForward(false);
        setFwdReason("");
        setFwdTargetAgent("");
        setCustomAlert({ show: true, message: "✅ Ticket forwarded successfully!", type: "success" });
        addDailyNotif({ type: "ticket_forwarded", icon: "✉️", text: `${currentUser.name} forwarded ${selTicket.id} to ${agent.name}`, ticketId: selTicket.id, by: currentUser.name });
        // Send inbox notification to the agent being assigned
        try {
          await axios.post(NOTIFICATIONS_API, {
            userId: agent.id, type: "ticket_assigned", read: false, alerted: false,
            title: `Ticket Assigned: ${selTicket.id}`,
            message: `${currentUser.name} forwarded ticket ${selTicket.id} to you. Reason: ${fwdReason}`,
            ticketId: selTicket.id, from: currentUser.name, createdAt: nowISO
          });
        } catch { }
      } catch (e) {
        setCustomAlert({ show: true, message: "Failed to forward ticket", type: "error" });
      }
    }
    // ✅ If Agent or Viewer - create request
    else {
      const forwardRequest = {
        id: `FWD-${Date.now()}`,
        ticketId: selTicket.id,
        ticketSummary: selTicket.summary,
        fromUser: currentUser.name,
        fromRole: currentUser.role,
        toAgent: agent,
        reason: fwdReason,
        status: "Pending",
        createdAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null
      };

      setForwardRequests(prev => [forwardRequest, ...prev]);
      setShowForward(false);
      setFwdReason("");
      setFwdTargetAgent("");
      setCustomAlert({ show: true, message: "✅ Forward request sent to admin for approval", type: "success" });
      addDailyNotif({ type: "forward_requested", icon: "📬", text: `You requested to forward ${selTicket.id} to ${agent.name}`, ticketId: selTicket.id, by: currentUser.name });
      // Send inbox notification to all admins and managers
      const adminsAndManagers = (Array.isArray(users) ? users : []).filter(u => u.active && (u.role === "Admin" || u.role === "Manager"));
      for (const admin of adminsAndManagers) {
        try {
          await axios.post(NOTIFICATIONS_API, {
            userId: admin.id, type: "forward_request", read: false, alerted: false,
            requestId: forwardRequest.id,
            title: `Forward Request: ${selTicket.id}`,
            message: `${currentUser.name} (${currentUser.role}) wants to forward ${selTicket.id} to ${agent.name}. Reason: ${fwdReason}`,
            ticketId: selTicket.id, ticketSummary: selTicket.summary,
            fromUser: currentUser.name, fromUserId: currentUser.id,
            toAgent: agent, createdAt: nowISO, reason: fwdReason
          });
        } catch { }
      }
    }
  };

  // ✅ Admin approves forward request
  const approveForwardRequest = async (request) => {
    const t = selTicket;
    const nowISO = new Date().toISOString();

    try {
      const update = {
        ...t,
        assignees: [request.toAgent],
        updated: nowISO,
        timeline: [
          ...(t.timeline || []),
          {
            action: `✉️ Forwarded to Agent: ${request.toAgent.name}`,
            by: currentUser.name,
            date: nowISO,
            note: `Request from ${request.fromRole} ${request.fromUser}. Reason: ${request.reason}`,
            visibility: "internal"
          }
        ]
      };

      await axios.put(`${TICKETS_API}/${t.id}`, update);
      setTickets(p => p.map(x => x.id === t.id ? { ...update, updated: new Date(nowISO) } : x));
      setSelTicket({ ...update, updated: new Date(nowISO) });

      setForwardRequests(prev => prev.map(r =>
        r.id === request.id
          ? { ...r, status: "Approved", approvedBy: currentUser.name, approvedAt: nowISO }
          : r
      ));
      setCustomAlert({ show: true, message: "✅ Forward request approved", type: "success" });
      addDailyNotif({ type: "forward_approved", icon: "✅", text: `${currentUser.name} approved forward of ${request.ticketId} to ${request.toAgent.name}`, ticketId: request.ticketId, by: currentUser.name });
      // Send inbox response back to requester
      try {
        const requesterId = users.find(u => u.name === request.fromUser)?.id;
        if (requesterId) {
          await axios.post(NOTIFICATIONS_API, {
            userId: requesterId, type: "forward_response", read: false, alerted: false,
            title: `Forward Request Approved: ${request.ticketId}`,
            message: `${currentUser.name} approved your request to forward ${request.ticketId} to ${request.toAgent.name}.`,
            ticketId: request.ticketId, from: currentUser.name, status: "Approved", createdAt: nowISO
          });
        }
        // Also notify assigned agent
        await axios.post(NOTIFICATIONS_API, {
          userId: request.toAgent.id, type: "ticket_assigned", read: false, alerted: false,
          title: `Ticket Assigned: ${request.ticketId}`,
          message: `${request.fromUser}'s forward request was approved. Ticket ${request.ticketId} is now assigned to you.`,
          ticketId: request.ticketId, from: currentUser.name, createdAt: nowISO
        });
      } catch { }

      // Resolve all other admins' pending forward_request notifications for this ticket
      try {
        const otherAdminNotifs = inboxItems.filter(i =>
          i.type === "forward_request" &&
          i.ticketId === request.ticketId &&
          !i.resolved &&
          i.id !== request.id
        );
        await Promise.all(otherAdminNotifs.map(n =>
          axios.put(`${NOTIFICATIONS_API}/${n.id}`, { ...n, resolved: "Approved", read: true, alerted: true })
        ));
        setInboxItems(prev => prev.map(i =>
          i.type === "forward_request" && i.ticketId === request.ticketId && !i.resolved
            ? { ...i, resolved: "Approved", read: true }
            : i
        ));
      } catch { }

    } catch (e) {
      setCustomAlert({ show: true, message: "Failed to approve forward", type: "error" });
    }
  };

  // ✅ Admin rejects forward request
  const rejectForwardRequest = async (request) => {
    const nowISO = new Date().toISOString();
    setForwardRequests(prev => prev.map(r =>
      r.id === request.id
        ? { ...r, status: "Rejected", approvedBy: currentUser.name, approvedAt: nowISO }
        : r
    ));
    setCustomAlert({ show: true, message: "Forward request rejected", type: "success" });
    addDailyNotif({ type: "forward_rejected", icon: "❌", text: `${currentUser.name} rejected forward of ${request.ticketId}`, ticketId: request.ticketId, by: currentUser.name });
    // Send inbox response back to requester
    try {
      const requesterId = users.find(u => u.name === request.fromUser)?.id;
      if (requesterId) {
        await axios.post(NOTIFICATIONS_API, {
          userId: requesterId, type: "forward_response", read: false, alerted: false,
          title: `Forward Request Rejected: ${request.ticketId}`,
          message: `${currentUser.name} rejected your request to forward ${request.ticketId} to ${request.toAgent.name}.`,
          ticketId: request.ticketId, from: currentUser.name, status: "Rejected", createdAt: nowISO
        });
      }
    } catch { }
  };

  const handleSendForRepair = async (vendorName, contactInfo) => {
    if (!vendorName) { setCustomAlert({ show: true, message: "⚠️ Vendor name is required", type: "error" }); return; }
    if (!fwdReason.trim()) { setCustomAlert({ show: true, message: "⚠️ Reason is required", type: "error" }); return; }
    const t = selTicket;
    try {
      const nowISO = new Date().toISOString();
      if (t.status === "Closed") {
        setCustomAlert({ show: true, message: "⚠️ Ticket is closed. Reopen it before sending to vendor.", type: "error" });
        return;
      }
      const update = { ...t, status: "Pending", updated: nowISO, timeline: [...(t.timeline || []), { action: `Sent for Repair: ${vendorName}`, by: currentUser.name, date: nowISO, note: `Contact: ${contactInfo}\nReason: ${fwdReason}`, visibility: "internal" }] };
      await axios.put(`${TICKETS_API}/${t.id}`, update);
      setTickets(p => p.map(x => x.id === t.id ? { ...update, updated: new Date(nowISO) } : x));
      setSelTicket({ ...update, updated: new Date(nowISO) });
    } catch (e) { setCustomAlert({ show: true, message: "Repair update failed", type: "error" }); }
  };

  const handleVendorReturn = async () => {
    const t = selTicket;
    const nowISO = new Date().toISOString();
    const resolved = vendorReturnOutcome === "fixed";
    const newStatus = resolved ? "Closed" : "Open";
    const timelineEntry = {
      action: `Item Returned from Vendor`,
      by: currentUser.name,
      date: nowISO,
      note: `Outcome: ${vendorReturnOutcome === "fixed" ? "✅ Fixed" : "❌ Not Fixed"}\n${vendorReturnNote ? `Note: ${vendorReturnNote}` : ""}`,
      visibility: "internal"
    };
    const update = {
      ...t, status: newStatus, updated: nowISO,
      closedAt: resolved ? nowISO : null,
      closedBy: resolved ? currentUser.name : null,
      timeline: [...(t.timeline || []), timelineEntry]
    };
    try {
      await axios.put(`${TICKETS_API}/${t.id}`, update);
      setTickets(p => p.map(x => x.id === t.id ? { ...update, updated: new Date(nowISO) } : x));
      setSelTicket({ ...update, updated: new Date(nowISO) });
      setShowVendorReturn(false); setVendorReturnNote(""); setVendorReturnOutcome("fixed");
      showToast(resolved ? "✅ Ticket closed — item fixed" : "🔄 Ticket reopened — item not fixed", "success");
    } catch (e) { setCustomAlert({ show: true, message: "Failed to update return", type: "error" }); }
  };

  const handleForward = () => {
    if (fwdType === "Agent") handleForwardToAgent(fwdTargetAgent);
    else handleSendForRepair(fwdVendorName, fwdVendorEmail);
  };


  return { handleForwardTicket,handleSendForRepair,handleVendorReturn,handleForward, };
}
