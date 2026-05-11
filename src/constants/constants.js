// ─── DOMAIN CONSTANTS ─────────────────────────────────────────────────────────
export const PRIORITIES = ["Critical", "High", "Standard", "Medium"];
export const STATUSES = ["Closed", "Open", "Bin"];
export const ROLES = ["Admin", "Agent", "Manager", "Viewer"];
export const SATSANG_TYPES = ["Children Satsang", "G Satsang", "Special Satsang", "Weekly Satsang", "Youth Satsang"];
export const PROJECT_STATUSES = ["Closed", "Open", "Bin"];
export const PROJECT_PRIORITIES = ["Critical", "High", "Low", "Medium"];

export const PRIORITY_COLOR = {
  Standard: "#22c55e",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

export const STATUS_COLOR = {
  Open: { bg: "#dbeafe", text: "#1d4ed8" },
  Pending: { bg: "#ede9fe", text: "#6d28d9" },
  Closed: { bg: "#dcfce7", text: "#15803d" },
};

// ─── COLOR HELPERS ─────────────────────────────────────────────────────────────
export const ITEM_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#f97316", "#6366f1", "#d946ef", "#ea580c", "#14b8a6", "#0891b2",
];

export const getItemColor = (item) => {
  if (!item) return ITEM_COLORS[0];
  const id = String(item.id || item.name || "");
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ITEM_COLORS[hash % ITEM_COLORS.length];
};

// ─── TICKET VIEWS ──────────────────────────────────────────────────────────────
export const TICKET_VIEWS = [
  { id: "open", label: "Open Tickets", desc: "All open tickets", filter: t => t.status === "Open" },
  { id: "closed", label: "Closed Tickets", desc: "All closed tickets", filter: t => t.status === "Closed" },
  { id: "bin", label: "Bin", desc: "Deleted tickets (30-day retention)", filter: t => t.status === "Bin" },
  { id: "unassigned", label: "Unassigned", desc: "Tickets with no assignees", filter: t => (!t.assignees || t.assignees.length === 0) && t.status !== "Closed" },
  { id: "mine", label: "My Tickets", desc: "Open/in progress assigned to me", filter: (t, me) => (t.status === "Open") && t.assignees?.some(a => a.id === me?.id) },
  { id: "all", label: "All Tickets", desc: "Every ticket in the system", filter: () => true },
  { id: "pastdue", label: "Past Due", desc: "Open tickets with past due date", filter: t => t.status === "Open" && t.dueDate && new Date(String(t.dueDate)) < new Date() },
  { id: "vendor", label: "By Vendor", desc: "Tickets sent to vendors for repair", filter: t => t.status === "Pending" && t.timeline?.some(ev => ev.action?.includes("Sent for Repair")) },
  { id: "reopened", label: "Reopened Tickets", desc: "Tickets that were reopened", filter: t => (t.timeline || []).some(e => e.action === "Reopened" || (e.action?.includes("Status changed to Open") && (t.timeline || []).some(prev => prev.action?.includes("Status changed to Closed")))) },
];

// ─── PROJECT VIEWS ─────────────────────────────────────────────────────────────
export const PROJECT_VIEWS = [
  { id: "all", label: "All Projects", desc: "Every project in the system", filter: p => p.status !== "Bin" },
  { id: "open", label: "Open Projects", desc: "All open projects", filter: p => p.status === "Open" },
  { id: "closed", label: "Closed Projects", desc: "All closed projects", filter: p => p.status === "Closed" },
  { id: "bin", label: "Bin", desc: "Deleted projects (30-day retention)", filter: p => p.status === "Bin" },
  { id: "unassigned", label: "Unassigned", desc: "Projects with no assignee", filter: p => (!p.assignees || p.assignees.length === 0) && p.status !== "Closed" && p.status !== "Bin" },
  { id: "mine", label: "My Projects", desc: "Projects assigned to me", filter: (p, me) => p.assignees?.some(a => a.id === me?.id) && p.status !== "Closed" && p.status !== "Bin" },
  { id: "critical", label: "Critical", desc: "Critical priority projects", filter: p => p.priority === "Critical" && p.status !== "Closed" && p.status !== "Bin" },
];

// ─── STYLE TOKENS (shared inline styles) ──────────────────────────────────────
export const iS = { width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1e293b", background: "#fafafa", outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif" };
export const sS = { ...iS, cursor: "pointer" };
export const bP = { padding: "9px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" };
export const bG = { padding: "9px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", color: "#374151" };
