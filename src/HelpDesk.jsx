import React, { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";

import {
  BASE_URL, TICKETS_API, ORGS_API, CATEGORIES_API, CUSTOM_ATTRS_API,
  USERS_API, LOCATIONS_API, VENDORS_API, DB_API, AUTH_API,
  IMPORT_API, PROJECTS_API, VALIDATE_SESSIONS_API,
  NOTIFICATIONS_API, SSE_URL, DEVICES_API,
} from "./constants/api";
import {
  PRIORITIES, STATUSES, ROLES, SATSANG_TYPES,
  PRIORITY_COLOR, STATUS_COLOR, ITEM_COLORS, getItemColor,
  TICKET_VIEWS,
  iS, sS, bP, bG,
} from "./constants/constants";

const PIE_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f97316","#6366f1","#22c55e","#ec4899"];
import { saveSession, loadSession, clearSession, SESSION_KEY } from "./utils/session";
import { exportCSV, exportJSON, exportPrint } from "./utils/exportHelpers";
import { applySort } from "./utils/sortHelpers";
import {
  Avatar, Badge, Modal, FF,
  CustomAlert, ConfirmationModal, SearchableSelect,
  FilterableHeader, ProgressBar,
} from "./components/UIComponents";
import { BarChart, HorizontalBarChart, PieChart, DonutChart, SmartChart } from "./components/Charts";

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

// ── Hooks ───────────────────────────────────────────────────────────────────
import { useTicketHandlers } from "./hooks/useTicketHandlers";
import { useForwardHandlers } from "./hooks/useForwardHandlers";
import { useSettingsHandlers } from "./hooks/useSettingsHandlers";
import { useProjectHandlers } from "./hooks/useProjectHandlers";
import { useLocationHandlers } from "./hooks/useLocationHandlers";
import { useAuthHandlers } from "./hooks/useAuthHandlers";
import { useProfileHandlers } from "./hooks/useProfileHandlers";
import { useNavHandlers } from "./hooks/useNavHandlers";

// ── Views ───────────────────────────────────────────────────────────────────
import { DashboardView } from "./views/DashboardView";
import { TicketsView } from "./views/TicketsView";
import { AlertsView } from "./views/AlertsView";
import { WebcastView } from "./views/WebcastView";
import { ReportsView } from "./views/ReportsView";
import { BinView } from "./views/BinView";
import { SettingsView } from "./views/SettingsView";
import { Modals } from "./views/Modals";
// ─── BOOT SCREEN ──────────────────────────────────────────────────────────────
function BootScreen({ phase }) {
  const steps = [
    { label: "Connecting to database" },
    { label: "Syncing schemas" },
    { label: "Running migrations" },
    { label: "Loading dashboard data" },
  ];
  // Which step index is actively animating
  const activeIdx = phase === "waking" ? 0 : phase === "loading" ? 3 : 4;

  return (
    <div style={{
      display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center",
      flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "18%", left: "12%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)", animation: "df-orb1 7s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "18%", right: "12%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", animation: "df-orb2 9s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "55%", left: "55%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", animation: "df-orb1 5s ease-in-out infinite reverse" }} />
      </div>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 52, animation: "df-fadeUp 0.5s ease both" }}>
        <div style={{
          width: 58, height: 58, borderRadius: 18,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, animation: "df-logoPulse 2.5s ease-in-out infinite",
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px", lineHeight: 1.1 }}>DeskFlow</div>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>Help Desk Pro</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 290, marginBottom: 36, animation: "df-fadeUp 0.5s ease 0.1s both" }}>
        {steps.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const isPending = i > activeIdx;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, opacity: isPending ? 0.3 : 1, transition: "opacity 0.5s ease" }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, transition: "all 0.4s ease",
                background: isDone ? "rgba(34,197,94,0.15)" : isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isDone ? "rgba(34,197,94,0.35)" : isActive ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: isDone ? "#4ade80" : isActive ? "#60a5fa" : "#475569",
              }}>
                {isDone ? "✓" : (i + 1)}
              </div>
              <span style={{
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isDone ? "#4ade80" : isActive ? "#93c5fd" : "#475569",
                transition: "color 0.4s ease",
              }}>{s.label}</span>
              {isActive && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#3b82f6", animation: `df-dot 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: 290, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 14, animation: "df-fadeUp 0.5s ease 0.2s both" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
          animation: phase === "waking" ? "df-barWake 2.5s ease-in-out infinite" : "df-barLoad 1.6s ease-in-out infinite",
        }} />
      </div>

      <div style={{ fontSize: 12, color: "#475569", animation: "df-fadeUp 0.5s ease 0.3s both" }}>
        {phase === "waking" ? "Server is starting up, please wait…" : "Loading your workspace…"}
      </div>

      <style>{`
        @keyframes df-fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes df-logoPulse { 0%,100% { box-shadow:0 0 28px rgba(99,102,241,0.25); } 50% { box-shadow:0 0 52px rgba(99,102,241,0.55); } }
        @keyframes df-dot { 0%,80%,100% { transform:scale(0.55); opacity:0.35; } 40% { transform:scale(1); opacity:1; } }
        @keyframes df-orb1 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(28px,-18px); } }
        @keyframes df-orb2 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(-18px,26px); } }
        @keyframes df-barWake { 0% { width:0%; margin-left:0%; } 50% { width:55%; margin-left:22%; } 100% { width:0%; margin-left:100%; } }
        @keyframes df-barLoad { 0% { width:15%; margin-left:-15%; } 50% { width:55%; margin-left:28%; } 100% { width:15%; margin-left:105%; } }
      `}</style>
    </div>
  );
}

