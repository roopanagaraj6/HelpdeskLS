import React, { useState } from "react";

/**
 * Full-page Alerts & Inbox view — replaces the inline tvFilter==="alerts" section.
 * Drop-in replacement. Pass same props as TicketsView receives.
 */
export function AlertsView(props) {
  const {
    alertNotifs = [],
    inboxItems = [],
    inboxUnread = 0,
    currentUser,
    handleNotificationClick,
    acceptInboxForwardRequest,
    rejectInboxForwardRequest,
  } = props;

  const [activeTab, setActiveTab] = useState("notifications"); // "notifications" | "inbox"
  const [notifFilter, setNotifFilter] = useState("all"); // "all" | "tickets" | "projects" | "system"

  const filteredNotifs = alertNotifs.filter(n => {
    if (notifFilter === "all") return true;
    if (notifFilter === "tickets") return n.ticketId && !String(n.ticketId).startsWith("PRJ-");
    if (notifFilter === "projects") return n.ticketId && String(n.ticketId).startsWith("PRJ-");
    if (notifFilter === "system") return !n.ticketId;
    return true;
  });

  const typeIcon = () => null;

  const typeLabel = (type) => {
    switch (type) {
      case "forward_request": return { text: "Forward Request", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
      case "forward_response": return { text: "Forward Response", bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" };
      case "ticket_assigned": return { text: "Assigned", bg: "#f0fdf4", color: "#15803d", border: "#86efac" };
      case "ticket_closed": return { text: "Closed", bg: "#dcfce7", color: "#15803d", border: "#86efac" };
      case "ticket_created": return { text: "Created", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "ticket_status": return { text: "Status Change", bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" };
      case "project_created": return { text: "Project", bg: "#fdf4ff", color: "#a21caf", border: "#f0abfc" };
      default: return { text: "Activity", bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    const d = new Date(time);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "yesterday";
    return d.toLocaleDateString();
  };

  const groupByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const d = new Date(item.time || item.createdAt);
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      let label;
      if (d >= today) label = "Today";
      else if (d >= yesterday) label = "Yesterday";
      else label = d.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  };

  const notifGroups = groupByDate(filteredNotifs);
  const inboxGroups = groupByDate(inboxItems.map(i => ({ ...i, time: i.createdAt })));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        .alrt-item:hover { background: #f8fafc !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Alerts & Inbox</h2>
          {inboxUnread > 0 && (
            <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 9px" }}>
              {inboxUnread} unread
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Your notifications, activity feed, and inbox messages.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {[
          { id: "notifications", label: "Notifications", count: alertNotifs.length },
          { id: "inbox", label: "Inbox", count: inboxItems.length, unread: inboxUnread },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "8px 20px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: activeTab === tab.id ? "#fff" : "transparent",
            color: activeTab === tab.id ? "#0f172a" : "#64748b",
            boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            {tab.label}
            <span style={{
              background: activeTab === tab.id ? (tab.unread > 0 ? "#ef4444" : "#e2e8f0") : "#e2e8f0",
              color: activeTab === tab.id && tab.unread > 0 ? "#fff" : "#64748b",
              borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 7px", minWidth: 20, textAlign: "center",
            }}>{tab.unread > 0 ? tab.unread : tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === "notifications" && (
        <div>
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All", count: alertNotifs.length },
              { id: "tickets", label: "Tickets", count: alertNotifs.filter(n => n.ticketId && !String(n.ticketId).startsWith("PRJ-")).length },
              { id: "projects", label: "Projects", count: alertNotifs.filter(n => n.ticketId && String(n.ticketId).startsWith("PRJ-")).length },
              { id: "system", label: "System", count: alertNotifs.filter(n => !n.ticketId).length },
            ].map(f => (
              <button key={f.id} onClick={() => setNotifFilter(f.id)} style={{
                padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${notifFilter === f.id ? "#3b82f6" : "#e2e8f0"}`,
                background: notifFilter === f.id ? "#eff6ff" : "#fff",
                color: notifFilter === f.id ? "#1d4ed8" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {f.label}
                <span style={{ fontSize: 10, opacity: 0.7 }}>({f.count})</span>
              </button>
            ))}
          </div>

          {filteredNotifs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>No notifications</div>
              <div style={{ fontSize: 13 }}>You're all caught up!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(notifGroups).map(([date, items]) => (
                <div key={date}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingLeft: 2 }}>
                    {date}
                  </div>
                  <div style={{ background: "#fff", borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    {items.map((n, i) => {
                      const tl = typeLabel(n.type);
                      return (
                        <div key={n.id || i} className="alrt-item" onClick={() => n.ticketId && handleNotificationClick(n)}
                          style={{ padding: "14px 16px", borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "flex-start", gap: 12, cursor: n.ticketId ? "pointer" : "default", background: "#fff" }}>
                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: tl.bg, color: tl.color, border: `1px solid ${tl.border}` }}>{tl.text}</span>
                              {n.by && <span style={{ fontSize: 11, color: "#94a3b8" }}>by {n.by}</span>}
                            </div>
                            <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                            {n.ticketId && (
                              <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace", fontWeight: 600, marginTop: 4 }}>
                                {n.ticketId} <span style={{ color: "#94a3b8", fontFamily: "DM Sans, sans-serif", fontWeight: 400 }}>→ click to view</span>
                              </div>
                            )}
                          </div>
                          {/* Time */}
                          <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>{formatTime(n.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div>
          {inboxItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Inbox is empty</div>
              <div style={{ fontSize: 13 }}>No messages yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(inboxGroups).map(([date, items]) => (
                <div key={date}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingLeft: 2 }}>
                    {date}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item, i) => (
                      <div key={item.id || i} className="alrt-item" style={{
                        background: item.read ? "#fff" : "#f0f9ff",
                        border: `1px solid ${item.read ? "#e2e8f0" : "#bfdbfe"}`,
                        borderLeft: `4px solid ${item.read ? "#e2e8f0" : "#3b82f6"}`,
                        borderRadius: 4, padding: "16px 18px",
                        boxShadow: item.read ? "0 1px 3px rgba(0,0,0,0.04)" : "0 2px 8px rgba(59,130,246,0.1)",
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.title}</span>
                              {!item.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 8 }}>{item.message}</div>
                            {item.ticketId && (
                              <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace", fontWeight: 600, marginBottom: 8 }}>{item.ticketId}</div>
                            )}
                            {/* Approve/Reject for pending forward requests */}
                            {item.type === "forward_request" && !item.resolved && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && (
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button onClick={() => acceptInboxForwardRequest(item)} style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, background: "#10b981", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}>
                                  Approve
                                </button>
                                <button onClick={() => rejectInboxForwardRequest(item)} style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: 7, cursor: "pointer" }}>
                                  Reject
                                </button>
                              </div>
                            )}
                            {/* Resolved badge */}
                            {item.resolved && (
                              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: item.resolved === "Approved" ? "#dcfce7" : "#fee2e2", color: item.resolved === "Approved" ? "#15803d" : "#991b1b" }}>
                                {item.resolved === "Approved" ? "Approved" : "Rejected"}
                              </span>
                            )}
                          </div>
                          {/* Time */}
                          <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{formatTime(item.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