export default function HelpDesk() {

  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customAttrs, setCustomAttrs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const [bootPhase, setBootPhase] = useState("waking"); // "waking" | "loading" | ""
  const [targetTable, setTargetTable] = useState("tickets");
  const [exportFilterType, setExportFilterType] = useState("all"); // all, assignee, category, type
  const [exportFilterValue, setExportFilterValue] = useState(""); // assignee id, category name, type
  const [exportFormat, setExportFormat] = useState("csv"); // csv, json, pdf
  const [ticketTotalCount, setTicketTotalCount] = useState(0);
  const [serverTicketCounts, setServerTicketCounts] = useState(null);

  // ✅ NEW: Advanced Export Modal State
  const [showAdvancedExportModal, setShowAdvancedExportModal] = useState(false);
  const [advancedExportFilters, setAdvancedExportFilters] = useState({
    byAssignee: false,
    byCategory: false,
    byStatus: false,
    byPriority: false,
    byVendor: false,
    byDateRange: false,
    dateFromInput: "",
    dateToInput: "",
    selectedAssignees: [],
    selectedCategories: [],
    selectedStatuses: [],
    selectedPriorities: [],
    selectedVendors: [],
  });
  const [reportTimeRange, setReportTimeRange] = useState("all");
  const [savedReports, setSavedReports] = useState([]);
  useEffect(() => {
    axios.get(`${BASE_URL}/saved-reports`).then(r => setSavedReports(r.data)).catch(() => {});
  }, []);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    dataSource: "tickets", status: [], priority: [], category: [], assignee: "",
    dateFrom: "", dateTo: "", columns: [], org: "",
  });
  const [reportPreview, setReportPreview] = useState([]);
  const [reportName, setReportName] = useState("");
  const [saveReportDialogOpen, setSaveReportDialogOpen] = useState(false);


  // ✅ NEW: User management edit modal state
  const [userEditModal, setUserEditModal] = useState({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  // Restore from localStorage session — survives page reload
  const [currentUser, setCurrentUser] = useState(() => loadSession());

  // ── v2 projects (local state – no API for projects) ──
  const [projects, setProjects] = useState([]);

  // ── Navigation ──
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem("deskflow_view") || "dashboard";
      const session = loadSession();
      if (session?.role === "Agent" && saved === "settings") return "dashboard";
      return saved;
    } catch {
      return "dashboard";
    }
  });

  const mainContentRef = useRef(null);
  const switchView = (v) => { setView(v); setSearch(""); setStatusF("All"); setPriorityF("All"); setTicketDateFrom(""); setTicketDateTo(""); setFilterStatus([]); setFilterAssignment([]); setFilterAssignee(""); setFilterCategory(""); setDeptFilter("all"); setCategoryFilter("all"); setOrgFilterSearch(""); setProjSearch(""); setProjStatusF("All"); setProjPriorityF("All"); setProjFilterStatus([]); setProjFilterAssignment([]); setProjFilterAssignee(""); setProjFilterCategory(""); setProjFilterPriority("All"); setVisibleTicketCols(new Set(ALL_TICKET_COLS.filter(c => c !== "reportedBy"))); setVisibleProjCols(new Set(ALL_PROJ_COLS.filter(c => c !== "progress"))); setSettingsTab(currentUser?.role === "Agent" ? "profile" : "organisations"); setReportBuilderOpen(false); setTicketSort({}); setProjSort({}); setTimeout(() => mainContentRef.current?.scrollTo(0, 0), 0); };
  const [settingsTab, setSettingsTab] = useState("organisations");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState([]);       // "open","closed","pastdue"
  const [filterAssignment, setFilterAssignment] = useState([]); // "assigned","unassigned","vendor"
  const [filterAssignee, setFilterAssignee] = useState([]);
  const [filterAssigneeSearch, setFilterAssigneeSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCategorySearch, setFilterCategorySearch] = useState("");
  const [activeFilterDD, setActiveFilterDD] = useState(null); // "status"|"assignment"|"assignee"|"category"|"priority"
  const filterStatusRef = useRef(null);
  const filterAssignmentRef = useRef(null);
  const filterAssigneeRef = useRef(null);
  const filterCategoryRef = useRef(null);
  const filterPriorityRef = useRef(null);
  const filterOrgRef = useRef(null);
  const filterDeptRef = useRef(null);
  const [showProjFilterDD, setShowProjFilterDD] = useState(false);
  const ticketFilterRef = useRef(null);
  const projFilterRef = useRef(null);
  const [tvFilter, setTvFilter] = useState(() => {    try {
      const saved = localStorage.getItem("deskflow_tvFilter") || "all";
      return TICKET_VIEWS.find(v => v.id === saved) ? saved : "all";
    } catch {
      return "all";
    }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return localStorage.getItem("deskflow_searchQuery") || "";
    } catch {
      return "";
    }
  });
  const [pvFilter, setPvFilter] = useState(() => {
    try {
      return localStorage.getItem("deskflow_pvFilter") || "all";
    } catch {
      return "all";
    }
  });
  const [range, setRange] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [dashboardOrg, setDashboardOrg] = useState("all");
  const [catBreakdownExpanded, setCatBreakdownExpanded] = useState(false);
  const [closuresByPersonExpanded, setClosuresByPersonExpanded] = useState(false);
  const [assignmentsByPersonExpanded, setAssignmentsByPersonExpanded] = useState(false);

  const [dashboardOrgSearch, setDashboardOrgSearch] = useState("");
  const [showDashboardOrgDD, setShowDashboardOrgDD] = useState(false);
  // ✅ NEW: Dashboard time period filter
  const [dashboardTimePeriod, setDashboardTimePeriod] = useState("all");  // 1d, 7d, 1m, 3m, 6m, 1y, all
  useEffect(() => {
    const now = new Date();
    let dateFrom = "";
    if (dashboardTimePeriod !== "all") {
      const d = new Date();
      if (dashboardTimePeriod === "1d") d.setHours(0, 0, 0, 0);
      else if (dashboardTimePeriod === "7d") d.setDate(d.getDate() - 7);
      else if (dashboardTimePeriod === "1m") d.setMonth(d.getMonth() - 1);
      else if (dashboardTimePeriod === "3m") d.setMonth(d.getMonth() - 3);
      else if (dashboardTimePeriod === "6m") d.setMonth(d.getMonth() - 6);
      else if (dashboardTimePeriod === "1y") d.setFullYear(d.getFullYear() - 1);
      const _pad = n => String(n).padStart(2,"0"); dateFrom = `${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
    }
    setReportFilters(f => ({
      ...f,
      org: dashboardOrg === "all" ? "" : dashboardOrg,
      dateFrom,
      dateTo: dashboardTimePeriod !== "all" ? now.toISOString().split("T")[0] : "",
    }));
  }, [dashboardOrg, dashboardTimePeriod]);

  // ✅ NEW: Departments and filters
  const [departments, setDepartments] = useState([]);
  const [pendingDepartments, setPendingDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");   // independent state for All Tickets view
  // One-way sync: dashboard org filter → tickets org filter (not the reverse)
  useEffect(() => { setOrgFilter(dashboardOrg); }, [dashboardOrg]);
  useEffect(() => { if (orgFilter === "all") setDeptFilter("all"); }, [orgFilter]);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [orgFilterSearch, setOrgFilterSearch] = useState("");
  const [showOrgFilterDD, setShowOrgFilterDD] = useState(false);
  const [orgClassifyType, setOrgClassifyType] = useState("all");
  const [newDept, setNewDept] = useState({ name: "", orgName: "" });

  // ✅ NEW: Bin (deleted tickets) state
  const [showBinModal, setShowBinModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState(null);
  const [binDeletedAt, setBinDeletedAt] = useState({});
  const [restoreModal, setRestoreModal] = useState({ show: false, ticket: null, remark: "" });

  // ✅ NEW: Locations (from database)
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: "" });

  // ✅ NEW: Vendor Management
  const [vendors, setVendors] = useState([]);
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", address: "" });
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editingVendorData, setEditingVendorData] = useState({ name: "", email: "", phone: "", address: "" });


  // ✅ NEW: User Add Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [ticketsExpanded, setTicketsExpanded] = useState(false);

  useEffect(() => {
    mainContentRef.current?.scrollTo(0, 0);
  }, [tvFilter]);
  // ✅ NEW: Save current view and filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("deskflow_view", view);
    } catch (e) {
      console.error("Failed to save view:", e);
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem("deskflow_tvFilter", tvFilter);
    } catch (e) {
      console.error("Failed to save tvFilter:", e);
    }
  }, [tvFilter]);

  useEffect(() => {
    try {
      localStorage.setItem("deskflow_searchQuery", searchQuery);
    } catch (e) {
      console.error("Failed to save searchQuery:", e);
    }
  }, [searchQuery]);

  useEffect(() => {
    try {
      localStorage.setItem("deskflow_pvFilter", pvFilter);
    } catch (e) {
      console.error("Failed to save pvFilter:", e);
    }
  }, [pvFilter]);

  // Close filter dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ticketFilterRef.current && !ticketFilterRef.current.contains(e.target)) setShowQuickFilterDD(false);
      if (projFilterRef.current && !projFilterRef.current.contains(e.target)) setShowProjFilterDD(false);
      if (filterAssigneeRef.current && !filterAssigneeRef.current.contains(e.target) &&
        filterCategoryRef.current && !filterCategoryRef.current.contains(e.target) &&
        filterStatusRef.current && !filterStatusRef.current.contains(e.target) &&
        filterAssignmentRef.current && !filterAssignmentRef.current.contains(e.target) &&
        filterOrgRef.current && !filterOrgRef.current.contains(e.target) &&
        filterDeptRef.current && !filterDeptRef.current.contains(e.target) &&
        filterPriorityRef.current && !filterPriorityRef.current.contains(e.target)) {
      setActiveFilterDD(prev => {
        if (prev === "assignee") setFilterAssigneeSearch("");
        if (prev === "category") setFilterCategorySearch("");
        return null;
      });
    }
    if (projFilterAssigneeRef.current && !projFilterAssigneeRef.current.contains(e.target) &&
        projFilterCategoryRef.current && !projFilterCategoryRef.current.contains(e.target)) {
      setActiveProjFilterDD(prev => {
        if (prev === "assignee") setProjFilterAssigneeSearch("");
        if (prev === "category") setProjFilterCategorySearch("");
        return null;
      });
    }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Ticket filters ──
  const [statusF, setStatusF] = useState("All");
  const [priorityF, setPriorityF] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExport, setShowExport] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketSort, setTicketSort] = useState({});
  const ticketSortRef = useRef({});
  useEffect(() => { ticketSortRef.current = ticketSort; setTicketPage(1); }, [ticketSort]);
  const importRef = useRef(null);

  const TICKETS_PER_PAGE = 25;
  const [ticketDateFrom, setTicketDateFrom] = useState("");
  const [ticketDateTo, setTicketDateTo] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  useEffect(() => {
    setTicketPage(1);
  }, [search, statusF, priorityF, tvFilter, view, orgFilter, deptFilter, filterStatus, filterAssignment, filterAssignee, filterCategory, ticketSort, ticketDateFrom, ticketDateTo]);
  useEffect(() => {
    const _isAgentRole = currentUser?.role === "Agent" || currentUser?.role === "Viewer";
    if (view !== "tickets" && !(_isAgentRole && view === "dashboard")) return;
    if (_isAgentRole && view === "tickets" && tickets.length > 0 && tickets.length <= 25 && tvFilter === "all" && !debouncedSearch && priorityF === "All" && orgFilter === "all" && filterStatus.length === 0 && filterAssignment.length === 0 && filterAssignee.length === 0 && !filterCategory && ticketPage === 1 && tickets[0]?.timeline === undefined) return;
    setTicketsLoading(true);
    const _isDashboardFetch = _isAgentRole && view === "dashboard";
    const params = new URLSearchParams({ limit: _isDashboardFetch ? 999999 : 25, page: _isDashboardFetch ? 1 : ticketPage, ..._isDashboardFetch && { includeTimeline: 1 } });    
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (priorityF !== "All") params.set("priority", priorityF);
    if (orgFilter !== "all") params.set("org", orgFilter);
    if (deptFilter !== "all") params.set("department", deptFilter);

    // tvFilter drives server-side status — takes priority over filterStatus chips
    // Exception: when agent/viewer is on dashboard view, skip tvFilter filters so all tickets load for correct stats
    if (!_isDashboardFetch) {
      if (tvFilter === "open")         { params.set("status", "Open"); }
      else if (tvFilter === "closed")  { params.set("status", "Closed"); }
      else if (tvFilter === "pastdue") { params.set("status", "Open"); params.set("pastdue", "1"); }
      else if (tvFilter === "reopened") { params.set("reopened", "1"); } // no status=Open — reopened tickets can be any status
      else if (tvFilter === "unassigned") { params.set("unassigned", "1"); params.set("status", "Open"); }
      else {
        // tvFilter is "all" or other — use filterStatus chips
        if (filterStatus.length === 1 && filterStatus[0] === "open")    params.set("status", "Open");
        if (filterStatus.length === 1 && filterStatus[0] === "closed")  params.set("status", "Closed");
        if (filterStatus.length === 1 && filterStatus[0] === "pastdue") { params.set("status", "Open"); params.set("pastdue", "1"); }
        if (filterAssignment.length === 1 && filterAssignment[0] === "unassigned") params.set("unassigned", "1");
        if (filterAssignment.length === 1 && filterAssignment[0] === "vendor")     params.set("hasVendor", "1");
      }
    }

    // Apply dashboard time period as dateFrom — takes priority over ticketDateFrom
    // Skip for dashboard fetch (agent/viewer): needs all tickets for correct stats
    if (!_isDashboardFetch) {
      if (dashboardTimePeriod && dashboardTimePeriod !== "all" && tvFilter !== "reopened") {
        const cutoff = new Date();
        if (dashboardTimePeriod === "1d") cutoff.setHours(0, 0, 0, 0);
        else if (dashboardTimePeriod === "7d") cutoff.setDate(cutoff.getDate() - 7);
        else if (dashboardTimePeriod === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
        else if (dashboardTimePeriod === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
        else if (dashboardTimePeriod === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
        else if (dashboardTimePeriod === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
        const _p2 = n => String(n).padStart(2,"0"); params.set("dateFrom", `${cutoff.getFullYear()}-${_p2(cutoff.getMonth()+1)}-${_p2(cutoff.getDate())}`);
      } else if (ticketDateFrom && tvFilter !== "reopened") {
        params.set("dateFrom", ticketDateFrom);
        if (ticketDateTo) params.set("dateTo", ticketDateTo);
      }
      if (filterCategory) params.set("category", filterCategory);
    }
    if (_isAgentRole && filterAssignee.length === 0) params.set("assignee", currentUser.name);
    else if (filterAssignee.length === 1) params.set("assignee", filterAssignee[0]);
    if (ticketSortRef.current?._sortField === "created") params.set("sortDir", ticketSortRef.current._sortDir || "desc");
    axios.get(`${BASE_URL}/tickets/paginated?${params}`)
      .then(res => {
        const parsed = (res.data.tickets || []).map(t => ({
          ...t,
          created: new Date(t.createdAt || t.created),
          updated: new Date(t.updatedAt || t.updated),
          satsangType: t.satsangType || "",
          location: t.location || "",
          assignees: Array.isArray(t.assignees) ? t.assignees : (typeof t.assignees === "string" ? JSON.parse(t.assignees) : []),
        }));
        setTickets(parsed.sort((a, b) => b.created - a.created));
        setTicketTotalCount(res.data.total || 0);
        setTicketsLoading(false);
      })
      .catch(() => { setTicketsLoading(false); });
  }, [ticketPage, view, debouncedSearch, priorityF, orgFilter, deptFilter, filterStatus, filterCategory, filterAssignee, filterAssignment, tvFilter, ticketSort, dashboardTimePeriod, ticketDateFrom, ticketDateTo, currentUser]);

  // ── Project filters ──
  const [projSearch, setProjSearch] = useState("");
  const [projStatusF, setProjStatusF] = useState("All");
  const [projPriorityF, setProjPriorityF] = useState("All");
  const [projFilterStatus, setProjFilterStatus] = useState([]);
  const [projFilterAssignment, setProjFilterAssignment] = useState([]);
  const [projFilterAssignee, setProjFilterAssignee] = useState([]);
  const [projFilterAssigneeSearch, setProjFilterAssigneeSearch] = useState("");
  const [projFilterCategory, setProjFilterCategory] = useState("");
  const [projFilterCategorySearch, setProjFilterCategorySearch] = useState("");
  const [reportCategorySearch, setReportCategorySearch] = useState("");
  const [reportAssigneeSearch, setReportAssigneeSearch] = useState("");
  const [activeReportFilterDD, setActiveReportFilterDD] = useState(null);
  const [projFilterPriority, setProjFilterPriority] = useState("All");
  const [activeProjFilterDD, setActiveProjFilterDD] = useState(null);
  const projFilterStatusRef = useRef(null);
  const projFilterAssignmentRef = useRef(null);
  const projFilterAssigneeRef = useRef(null);
  const projFilterCategoryRef = useRef(null);
  const projFilterPriorityRef = useRef(null);  
  const [selectedProjIds, setSelectedProjIds] = useState(new Set());
  const [showProjExport, setShowProjExport] = useState(false);
  const [showManageTicket, setShowManageTicket] = useState(null);
  const [showManageProject, setShowManageProject] = useState(null);

  // ── Modals ──
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selTicket, setSelTicket] = useState(null);
  const [pendingTicketStatus, setPendingTicketStatus] = useState(null);
  const [selProject, setSelProject] = useState(null);
  const [selAgent, setSelAgent] = useState(null);
  const [agentStatusFilter, setAgentStatusFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const [agentTicketFilter, setAgentTicketFilter] = useState(null);

  // ── Satsangs ──
  const [satsangs, setSatsangs] = useState([]);

  // ── Comments ──
  const [newComment, setNewComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [ticketImage, setTicketImage] = useState(null);
  const [ticketImagePreview, setTicketImagePreview] = useState(null);
  const [newProjComment, setNewProjComment] = useState("");

  // ── Ticket form ──
  const getDefaultDueDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };
  const emptyForm = () => ({ org: "", department: "", contact: "", reportedBy: "", summary: "", description: "", assignees: [], priority: "Standard", category: "", subcategory: "", customAttrs: {}, dueDate: getDefaultDueDate(), satsangType: "", location: "" });
  const [form, setForm] = useState(emptyForm);
  const [ccInput, setCcInput] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showTicketAssigneeDD, setShowTicketAssigneeDD] = useState(false);
  const [showProjAssigneeDD, setShowProjAssigneeDD] = useState(false);
  const [showAssigneeDD, setShowAssigneeDD] = useState(false);

  // ✅ NEW: Dropdown search states for department, category, location
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [showDepartmentDD, setShowDepartmentDD] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDD, setShowCategoryDD] = useState(false);
  const [projCategorySearch, setProjCategorySearch] = useState("");
  const [showProjCategoryDD, setShowProjCategoryDD] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDD, setShowLocationDD] = useState(false);

  // ✅ NEW: Separate location dropdown states for webcast fields
  const [webcastLocationSearch, setWebcastLocationSearch] = useState("");
  const [showWebcastLocationDD, setShowWebcastLocationDD] = useState(false);
  const [projWebcastLocationSearch, setProjWebcastLocationSearch] = useState("");
  const [showProjWebcastLocationDD, setShowProjWebcastLocationDD] = useState(false);

  // ── Project form ──
  const emptyProjectForm = { org: "", department: "", reportedBy: "", title: "", description: "", assignees: [], priority: "", category: "", status: "Open", location: "", dueDate: "", satsangType: "", progress: 0, customAttrs: {}, webcastId: null };
  const [projForm, setProjForm] = useState(emptyProjectForm);
  const [projCcInput, setProjCcInput] = useState("");

  // ── Settings forms ──
  const [newOrg, setNewOrg] = useState({ name: "", domain: "", phone: "" });
  const [newCat, setNewCat] = useState({ name: "", color: "#3b82f6" });
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newSubcatCatId, setNewSubcatCatId] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "Viewer" });
  const [newAttr, setNewAttr] = useState({ name: "", type: "text", options: "", required: false, section: "grid", sortOrder: 0 });
  const [attrDragIdx, setAttrDragIdx] = useState(null);
  const [showAttrLayoutModal, setShowAttrLayoutModal] = useState(false);
  const [layoutDraft, setLayoutDraft] = useState([]);
  const [draftLayout, setDraftLayout] = useState([]);
  const [layoutDragIdx, setLayoutDragIdx] = useState(null);
  const [layoutDragOver, setLayoutDragOver] = useState(null);

  // ── Inline ticket/project category+attr managers ──
  const [ticketCategories, setTicketCategories] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [ticketCustomAttrs, setTicketCustomAttrs] = useState([]);
  const [projectCustomAttrs, setProjectCustomAttrs] = useState([]);
  const [newTicketCat, setNewTicketCat] = useState({ name: "", color: "#3b82f6" });
  const [newProjCat, setNewProjCat] = useState({ name: "", color: "#8b5cf6" });
  const [newTicketAttr, setNewTicketAttr] = useState({ name: "", type: "text", options: "", required: false });
  const [newProjAttr, setNewProjAttr] = useState({ name: "", type: "text", options: "", required: false });

  // ── Auth ──
  const [isLogin, setIsLogin] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [authForm, setAuthForm] = useState({ email: "", password: "", firstName: "", middleName: "", lastName: "", countryCode: "+91", phone: "", confirm: "" });
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // ── Toast Notifications ──
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  // ── Slideshow (Login Page) ──
  useEffect(() => {
    if (!currentUser) {
      const timer = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % 3);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [currentUser]);

  // ── Ticket Edit Mode ──
  const [editMode, setEditMode] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [editProjMode, setEditProjMode] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [ticketEditMode, setTicketEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [projEditMode, setProjEditMode] = useState(false);
  const [editProjForm, setEditProjForm] = useState({});
  const handleTicketEditSave = async () => {};
  const handleProjectEditSave = async () => {};

  // ── Forward ticket ──
  const [showForward, setShowForward] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [showVendorReturn, setShowVendorReturn] = useState(false);
  const [vendorReturnOutcome, setVendorReturnOutcome] = useState("fixed");
  const [vendorReturnNote, setVendorReturnNote] = useState("");
  const [fwdType, setFwdType] = useState("Agent");
  const [fwdTargetAgent, setFwdTargetAgent] = useState("");
  const [fwdReason, setFwdReason] = useState("");
  const selectedForwardAgent = fwdTargetAgent;
  const setSelectedForwardAgent = setFwdTargetAgent;
  const forwardNote = fwdReason;
  const setForwardNote = setFwdReason;  
  const [forwardAgentSearch, setForwardAgentSearch] = useState("");
  const [showForwardAgentDD, setShowForwardAgentDD] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [fwdVendorName, setFwdVendorName] = useState("");
  const [fwdVendorEmail, setFwdVendorEmail] = useState("");

  // ✅ NEW: Forward Request Workflow
  const [forwardRequests, setForwardRequests] = useState([]);  // List of forward requests waiting approval
  const [showForwardRequest, setShowForwardRequest] = useState(false);  // Show request form instead of direct forward
  const [showAdminForwardApprovals, setShowAdminForwardApprovals] = useState(false);  // Admin approval modal

  // ✅ NEW: Timeline View
  const [showTimelineView, setShowTimelineView] = useState(false);
  const [timelineTab, setTimelineTab] = useState("external");
  const [showProjTimelineView, setShowProjTimelineView] = useState(false);
  const [commentVisibility, setCommentVisibility] = useState("external"); // "internal" | "external"

  // ── Notification Center ──
  // Bell: populated purely from DB — no localStorage caching
  const [dailyNotifs, setDailyNotifs] = useState([]);
  const [showBellPanel, setShowBellPanel] = useState(false);
  const [bellUnread, setBellUnread] = useState(0);
  const [alertNotifs, setAlertNotifs] = useState([]);

  // Mail: inbox items from DB (per user), persisted
  const [inboxItems, setInboxItems] = useState([]);
  const [showInboxPanel, setShowInboxPanel] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  // Floating forward-request alerts (30 sec, with Accept/Reject)
  const [floatingAlerts, setFloatingAlerts] = useState([]);

  // ── Core notification broadcaster ──────────────────────────────────────────
  // ONE row in DB per event (userId = 0 = global).
  // Admins/Managers poll userId=0 and see everything.
  // For ticket events, also push one personal row to each assigned agent/viewer.
  const addDailyNotif = (notif) => {
    if (!currentUser) return;
    const nowISO = new Date().toISOString();
    const ticketEventTypes = [
      "ticket_created", "ticket_closed", "ticket_status", "ticket_edited",
      "ticket_forwarded", "forward_approved", "forward_rejected"
    ];
    const globalEventTypes = [
      ...ticketEventTypes,
      "project_created", "org_added", "category_added", "dept_added",
      "location_added", "vendor_added", "user_added"
    ];
    if (!globalEventTypes.includes(notif.type)) return;

    const payload = {
      type: "activity",
      title: notif.text,
      message: notif.text,
      ticketId: notif.ticketId || null,
      from: currentUser.name,
      broadcastIcon: notif.icon,
      broadcastType: notif.type,
      read: false,
      alerted: false,
      createdAt: nowISO
    };

    // 2. ONE global row — userId = 0 — visible to all admins/managers
    axios.post(NOTIFICATIONS_API, { ...payload, userId: 0 }).catch(err => console.error("Notif POST failed:", err?.response?.data || err.message));

    // 3. For ticket events only: also send a personal row to each assigned agent/viewer
    //    so they see their own tickets in their bell too
    if (ticketEventTypes.includes(notif.type) && notif.ticketId) {
      const ticket = tickets.find(t => t.id === notif.ticketId);
      if (ticket) {
        const assigneeIds = (ticket.assignees || [])
          .filter(a => a.id !== currentUser.id &&
            !["Admin", "Manager"].includes(Array.isArray(users) ? users.find(u => u.id === a.id)?.role : undefined))
          .map(a => a.id);
        if (assigneeIds.length > 0) {
          axios.post(NOTIFICATIONS_API, { ...payload, recipientIds: assigneeIds }).catch(err => console.error("Notif assignee POST failed:", err?.response?.data || err.message));
        }
      }
    }
  };

  const pushFloatingAlert = (item) => {
    const alertId = `fa-${Date.now()}-${Math.random()}`;
    setFloatingAlerts(prev => [...prev, { ...item, alertId }]);
    setTimeout(() => {
      setFloatingAlerts(prev => prev.filter(a => a.alertId !== alertId));
    }, 30000);
  };

  // ── Profile ──
  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: "", name: "" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [customAlert, setCustomAlert] = useState({ show: false, message: "", type: "success" });

  // ✅ NEW: Activity Logging & Session Tracking
  const [activityLogs, setActivityLogs] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // ✅ NEW: Location & Ticket Tracking
  const [currentTicketId, setCurrentTicketId] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTicketDropdown, setShowTicketDropdown] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState(null);
  const [isReopenModal, setIsReopenModal] = useState(false);
  const isReopenModalRef = useRef(false);
  const [ticketRemark, setTicketRemark] = useState("");
  const [closedBy, setClosedBy] = useState(null);
  const [closedDate, setClosedDate] = useState("");
  const [minutes, setMinutes] = useState(0);

  // ✅ NEW: Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
  const showConfirmation = confirmModal.show;
  const setShowConfirmation = (v) => setConfirmModal(v);
  useEffect(() => {
    if (!currentUser) setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
  }, [currentUser]);
  const confirmationConfig = confirmModal;
  const [agentDetailModal, setAgentDetailModal] = useState({ show: false, user: null });
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [ticketsPerPage, setTicketsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = newest first, "asc" = oldest first
  const ALL_TICKET_COLS = ["id","created","summary","org","department","reportedBy","assignees","priority","category","status"];
  const [visibleTicketCols, setVisibleTicketCols] = useState(new Set(ALL_TICKET_COLS.filter(c => c !== "reportedBy")));
  const [showTicketColPicker, setShowTicketColPicker] = useState(false);
  const ALL_PROJ_COLS = ["id","created","title","org","department","assignees","priority","category","status","progress","dueDate"];
  const [visibleProjCols, setVisibleProjCols] = useState(new Set(ALL_PROJ_COLS.filter(c => c !== "progress")));
  const [projPage, setProjPage] = useState(1);
  const [projFilters, setProjFilters] = useState({});
  const [showProjColPicker, setShowProjColPicker] = useState(false);
  const [ticketColDDPos, setTicketColDDPos] = useState({ top: 0, right: 0 });
  const [projColDDPos, setProjColDDPos] = useState({ top: 0, right: 0 });
  const ticketColBtnRef = useRef(null);
  const projColBtnRef = useRef(null);
  const [showTicketExport, setShowTicketExport] = useState(false);
  const [showProjExportDD, setShowProjExportDD] = useState(false);
  const [showTicketColExport, setShowTicketColExport] = useState(false);
  const [ticketExportCols, setTicketExportCols] = useState(new Set(ALL_TICKET_COLS));
  const [ticketExportMode, setTicketExportMode] = useState("csv");
  const [showProjColExport, setShowProjColExport] = useState(false);
  const [projExportCols, setProjExportCols] = useState(new Set(ALL_PROJ_COLS));
  const [projExportMode, setProjExportMode] = useState("csv");
  const ticketExportBtnRef = useRef(null);
  const projExportBtnRef = useRef(null);
  const printFrameRef = useRef(null);
  // ✅ NEW: Refs for column pickers (to handle scroll closing)
  const ticketColPickerRef = useRef(null);
  const projColPickerRef = useRef(null);

  useEffect(() => {
    if (!showTicketColPicker) return;
    const handler = (e) => {
      if (ticketColBtnRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-col-picker="ticket"]')) return;
      setShowTicketColPicker(false);
    };
    window.addEventListener("scroll", () => setShowTicketColPicker(false), true);
    window.addEventListener("mousedown", handler, true);
    return () => {
      window.removeEventListener("scroll", () => setShowTicketColPicker(false), true);
      window.removeEventListener("mousedown", handler, true);
    };
  }, [showTicketColPicker]);

    useEffect(() => {
      if (!showProjColPicker) return;
      const handler = (e) => {
        if (projColBtnRef.current?.contains(e.target)) return;
        if (e.target.closest('[data-col-picker="proj"]')) return;
        setShowProjColPicker(false);
      };
      window.addEventListener("scroll", () => setShowProjColPicker(false), true);
      window.addEventListener("mousedown", handler, true);
      return () => {
        window.removeEventListener("scroll", () => setShowProjColPicker(false), true);
        window.removeEventListener("mousedown", handler, true);
      };
  }, [showProjColPicker]);

  // ── Per-table sort state ──
  const [userSort, setUserSort] = useState({ _sortField: "name", _sortDir: "asc" });
  const [projSort, setProjSort] = useState({});
  const [orgSort, setOrgSort] = useState({ _sortField: "name", _sortDir: "asc" });
  const [catSort, setCatSort] = useState({});
  const [deptSort, setDeptSort] = useState({});
  const [locSort, setLocSort] = useState({});
  const [vendorSort, setVendorSort] = useState({});
  const [webcastSort, setWebcastSort] = useState({});
  const [webcastFilter, setWebcastFilter] = useState(null);
  const [agentSort, setAgentSort] = useState({});
  

  // ✅ NEW: Admin edit user modal
  const [editUserOpen, setEditUserOpen] = useState(null); // Holds the user being edited
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", password: "" });

  const statusOpts = [
    { l: "On Duty", c: "#22c55e", bg: "#dcfce7" },      // 🟢 Green - In office
    { l: "On Ticket", c: "#06b6d4", bg: "#cffafe" },    // 🔵 Cyan - On ticket/location
    { l: "Idle", c: "#a855f7", bg: "#f3e8ff" },         // 🟣 Purple - Idle (on duty but no ticket)
    { l: "On Lunch", c: "#f97316", bg: "#ffedd5" },     // 🟠 Orange - On lunch break
    { l: "Off Duty", c: "#f59e0b", bg: "#fef3c7" }      // 🟡 Yellow - Off duty
  ];

  // ── Password strength ──
  const calcPwdStr = (pwd) => { if (!pwd) return 0; let s = 0; if (pwd.length >= 8) s += 25; if (/[A-Z]/.test(pwd)) s += 25; if (/[a-z]/.test(pwd)) s += 25; if (/[^A-Za-z0-9]/.test(pwd)) s += 25; return s; };

  // ✅ NEW: Password requirement checks
  const getPwdRequirements = (pwd) => {
    if (!pwd) return [];
    return [
      { id: "length", label: "At least 8 characters", met: pwd.length >= 8 },
      { id: "uppercase", label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(pwd) },
      { id: "lowercase", label: "Lowercase letter (a-z)", met: /[a-z]/.test(pwd) },
      { id: "special", label: "Special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(pwd) }
    ];
  };

  const pwdReqs = getPwdRequirements(authForm.password);
  const pwdStr = useMemo(() => calcPwdStr(authForm.password), [authForm.password]);
  const pwdColor = pwdStr <= 25 ? "#ef4444" : pwdStr <= 50 ? "#f59e0b" : pwdStr <= 75 ? "#eab308" : "#22c55e";

  // ─── DATA LOADING ──────────────────────────────────────────────────────────
  const loadData = async (callerUser = null) => { 
    setLoading(true);
    try {
      // Use axios.get because DB_API is a URL string
      const response = await axios.get(DB_API);
      const data = response.data;

      setUsers(data.users || []);
      setOrgs(data.orgs || []);
      setCategories(data.categories || []);
      setCustomAttrs(data.customAttrs || []);
      setTicketCategories(data.categories || []);
      setProjectCategories(data.categories || []);
      setTicketCustomAttrs(data.customAttrs || []);
      setProjectCustomAttrs(data.customAttrs || []);

      // ✅ NEW: Load departments from database only (NO hardcoded fallback!)
      try {
        const deptResponse = await axios.get(`${BASE_URL}/departments`);
        setDepartments(deptResponse.data || []);
      } catch (e) {
        console.log("Departments loading from API:", e.message);
        // If API fails, set empty array - no hardcoded defaults!
        setDepartments([]);
      }

      // ✅ NEW: Load locations from database
      try {
        const locResponse = await axios.get(LOCATIONS_API);
        setLocations(locResponse.data || []);
      } catch (e) {
        console.log("Locations loading from API:", e.message);
        setLocations([]);
      }

      // load first page only; TicketsView fetches more via paginated endpoint
      const [ticketRes, countsRes] = await Promise.all([
        axios.get(`${BASE_URL}/tickets/paginated?limit=25&page=1`),
        axios.get(`${BASE_URL}/tickets/counts`)
      ]);
      setServerTicketCounts(countsRes.data);
      const allRaw = ticketRes.data.tickets || [];
      const parsedTickets = allRaw.map(t => ({
          ...t,
          created: new Date(t.createdAt || t.created),
          updated: new Date(t.updatedAt || t.updated),
          satsangType: t.satsangType || "",
          location: t.location || "",
          assignees: Array.isArray(t.assignees) ? t.assignees : (typeof t.assignees === "string" ? JSON.parse(t.assignees) : []),
      })).sort((a, b) => b.created - a.created);
      const _activeUser = callerUser ?? currentUser;
      const _isAgentDashboard = (_activeUser?.role === "Agent" || _activeUser?.role === "Viewer") && view === "dashboard";
      if (!_isAgentDashboard) {
        setTickets(parsedTickets);
        setTicketTotalCount(ticketRes.data.total || 0);
      }
      setSatsangs(data.satsangs || []);

      const parsedProjects = (data.projects || []).map(p => ({
        ...p,
        created: new Date(p.createdAt || p.created),
        updated: new Date(p.updatedAt || p.updated),
        dueDate: p.dueDate ? new Date(p.dueDate) : null,

        progress: p.progress || 0,
        org: p.org || "",
        department: p.department || "",
        reportedBy: p.reportedBy || "",
        category: p.category || "",
        location: p.location || "",
        priority: p.priority || "Medium",
        status: p.status || "Open",
        assignees: Array.isArray(p.assignees) ? p.assignees : [],
        cc: Array.isArray(p.cc) ? p.cc : [],
        customAttrs: p.customAttrs || {},
        webcastId: p.webcastId || null,
        satsangType: p.satsangType || "",
      })).sort((a, b) => b.created - a.created);

      setProjects(parsedProjects);
      setLoading(false); // ✅ MUST set to false on success
    } catch (e) {
      console.error("Error loading data:", e);
      setLoading(false); // ✅ MUST set to false even on error
    }
  };

  // On mount: poll /api/ready until server is up, then load data
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      let serverOk = false;
      // Quick probe — if server already warm, skip waking phase
      try {
        const probe = await axios.get(`${BASE_URL}/ready`, { timeout: 1500 });
        if (probe.data.ready) { serverOk = true; setBootPhase("loading"); }
      } catch (_) {}

      if (!serverOk) {
        setBootPhase("waking");
        for (let i = 0; i < 40 && !cancelled; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const r = await axios.get(`${BASE_URL}/ready`, { timeout: 1500 });
            if (r.data.ready) { serverOk = true; break; }
          } catch (_) {}
        }
        if (!cancelled) setBootPhase("loading");
      }

      if (!cancelled) {
        setLoading(true);
        await loadData();
        setBootPhase("");
      }
    };
    boot();
    const timeout = setTimeout(() => { setLoading(false); setBootPhase(""); }, 45000);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);



  // Silent background refresh on page navigation — no loading spinner
  const silentRefresh = async () => {
    try {
      const response = await axios.get(DB_API);
      const data = response.data;
      // Only refresh metadata — NOT tickets/projects (use paginated instead)
      setUsers(data.users || []);
      setOrgs(data.orgs || []);
      setCategories(data.categories || []);
      setCustomAttrs(data.customAttrs || []);
      setTicketCategories(data.categories || []);
      setProjectCategories(data.categories || []);
      setTicketCustomAttrs(data.customAttrs || []);
      setProjectCustomAttrs(data.customAttrs || []);
      setSatsangs(data.satsangs || []);
      try { const r = await axios.get(`${BASE_URL}/departments`); setDepartments(r.data || []); } catch (_) {}
      try { const r = await axios.get(LOCATIONS_API); setLocations(r.data || []); } catch (_) {}
      try { const r = await axios.get(VENDORS_API); setVendors(r.data || []); } catch (_) {}
    } catch (e) { console.error("Silent refresh failed:", e); }
};

  // Refresh data silently every time the user navigates to a different page
  useEffect(() => {
    if (currentUser) silentRefresh();
  }, [view]);

  // ✅ NEW: Check if current user was deleted or deactivated
  useEffect(() => {
    if (!currentUser) return;
    const checkUserStatus = async () => {
      try {
        const response = await axios.get(`${USERS_API}/${currentUser.id}/status`);
        const user = response.data;

        if (!user) {
          clearSession();
          setCurrentUser(null);
          setCustomAlert({ show: true, message: "❌ Your account has been deleted by an administrator", type: "error" });
          return;
        }

        if (!user.active && !user.forceLogout) {
          clearSession();
          setCurrentUser(null);
          setAuthForm({ email: "", password: "", firstName: "", middleName: "", lastName: "", countryCode: "+91", phone: "", confirm: "" });
          setCustomAlert({ show: true, message: "🚪 You have been logged out by an administrator.", type: "error" });
          return;
        }

        if (user.role !== currentUser.role) {
          clearSession();
          setCurrentUser(null);
          setCustomAlert({ show: true, message: "⚠️ Your role has been changed. Please log in again.", type: "warning" });
          return;
        }

        if (user.forceLogout) {
          try {
            await axios.put(`${USERS_API}/${user.id}`, { forceLogout: false, _isSystemUpdate: true });
          } catch (_) {}
          clearSession();
          setCurrentUser(null);
          setAuthForm({ email: "", password: "", firstName: "", middleName: "", lastName: "", countryCode: "+91", phone: "", confirm: "" });
          setCustomAlert({ show: true, message: "🚪 You have been logged out by an administrator.", type: "error" });
          return;
        }
        if (
          (currentUser.status === "On Duty" || currentUser.status === "On Ticket" || currentUser.status === "On Lunch" || currentUser.status === "Idle") &&
          (user.status === "Off Duty" || user.status === "On Ticket") &&
          user.status !== currentUser.status
        ) {
          clearSession();
          setCurrentUser(null);
          setAuthForm({ email: "", password: "", firstName: "", middleName: "", lastName: "", countryCode: "+91", phone: "", confirm: "" });
          setCustomAlert({ show: true, message: "🚪 You have been logged out by an administrator.", type: "error" });
          return;
        }

      } catch (e) {
        console.error("Failed to check user status:", e);
      }
    };

    const interval = setInterval(checkUserStatus, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ✅ NEW: Validate sessions periodically and update user statuses
  const validateSessions = async () => {
    try {
      // Send the current user email to mark as active
      const activeUserEmails = currentUser ? [currentUser.email] : [];
      const response = await axios.post(VALIDATE_SESSIONS_API, { emails: activeUserEmails });
      // ✅ FIX: Only update user status (online/offline), NOT replace entire user list
      // The response tells us which users are active, but we should only update their status
      // NOT replace the entire users array from database
      if (response.data?.active && Array.isArray(response.data.active)) {
        const activeEmails = new Set(response.data.active);
        // Update user statuses without replacing the list
        setUsers(prev =>
          Array.isArray(prev) ? prev.map(u => ({
            ...u,
            isOnline: activeEmails.has(u.email)
          })) : []
        );
      }
    } catch (e) {
      console.error("Error validating sessions:", e);
    }
  };

  // Call validate sessions every 45 seconds
  useEffect(() => {
    if (!currentUser) return;

    // Validate immediately on login
    validateSessions();

    // Then validate periodically
    const interval = setInterval(validateSessions, 45000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ── Inbox polling: fetch notifications from DB every 10s ──
  // Use a ref to track which DB activity IDs we've already seen
  // Persist to localStorage so it survives page reloads
  const seenActivityIds = useRef(new Set());

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("seenActivityIds");
      if (saved) {
        seenActivityIds.current = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load seenActivityIds:", e);
    }
  }, []);

  const fetchInbox = async () => {
    if (!currentUser) return;
    const isAdminOrManager = ["Admin", "Manager"].includes(currentUser.role);
    try {
      // Personal notifications (forward requests, responses, ticket assignments for agents)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const since = oneDayAgo.toISOString();

      const personalRes = await axios.get(`${NOTIFICATIONS_API}?userId=${currentUser.id}&since=${since}`);

      const personalItems = personalRes.data || [];

      // Global activity log (userId=0) — only admins/managers pull this
      let globalItems = [];
      if (isAdminOrManager) {
        const globalRes = await axios.get(`${NOTIFICATIONS_API}?userId=0&since=${since}`);
        globalItems = globalRes.data || [];
      }

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      // ── Activity items for bell: global rows (admins) + personal activity rows (agents) ──
      const allActivityItems = [
        ...globalItems.filter(i => i.type === "activity"),
        ...personalItems.filter(i => i.type === "activity")
      ];

      // Build bell items from today's activity — DB is the single source of truth
      const bellItems = allActivityItems
        .filter(a => new Date(a.createdAt) >= todayStart)
        .map(a => ({
          id: `db-${a.id}`,
          dbId: a.id,
          type: a.broadcastType || "activity",
          icon: a.broadcastIcon || "📢",
          text: a.title,
          ticketId: a.ticketId,
          by: a.from,
          time: a.createdAt,
          fromDB: true,
          fromBroadcast: a.userId === 0
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      setDailyNotifs(bellItems);

      const alertNotifs = allActivityItems
        .filter(a => new Date(a.createdAt) >= oneDayAgo)
        .map(a => ({
          id: `db-${a.id}`,
          dbId: a.id,
          type: a.broadcastType || "activity",
          icon: a.broadcastIcon || "📢",
          text: a.title,
          ticketId: a.ticketId,
          by: a.from,
          time: a.createdAt,
          fromDB: true,
          fromBroadcast: a.userId === 0
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time));
      setAlertNotifs(alertNotifs);

// Unread = items not yet seen (not in ref). Ref is populated when bell is opened.

      // Unread = items not yet seen (not in ref). Ref is populated when bell is opened.
      const unseenCount = bellItems.filter(b => !seenActivityIds.current.has(b.dbId)).length;
      setBellUnread(unseenCount);

      // ── Inbox panel: personal non-activity items (forward requests, responses, assignments) ──
      const inboxOnlyItems = personalItems.filter(i => i.type !== "activity");
      setInboxItems(inboxOnlyItems);
      setInboxUnread(inboxOnlyItems.filter(i => !i.read).length);

      // Auto-dismiss floating alerts for forward_requests resolved by another admin
      setFloatingAlerts(prev => prev.filter(a => {
        if (a.type !== "forward_request") return true;
        const live = inboxOnlyItems.find(i => i.id === a.id);
        return live ? !live.resolved : true; // remove if resolved
      }));

      inboxOnlyItems
        .filter(i => !i.read && (i.type === "forward_request" || i.type === "forward_response") && (i.type !== "forward_request" || !i.resolved))
        .forEach(item => {
          if (!item.alerted) {
            pushFloatingAlert(item);
            axios.put(`${NOTIFICATIONS_API}/${item.id}`, { ...item, alerted: true }).catch(() => { });
          }
        });

      // ✅ NEW: Popup when current user gets a ticket assigned
      inboxOnlyItems
        .filter(i => !i.read && i.type === "ticket_assignment")
        .forEach(item => {
          if (!item.alerted) {
            setCustomAlert({
              show: true,
              message: `🎫 ${item.title || 'New ticket assigned to you!'}`,
              type: "success",
              duration: 5000
            });
            axios.put(`${NOTIFICATIONS_API}/${item.id}`, { ...item, alerted: true }).catch(() => { });
          }
        });
    } catch (e) {
      // Silently fail — notifications are non-critical
    }
  };

   useEffect(() => {
    if (!currentUser) return;
    // ✅ REMOVED: seenActivityIds.current = new Set(); // Don't reset - keep persistent across reloads
    fetchInbox();
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // SSE: instant popup dismiss when another admin approves a forward request
  useEffect(() => {
    if (!currentUser) return;
    const es = new EventSource(`${SSE_URL}/${currentUser.id}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === "forward_resolved") {
        setFloatingAlerts(prev => prev.filter(a =>
          !(a.type === "forward_request" && a.ticketId === data.ticketId)
        ));
        setInboxItems(prev => prev.map(i =>
          i.type === "forward_request" && i.ticketId === data.ticketId && !i.resolved
            ? { ...i, resolved: data.resolved, read: true }
            : i
        ));
      }
    };
    return () => es.close();
  }, [currentUser])



  // ✅ NEW: Listen for role change broadcasts from other tabs/admins
  useEffect(() => {
    if (!currentUser) return;

    const handleStorageChange = (e) => {
      if (e.key === `role_change_${currentUser.id}`) {
        // Role was changed by admin for current user
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.newRole) {
            setCustomAlert({ show: true, message: `Your role has been changed to ${data.newRole}. Page will refresh automatically.`, type: "success" });
            // Refresh after 2 seconds
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (error) {
          console.error("Error processing role change notification:", error);
        }
      }

      // ✅ NEW: Listen for logout events from other tabs
      if (e.key === SESSION_KEY && e.newValue === null) {
        // Another tab/window logged out - refresh users list to update status display
        loadData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentUser]);

  // Calculate project progress based on status
  const getProgressFromStatus = (status) => {
    switch (status) {
      case "Open": return 0;
      case "Pending": return 50;
      case "Closed": return 100;
      default: return 0;
    }
  };

  // ✅ NEW: Helper to get display status based on session
  const getDisplayStatus = (user) => {
    // Check if this user is the currently logged-in user
    if (currentUser && currentUser.id === user.id) {
      return "Logged-In";
    }
    // Otherwise, assume logged out
    return "Logged-Out";
  };

  // You can also add this for your dropdowns
  const managersOnly = useMemo(() => {
    return Array.isArray(users) ? users.filter(u => u.role === "Admin" || u.role === "Manager") : [];
  }, [users]);

  // ─── COMPUTED DATA ─────────────────────────────────────────────────────────
  const now = Date.now(), dayMs = 86400000;
  const rangeMs = (() => {
    if (range === "all") return Infinity;
    if (range === "custom") return Infinity; // handled separately in fbr
    if (range === "last_month") {
      // last 6 calendar months back from today
      const d = new Date(); d.setHours(0, 0, 0, 0);
      const start6mo = new Date(d); start6mo.setMonth(start6mo.getMonth() - 6);
      return d.getTime() - start6mo.getTime();
    }
    return parseInt(range) * dayMs;
  })();
  const fbr = useMemo(() => {
    let inRange;
    if (range === "all") {
      inRange = tickets;
    } else if (range === "custom") {
      const from = customDateFrom ? new Date(customDateFrom) : null;
      const to = customDateTo ? new Date(customDateTo) : null;
      if (to) to.setHours(23, 59, 59, 999);
      inRange = tickets.filter(t => {
        const tc = t.created instanceof Date ? t.created : new Date(t.created);
        if (from && tc < from) return false;
        if (to && tc > to) return false;
        return true;
      });
    } else if (range === "last_month") {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      const start6mo = new Date(d); start6mo.setMonth(start6mo.getMonth() - 6);
      inRange = tickets.filter(t => t.created.getTime() >= start6mo.getTime());
    } else {
      inRange = tickets.filter(t => {
        const dateField = t.status === "Closed" && t.closedAt
          ? new Date(t.closedAt)
          : (t.created instanceof Date ? t.created : new Date(t.created));
        return now - dateField.getTime() <= rangeMs;
      });
    }
    if (currentUser?.role === "Admin" || currentUser?.role === "Manager") {
      inRange = inRange;
    } else {
      inRange = inRange.filter(t => t.reportedBy === currentUser?.name || t.assignees?.some(a => a.id === currentUser?.id || a.name === currentUser?.name));
    }
    return inRange;
  }, [tickets, range, rangeMs, now, currentUser, customDateFrom, customDateTo, view]);

  // ✅ NEW: Dashboard data filtered by organization AND time period
  const dashboardData = useMemo(() => {
    let data = fbr;
    if (dashboardOrg !== "all") {
      data = data.filter(t => t.org === dashboardOrg);
    }

    // ✅ NEW: Filter by time period
    const now = new Date();
    const cutoffDate = new Date();

    switch (dashboardTimePeriod) {
      case "1d": cutoffDate.setHours(0, 0, 0, 0); break;
      case "7d": cutoffDate.setDate(cutoffDate.getDate() - 7); break;
      case "1m": cutoffDate.setMonth(cutoffDate.getMonth() - 1); break;
      case "3m": cutoffDate.setMonth(cutoffDate.getMonth() - 3); break;
      case "6m": cutoffDate.setMonth(cutoffDate.getMonth() - 6); break;
      case "1y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); break;
      case "all": default: return data;
    }

    return data.filter(t => {
  const dateField = t.status === "Closed"
    ? (t.closedAt ? new Date(t.closedAt) : (() => { const e = (t.timeline||[]).slice().reverse().find(e=>e.action?.includes("Status changed to Closed")); return e?.date ? new Date(e.date) : (t.created instanceof Date ? t.created : new Date(t.created)); })())
    : (t.created instanceof Date ? t.created : new Date(t.created));
      return dateField >= cutoffDate;
    });
  }, [fbr, dashboardOrg, dashboardTimePeriod]);

  // ✅ NEW: Classified reports data based on filters
  const classifiedReportsData = useMemo(() => {
    let data = fbr;

    if (exportFilterType === "assignee" && exportFilterValue) {
      data = data.filter(t => t.assignees?.some(a => a.id === exportFilterValue));
    } else if (exportFilterType === "category" && exportFilterValue) {
      data = data.filter(t => t.category === exportFilterValue);
    } else if (exportFilterType === "type" && exportFilterValue) {
      if (exportFilterValue === "webcast") {
        data = data.filter(t => t.category === "Webcast");
      } else if (exportFilterValue === "ticket") {
        data = data.filter(t => t.category !== "Webcast");
      }
    } else if (exportFilterType === "status" && exportFilterValue) {
      data = data.filter(t => t.status === exportFilterValue);
    } else if (exportFilterType === "priority" && exportFilterValue) {
      data = data.filter(t => t.priority === exportFilterValue);
    }

    return data;
  }, [fbr, exportFilterType, exportFilterValue]);

  // Report filtered data uses the same top-bar range filter as the dashboard
  const reportFilteredData = fbr;

  const prbr = useMemo(() => range === "all" ? projects : projects.filter(p => now - p.created.getTime() <= rangeMs), [projects, rangeMs, range, now]);

  const isPrivilegedRole = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const effectiveTvFilter = (tvFilter === "unassigned" && !isPrivilegedRole) ? "all" : tvFilter;
  const cvd = TICKET_VIEWS.find(v => v.id === effectiveTvFilter) || TICKET_VIEWS[6];

  // A ticket is a webcast if category === "Webcast" or isWebcast === true
  const isTrueWebcast = (t) =>
    t.category === "Webcast" || t.isWebcast === true;

  const SERVER_FILTERED_VIEWS = ["open", "closed", "reopened", "pastdue", "unassigned"];
  const filtered = useMemo(() => tickets.filter(t => {
    if (!currentUser) return false;
    if (!SERVER_FILTERED_VIEWS.includes(cvd.id) && !cvd.filter(t, currentUser)) return false;
    if (cvd.id !== "bin" && t.status === "Bin") return false;
    // Webcasts (isWebcast/category=Webcast) are loaded locally — apply manual filter for server-side views
    if (SERVER_FILTERED_VIEWS.includes(cvd.id) && isTrueWebcast(t)) {
      if (cvd.id === "reopened") return (t.timeline || []).some(e => e.action === "Reopened");
      if (cvd.id === "open") return t.status === "Open";
      if (cvd.id === "closed") return t.status === "Closed";
      if (cvd.id === "pastdue") { const due = t.dueDate && new Date(t.dueDate); const today = new Date(); today.setHours(0,0,0,0); return t.status === "Open" && due && due < today; }
      if (cvd.id === "unassigned") return t.status === "Open" && (!t.assignees || t.assignees.length === 0);
    }
    if (currentUser.role !== "Admin" && currentUser.role !== "Manager" && t.reportedBy !== currentUser.name && !t.assignees?.some(a => a.id === currentUser.id || a.name === currentUser.name)) return false;
    if (statusF !== "All" && t.status !== statusF) return false;
    if (priorityF !== "All" && t.priority !== priorityF) return false;
    if (orgFilter !== "all" && t.org !== orgFilter) return false;
    if (deptFilter !== "all" && t.department !== deptFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (dashboardTimePeriod !== "all" && cvd.id !== "reopened") {
      const cutoff = new Date();
      if (dashboardTimePeriod === "1d") cutoff.setHours(0, 0, 0, 0);
      else if (dashboardTimePeriod === "7d") { cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0, 0, 0, 0); }
      else if (dashboardTimePeriod === "1m") { cutoff.setMonth(cutoff.getMonth() - 1); cutoff.setHours(0, 0, 0, 0); }
      else if (dashboardTimePeriod === "3m") { cutoff.setMonth(cutoff.getMonth() - 3); cutoff.setHours(0, 0, 0, 0); }
      else if (dashboardTimePeriod === "6m") { cutoff.setMonth(cutoff.getMonth() - 6); cutoff.setHours(0, 0, 0, 0); }
      else if (dashboardTimePeriod === "1y") { cutoff.setFullYear(cutoff.getFullYear() - 1); cutoff.setHours(0, 0, 0, 0); }
      const isClosed = t.status === "Closed";
      const closedDate = isClosed
        ? (t.closedAt ? new Date(t.closedAt) : (() => { const e = (t.timeline||[]).slice().reverse().find(e=>e.action?.includes("Status changed to Closed")); return e?.date ? new Date(e.date) : null; })())
        : null;
      const tc = (isClosed && closedDate) ? closedDate : (t.created instanceof Date ? t.created : new Date(t.created));
      if (tc < cutoff) return false;
    }
    if (filterStatus.length > 0) {
      const statusPass = filterStatus.some(f => {
        if (f === "open") return t.status === "Open";
        if (f === "closed") return t.status === "Closed";
        if (f === "pastdue") { const due = t.dueDate && new Date(String(t.dueDate)); const today = new Date(); today.setHours(0,0,0,0); return t.status === "Open" && due && due < today; }        return false;
      });
      if (!statusPass) return false;
    }
    // Assignment filter
    if (filterAssignment.length > 0) {
      const assignPass = filterAssignment.some(f => {
        if (f === "assigned") return t.assignees && t.assignees.length > 0;
        if (f === "unassigned") return !t.assignees || t.assignees.length === 0;
        if (f === "vendor") return t.status === "Pending" && t.timeline?.some(ev => ev.action?.includes("Sent for Repair"));
        return false;
      });
      if (!assignPass) return false;
    }
    // Assignee search
    if (filterAssignee.length > 0) {
      if (!t.assignees?.some(a => filterAssignee.includes(a.name))) return false;
    }
    // Category search
    if (filterCategory.trim()) {
      if (!t.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    }
    if (debouncedSearch) {
      if (debouncedSearch.startsWith("event:")) {
        const id = debouncedSearch.split(":")[1];
        return String(t.satsangId) === id;
      }
      if (!t.summary.toLowerCase().includes(debouncedSearch.toLowerCase()) && !t.id.toLowerCase().includes(debouncedSearch.toLowerCase()) && !t.org.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    }
    return true;
  }), [tickets, cvd, currentUser, statusF, priorityF, debouncedSearch, orgFilter, deptFilter, categoryFilter, filterStatus, filterAssignment, filterAssignee, filterCategory, dashboardTimePeriod]);

      // ── HOOK WIRING ──────────────────────────────────────────────────────────────
  const ctx = {
    tickets, setTickets, filtered, departments,
    ticketCategories, setTicketCategories,
    loadData,
    view, cvd,
    projects, setProjects,
    users, setUsers, orgs, setOrgs,
    categories, setCategories, customAttrs, setCustomAttrs,
    locations, setLocations, vendors, setVendors,
    departments, setDepartments,
    currentUser, setCurrentUser,
    form, setForm, projForm, setProjForm, authForm, setAuthForm,
    setShowNewTicket, setShowNewProject,
    showAssigneeDD, setShowAssigneeDD,
    setShowProjAssigneeDD, setShowRemarkModal, setShowForward,
    setShowVendor, setShowLocationModal,
    setShowConfirmation: (v) => setConfirmModal(v),
    setConfirmModal,
    setConfirmationConfig: () => {},
    setShowAddVendorModal,
    selectedIds, setSelectedIds,
    selTicket, setSelTicket, selProject, setSelProject,
    selectedForwardAgent: fwdTargetAgent, setSelectedForwardAgent: setFwdTargetAgent,
    forwardNote: fwdReason, setForwardNote: setFwdReason,
    showForward, showVendor,
    vendorReturnNote, setVendorReturnNote,
    vendorReturnOutcome, setVendorReturnOutcome,
    setClosingTicketId, setIsReopenModal, isReopenModalRef, setPendingTicketStatus, setClosedBy,
    setTicketRemark, setClosedDate, setMinutes: () => {},
    closingTicketId, isReopenModal,
    ticketRemark, closedDate, closedBy,
    setCustomAlert, setCcInput, setAssigneeSearch,
    setDeleteConfirmation, setTicketImage, setTicketImagePreview,
    exportFilterType, exportFilterValue, exportFormat, targetTable,
    advancedExportFilters,
    newOrg, setNewOrg, newCat, setNewCat, newUser, setNewUser,
    newAttr, setNewAttr, newLocation, setNewLocation,
    newVendor, setNewVendor, newDept, setNewDept,
    newSubcategory, setNewSubcategory, newSubcatCatId, setNewSubcatCatId,
    attrLayout: layoutDraft, draftLayout, setDraftLayout,
    showAttrLayoutModal, setShowAttrLayoutModal,
    setAuthError, setAuthMessage, setView,
    agentUser: selAgent, setAgentUser: setSelAgent,
    dailyNotifs, setBellUnread, setShowBellPanel, setShowInboxPanel,
    inboxItems, setInboxItems, setInboxUnread, seenActivityIds,
    setTvFilter, setPvFilter, setSettingsTab,
    addDailyNotif,
    isTrueWebcast,
    selTicket,
    ticketImage,
    passwordForm, setPasswordForm,
    setShowChangePassword,
    profileForm, setProfileForm,
    setEditProfileOpen,
    switchView,
  };

  // ✅ NEW: Filter for webcast tickets only
  const webcastFiltered = useMemo(() => tickets.filter(t => {
    // ✅ Only show true webcasts (WEB-/WC- IDs or isWebcast=true), never TKT- tickets
    if (!isTrueWebcast(t)) return false;

    if (!currentUser || !cvd.filter(t, currentUser)) return false;
    // Non-admins/managers only see tickets assigned to them or reported by them
    if (currentUser.role !== "Admin" && currentUser.role !== "Manager" && t.reportedBy !== currentUser.name && !t.assignees?.some(a => a.id === currentUser.id || a.name === currentUser.name)) return false;
    if (statusF !== "All" && t.status !== statusF) return false;
    if (priorityF !== "All" && t.priority !== priorityF) return false;
    if (orgFilter !== "all" && t.org !== orgFilter) return false;
    if (deptFilter !== "all" && t.department !== deptFilter) return false;
    if (search) {
      if (search.startsWith("event:")) {
        const id = search.split(":")[1];
        return String(t.satsangId) === id;
      }
      if (!t.summary.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase()) && !t.org.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  }), [tickets, cvd, currentUser, statusF, priorityF, search, orgFilter, deptFilter]);

  const totalPages = Math.ceil(ticketTotalCount / TICKETS_PER_PAGE);
  // Filter tickets by column filters
  const allSortedTickets = useMemo(() => filtered, [filtered]);

  // Paginate the sorted list
  const currentTickets = allSortedTickets;
  const stats = useMemo(() => ({ total: fbr.length, open: fbr.filter(x => x.status === "Open").length, closed: fbr.filter(x => x.status === "Closed").length, critical: fbr.filter(x => x.priority === "Critical").length }), [fbr]);

  const [dashboardStatsMap, setDashboardStatsMap] = useState({ priority: [], category: [], daily: [], assignedUsers: {} });
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(false);
  const [dashboardRefreshTick, setDashboardRefreshTick] = useState(0);

  // ✅ NEW: Dashboard stats (filtered by organization)
  const dashboardStats = useMemo(() => {
    const isAgent = currentUser?.role === "Agent" || currentUser?.role === "Viewer";

    // NOTE: Webcasts are stored in the Tickets table (isWebcast=true / category=Webcast).
    // Server counts already include them — do NOT add them separately to avoid double-counting.

    // Admin/Manager: always prefer server counts (fetched with correct org+dateFrom filters)
    if (!isAgent && dashboardStatsMap.counts) {
      return {
        total:      dashboardStatsMap.counts.total,
        open:       dashboardStatsMap.counts.open,
        closed:     dashboardStatsMap.counts.closed,
        critical:   dashboardStatsMap.counts.critical,
        reopened:   dashboardStatsMap.counts.reopened,
        unassigned: dashboardStatsMap.counts.unassigned ?? 0,
      };
    }
    // Admin/Manager fallback before dashboard stats load (initial page load, no filter)
    if (!isAgent && serverTicketCounts && dashboardOrg === "all" && dashboardTimePeriod === "all") {
      const open   = serverTicketCounts.byStatus?.find(r => r.status === "Open")?.cnt || 0;
      const closed = serverTicketCounts.byStatus?.find(r => r.status === "Closed")?.cnt || 0;
      return {
        total:      serverTicketCounts.total,
        open:       parseInt(open),
        closed:     parseInt(closed),
        critical:   serverTicketCounts.critical,
        reopened:   serverTicketCounts.reopened,
        unassigned: serverTicketCounts.unassigned ?? 0,
      };
    }
    // Agent/Viewer: compute from local dashboardData (their own tickets only)
    let base = dashboardData;
    if (isAgent) base = base.filter(t => t.assignees?.some(a => a.id === currentUser?.id || a.name === currentUser?.name));
    // Reopened uses unfiltered dashboardData (no assignee filter) to match what the Reopened tile click shows
    const reopenedBase = dashboardData.filter(x => x.status !== "Bin");
    return {
      total:      base.filter(x => x.status !== "Bin").length,
      open:       base.filter(x => x.status === "Open").length,
      closed:     base.filter(x => x.status === "Closed").length,
      critical:   base.filter(x => x.priority === "Critical" && x.status === "Open").length,
      reopened:   reopenedBase.filter(x => (x.timeline || []).some(e => e.action === "Reopened" || (e.action?.includes("Status changed to Open") && (x.timeline||[]).some(prev => prev.action?.includes("Status changed to Closed"))))).length,
      unassigned: base.filter(x => x.status === "Open" && (!x.assignees || x.assignees.length === 0)).length,
    };
  }, [dashboardData, currentUser, serverTicketCounts, dashboardStatsMap, dashboardOrg, dashboardTimePeriod]);

  // For dashboard: Agents and Viewers only see stats for projects assigned to them
  const dashboardProjects = useMemo(() => {
    if (currentUser?.role === "Agent" || currentUser?.role === "Viewer") {
      return prbr.filter(p => p.assignees?.some(a => a.id === currentUser?.id));
    }
    return prbr;
  }, [prbr, currentUser]);

  const projStats = useMemo(() => ({ total: dashboardProjects.length, open: dashboardProjects.filter(x => x.status === "Open").length, closed: dashboardProjects.filter(x => x.status === "Closed").length, critical: dashboardProjects.filter(x => x.priority === "Critical" && x.status !== "Closed").length }), [dashboardProjects]);
  const [agentStatsMap, setAgentStatsMap] = useState({ assigned: {}, closed: {} });
  useEffect(() => {
    axios.get(`${BASE_URL}/stats/agents`).then(r => setAgentStatsMap(r.data)).catch(() => {});
  }, [tickets]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (dashboardOrg !== "all") params.set("org", dashboardOrg);
    if (dashboardTimePeriod !== "all") {
      const cutoff = new Date();
      if (dashboardTimePeriod === "1d") cutoff.setHours(0, 0, 0, 0);
      else if (dashboardTimePeriod === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (dashboardTimePeriod === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
      else if (dashboardTimePeriod === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
      else if (dashboardTimePeriod === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
      else if (dashboardTimePeriod === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
      const _p3 = n => String(n).padStart(2,"0"); params.set("dateFrom", `${cutoff.getFullYear()}-${_p3(cutoff.getMonth()+1)}-${_p3(cutoff.getDate())}`);
    }
    const qs = params.toString();
    setDashboardStatsLoading(true);
    axios.get(`${BASE_URL}/stats/dashboard${qs ? `?${qs}` : ""}`)
      .then(r => { setDashboardStatsMap(r.data); setDashboardStatsLoading(false); })
      .catch(() => { setDashboardStatsLoading(false); });
  }, [dashboardOrg, dashboardTimePeriod, dashboardRefreshTick]);

  const agentStats = useMemo(() => {
    const orgProjects = dashboardOrg === "all" ? prbr : prbr.filter(p => p.org === dashboardOrg);
    return (Array.isArray(users) ? users : []).filter(u => u.active !== false).map(u => ({
      ...u,
      assigned: agentStatsMap.assigned[u.name] || 0,
      closed: agentStatsMap.closed[u.name] || 0,
      projAssigned: orgProjects.filter(p => p.assignees?.some(a => a.id === u.id)).length
    }));
  }, [agentStatsMap, prbr, users, dashboardOrg]);
  const dailyData = useMemo(() => { const days = parseInt(range) <= 7 ? parseInt(range) : 7; return Array.from({ length: days }, (_, i) => { const d = new Date(now - (days - 1 - i) * dayMs); return { label: d.toLocaleDateString("en", { weekday: "short" }), value: fbr.filter(t => {
  const dateField = t.status === "Closed" && t.closedAt
      ? new Date(t.closedAt)
      : (t.created instanceof Date ? t.created : new Date(t.created));
    return dateField.getDate() === d.getDate() && dateField.getMonth() === d.getMonth();
  }).length }; }); }, [fbr, range, now, dayMs]);
  const priorityDist = useMemo(() => {
    const isAgent = currentUser?.role === "Agent" || currentUser?.role === "Viewer";
    if (!isAgent && dashboardStatsMap.priority.length) {
      const map = Object.fromEntries(dashboardStatsMap.priority.map(r => [r.priority, Number(r.cnt)]));
      return PRIORITIES.map(p => ({ label: p, value: map[p] || 0, color: PRIORITY_COLOR[p] }));
    }
    let base = dashboardData.filter(t => t.status !== "Bin");
    if (isAgent) base = base.filter(t => t.assignees?.some(a => a.id === currentUser?.id || a.name === currentUser?.name));
    return PRIORITIES.map(p => ({ label: p, value: base.filter(t => t.priority === p).length, color: PRIORITY_COLOR[p] }));
  }, [dashboardStatsMap, dashboardData, dashboardTimePeriod, dashboardOrg, currentUser]);
  const categoryCountMap = useMemo(() => {
    if (dashboardStatsMap.category.length) {
      return Object.fromEntries(dashboardStatsMap.category.map(r => [r.category, Number(r.cnt)]));
    }
    const map = {};
    dashboardData.filter(t => t.status !== "Bin")
      .forEach(t => { map[t.category] = (map[t.category] || 0) + 1; });
    return map;
  }, [dashboardStatsMap, dashboardData, dashboardTimePeriod, dashboardOrg]);

  const categoryDist = useMemo(() => categories.slice(0, 6).map(c => ({ label: c.name, value: categoryCountMap[c.name] || 0, color: c.color })), [categoryCountMap, categories]);
  const categoryDistFull = useMemo(() => {
    return [...categories].map((c, i) => ({ label: c.name, value: categoryCountMap[c.name] || 0, color: PIE_COLORS[i % PIE_COLORS.length] })).sort((a, b) => b.value - a.value);
  }, [categoryCountMap, categories]);

  // ✅ NEW: Dashboard-specific chart data (with org filter)
  const dashboardDailyData = useMemo(() => {
    const getChartDate = (t) => {
      if (t.status === "Closed") {
        if (t.closedAt) return new Date(t.closedAt);
        const e = (t.timeline||[]).slice().reverse().find(e => e.action?.includes("Status changed to Closed"));
        if (e?.date) return new Date(e.date);
      }
      return t.created instanceof Date ? t.created : new Date(t.created);
    };
  const serverDailyMap = Object.fromEntries((dashboardStatsMap.daily || []).map(r => [r.day, Number(r.cnt)]));
  const base = tickets.filter(t => t.status !== "Bin" && (dashboardOrg === "all" || t.org === dashboardOrg) && (currentUser?.role !== "Agent" || t.assignees?.some(a => a.id === currentUser.id || a.name === currentUser.name)));    if (range === "1") {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const slots = [
        { label: "12am", start: 0, end: 4 }, { label: "4am", start: 4, end: 8 },
        { label: "8am", start: 8, end: 12 }, { label: "12pm", start: 12, end: 16 },
        { label: "4pm", start: 16, end: 20 }, { label: "8pm", start: 20, end: 24 },
      ];
      return slots.map(slot => ({
        label: slot.label,
        value: base.filter(t => {
          const d = getChartDate(t);
          return d >= todayStart && d.getHours() >= slot.start && d.getHours() < slot.end;
        }).length
      }));
    }
    const days = 7;
    return Array.from({ length: days }, (_, i) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i));
      const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
      const _p4 = n => String(n).padStart(2,"0"); const dayKey = `${d.getFullYear()}-${_p4(d.getMonth()+1)}-${_p4(d.getDate())}`;
      return {
        label: d.toLocaleDateString("en", { weekday: "short" }),
        value: (currentUser?.role === "Agent" ? null : serverDailyMap[dayKey]) ?? base.filter(t => {
          const td = t.created instanceof Date ? t.created : new Date(t.created);
          return td >= d && td <= dEnd;
        }).length
      };
    });
}, [dashboardStatsMap, tickets, dashboardOrg, range, now, dayMs]);

  const dashboardStatusDist = useMemo(() => {
  const base = dashboardData.filter(t => t.status !== "Bin");
  return [
    { label: "Open",        value: base.filter(t => t.status === "Open").length,                                          color: STATUS_COLOR["Open"]?.text || "#1d4ed8" },
    { label: "Closed",      value: base.filter(t => t.status === "Closed" || t.status === "Resolved").length,             color: STATUS_COLOR["Closed"]?.text || "#15803d" },
  ];
}, [dashboardData]);

  const dashboardClosingUsers = useMemo(() => {
    const closedMap = dashboardStatsMap.closingUsers ?? agentStatsMap.closed;
    return users.filter(u => u.active !== false).map((u, i) => ({
      label: u.name,
      value: closedMap[u.name] || 0,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [agentStatsMap, dashboardStatsMap, users]);

  const dashboardClosingUsersFull = useMemo(() => {
    const closedMap = dashboardStatsMap.closingUsers ?? agentStatsMap.closed;
    return users.filter(u => u.active !== false).map((u, i) => ({
      label: u.name,
      value: closedMap[u.name] || 0,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [agentStatsMap, dashboardStatsMap, users]);

  const dashboardAssignedUsersFull = useMemo(() => {
    const assignedMap = dashboardStatsMap.assignedUsers ?? {};
    return users.filter(u => u.active !== false).map((u, i) => {
      const entry = assignedMap[u.name] || { open: 0, closed: 0 };
      return {
        label: u.name,
        open: entry.open,
        closed: entry.closed,
        value: entry.open + entry.closed,
        color: PIE_COLORS[i % PIE_COLORS.length],
      };
    }).sort((a, b) => b.value - a.value);
  }, [dashboardStatsMap, users]);

  // ✅ NEW: Yearly data for reports (30+ days)
  const yearlyData = useMemo(() => {
    const months = 12;
    const monthlyData = {};

    fbr.forEach(t => {
      const monthKey = t.created.toLocaleDateString("en", { month: "short" });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now - (months - 1 - i) * dayMs * 30);
      const monthKey = d.toLocaleDateString("en", { month: "short" });
      return {
        label: monthKey,
        value: monthlyData[monthKey] || 0
      };
    });
  }, [fbr, now, dayMs]);

  const categoryDistAll = categoryDistFull;
  const statusDist = dashboardStatusDist;
  const orgDist = useMemo(() => orgs.map(o => ({ label: o.name, value: dashboardData.filter(t => t.org === o.name && t.status !== "Bin").length, color: "#3b82f6" })).sort((a,b) => b.value - a.value), [dashboardData, orgs]);
  const agentDist = useMemo(() => users.filter(u => u.active !== false).map((u,i) => ({ label: u.name, value: agentStatsMap.closed[u.name] || 0, color: PIE_COLORS[i % PIE_COLORS.length] })).sort((a,b) => b.value - a.value).slice(0,8), [agentStatsMap, users]);
  const monthlyDist = yearlyData;


  // Webcast fields shared component
  const WebcastFields = ({ f, setF, isProject = false }) => {
    const [satsangSearch, setSatsangSearch] = useState("");
    const [showDD, setShowDD] = useState(false);
    const locSearch = isProject ? projWebcastLocationSearch : webcastLocationSearch;
    const setLocSearch = isProject ? setProjWebcastLocationSearch : setWebcastLocationSearch;
    const showLocDD = isProject ? showProjWebcastLocationDD : showWebcastLocationDD;
    const setShowLocDD = isProject ? setShowProjWebcastLocationDD : setShowWebcastLocationDD;

    return (
      <div style={{ background: "#fff7ed", borderRadius: 9, border: "1px solid #fed7aa", padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#9a3412", marginBottom: 12 }}>📡 Webcast Details (Required)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
          <FF label="Sub Category" required>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search sub category..."
                value={satsangSearch || f.satsangType}
                onChange={e => setSatsangSearch(e.target.value)}
                onFocus={() => setShowDD(true)}
                onBlur={() => setTimeout(() => setShowDD(false), 200)}
                style={{ ...iS, width: "100%", fontSize: 12 }}
              />
              {showDD && (
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 280, overflowY: "auto" }}>
                  {(() => {
                    const webcastCat = categories.find(c => c.name === "Webcast");
                    const subcats = (webcastCat?.subcategories || []).filter(t => satsangSearch === "" || t.toLowerCase().includes(satsangSearch.toLowerCase()));
                    return subcats.length === 0
                      ? <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No sub categories found. Add via Settings → Categories → Webcast.</div>
                      : subcats.map(t => (
                          <div key={t} onClick={() => { setF({ ...f, satsangType: t }); setShowDD(false); setSatsangSearch(""); }} onMouseDown={e => e.preventDefault()} style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", backgroundColor: f.satsangType === t ? "#eff6ff" : "transparent" }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{t}</div>
                          </div>
                        ));
                  })()}
                </div>
              )}
            </div>
          </FF>
          <FF label="Location / Venue" required>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search location..."
                value={locSearch || (f.location ? locations.find(l => l.name === f.location)?.name || "" : "")}
                onChange={e => setLocSearch(e.target.value)}
                onFocus={() => { setLocSearch(""); setShowLocDD(true); }}
                onBlur={() => setTimeout(() => setShowLocDD(false), 200)}
                style={{ ...iS, width: "100%", fontSize: 12 }}
              />
              {showLocDD && (
                <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 280, overflowY: "scroll" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 301 }}>
                    <input type="text" placeholder="Search locations..." value={locSearch} onChange={e => setLocSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {locations.filter(l => locSearch === "" || l.name.toLowerCase().includes(locSearch.toLowerCase())).map(l => (
                      <div key={l.id} onClick={() => { setF({ ...f, location: l.name }); setShowLocDD(false); setLocSearch(""); }} onMouseDown={e => e.preventDefault()} style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", backgroundColor: f.location === l.name ? "#eff6ff" : "transparent", transition: "background 0.15s" }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</div>
                      </div>
                    ))}
                    {locations.filter(l => locSearch === "" || l.name.toLowerCase().includes(locSearch.toLowerCase())).length === 0 && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>No locations found</div>}
                  </div>
                </div>
              )}
            </div>
          </FF>
        </div>
      </div>
    );
  };


  const { handleSubmit, deleteTicket, updateStatus,
    handleSelectiveImport, handleExport,
    toggleSel, toggleCurrentPage, toggleAllFiltered,
    toggleAssignee,
    addCC, clearAllTickets, closeTicketWithRemark,
    compressImage } = useTicketHandlers(ctx);
  const { handleForward, handleForwardTicket, handleSendForRepair,
          handleVendorReturn }                            = useForwardHandlers({ ...ctx, forwardRequests, setForwardRequests });
  const { addOrg, deleteOrg, addCat, deleteCat,
        updateCatSubcategories, addUser, deleteUser,
        addAttr, deleteAttr, updateAttrLayout,
        saveLayoutDraft, changePassword, editUser }     = useSettingsHandlers(ctx);
  const { handleProjectSubmit, updateProjectStatus,
          deleteProject, addProjCC,
          addDept, deleteDept }                           = useProjectHandlers(ctx);
  const { addLocation, deleteLocation,
          addVendor, deleteVendor }                       = useLocationHandlers(ctx);
  const { handleLogin, handleLogout,
          handleSignup }                                  = useAuthHandlers(ctx);
  const { updateStatusDirect, handleLunchBreak,
          updateTracking, calculateSessionDuration,
          saveProfile }                                   = useProfileHandlers(ctx);
  const restoreTicket = async (id) => {
    const t = tickets.find(x => x.id === id); if (!t) return;
    try {
      await axios.put(`${TICKETS_API}/${id}`, { status: "Open" });
      setTickets(p => p.map(x => x.id === id ? { ...x, status: "Open" } : x));
      setCustomAlert({ show: true, message: "✅ Ticket restored to Open", type: "success" });
    } catch (e) {
      setCustomAlert({ show: true, message: "❌ Failed to restore ticket", type: "error" });
    }
  };
  const restoreProject = async (id) => {
    const p = projects.find(x => x.id === id); if (!p) return;
    try {
      await axios.put(`${PROJECTS_API}/${id}`, { status: "Open" });
      setProjects(prev => prev.map(x => x.id === id ? { ...x, status: "Open" } : x));
      setCustomAlert({ show: true, message: "✅ Project restored to Open", type: "success" });
    } catch (e) {
      setCustomAlert({ show: true, message: "❌ Failed to restore project", type: "error" });
    }
  };
  const permanentDeleteTicket = async (id) => {
    try {
      await axios.delete(`${TICKETS_API}/${id}`);
      setTickets(p => p.filter(x => x.id !== id));
      setCustomAlert({ show: true, message: "🗑️ Ticket permanently deleted", type: "success" });
    } catch (e) {
      setCustomAlert({ show: true, message: "❌ Failed to delete ticket", type: "error" });
    }
  };
  const permanentDeleteProject = async (id) => {
    try {
      await axios.delete(`${PROJECTS_API}/${id}`);
      setProjects(p => p.filter(x => x.id !== id));
      setCustomAlert({ show: true, message: "🗑️ Project permanently deleted", type: "success" });
    } catch (e) {
      setCustomAlert({ show: true, message: "❌ Failed to delete project", type: "error" });
    }
  };
  
  const { sideNav, stabs, getPageTitle, thStyle, tdStyle,
          markBellRead, handleNotificationClick,
          markInboxRead, acceptInboxForwardRequest,
          rejectInboxForwardRequest }                     = useNavHandlers(ctx);
  // ─── LOADING SCREEN ─────────────────────────────────────────────────────────
  if (loading || bootPhase) return <BootScreen phase={bootPhase} />;

  // ─── AUTH SCREENS ──────────────────────────────────────────────────────────
  if (!currentUser) {
    const videoUrl = "https://www.artofliving.org/in-en/app/uploads/2023/06/Sunrise.webm"; // USER: Set your video URL here

    return (
      <div style={{ display: "flex", height: "100dvh", fontFamily: "'Arial Hebrew', 'DM Sans', sans-serif", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {/* FULL SCREEN VIDEO BACKGROUND */}
        <video
          autoPlay
          muted
          loop
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>

        {/* DARK OVERLAY (Optional - for better text visibility) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 1
          }}
        />

        {/* LOGIN/SIGNUP FORM ON TOP */}
        <div style={{ width: "100%", maxWidth: 420, position: "relative", transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)", transformStyle: "preserve-3d", transform: isLogin ? "rotateY(0deg)" : "rotateY(-180deg)", zIndex: 2 }}>

          {/* FRONT: LOGIN */}
          <div style={{ background: "rgba(255, 255, 255, 0.25)", backdropFilter: "blur(10px)", padding: 40, borderRadius: 20, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)", backfaceVisibility: "hidden", position: isLogin ? "relative" : "absolute", top: 0, left: 0, width: "100%", border: "1px solid rgba(255, 255, 255, 0.4)", fontFamily: "'Arial Hebrew', sans-serif", color: "#000" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 30 }}>
              <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff" }}>⚡</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>DeskFlow</div>
            </div>
            <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.15)", borderRadius: 10, padding: 4, marginBottom: 24, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
              <button onClick={() => { setIsLogin(true); setAuthError(""); setAuthMessage(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "#3b82f6", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", cursor: "pointer", fontWeight: 600, color: "#fff", fontFamily: "'Arial Hebrew', sans-serif" }}>Login</button>
              <button onClick={() => { setIsLogin(false); setAuthError(""); setAuthMessage(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontWeight: 600, color: "#000", fontFamily: "'Arial Hebrew', sans-serif" }}>Signup</button>
            </div>
            {authError && <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.2)", color: "#000", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500, border: "1px solid rgba(239, 68, 68, 0.3)", fontFamily: "'Arial Hebrew', sans-serif" }}>{authError}</div>}
            {authMessage && <div style={{ padding: "10px 14px", background: "rgba(34, 197, 94, 0.2)", color: "#000", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)", fontFamily: "'Arial Hebrew', sans-serif" }}>{authMessage}</div>}
            <form onSubmit={handleLogin}>
              <FF label="Email"><input type="email" required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="your@email.com" /></FF>
              <FF label="Password"><input type="password" required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="••••••••" /></FF>
              <button type="submit" style={{ ...bP, width: "100%", marginTop: 10, padding: 12, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", border: "none", fontFamily: "'Arial Hebrew', sans-serif", fontWeight: 600 }}>Log In</button>
              <div style={{ marginTop: 16, textAlign: "center" }}><button type="button" onClick={() => { setIsLogin(false); setAuthError(""); setAuthMessage(""); }} style={{ ...bG, border: "none", color: "#000", padding: 0, fontSize: 12, background: "transparent", fontFamily: "'Arial Hebrew', sans-serif" }}>Need an account? Sign up</button></div>
            </form>
          </div>

          {/* BACK: SIGNUP */}
          <div style={{ background: "rgba(255, 255, 255, 0.25)", backdropFilter: "blur(10px)", padding: 40, borderRadius: 20, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)", backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: !isLogin ? "relative" : "absolute", top: 0, left: 0, width: "100%", border: "1px solid rgba(255, 255, 255, 0.4)", fontFamily: "'Arial Hebrew', sans-serif", color: "#000" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 30 }}>
              <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff" }}>⚡</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>DeskFlow</div>
            </div>
            <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.15)", borderRadius: 10, padding: 4, marginBottom: 24, border: "1px solid rgba(255, 255, 255, 0.2)" }}>
              <button onClick={() => { setIsLogin(true); setAuthError(""); setAuthMessage(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontWeight: 600, color: "#000", fontFamily: "'Arial Hebrew', sans-serif" }}>Login</button>
              <button onClick={() => { setIsLogin(false); setAuthError(""); setAuthMessage(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: "#3b82f6", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", cursor: "pointer", fontWeight: 600, color: "#fff", fontFamily: "'Arial Hebrew', sans-serif" }}>Signup</button>
            </div>
            {authError && <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.2)", color: "#000", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500, border: "1px solid rgba(239, 68, 68, 0.3)", fontFamily: "'Arial Hebrew', sans-serif" }}>{authError}</div>}
            {authMessage && <div style={{ padding: "10px 14px", background: "rgba(34, 197, 94, 0.2)", color: "#000", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500, border: "1px solid rgba(34, 197, 94, 0.3)", fontFamily: "'Arial Hebrew', sans-serif" }}>{authMessage}</div>}
            <form onSubmit={handleSignup}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                <FF label="First Name" required><input required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.firstName} onChange={e => setAuthForm({ ...authForm, firstName: e.target.value })} placeholder="First" /></FF>
                <FF label="Last Name" required><input required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.lastName} onChange={e => setAuthForm({ ...authForm, lastName: e.target.value })} placeholder="Last" /></FF>
              </div>
              <FF label="Middle Name (Optional)"><input style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.middleName} onChange={e => setAuthForm({ ...authForm, middleName: e.target.value })} placeholder="Middle" /></FF>
              <FF label="Phone"><div style={{ display: "flex", gap: 6 }}>
                <select style={{ ...sS, width: 70, padding: "9px 6px", background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.countryCode} onChange={e => setAuthForm({ ...authForm, countryCode: e.target.value })}>
                  <option value="+1">+1</option><option value="+44">+44</option><option value="+91">+91</option><option value="+61">+61</option><option value="+81">+81</option>
                </select>
                <input style={{ ...iS, flex: 1, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.phone} onChange={e => setAuthForm({ ...authForm, phone: e.target.value })} placeholder="Phone" />
              </div></FF>
              <FF label="Email"><input type="email" required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="your@email.com" /></FF>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                <FF label="Password" required>
                  <input type="password" required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: authForm.password && authForm.password !== authForm.confirm ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="••••••••" />
                  <div style={{ marginTop: 4, height: 4, background: "rgba(255, 255, 255, 0.2)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pwdStr}%`, background: pwdColor, transition: "all 0.3s" }} /></div>

                  {/* ✅ NEW: Password Requirements */}
                  {authForm.password && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                      {pwdReqs.map(req => (
                        <div
                          key={req.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            color: req.met ? "#22c55e" : "#000",
                            opacity: req.met ? 0.6 : 1,
                            textDecoration: req.met ? "line-through" : "none",
                            animation: req.met ? "strikeThrough 0.5s ease-out" : "none",
                            transition: "all 0.3s ease"
                          }}
                        >
                          <span style={{ fontSize: 10 }}>{req.met ? "✓" : "•"}</span>
                          <span>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </FF>
                <FF label="Confirm" required><input type="password" required style={{ ...iS, background: "rgba(255, 255, 255, 0.1)", color: "#000", border: authForm.confirm && authForm.password !== authForm.confirm ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.2)", fontFamily: "'Arial Hebrew', sans-serif" }} value={authForm.confirm} onChange={e => setAuthForm({ ...authForm, confirm: e.target.value })} placeholder="••••••••" /></FF>
              </div>
              {authForm.confirm && authForm.password !== authForm.confirm && <div style={{ color: "#000", fontSize: 11, marginTop: -6, marginBottom: 10, fontFamily: "'Arial Hebrew', sans-serif" }}>Passwords do not match</div>}
              <button type="submit" disabled={authForm.password !== authForm.confirm} style={{ ...bP, width: "100%", marginTop: 4, padding: 12, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", border: "none", fontFamily: "'Arial Hebrew', sans-serif", fontWeight: 600, opacity: authForm.password !== authForm.confirm ? 0.5 : 1 }}>Sign Up</button>
              <div style={{ marginTop: 12, textAlign: "center" }}><button type="button" onClick={() => { setIsLogin(true); setAuthError(""); setAuthMessage(""); }} style={{ ...bG, border: "none", color: "#000", padding: 0, fontSize: 12, background: "transparent", fontFamily: "'Arial Hebrew', sans-serif" }}>Already have an account? Log in</button></div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN APP ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100dvh", fontFamily: "'DM Sans',sans-serif", background: "#f8fafc", color: "#1e293b", overflow: "hidden", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');html{font-size:14px;-webkit-text-size-adjust:100%;text-size-adjust:100%}*{box-sizing:border-box;-webkit-font-smoothing:antialiased;moz-osx-font-smoothing:grayscale}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}input:focus,select:focus,textarea:focus{border-color:#3b82f6!important;outline:none;background:#fff!important}.rh:hover td{background:#f8fafc!important}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* ✅ NEW: Custom Alert */}
      <CustomAlert
        show={customAlert.show}
        message={customAlert.message}
        type={customAlert.type}
        onDismiss={() => setCustomAlert({ show: false, message: "", type: "success" })}
      />

      {/* ✅ NEW: Confirmation Modal */}
      <ConfirmationModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        fields={confirmModal.fields}
        showLunchButton={confirmModal.showLunchButton}
        confirmLabel={confirmModal.confirmLabel}
        confirmDanger={confirmModal.confirmDanger}
        onConfirm={confirmModal.onConfirm}
        onLunch={confirmModal.onLunch}
        onCancel={confirmModal.onCancel}
      />

      {deleteConfirmation?.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#faf8f4", borderRadius: 4, padding: 24, maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{deleteConfirmation.title}</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{deleteConfirmation.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={deleteConfirmation.onCancel}
                style={{ padding: "10px 16px", background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#334155" }}
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirmation.onConfirm}
                style={{ padding: "10px 16px", background: deleteConfirmation.confirmDanger ? "#ef4444" : "#22c55e", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#fff" }}
              >
                {deleteConfirmation.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTicketColExport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700 }}>📄 Choose Columns to Export</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
              {ALL_TICKET_COLS.map(col => (
                <label key={col} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={ticketExportCols.has(col)} onChange={() => setTicketExportCols(prev => { const n=new Set(prev); n.has(col)?n.delete(col):n.add(col); return n; })} />
                  {col.charAt(0).toUpperCase()+col.slice(1)}
                </label>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowTicketColExport(false)} style={{ ...bG, padding:"7px 14px" }}>Cancel</button>
              <button onClick={async () => {
                const cols = [...ticketExportCols];
                const colLabels = { id:"ID", created:"Created", summary:"Summary", org:"Organization", department:"Department", reportedBy:"Reported By", assignees:"Assignees", priority:"Priority", category:"Category", status:"Status" };
                setShowTicketColExport(false);
                setCustomAlert({ show: true, message: "⏳ Fetching filtered tickets for export...", type: "success" });
                try {
                  const isAgentRole = currentUser?.role === "Agent" || currentUser?.role === "Viewer";
                  const exportParams = new URLSearchParams({ limit: 999999, page: 1 });
                  if (debouncedSearch) exportParams.set("search", debouncedSearch);
                  if (priorityF !== "All") exportParams.set("priority", priorityF);
                  if (orgFilter !== "all") exportParams.set("org", orgFilter);
                  if (tvFilter === "open")            { exportParams.set("status", "Open"); }
                  else if (tvFilter === "closed")     { exportParams.set("status", "Closed"); }
                  else if (tvFilter === "pastdue")    { exportParams.set("status", "Open"); exportParams.set("pastdue", "1"); }
                  else if (tvFilter === "reopened")   { exportParams.set("reopened", "1"); }
                  else if (tvFilter === "unassigned") { exportParams.set("unassigned", "1"); exportParams.set("status", "Open"); }
                  else {
                    if (filterStatus.length === 1 && filterStatus[0] === "open")    exportParams.set("status", "Open");
                    if (filterStatus.length === 1 && filterStatus[0] === "closed")  exportParams.set("status", "Closed");
                    if (filterStatus.length === 1 && filterStatus[0] === "pastdue") { exportParams.set("status", "Open"); exportParams.set("pastdue", "1"); }
                    if (filterAssignment.length === 1 && filterAssignment[0] === "unassigned") exportParams.set("unassigned", "1");
                    if (filterAssignment.length === 1 && filterAssignment[0] === "vendor")     exportParams.set("hasVendor", "1");
                  }
                  if (dashboardTimePeriod && dashboardTimePeriod !== "all" && tvFilter !== "reopened") {
                    const _ec = new Date();
                    if (dashboardTimePeriod === "1d") _ec.setHours(0,0,0,0);
                    else if (dashboardTimePeriod === "7d") _ec.setDate(_ec.getDate()-7);
                    else if (dashboardTimePeriod === "1m") _ec.setMonth(_ec.getMonth()-1);
                    else if (dashboardTimePeriod === "3m") _ec.setMonth(_ec.getMonth()-3);
                    else if (dashboardTimePeriod === "6m") _ec.setMonth(_ec.getMonth()-6);
                    else if (dashboardTimePeriod === "1y") _ec.setFullYear(_ec.getFullYear()-1);
                    const _p2 = n => String(n).padStart(2,"0");
                    exportParams.set("dateFrom", `${_ec.getFullYear()}-${_p2(_ec.getMonth()+1)}-${_p2(_ec.getDate())}`);
                  } else if (ticketDateFrom && tvFilter !== "reopened") {
                    exportParams.set("dateFrom", ticketDateFrom);
                    if (ticketDateTo) exportParams.set("dateTo", ticketDateTo);
                  }
                  if (filterCategory) exportParams.set("category", filterCategory);
                  if (isAgentRole && filterAssignee.length === 0) exportParams.set("assignee", currentUser.name);
                  else if (filterAssignee.length === 1) exportParams.set("assignee", filterAssignee[0]);
                  const res = await axios.get(`${BASE_URL}/tickets/paginated?${exportParams}`);
                  const allTickets = (res.data.tickets || []).map(t => ({ ...t, assignees: Array.isArray(t.assignees) ? t.assignees : (typeof t.assignees === "string" ? JSON.parse(t.assignees||"[]") : []) }));
                  if (ticketExportMode === "csv") {
                    const headers = cols.map(c => colLabels[c]||c);
                    const rows = allTickets.map(t => cols.map(c => {
                      if(c==="assignees") { const a = typeof t.assignees==="string" ? JSON.parse(t.assignees||"[]") : (t.assignees||[]); return `"${a.map(x=>x.name).join("; ")}"` ; }
                      if(c==="created") return new Date(t.createdAt||t.created).toLocaleString();
                      return `"${t[c]||""}"`;
                    }));
                    const csv = [headers,...rows].map(r=>r.join(",")).join("\n");
                    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`tickets_export_${new Date().toISOString().split("T")[0]}.csv`; a.click();
                    setCustomAlert({ show: true, message: `✅ Exported ${allTickets.length} tickets as CSV`, type: "success" });
                  } else {
                    const headers = cols.map(c => colLabels[c]||c);
                    const trs = allTickets.map(t => `<tr>${cols.map(c => {
                      let v; if(c==="assignees") { const a = typeof t.assignees==="string" ? JSON.parse(t.assignees||"[]") : (t.assignees||[]); v=a.map(x=>x.name).join(", "); } else if(c==="created") { v=new Date(t.createdAt||t.created).toLocaleString(); } else { v=t[c]||""; }
                      return `<td>${v}</td>`;
                    }).join("")}</tr>`).join("");
                    const html = `<html><head><title>Tickets Export</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9}@media print{body{margin:0}}</style></head><body><h2>Tickets Export — ${new Date().toLocaleDateString()}</h2><p>${allTickets.length} tickets</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
                    const fr = printFrameRef.current;
                    fr.srcdoc = html;
                    fr.onload = () => { fr.contentWindow.focus(); fr.contentWindow.print(); };
                  }
                } catch(e) { setCustomAlert({ show: true, message: "Export failed: " + e.message, type: "error" }); }
              }} style={{ ...bP, padding:"7px 14px" }}>⬇️ Export</button>
            </div>
          </div>
        </div>
      )}

      {showProjColExport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700 }}>📄 Choose Columns to Export</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
              {ALL_PROJ_COLS.map(col => (
                <label key={col} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={projExportCols.has(col)} onChange={() => setProjExportCols(prev => { const n=new Set(prev); n.has(col)?n.delete(col):n.add(col); return n; })} />
                  {col.charAt(0).toUpperCase()+col.slice(1)}
                </label>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowProjColExport(false)} style={{ ...bG, padding:"7px 14px" }}>Cancel</button>
              <button onClick={() => {
                const cols = [...projExportCols];
                const colLabels = { id:"ID", created:"Created", title:"Title", org:"Organization", department:"Department", assignees:"Assignees", priority:"Priority", category:"Category", status:"Status", progress:"Progress", dueDate:"Due Date" };
                const sortedProjs = applySort(filteredProjects, projSort);
                if (projExportMode === "csv") {
                  const headers = cols.map(c => colLabels[c]||c);
                  const rows = sortedProjs.map(t => cols.map(c => {
                    if(c==="assignees") return `"${(t.assignees||[]).map(a=>a.name).join("; ")}"`;
                    if(c==="created") return new Date(t[c]).toLocaleString();
                    if(c==="dueDate") return t.dueDate?.toLocaleDateString()||"";
                    if(c==="progress") return `${t.progress||0}%`;
                    return `"${t[c]||""}"`;
                  }));
                  const csv = [headers,...rows].map(r=>r.join(",")).join("\n");
                  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`projects_export_${new Date().toISOString().split("T")[0]}.csv`; a.click();
                } else {
                  const headers = cols.map(c => colLabels[c]||c);
                  const trs = sortedProjs.map(t => `<tr>${cols.map(c => {
                    let v = c==="assignees" ? (t.assignees||[]).map(a=>a.name).join(", ") : c==="created" ? new Date(t[c]).toLocaleString() : c==="dueDate" ? t.dueDate?.toLocaleDateString()||"" : c==="progress" ? `${t.progress||0}%` : (t[c]||"");
                    return `<td>${v}</td>`;
                  }).join("")}</tr>`).join("");
                  const html = `<html><head><title>Projects Export</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9}@media print{body{margin:0}}</style></head><body><h2>Projects Export — ${new Date().toLocaleDateString()}</h2><p>${sortedProjs.length} projects</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
                  const fr = printFrameRef.current;
                  fr.srcdoc = html;
                  fr.onload = () => { fr.contentWindow.focus(); fr.contentWindow.print(); };
                  return;
                }
                setShowProjColExport(false);
              }} style={{ ...bP, padding:"7px 14px" }}>⬇️ Export</button>
            </div>
          </div>
        </div>
      )}
      {/* ✅ NEW: Advanced Export Modal */}
      {showAdvancedExportModal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
        <div style={{ background: "#faf8f4", borderRadius: 14, padding: 24, maxWidth: 600, width: "90%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>Advanced Export Options</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>Select the filters you want to apply when exporting</div>

          {/* Export Format */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Export Format</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["csv", "json", "pdf"].map(fmt => (
                <button key={fmt} onClick={() => setExportFormat(fmt)} style={{ padding: "8px 16px", borderRadius: 8, border: fmt === exportFormat ? "2px solid #3b82f6" : "1px solid #e2e8f0", background: fmt === exportFormat ? "#eff6ff" : "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12, color: fmt === exportFormat ? "#3b82f6" : "#64748b" }}>
                  {fmt === "csv" ? "📄 CSV" : fmt === "json" ? "📋 JSON" : "🖨 PDF"}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Checkboxes */}
          <div style={{ marginBottom: 18, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Filter Options:</div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byAssignee} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byAssignee: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Assignee</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byCategory} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byCategory: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Category</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byStatus} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byStatus: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Status</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byPriority} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byPriority: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Priority</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byVendor} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byVendor: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Vendor</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={advancedExportFilters.byDateRange} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, byDateRange: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Export by Date Range</span>
            </label>

            {advancedExportFilters.byDateRange && (
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginLeft: 28, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>From Date</label>
                    <input type="date" value={advancedExportFilters.dateFromInput} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, dateFromInput: e.target.value })} style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>To Date</label>
                    <input type="date" value={advancedExportFilters.dateToInput} onChange={e => setAdvancedExportFilters({ ...advancedExportFilters, dateToInput: e.target.value })} style={{ ...iS, width: "100%", fontSize: 12 }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <button onClick={() => setShowAdvancedExportModal(false)} style={{ ...bG, padding: "8px 16px", fontSize: 13 }}>Cancel</button>
            <button onClick={() => {
              // Filter data based on advanced options
              let dataToExport = reportFilteredData;

              if (advancedExportFilters.byDateRange && advancedExportFilters.dateFromInput && advancedExportFilters.dateToInput) {
                const fromDate = new Date(advancedExportFilters.dateFromInput).getTime();
                const toDate = new Date(advancedExportFilters.dateToInput).getTime();
                dataToExport = dataToExport.filter(t => {
                  const tDate = t.created.getTime();
                  return tDate >= fromDate && tDate <= toDate + 86400000;
                });
              }

              if (exportFormat === "csv") {
                exportCSV(dataToExport, "tickets");
              } else if (exportFormat === "json") {
                exportJSON(dataToExport);
              } else if (exportFormat === "pdf") {
                exportPrint(dataToExport, "tickets");
              }

              setShowAdvancedExportModal(false);
            }} style={{ ...bP, padding: "8px 16px", fontSize: 13, background: "#3b82f6", color: "#fff" }}>⬇️ Export Now</button>
          </div>
        </div>
      </div>}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div style={{ width: 220, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, position: isMobile ? "fixed" : "relative", left: isMobile ? (sidebarOpen ? 0 : -220) : 0, top: 0, bottom: 0, zIndex: isMobile ? 1000 : "auto", transition: "left 0.3s ease", height: "100dvh", overflowY: "auto" }}>        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff" }}>⚡</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>DeskFlow</div>
              <div style={{ fontSize: 10, color: "#475569" }}>Help Desk Pro</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 8px 0", flex: 1, overflow: "auto" }}>
          {sideNav.map(n => (
            <React.Fragment key={n.id}>
              <button onClick={() => {
                switchView(n.id);
                if (n.id === "dashboard") {
                  setDashboardRefreshTick(t => t + 1);
                }
                if (n.id === "tickets") {
                  setTvFilter("all"); 
                  setStatusF("All");
                  setPriorityF("All");
                  setTicketDateFrom("");
                  setTicketsExpanded(prev => !prev);
                }
              }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", borderRadius: 7, border: "none", cursor: "pointer", background: view === n.id ? "#1e293b" : "transparent", color: view === n.id ? "#60a5fa" : "#64748b", fontSize: 13, fontWeight: view === n.id ? 600 : 400, marginBottom: 2, textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}>
                <span>{n.icon}</span>{n.label}
                {n.id === "tickets" && <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>{ticketsExpanded ? "▲" : "▼"}</span>}
              </button>
              {n.id === "tickets" && view === "tickets" && ticketsExpanded && (
                <div style={{ marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid #1e293b", marginLeft: 11 }}>
                  {[
                    { id: "open", label: "Open Tickets", icon: "" },
                    { id: "closed", label: "Closed Tickets", icon: "" },
                  ].map(v => (
                    <button key={v.id} onClick={() => { setTvFilter(v.id); setStatusF("All"); setPriorityF("All"); setSearch(""); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 11px", borderRadius: 6, border: "none", cursor: "pointer", background: tvFilter === v.id ? "#0f172a" : "transparent", color: tvFilter === v.id ? "#93c5fd" : "#475569", fontSize: 11.5, textAlign: "left", fontFamily: "'DM Sans',sans-serif", marginBottom: 1 }}>
                      <span style={{ fontSize: 12 }}>{v.icon}</span>{v.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Projects sub-menu removed — filter moved to action bar dropdown */}
            </React.Fragment>
          ))}
        </div>

        {/* New Ticket / Project buttons */}
        <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
          <button onClick={() => { setForm({ ...emptyForm(), org: dashboardOrg !== "all" ? dashboardOrg : "" }); setShowNewTicket(true); }} style={{ width: "100%", padding: "8px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ New Ticket</button>
        </div>

        {/* Profile section (v1 full profile panel) */}
        <div style={{ padding: "8px 12px 14px", borderTop: "1px solid #1e293b" }}>
          <div onClick={() => setProfileOpen(!profileOpen)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 8, cursor: "pointer", background: profileOpen ? "#1e293b" : "transparent", transition: "background 0.2s" }}>
            <Avatar name={currentUser.name} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: (statusOpts.find(s => s.l === currentUser.status)?.c || "#94a3b8") }} />
                {currentUser.role}
              </div>
            </div>
            <span style={{ color: "#475569", fontSize: 12 }}>{profileOpen ? "▴" : "▾"}</span>
          </div>
          {profileOpen && (
            <div style={{ marginTop: 8, background: "#1e293b", borderRadius: 8, padding: "8px" }}>
              <button onClick={() => { setProfileForm({ name: currentUser.name, phone: currentUser.phone || "" }); setEditProfileOpen(true); }} style={{ width: "100%", padding: "6px 10px", background: "#334155", border: "none", borderRadius: 6, color: "#f8fafc", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8, textAlign: "left" }}>👤 View Profile</button>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", padding: "0 4px" }}>Status</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {/* ✅ UPDATED: Show only current status as read-only */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: (statusOpts.find(s => s.l === currentUser.status)?.c || "#94a3b8") }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: (statusOpts.find(s => s.l === currentUser.status)?.c || "#cbd5e1") }}>
                    {currentUser.status || "Off Duty"}
                  </span>
                </div>
              </div>

              <button onClick={handleLogout} style={{ width: "100%", padding: "6px 10px", background: "transparent", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8, textAlign: "left", borderTop: "1px solid #334155", paddingTop: 8 }}>Log Out</button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal (v1) */}
      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="My Profile" width={400}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Avatar name={currentUser.name} size={64} />
          <div><div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{currentUser.name}</div><div style={{ fontSize: 13, color: "#64748b" }}>{currentUser.role}</div></div>
        </div>

        {/* ✅ NEW: Session Information Section */}
        <div style={{ marginBottom: 18, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#0c4a6e", textTransform: "uppercase", marginBottom: 8 }}>📊 Session Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#475569" }}>Current Status:</span>
              <span style={{ fontWeight: 600, color: currentUser.status === "On Duty" ? "#22c55e" : currentUser.status === "On Lunch" ? "#f97316" : "#f59e0b" }}>
                {currentUser.status || "Off Duty"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#475569" }}>Location:</span>
              <span style={{ fontWeight: 500, color: "#0f172a" }}>{currentUser.currentLocation || "Not Set"}</span>
            </div>
            {currentUser.currentTicketId && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#475569" }}>Current Ticket:</span>
                <span style={{ fontWeight: 500, color: "#0f172a" }}>{currentUser.currentTicketId}</span>
              </div>
            )}
            {currentUser.loginTime && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#475569" }}>Session Time:</span>
                <span style={{ fontWeight: 500, color: "#0f172a" }}>{calculateSessionDuration() || "Computing..."}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 18, padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>Email Address (Unchangeable)</div>
          <div style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{currentUser.email}</div>
        </div>
        <FF label="Full Name"><input style={{ ...iS, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} value={profileForm.name} disabled /></FF>
        <FF label="Phone Number"><input style={iS} value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} /></FF>

        {/* ✅ NEW: Activity & Session History Buttons */}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            onClick={() => { setShowActivityLog(true); }}
            style={{ flex: 1, padding: "8px 12px", background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 6, color: "#0c4a6e", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            📋 Activity Log
          </button>
          <button
            onClick={() => { setShowSessionHistory(true); }}
            style={{ flex: 1, padding: "8px 12px", background: "#f3e8ff", border: "1px solid #e9d5ff", borderRadius: 6, color: "#6b21a8", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            ⏱️ Session History
          </button>
        </div>

        {/* ✅ NEW: Change Password Section */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
          <button onClick={() => setShowChangePassword(!showChangePassword)} style={{ width: "100%", padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#0c4a6e", fontWeight: 600, cursor: "pointer", fontSize: 13, marginBottom: 12 }}>
            {showChangePassword ? "Hide Change Password" : "Change Password"}
          </button>

          {showChangePassword && (
            <div style={{ background: "#fef9c3", padding: 14, borderRadius: 8, marginBottom: 12, border: "1px solid #fcd34d" }}>
              <FF label="Current Password"><input style={iS} type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} placeholder="Enter your current password" /></FF>
              <FF label="New Password"><input style={iS} type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Enter new password (min 6 characters)" /></FF>
              <FF label="Confirm New Password"><input style={iS} type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Re-enter new password" /></FF>
              <button onClick={changePassword} style={{ ...bP, width: "100%" }}>Change Password</button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={() => setEditProfileOpen(false)} style={bG}>Cancel</button>
          <button onClick={saveProfile} style={bP}>Save Changes</button>
        </div>
      </Modal>

      {/* ✅ NEW: Admin Edit User Modal (Name & Password) */}
      <Modal open={!!editUserOpen} onClose={() => { setEditUserOpen(null); setEditUserForm({ name: "", email: "", password: "" }); }} title="Edit User" width={400}>
        {editUserOpen && (
          <div>
            <div style={{ marginBottom: 20, padding: "12px 14px", background: "#f0f9ff", borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
              <div style={{ fontSize: 12, color: "#0c4a6e", fontWeight: 600 }}>Admin Edit Mode</div>
              <div style={{ fontSize: 12, color: "#0c4a6e", marginTop: 4 }}>You are editing: <strong>{editUserOpen.name}</strong></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Full Name</label>
              <input
                style={iS}
                value={editUserForm.name}
                onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Email Address</label>
              <input
                style={iS}
                value={editUserForm.email}
                onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>New Password (Leave blank to keep current)</label>
              <input
                style={iS}
                type="password"
                value={editUserForm.password}
                onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
              />
              {editUserForm.password && editUserForm.password.length < 6 && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Password must be at least 6 characters</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setEditUserOpen(null); setEditUserForm({ name: "", email: "", password: "" }); }} style={bG}>Cancel</button>
              <button onClick={editUser} style={bP}>Update User</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ✅ NEW: User Management Edit Modal (Role Change, Deactivate, Delete) */}
      {/* User Management Edit Modal */}
      <Modal open={userEditModal.show} onClose={() => { setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" }); }} title={userEditModal.user ? `Manage User: ${userEditModal.user.name}` : "Manage User"} width={520}>
        {userEditModal.user && (
          <div>
            {/* Header card */}
            <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={userEditModal.user.name} size={48} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{userEditModal.user.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{userEditModal.user.email}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Badge label={userEditModal.user.role} style={{ background: "#ede9fe", color: "#6d28d9" }} />
                    <Badge label={userEditModal.user.active ? "Active" : "Inactive"} style={{ background: userEditModal.user.active ? "#dcfce7" : "#fee2e2", color: userEditModal.user.active ? "#15803d" : "#991b1b" }} />
                    {(() => {
                      const st = statusOpts.find(s => s.l === userEditModal.user.status);
                      return st ? <Badge label={st.l} style={{ background: st.bg, color: st.c }} /> : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Edit Details ── */}
            <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 12 }}>Edit Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Full Name *</label>
                  <input style={{ ...iS, fontSize: 12, padding: "8px 10px" }} value={userEditModal.editName} onChange={e => setUserEditModal({ ...userEditModal, editName: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Email Address *</label>
                  <input style={{ ...iS, fontSize: 12, padding: "8px 10px" }} type="email" value={userEditModal.editEmail} onChange={e => setUserEditModal({ ...userEditModal, editEmail: e.target.value })} placeholder="Email address" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Phone</label>
                  <input style={{ ...iS, fontSize: 12, padding: "8px 10px" }} value={userEditModal.editPhone} onChange={e => setUserEditModal({ ...userEditModal, editPhone: e.target.value })} placeholder="Phone number" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>New Password <span style={{ color: "#94a3b8", fontWeight: 400 }}>(leave blank to keep unchanged)</span></label>
                  <input style={{ ...iS, fontSize: 12, padding: "8px 10px" }} type="password" value={userEditModal.editPassword} onChange={e => setUserEditModal({ ...userEditModal, editPassword: e.target.value })} placeholder="New password" />
                </div>
                <button
                  onClick={async () => {
                    if (!userEditModal.editName?.trim() || !userEditModal.editEmail?.trim()) {
                      setCustomAlert({ show: true, message: "Name and email are required", type: "error" }); return;
                    }
                    try {
                      const updates = { name: userEditModal.editName.trim(), email: userEditModal.editEmail.trim(), phone: userEditModal.editPhone?.trim() || userEditModal.user.phone };
                      if (userEditModal.editPassword) updates.password = userEditModal.editPassword;
                      const updated = { ...userEditModal.user, ...updates, active: userEditModal.user.active, forceLogout: false };
                      await axios.put(`${USERS_API}/${userEditModal.user.id}`, updated);
                      setUsers(users.map(u => u.id === userEditModal.user.id ? updated : u));
                      setCustomAlert({ show: true, message: `✅ ${updates.name}'s details updated`, type: "success" });
                      setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                    } catch (err) { setCustomAlert({ show: true, message: "Failed to update details", type: "error" }); }
                  }}
                  style={{ ...bP, padding: "7px 14px", fontSize: 12, alignSelf: "flex-end" }}
                >Save Details</button>
              </div>
            </div>

            {/* ── Role Change ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>🔑 Change Role</label>
              <select value={userEditModal.newRole} onChange={(e) => setUserEditModal({ ...userEditModal, newRole: e.target.value })} style={{ ...sS, fontSize: 12, padding: "8px 10px", width: "100%" }}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
              {userEditModal.newRole !== userEditModal.user.role && (
                <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, padding: "8px 10px", background: "#fffaeb", borderRadius: 6, borderLeft: "3px solid #f59e0b" }}>
                  ⚠️ Changing role will log out the user. They must log in again with their new permissions.
                </div>
              )}
            </div>

            {/* ── Force Logout — only for On Duty agents (not Idle, not Off Duty, not self) ── */}
            {/* ── Force Logout — for any active/logged-in agent ── */}
              {userEditModal.user.id !== currentUser?.id && (currentUser?.role === "Admin" || currentUser?.role === "Manager") &&
              ((userEditModal.user.role === "Agent" && userEditModal.user.status === "On Duty") ||
              ((userEditModal.user.role === "Admin" || userEditModal.user.role === "Manager") && (userEditModal.user.status === "On Duty" || userEditModal.user.status === "On Lunch"))) && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "#fff7ed", borderRadius: 10, border: "1px solid #fed7aa" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412", marginBottom: 3 }}>🚪 Force Logout</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Currently <strong>{userEditModal.user.status}</strong>. They will be logged out and set to Off Duty.</div>
                  </div>
                  <button
                    onClick={() => {
                      const agentUser = userEditModal.user;
                      const canBeOnTicket = agentUser.role === "Agent" || agentUser.role === "Admin" || agentUser.role === "Manager";
                      const agentTickets = canBeOnTicket ? (Array.isArray(tickets) ? tickets : [])
                        .filter(t => (t.status === "Open") && t.assignees?.some(a => String(a.id) === String(agentUser.id)))
                        .map(t => ({ value: t.id, label: `${t.id} — ${t.summary}` })) : [];
                      const fields = [
                        { name: "logoutReason", label: "📝 Reason for logout", type: "select", options: [{ value: "End of shift", label: "End of shift" }, { value: "Going for ticket", label: "Going for ticket" }, { value: "Going for lunch", label: "Going for lunch" }], value: "", required: true },
                        { name: "ticketId", label: "🎫 Select Ticket", type: "searchable-select", options: agentTickets, value: "", required: false },
                        { name: "location", label: "📍 Location", type: "select", options: locations.map(loc => ({ value: loc.name, label: loc.name })), value: agentUser.currentLocation || "", required: false }
                      ];
                      setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                      setConfirmModal({
                        show: true,
                        title: `Force Logout: ${agentUser.name}`,
                        confirmLabel: "Force Logout & Set Off Duty",
                        message: `Set ${agentUser.name} as Off Duty and log them out.`,
                        fields,
                        onConfirm: async (data) => {
                          try {
                            if (!data.logoutReason || data.logoutReason.trim() === "") {
                              setCustomAlert({ show: true, message: "Please provide a reason for logout", type: "error" }); return;
                            }
                            const isGoingForTicket = data.logoutReason === "Going for ticket";
                            if (isGoingForTicket && (!data.ticketId || data.ticketId.trim() === "")) {
                              setCustomAlert({ show: true, message: "Please select a ticket", type: "error" }); return;
                            }
                            if (isGoingForTicket && (!data.location || data.location.trim() === "")) {
                              setCustomAlert({ show: true, message: "Please select a location", type: "error" }); return;
                            }
                            const isGoingForLunch = data.logoutReason === "Going for lunch";
                            const finalStatus = isGoingForTicket ? "On Ticket" : isGoingForLunch ? "On Lunch" : "Off Duty";
                            const finalTicketId = isGoingForTicket ? data.ticketId : null;
                            const finalLocation = isGoingForTicket ? data.location : (agentUser.currentLocation || null);
                            // If agent is already On Ticket, they are already logged out — just update status, no session logout needed
                            if (agentUser.status === "On Ticket") {
                              await axios.put(`${USERS_API}/${agentUser.id}`, { logoutReason: data.logoutReason, status: "Off Duty", currentTicketId: null, currentLocation: finalLocation, lunchStatus: false, forceLogout: false, _isSystemUpdate: true });
                            } else {
                              // Agent is On Duty/On Lunch/Idle — set forceLogout:true with final status in one atomic update
                              await axios.put(`${USERS_API}/${agentUser.id}`, { logoutReason: data.logoutReason, status: finalStatus, currentTicketId: finalTicketId, currentLocation: finalLocation, forceLogout: true, lunchStatus: false, _isSystemUpdate: true });
                            }
                            setUsers(prev => prev.map(u => u.id === agentUser.id ? { ...u, forceLogout: true, status: finalStatus, currentTicketId: finalTicketId, currentLocation: finalLocation } : u));
                            setConfirmModal({ show: false });
                            setCustomAlert({ show: true, message: `✅ ${agentUser.name} has been logged out`, type: "success" });
                          } catch (err) { setCustomAlert({ show: true, message: "Failed to force logout agent", type: "error" }); }
                        },
                        onCancel: () => setConfirmModal({ show: false })
                      });
                    }}
                    style={{ padding: "6px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, color: "#c2410c", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                  >Force Logout</button>
                </div>
              </div>
            )}

            {/* ── Set Off Duty for Idle agents ── */}
            {userEditModal.user.id !== currentUser?.id && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && userEditModal.user.status === "Idle" && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>✅ Set Off Duty</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Agent is <strong>Idle</strong>. Mark them as Off Duty without a session logout.</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await axios.put(`${USERS_API}/${userEditModal.user.id}`, { status: "Off Duty", logoutReason: "Set Off Duty by admin", idleAt: null, _isSystemUpdate: true });
                        setUsers(prev => prev.map(u => u.id === userEditModal.user.id ? { ...u, status: "Off Duty", idleAt: null } : u));
                        setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                        setCustomAlert({ show: true, message: "✅ Agent set to Off Duty", type: "success" });
                      } catch (err) { setCustomAlert({ show: true, message: "Failed to update status", type: "error" }); }
                    }}
                    style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#15803d", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                  >Set Off Duty</button>
                </div>
              </div>
            )}
            {/* ── Set Off Duty for On Ticket agents (status only, no logout) ── */}
            {userEditModal.user.id !== currentUser?.id && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && userEditModal.user.status === "On Ticket" && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>✅ Mark Off Duty</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Agent is <strong>On Ticket</strong>. Mark as Off Duty (status change only).</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await axios.put(`${USERS_API}/${userEditModal.user.id}`, { status: "Off Duty", logoutReason: "Set Off Duty by admin", currentTicketId: null, _isSystemUpdate: true });
                        setUsers(prev => prev.map(u => u.id === userEditModal.user.id ? { ...u, status: "Off Duty", currentTicketId: null } : u));
                        setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                        setCustomAlert({ show: true, message: "✅ Agent set to Off Duty", type: "success" });
                      } catch (err) { setCustomAlert({ show: true, message: "Failed to update status", type: "error" }); }
                    }}
                    style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#15803d", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                  >Mark Off Duty</button>
                </div>
              </div>
            )}

            {/* ── Set Off Duty for On Lunch agents (status only, no logout) ── */}
            {userEditModal.user.id !== currentUser?.id && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && userEditModal.user.status === "On Lunch" && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>✅ Set Off Duty</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Agent is <strong>On Lunch</strong>. Mark as Off Duty (status change only).</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await axios.put(`${USERS_API}/${userEditModal.user.id}`, { status: "Off Duty", logoutReason: "Set Off Duty by admin", lunchStatus: false, _isSystemUpdate: true });
                        setUsers(prev => prev.map(u => u.id === userEditModal.user.id ? { ...u, status: "Off Duty", lunchStatus: false } : u));
                        setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                        setCustomAlert({ show: true, message: "✅ Agent set to Off Duty", type: "success" });
                      } catch (err) { setCustomAlert({ show: true, message: "Failed to update status", type: "error" }); }
                    }}
                    style={{ padding: "6px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#15803d", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                  >Set Off Duty</button>
                </div>
              </div>
            )}

            {/* ── Deactivate ── */}
            <div style={{ marginBottom: 20, padding: "14px 16px", background: userEditModal.user.active ? "#fef3c7" : "#dcfce7", borderRadius: 10, border: `1px solid ${userEditModal.user.active ? "#f59e0b" : "#22c55e"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>{userEditModal.user.active ? "🔴 Deactivate User" : "🟢 Activate User"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{userEditModal.user.active ? "This user will be logged out and unable to access the system" : "This user will be able to log in and access the system"}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const isDeactivating = userEditModal.user.active;
                      const updated = { ...userEditModal.user, active: !userEditModal.user.active, status: !userEditModal.user.active ? userEditModal.user.status : "Logged-Out", _isSystemUpdate: true };
                      await axios.put(`${USERS_API}/${userEditModal.user.id}`, updated);
                      setUsers(users.map(x => x.id === userEditModal.user.id ? updated : x));

                      // Unassign open tickets from deactivated user
                      if (isDeactivating) {
                        const deactivatedId = userEditModal.user.id;
                        const affectedTickets = tickets.filter(t =>
                          t.status === "Open" && (t.assignees || []).some(a => a.id === deactivatedId)
                        );
                        const affectedProjects = projects.filter(p =>
                          p.status === "Open" && (p.assignees || []).some(a => a.id === deactivatedId)
                        );
                        const nowISO = new Date().toISOString();
                        await Promise.all([
                          ...affectedTickets.map(t => {
                            const unassigned = { ...t, assignees: (t.assignees || []).filter(a => a.id !== deactivatedId), updated: nowISO, timeline: [...(t.timeline || []), { action: `Assignee removed: ${userEditModal.user.name}`, by: currentUser.name, date: nowISO, note: "User deactivated" }] };
                            return axios.put(`${TICKETS_API}/${t.id}`, unassigned).then(() => setTickets(prev => prev.map(x => x.id === t.id ? { ...unassigned, updated: new Date(nowISO) } : x)));
                          }),
                          ...affectedProjects.map(p => {
                            const unassigned = { ...p, assignees: (p.assignees || []).filter(a => a.id !== deactivatedId), updated: nowISO, timeline: [...(p.timeline || []), { action: `Assignee removed: ${userEditModal.user.name}`, by: currentUser.name, date: nowISO, note: "User deactivated" }] };
                            return axios.put(`${PROJECTS_API}/${p.id}`, unassigned).then(() => setProjects(prev => prev.map(x => x.id === p.id ? { ...unassigned, updated: new Date(nowISO) } : x)));
                          }),
                        ]);
                      }

                      if (userEditModal.user.id === currentUser.id && isDeactivating) {
                        clearSession(); setCurrentUser(null);
                        setCustomAlert({ show: true, message: "❌ You've been deactivated. Logged out.", type: "error" });
                        setTimeout(() => window.location.reload(), 2000);
                      } else {
                        const unassignedCount = isDeactivating ? tickets.filter(t => t.status === "Open" && (t.assignees || []).some(a => a.id === userEditModal.user.id)).length + projects.filter(p => p.status === "Open" && (p.assignees || []).some(a => a.id === userEditModal.user.id)).length : 0;
                        setCustomAlert({ show: true, message: `✅ ${userEditModal.user.name} deactivated${unassignedCount > 0 ? ` — ${unassignedCount} open item(s) moved to pool` : ""}.`, type: "success" });
                      }
                      setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                    } catch (err) { setCustomAlert({ show: true, message: "Failed to update user status", type: "error" }); }
                  }}
                  style={{ padding: "6px 12px", background: userEditModal.user.active ? "#fef3c7" : "#dcfce7", border: `1px solid ${userEditModal.user.active ? "#f59e0b" : "#22c55e"}`, borderRadius: 6, color: userEditModal.user.active ? "#854d0e" : "#15803d", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                >{userEditModal.user.active ? "Deactivate" : "Activate"}</button>
              </div>
            </div>

            {/* ── Delete ── */}
            {userEditModal.user.id !== currentUser?.id && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>🧹 Delete User</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Permanently remove this user from the system. This action cannot be undone.</div>
                  </div>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        show: true, title: "Delete User",
                        message: `Are you sure you want to permanently delete ${userEditModal.user.name}? This action cannot be undone.`,
                        onConfirm: async () => {
                          try {
                            await axios.delete(`${USERS_API}/${userEditModal.user.id}`);
                            setUsers(prev => prev.filter(u => u.id !== userEditModal.user.id));
                            setCustomAlert({ show: true, message: `✅ ${userEditModal.user.name} deleted.`, type: "success" });
                            setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
                            setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                          } catch (err) {
                            setCustomAlert({ show: true, message: "Failed to delete user", type: "error" });
                            setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
                          }
                        },
                        onCancel: () => { setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null }); }
                      });
                    }}
                    style={{ padding: "6px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, color: "#ef4444", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                  >Delete</button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
              <button onClick={() => { setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" }); }} style={{ ...bG, padding: "8px 16px", fontSize: 12 }}>Cancel</button>
              {userEditModal.newRole !== userEditModal.user.role && (
                <button
                  onClick={async () => {
                    try {
                      setConfirmModal({
                        show: true, title: "Confirm Role Change",
                        message: `Change ${userEditModal.user.name}'s role to ${userEditModal.newRole}? They will be logged out and must log in again.`,
                        onConfirm: async () => {
                          try {
                            const updated = { ...userEditModal.user, role: userEditModal.newRole, _isSystemUpdate: true };
                            await axios.put(`${USERS_API}/${userEditModal.user.id}`, updated);
                            setUsers(users.map(u => u.id === userEditModal.user.id ? updated : u));
                            if (userEditModal.user.id === currentUser.id) {
                              clearSession(); setCurrentUser(null);
                              setCustomAlert({ show: true, message: `⚠️ Your role changed to ${userEditModal.newRole}. Log in again.`, type: "warning" });
                              setTimeout(() => window.location.reload(), 2000);
                            } else {
                              setCustomAlert({ show: true, message: `✅ ${userEditModal.user.name} role → ${userEditModal.newRole}. User logged out.`, type: "success" });
                            }
                            setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
                            setUserEditModal({ show: false, user: null, newRole: null, editName: "", editEmail: "", editPhone: "", editPassword: "" });
                          } catch (err) {
                            setCustomAlert({ show: true, message: "Failed to update role", type: "error" });
                            setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
                          }
                        },
                        onCancel: () => { setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null }); }
                      });
                    } catch (err) { setCustomAlert({ show: true, message: "Failed to update role", type: "error" }); }
                  }}
                  style={{ ...bP, padding: "8px 16px", fontSize: 12 }}
                >Change Role</button>
              )}
            </div>
          </div>
        )}
      </Modal>    

      {/* Add Vendor Modal */}
      <Modal open={showAddVendorModal} onClose={() => { setShowAddVendorModal(false); setNewVendor({ name: "", email: "", phone: "", address: "" }); }} title="Add New Vendor" width={450}>
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Vendor Name *</label>
            <input style={iS} placeholder="Enter vendor name" value={newVendor.name || ""} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Email Address</label>
            <input style={iS} type="email" placeholder="Enter email" value={newVendor.email || ""} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Phone Number</label>
            <input style={iS} placeholder="Enter phone number" value={newVendor.phone || ""} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Address</label>
            <input style={iS} placeholder="Enter address" value={newVendor.address || ""} onChange={e => setNewVendor({ ...newVendor, address: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setShowAddVendorModal(false); setNewVendor({ name: "", email: "", phone: "", address: "" }); }} style={bG}>Cancel</button>
            <button onClick={() => { addVendor(); setShowAddVendorModal(false); }} style={bP}>Add Vendor</button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal open={showAddUserModal} onClose={() => { setShowAddUserModal(false); setNewUser({ name: "", email: "", password: "", role: "Viewer" }); }} title="Add New User" width={450}>
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Full Name *</label>
            <input style={iS} placeholder="Enter full name" value={newUser.name || ""} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Email Address *</label>
            <input style={iS} type="email" placeholder="Enter email" value={newUser.email || ""} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Password *</label>
            <input style={iS} type="password" placeholder="Enter password (min 6 characters)" value={newUser.password || ""} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Role</label>
            <select style={{ ...sS, width: "100%" }} value={newUser.role || "Viewer"} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setShowAddUserModal(false); setNewUser({ name: "", email: "", password: "", role: "Viewer" }); }} style={bG}>Cancel</button>
            <button onClick={() => { addUser(); setShowAddUserModal(false); }} style={bP}>Add User</button>
          </div>
        </div>
      </Modal>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minWidth: 0, width: isMobile ? "100%" : undefined }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#1e293b", padding: 0, lineHeight: 1 }}>☰</button>}
            <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{getPageTitle()}</h1>
            {view === "tickets" && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{cvd.desc}</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            {view === "dashboard" && (
              <>
                {/* Org Filter Dropdown */}
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder=""
                    value={dashboardOrgSearch ? dashboardOrgSearch : (dashboardOrg !== "all" ? dashboardOrg : "📊 All Organizations")}
                    onChange={e => setDashboardOrgSearch(e.target.value)}
                    onFocus={() => { setDashboardOrgSearch(""); setShowDashboardOrgDD(true); }}
                    style={{ ...sS, width: 170, fontSize: 13, padding: "7px 30px 7px 10px", appearance: "none", WebkitAppearance: "none", borderColor: dashboardOrg !== "all" ? "#3b82f6" : "#e2e8f0", background: dashboardOrg !== "all" ? "#eff6ff" : "#fafafa", color: dashboardOrg !== "all" ? "#1d4ed8" : "#1e293b", fontWeight: dashboardOrg !== "all" ? 600 : 400, outline: "none" }}
                  />
                  <span onClick={() => { setDashboardOrg("all"); setDashboardOrgSearch(""); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: dashboardOrg !== "all" ? "#3b82f6" : "#94a3b8", fontSize: dashboardOrg !== "all" ? 14 : 12, fontWeight: 700, lineHeight: 1, pointerEvents: dashboardOrg !== "all" ? "auto" : "none" }}>
                    {dashboardOrg !== "all" ? "×" : "▾"}
                  </span>
                  {showDashboardOrgDD && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setShowDashboardOrgDD(false); setDashboardOrgSearch(""); }} />
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", width: 200, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 6, zIndex: 200, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                        <div onClick={() => { setDashboardOrg("all"); setShowDashboardOrgDD(false); setDashboardOrgSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: dashboardOrg === "all" ? "#3b82f6" : "#64748b", fontWeight: dashboardOrg === "all" ? 700 : 400, borderBottom: "1px solid #f1f5f9" }}>All Organizations</div>
                        {[...orgs].sort((a,b) => a.name.localeCompare(b.name)).filter(o => dashboardOrgSearch === "" || o.name.toLowerCase().includes(dashboardOrgSearch.toLowerCase())).map(o => (
                          <div key={o.id} onClick={() => { setDashboardOrg(o.name); setShowDashboardOrgDD(false); setDashboardOrgSearch(""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: dashboardOrg === o.name ? "#3b82f6" : "#1e293b", fontWeight: dashboardOrg === o.name ? 700 : 400, borderBottom: "1px solid #f8fafc" }}>
                            {o.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Time Period Dropdown */}
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <select value={dashboardTimePeriod} onChange={e => setDashboardTimePeriod(e.target.value)} style={{ ...sS, width: 170, fontSize: 13, padding: "7px 30px 7px 10px", appearance: "none", WebkitAppearance: "none", borderColor: dashboardTimePeriod !== "all" ? "#3b82f6" : "#e2e8f0", background: dashboardTimePeriod !== "all" ? "#eff6ff" : "#fafafa", color: dashboardTimePeriod !== "all" ? "#1d4ed8" : "#1e293b", fontWeight: dashboardTimePeriod !== "all" ? 600 : 400 }}>
                    <option value="all">📊 All Time</option>
                    <option value="1d">📅 Today</option>
                    <option value="7d">📅 Last 7 Days</option>
                    <option value="1m">📊 Last Month</option>
                    <option value="3m">📊 Last 3 Months</option>
                    <option value="6m">📊 Last 6 Months</option>
                    <option value="1y">📊 Last Year</option>
                  </select>
                  {dashboardTimePeriod !== "all" ? (
                    <span onClick={() => setDashboardTimePeriod("all")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#3b82f6", fontSize: 14, fontWeight: 700, lineHeight: 1, zIndex: 1 }}>×</span>
                  ) : (
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12, pointerEvents: "none" }}>▾</span>
                  )}
                </div>
              </>
            )}
            {/* Bell + Inbox Icons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* 🔔 Bell — daily activity log */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowBellPanel(p => !p); setShowInboxPanel(false); }}
                  style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px solid #e2e8f0", background: showBellPanel ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, position: "relative" }}>
                  🔔
                  {bellUnread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{bellUnread > 99 ? "99+" : bellUnread}</span>}
                </button>
                {showBellPanel && <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setShowBellPanel(false)} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.14)", zIndex: 300, overflow: "hidden" }}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>🔔 Today's Activity</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: "auto" }}>
                      {dailyNotifs.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity yet today</div>}
                      {/* ✅ Show ALL notifications, but only count NEW ones on badge */}
                      {dailyNotifs.map(n => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} style={{ padding: "10px 16px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", gap: 10, background: seenActivityIds.current.has(n.dbId) ? "#fff" : (n.fromBroadcast ? "#fff7ed" : "#f0f9ff"), opacity: seenActivityIds.current.has(n.dbId) ? 0.7 : 1, cursor: "pointer", transition: "all 0.2s ease", borderLeft: seenActivityIds.current.has(n.dbId) ? "3px solid #e2e8f0" : "3px solid #3b82f6" }}
                          onMouseEnter={e => { if (!seenActivityIds.current.has(n.dbId)) { e.currentTarget.style.background = n.fromBroadcast ? "#fef0e7" : "#eff6ff"; e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.05)"; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = seenActivityIds.current.has(n.dbId) ? "#fff" : (n.fromBroadcast ? "#fff7ed" : "#f0f9ff"); e.currentTarget.style.boxShadow = "none"; }}>
                          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {n.fromBroadcast && n.by && n.by !== currentUser?.name && (
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#f97316", textTransform: "uppercase", marginBottom: 2, letterSpacing: "0.05em" }}>📢 {n.by}</div>
                            )}
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#1e293b", lineHeight: 1.4 }}>{n.text}</div>
                            {n.ticketId && <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 2, fontFamily: "monospace", fontWeight: 600 }}>🎫 {n.ticketId}</div>}
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                              {new Date(n.time).toLocaleTimeString()}
                              {seenActivityIds.current.has(n.dbId) && <span style={{ marginLeft: 8, color: "#22c55e", fontWeight: 600 }}>✓ Read</span>}
                              {!seenActivityIds.current.has(n.dbId) && <span style={{ marginLeft: 8, color: "#f97316", fontWeight: 600 }}>● Unread</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9" }}>
                      <button onClick={() => { switchView("alerts"); setShowBellPanel(false); }} style={{ width: "100%", padding: "7px", borderRadius: 8, border: "none", background: "#f8fafc", color: "#3b82f6", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>View All Alerts →</button>
                    </div>
                  </div>
                </>}
              </div>
              
              {/* ✉️ Inbox — DB-backed per user */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowInboxPanel(p => !p); setShowBellPanel(false); if (!showInboxPanel) markInboxRead(); }}
                  style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px solid #e2e8f0", background: showInboxPanel ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, position: "relative" }}>
                  ✉️
                  {inboxUnread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#3b82f6", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{inboxUnread > 99 ? "99+" : inboxUnread}</span>}
                </button>
                {showInboxPanel && <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setShowInboxPanel(false)} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 380, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.14)", zIndex: 300, overflow: "hidden" }}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>✉️ Inbox</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{inboxItems.length} messages</span>
                    </div>
                    <div style={{ maxHeight: 460, overflowY: "auto" }}>
                      {inboxItems.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No messages</div>}
                      {inboxItems.map(item => (
                        <div key={item.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f8fafc", background: item.read ? "#fff" : "#f0f9ff", borderLeft: item.read ? "none" : "3px solid #3b82f6" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                              {item.type === "forward_request" ? "📬" : item.type === "forward_response" ? (item.status === "Approved" ? "✅" : "❌") : item.type === "ticket_assigned" ? "🎫" : "📩"}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{item.title}</div>
                              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginBottom: 6 }}>{item.message}</div>
                              {item.ticketId && <div onClick={() => handleNotificationClick(item)} style={{ fontSize: 10, color: "#3b82f6", fontFamily: "monospace", marginBottom: 6, cursor: "pointer", textDecoration: "underline" }}>{item.ticketId}</div>}
                              {/* Accept/Reject for pending forward requests */}
                              {item.type === "forward_request" && !item.resolved && (currentUser?.role === "Admin" || currentUser?.role === "Manager") && (
                                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                  <button onClick={() => acceptInboxForwardRequest(item)} style={{ flex: 1, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>✓ Approve</button>
                                  <button onClick={() => rejectInboxForwardRequest(item)} style={{ flex: 1, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>✕ Reject</button>
                                </div>
                              )}
                              {item.resolved && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: item.resolved === "Approved" ? "#dcfce7" : "#fee2e2", color: item.resolved === "Approved" ? "#15803d" : "#991b1b" }}>{item.resolved}</span>}
                              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9" }}>
                      <button onClick={() => { switchView("alerts"); setShowInboxPanel(false); }} style={{ width: "100%", padding: "7px", borderRadius: 8, border: "none", background: "#f8fafc", color: "#3b82f6", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>View All Alerts →</button>
                    </div>
                  </div>
                </>}
              </div>

              {/* 🗑 Bin — Admin/Manager only */}
            {(currentUser?.role === "Admin") && (
              <button onClick={() => switchView("bin")} title="Bin"
                style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px solid #e2e8f0", background: view === "settings" && settingsTab === "bin" ? "#fee2e2" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                🗑️
              </button>
            )}
            </div>
          </div>
        </div>

        <div ref={mainContentRef} style={{ flex: 1, padding: 20, overflow: "auto", position: "relative" }}>
          {/* ── DASHBOARD (v2 layout + SmartCharts) ── */}

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <DashboardView
              tickets={tickets} projects={projects} users={users}
              orgs={orgs} categories={categories} currentUser={currentUser}
              priorityDist={priorityDist} categoryDist={categoryDist}
              categoryDistAll={categoryDistAll} statusDist={statusDist}
              orgDist={orgDist} agentDist={agentDist} monthlyDist={monthlyDist}
              dashboardOrg={dashboardOrg} setDashboardOrg={setDashboardOrg}
              showDashboardOrgDD={showDashboardOrgDD}
              setShowDashboardOrgDD={setShowDashboardOrgDD}
              dashboardStats={dashboardStats}
              dashboardStatsLoading={dashboardStatsLoading}
              dashboardData={dashboardData}
              dashboardDailyData={dashboardDailyData}
              categoryDistFull={categoryDistFull}
              dashboardClosingUsersFull={dashboardClosingUsersFull}
              catBreakdownExpanded={catBreakdownExpanded} setCatBreakdownExpanded={setCatBreakdownExpanded}
              closuresByPersonExpanded={closuresByPersonExpanded} setClosuresByPersonExpanded={setClosuresByPersonExpanded}
              assignmentsByPersonExpanded={assignmentsByPersonExpanded} setAssignmentsByPersonExpanded={setAssignmentsByPersonExpanded}
              dashboardAssignedUsersFull={dashboardAssignedUsersFull}
              setSelTicket={setSelTicket}
              switchView={switchView}
              setTvFilter={setTvFilter}
              setFilterStatus={setFilterStatus}
              setFilterAssignment={setFilterAssignment}
              setPriorityF={setPriorityF}
              setStatusF={setStatusF}
              setTicketDateFrom={setTicketDateFrom}
              dashboardTimePeriod={dashboardTimePeriod}
            />
          )}

          {/* ── TICKETS ── */}
          {view === "alerts" && (
            <AlertsView
              alertNotifs={alertNotifs}
              inboxItems={inboxItems}
              inboxUnread={inboxUnread}
              currentUser={currentUser}
              handleNotificationClick={handleNotificationClick}
              acceptInboxForwardRequest={acceptInboxForwardRequest}
              rejectInboxForwardRequest={rejectInboxForwardRequest}
            />
          )}
          {view === "tickets" && (
            <TicketsView
              tickets={tickets} users={users} orgs={orgs}
              ticketTotalCount={ticketTotalCount}
              ticketsLoading={ticketsLoading}
              categories={categories} currentUser={currentUser}
              filtered={filtered} tvFilter={tvFilter} setTvFilter={setTvFilter}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              filterAssignment={filterAssignment} setFilterAssignment={setFilterAssignment}
              filterAssignee={filterAssignee} setFilterAssignee={setFilterAssignee}
              filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              orgFilter={orgFilter} setOrgFilter={setOrgFilter}
              deptFilter={deptFilter} setDeptFilter={setDeptFilter}
              departments={departments}
              priorityF={priorityF} setPriorityF={setPriorityF}
              ticketSearch={search} setTicketSearch={setSearch}
              ticketDateFrom={ticketDateFrom} setTicketDateFrom={setTicketDateFrom}
              ticketDateTo={ticketDateTo} setTicketDateTo={setTicketDateTo}
              ticketFilters={{filterStatus, filterAssignment, statusF, priorityF}} setTicketFilters={() => {}}
              ticketPage={ticketPage} setTicketPage={setTicketPage}
              selectedIds={selectedIds} setSelectedIds={setSelectedIds}
              ticketSort={ticketSort} setTicketSort={setTicketSort}
              activeFilterDD={activeFilterDD} setActiveFilterDD={setActiveFilterDD}
              showTicketExport={showTicketExport} setShowTicketExport={setShowTicketExport}
              showTicketColPicker={showTicketColPicker} setShowTicketColPicker={setShowTicketColPicker}
              visibleTicketCols={visibleTicketCols} setVisibleTicketCols={setVisibleTicketCols}
              showTicketColExport={showTicketColExport} setShowTicketColExport={setShowTicketColExport}
              ticketExportCols={ticketExportCols} setTicketExportCols={setTicketExportCols}
              ticketExportMode={ticketExportMode} setTicketExportMode={setTicketExportMode}
              toggleSel={toggleSel} toggleCurrentPage={toggleCurrentPage}
              toggleAllFiltered={toggleAllFiltered}
              updateStatus={updateStatus} deleteTicket={deleteTicket}
              setSelTicket={setSelTicket}
              setShowRemarkModal={setShowRemarkModal}
              setClosingTicketId={setClosingTicketId}
              setPendingTicketStatus={setPendingTicketStatus}
              setClosedBy={setClosedBy}
              setShowForward={setShowForward} setShowVendor={setShowVendor}
              handleNotificationClick={handleNotificationClick}
              importRef={importRef} handleSelectiveImport={handleSelectiveImport}
              handleExport={handleExport}
              setShowNewTicket={setShowNewTicket}
              setForm={setForm} emptyForm={emptyForm} dashboardOrg={dashboardOrg}
              setConfirmModal={setConfirmModal} setCustomAlert={setCustomAlert}
              setTickets={setTickets} isTrueWebcast={isTrueWebcast}
              alertNotifs={alertNotifs} inboxItems={inboxItems} inboxUnread={inboxUnread}
              acceptInboxForwardRequest={acceptInboxForwardRequest}
              rejectInboxForwardRequest={rejectInboxForwardRequest}
            />
          )}
          
          {/* ── REPORTS ── */}
          {view === "reports" && (
            <ReportsView
              tickets={tickets} projects={projects} users={users}
              orgs={orgs} categories={categories} currentUser={currentUser}
              reportFilters={reportFilters} setReportFilters={setReportFilters}
              activeReportFilterDD={activeReportFilterDD} setActiveReportFilterDD={setActiveReportFilterDD}
              reportTimeRange={reportTimeRange} setReportTimeRange={setReportTimeRange}
              savedReports={savedReports} setSavedReports={setSavedReports}
              dashboardOrg={dashboardOrg}
            />
          )}

          {/* ── BIN ── */}
          {view === "bin" && (
            <BinView
              tickets={tickets} projects={projects} currentUser={currentUser}
              restoreTicket={restoreTicket} restoreProject={restoreProject}
              permanentDeleteTicket={permanentDeleteTicket}
              permanentDeleteProject={permanentDeleteProject}
              thStyle={thStyle} tdStyle={tdStyle}
              setConfirmModal={setConfirmModal}
              setCustomAlert={setCustomAlert}
            />
          )}

          {/* ── SETTINGS ── */}
          {view === "settings" && (
            <SettingsView
              currentUser={currentUser}
              orgs={orgs} setOrgs={setOrgs}
              categories={categories} setCategories={setCategories}
              users={users} setUsers={setUsers}
              customAttrs={customAttrs} setCustomAttrs={setCustomAttrs}
              locations={locations} setLocations={setLocations} vendors={vendors} setVendors={setVendors} departments={departments}
              attrLayout={layoutDraft} draftLayout={draftLayout} setDraftLayout={setDraftLayout}
              settingsTab={settingsTab} setSettingsTab={setSettingsTab}
              newOrg={newOrg} setNewOrg={setNewOrg}
              newCat={newCat} setNewCat={setNewCat}
              newUser={newUser} setNewUser={setNewUser}
              newAttr={newAttr} setNewAttr={setNewAttr}
              newLocation={newLocation} setNewLocation={setNewLocation}
              newVendor={newVendor} setNewVendor={setNewVendor}
              newDept={newDept} setNewDept={setNewDept}
              newSubcategory={newSubcategory} setNewSubcategory={setNewSubcategory}
              newSubcatCatId={newSubcatCatId} setNewSubcatCatId={setNewSubcatCatId}
              showAddUserModal={showAddUserModal} setShowAddUserModal={setShowAddUserModal}
              showAddVendorModal={showAddVendorModal} setShowAddVendorModal={setShowAddVendorModal}
              userEditModal={userEditModal} setUserEditModal={setUserEditModal}
              showAttrLayoutModal={showAttrLayoutModal} setShowAttrLayoutModal={setShowAttrLayoutModal}
              addOrg={addOrg} deleteOrg={deleteOrg}
              addCat={addCat} deleteCat={deleteCat} updateCatSubcategories={updateCatSubcategories}
              addUser={addUser} deleteUser={deleteUser}
              addAttr={addAttr} deleteAttr={deleteAttr}
              updateAttrLayout={updateAttrLayout} saveLayoutDraft={saveLayoutDraft}
              addLocation={addLocation} deleteLocation={deleteLocation}
              addVendor={addVendor} deleteVendor={deleteVendor}
              addDept={addDept} deleteDept={deleteDept}
              thStyle={thStyle} tdStyle={tdStyle}
              agentUser={selAgent} setAgentUser={setSelAgent}
              passwordForm={passwordForm} setPasswordForm={setPasswordForm}
              showChangePassword={showChangePassword} setShowChangePassword={setShowChangePassword}
              handleProfileUpdate={saveProfile}
              handlePasswordChange={changePassword}
              setConfirmModal={setConfirmModal}
              setCustomAlert={setCustomAlert}
              setProjects={setProjects}
              PROJECTS_API={PROJECTS_API}
              tickets={tickets} setTickets={setTickets}
              dashboardOrg={dashboardOrg}
              categoryCountMap={categoryCountMap}
              handleExport={handleExport}
              handleSelectiveImport={handleSelectiveImport}
              importRef={importRef}
              agentDetailModal={agentDetailModal}
              setAgentDetailModal={setAgentDetailModal}
            />
          )}

        </div>{/* end mainContent */}
      </div>{/* end app layout */}

      {/* ── ALL MODALS ── */}
      <Modals
  currentUser={currentUser}
  users={users} orgs={orgs} categories={categories}
  locations={locations} vendors={vendors} customAttrs={customAttrs}
  tickets={tickets} projects={projects}
  thStyle={thStyle} tdStyle={tdStyle}
  isTrueWebcast={isTrueWebcast}
  departments={departments}
  showNewTicket={showNewTicket} setShowNewTicket={setShowNewTicket}
  form={form} setForm={setForm}
  handleSubmit={handleSubmit}
  showDepartmentDD={showDepartmentDD} setShowDepartmentDD={setShowDepartmentDD}
  showCategoryDD={showCategoryDD} setShowCategoryDD={setShowCategoryDD}
  showLocationDD={showLocationDD} setShowLocationDD={setShowLocationDD}
  showAssigneeDD={showAssigneeDD} setShowAssigneeDD={setShowAssigneeDD}
  assigneeSearch={assigneeSearch} setAssigneeSearch={setAssigneeSearch}
  showTicketAssigneeDD={showTicketAssigneeDD} setShowTicketAssigneeDD={setShowTicketAssigneeDD}
  showNewProject={showNewProject} setShowNewProject={setShowNewProject}
  projForm={projForm} setProjForm={setProjForm}
  handleProjectSubmit={handleProjectSubmit}
  showProjCategoryDD={showProjCategoryDD} setShowProjCategoryDD={setShowProjCategoryDD}
  showProjAssigneeDD={showProjAssigneeDD} setShowProjAssigneeDD={setShowProjAssigneeDD}
  selTicket={selTicket} setSelTicket={setSelTicket}
  ticketEditMode={ticketEditMode} setTicketEditMode={setTicketEditMode}
  editForm={editForm} setEditForm={setEditForm}
  handleTicketEditSave={handleTicketEditSave}
  selProject={selProject} setSelProject={setSelProject}
  projEditMode={projEditMode} setProjEditMode={setProjEditMode}
  editProjForm={editProjForm} setEditProjForm={setEditProjForm}
  handleProjectEditSave={handleProjectEditSave}
  addProjCC={addProjCC}
  showForward={showForward} setShowForward={setShowForward}
  selectedForwardAgent={selectedForwardAgent} setSelectedForwardAgent={setSelectedForwardAgent}
  forwardNote={forwardNote} setForwardNote={setForwardNote}
  handleForward={handleForward}
  handleForwardTicket={handleForwardTicket}
  handleSendForRepair={handleSendForRepair} handleVendorReturn={handleVendorReturn}
  showVendor={showVendor} setShowVendor={setShowVendor}
  vendorReturnNote={vendorReturnNote} setVendorReturnNote={setVendorReturnNote}
  vendorReturnOutcome={vendorReturnOutcome} setVendorReturnOutcome={setVendorReturnOutcome}
  handleSendForRepair={handleSendForRepair} handleVendorReturn={handleVendorReturn}
  showTimelineView={showTimelineView} setShowTimelineView={setShowTimelineView}
  showProjTimelineView={showProjTimelineView} setShowProjTimelineView={setShowProjTimelineView}
  showLocationModal={showLocationModal} setShowLocationModal={setShowLocationModal}
  showRemarkModal={showRemarkModal} setShowRemarkModal={setShowRemarkModal}
  closingTicketId={closingTicketId} isReopenModal={isReopenModal} ticketRemark={ticketRemark} setTicketRemark={setTicketRemark}
  closedBy={closedBy} setClosedBy={setClosedBy} closedDate={closedDate} setClosedDate={setClosedDate} setIsReopenModal={setIsReopenModal} minutes={minutes}
  updateStatus={updateStatus}
  showAttrLayoutModal={showAttrLayoutModal} setShowAttrLayoutModal={setShowAttrLayoutModal}
  draftLayout={draftLayout} setDraftLayout={setDraftLayout}
  saveLayoutDraft={saveLayoutDraft} updateAttrLayout={updateAttrLayout}
  showActivityLog={showActivityLog} setShowActivityLog={setShowActivityLog}
  showSessionHistory={showSessionHistory} setShowSessionHistory={setShowSessionHistory}
  showAddUserModal={showAddUserModal} setShowAddUserModal={setShowAddUserModal}
  newUser={newUser} setNewUser={setNewUser} addUser={addUser}
  showAddVendorModal={showAddVendorModal} setShowAddVendorModal={setShowAddVendorModal}
  newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor}
  showConfirmation={showConfirmation} setShowConfirmation={setShowConfirmation}
  confirmationConfig={confirmationConfig}
  printFrameRef={printFrameRef}
  toggleAssignee={toggleAssignee}
  addCC={addCC}
  updateStatusDirect={updateStatusDirect}
  PRIORITY_COLOR={PRIORITY_COLOR} STATUS_COLOR={STATUS_COLOR} Badge={Badge}
  TICKETS_API={TICKETS_API} PROJECTS_API={PROJECTS_API} NOTIFICATIONS_API={NOTIFICATIONS_API}
  ticketImage={ticketImage}
  setTicketImage={setTicketImage}
  ticketImagePreview={ticketImagePreview}
  setTicketImagePreview={setTicketImagePreview}
  commentImage={commentImage}
  setCommentImage={setCommentImage}
  commentImagePreview={commentImagePreview}
  setCommentImagePreview={setCommentImagePreview}
  newComment={newComment}
  setNewComment={setNewComment}
  newProjComment={newProjComment}
  setNewProjComment={setNewProjComment}
  commentVisibility={commentVisibility}
  setCommentVisibility={setCommentVisibility}
  toasts={toasts}
  floatingAlerts={floatingAlerts}
  setFloatingAlerts={setFloatingAlerts}
  inboxItems={inboxItems}
  acceptInboxForwardRequest={acceptInboxForwardRequest}
  rejectInboxForwardRequest={rejectInboxForwardRequest}
  activityLogs={activityLogs}
  sessionHistory={sessionHistory}
  restoreModal={restoreModal}
  setRestoreModal={setRestoreModal}
  agentDetailModal={agentDetailModal}
  setAgentDetailModal={setAgentDetailModal}
  editMode={editMode}
  setEditMode={setEditMode}
  editTicket={editTicket}
  setEditTicket={setEditTicket}
  editProjMode={editProjMode}
  setEditProjMode={setProjEditMode}
  editProject={editProject}
  setEditProject={setEditProject}
  fwdTargetAgent={fwdTargetAgent}
  setFwdTargetAgent={setFwdTargetAgent}
  fwdReason={fwdReason}
  setFwdReason={setFwdReason}
  showForwardAgentDD={showForwardAgentDD}
  setShowForwardAgentDD={setShowForwardAgentDD}
  vendorName={vendorName}
  setVendorName={setVendorName}
  vendorEmail={vendorEmail}
  setVendorEmail={setVendorEmail}
  showVendorReturn={showVendorReturn}
  setShowVendorReturn={setShowVendorReturn}
  pendingTicketStatus={pendingTicketStatus}
  setPendingTicketStatus={setPendingTicketStatus}
  timelineTab={timelineTab}
  setTimelineTab={setTimelineTab}
  closeTicketWithRemark={closeTicketWithRemark}
  compressImage={compressImage}
  showToast={showToast}
  addDailyNotif={addDailyNotif}
  setCustomAlert={setCustomAlert}
  STATUSES={STATUSES}
  ProgressBar={ProgressBar}
  getProgressFromStatus={getProgressFromStatus}
  selAgent={selAgent}
  currentTicketId={currentTicketId}
  setCurrentTicketId={setCurrentTicketId}
  currentLocation={currentLocation}
  setCurrentLocation={setCurrentLocation}
  showTicketDropdown={showTicketDropdown}
  setShowTicketDropdown={setShowTicketDropdown}
  USERS_API={USERS_API}
  setUsers={setUsers}
  setTickets={setTickets}
  setProjects={setProjects}
/>
      {agentDetailModal?.show && (
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
      <iframe ref={printFrameRef} style={{ display: "none" }} title="print-frame" />
    </div>
  );
}
