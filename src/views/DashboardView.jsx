import React from "react";
import { SmartChart, DonutChart, HorizontalBarChart } from "../components/Charts";
import { Avatar, Badge } from "../components/UIComponents";
import { STATUS_COLOR } from "../constants/constants";

const shimmerStyle = {
  background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.2s infinite",
  borderRadius: 10,
};
const shimmerKeyframes = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

function StatCardSkeleton() {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", boxShadow: "0 2px 6px rgba(0,0,0,0.07)", borderLeft: "5px solid #e2e8f0" }}>
      <div style={{ ...shimmerStyle, height: 14, width: "40%", marginBottom: 10 }} />
      <div style={{ ...shimmerStyle, height: 32, width: "60%", marginBottom: 8 }} />
      <div style={{ ...shimmerStyle, height: 10, width: "50%" }} />
    </div>
  );
}

function ChartSkeleton({ height = 300 }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", height }}>
      <div style={{ ...shimmerStyle, height: 14, width: "40%", marginBottom: 16 }} />
      <div style={{ ...shimmerStyle, height: height - 60, borderRadius: 8 }} />
    </div>
  );
}

/**
 * Dashboard summary cards, charts, and recent-ticket feed.
 * All data is passed as props — no internal state or API calls.
 */
export function DashboardView(props) {
  const {
  tickets, projects, users, orgs, categories,
  currentUser,
  priorityDist, categoryDist, categoryDistAll,
  statusDist, orgDist, agentDist, monthlyDist,
  dashboardOrg, setDashboardOrg,
  showDashboardOrgDD, setShowDashboardOrgDD,
  dashboardStats, dashboardStatsLoading, dashboardData, dashboardDailyData,
  categoryDistFull, dashboardClosingUsersFull,
  catBreakdownExpanded, setCatBreakdownExpanded,
  closuresByPersonExpanded, setClosuresByPersonExpanded,
  setSelTicket, switchView,
  setTvFilter, setFilterStatus, setFilterAssignment,
  setPriorityF, setStatusF, setTicketDateFrom, dashboardTimePeriod,
 } = props;

  const getDateFrom = () => {
    if (!dashboardTimePeriod || dashboardTimePeriod === "all") return "";
    const d = new Date();
    if (dashboardTimePeriod === "1d") d.setHours(0,0,0,0);
    else if (dashboardTimePeriod === "7d") d.setDate(d.getDate()-7);
    else if (dashboardTimePeriod === "1m") d.setMonth(d.getMonth()-1);
    else if (dashboardTimePeriod === "3m") d.setMonth(d.getMonth()-3);
    else if (dashboardTimePeriod === "6m") d.setMonth(d.getMonth()-6);
    else if (dashboardTimePeriod === "1y") d.setFullYear(d.getFullYear()-1);
    const pad = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };

  return (
    <>
      <style>{shimmerKeyframes}</style>
      {/* Background Image with Clear Display for Dashboard */}
      <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: 'url("/res/login_page_bg.jpeg")', // USER: Static asset from public/res folder
              backgroundSize: "auto",
              backgroundPosition: "0 0",
              backgroundRepeat: "repeat",
              opacity: 1,
              zIndex: 0,
              pointerEvents: "none"
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              {/* ── ROW 1: TICKETS ── */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.1em", marginLeft: 2 }}>🎫 TICKETS</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 9, marginBottom: 20 }}>
                {(dashboardStatsLoading || !dashboardStats)
                 ? Array.from({ length: (currentUser?.role === "Admin" || currentUser?.role === "Manager") ? 7 : 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                  : [
                  { label: "Open", value: dashboardStats.open, bg: "#fef3c7", accent: "#f59e0b", icon: "", action: () => { switchView("tickets"); setTvFilter("all"); setFilterStatus(["open"]); setFilterAssignment([]); setPriorityF("All"); setTicketDateFrom(getDateFrom()); } },
                  ...((currentUser?.role === "Admin" || currentUser?.role === "Manager") ? [{ label: "Unassigned", value: dashboardStats.unassigned ?? 0, bg: "#f3e8ff", accent: "#a855f7", icon: "", action: () => { switchView("tickets"); setTvFilter("all"); setFilterAssignment(["unassigned"]); setFilterStatus(["open"]); setPriorityF("All"); setTicketDateFrom(getDateFrom()); } }] : []),
                  { label: "Critical", value: dashboardStats.critical, bg: "#fee2e2", accent: "#ef4444", icon: "", action: () => { switchView("tickets"); setTvFilter("all"); setFilterStatus(["open"]); setPriorityF("Critical"); setFilterAssignment([]); setTicketDateFrom(getDateFrom()); } },
                  { label: "Closed", value: dashboardStats.closed, bg: "#dcfce7", accent: "#22c55e", icon: "", action: () => { switchView("tickets"); setTvFilter("all"); setFilterStatus(["closed"]); setFilterAssignment([]); setPriorityF("All"); setTicketDateFrom(getDateFrom()); } },
                  { label: "Total", value: dashboardStats.total, bg: "#dbeafe", accent: "#3b82f6", icon: "", action: () => { switchView("tickets"); setTvFilter("all"); setStatusF("All"); setPriorityF("All"); setTicketDateFrom(getDateFrom()); } },
                  ...((currentUser?.role === "Admin" || currentUser?.role === "Manager") ? [{ label: "Reopened", value: dashboardStats.reopened, bg: "#fff7ed", accent: "#f97316", icon: "", action: () => { switchView("tickets"); setTvFilter("reopened"); setFilterStatus([]); setPriorityF("All"); setTicketDateFrom(""); } }] : []),
                ].map(s => (
                  <div key={s.label} onClick={s.action} style={{ background: s.bg, borderRadius: 12, padding: "16px 16px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", borderLeft: `5px solid ${s.accent}`, cursor: "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ✅ REMOVED: Separate Unassigned Card - Now integrated above */}

              {/* ✅ REMOVED: Projects stats section - Now shown only in Projects view */}

              {/* Dashboard Graphs - Different layouts for different roles */}
              {(currentUser?.role === "Admin" || currentUser?.role === "Manager") ? (
                <>
                  {/* Row 1: Tickets Over Time + Priority */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    {dashboardStatsLoading ? <ChartSkeleton /> : <SmartChart title="Daily Ticket count (Over a Week)" data={dashboardDailyData} defaultColor="#3b82f6" hideTotal defaultType="hbar" />
}
                    {dashboardStatsLoading ? <ChartSkeleton /> : <SmartChart title="Priority Distribution" data={priorityDist} defaultType="pie" />}
                  </div>

                  {/* Row 2: Category Breakdown + Closures by Person */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Category Breakdown</div>
                        <button onClick={() => setCatBreakdownExpanded(v => !v)} style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{catBreakdownExpanded ? "Show Less ↑" : "View All ↓"}</button>
                      </div>
                      {dashboardStatsLoading ? <div style={{ ...shimmerStyle, height: 200, borderRadius: 8 }} /> : <HorizontalBarChart data={categoryDistFull} maxItems={catBreakdownExpanded ? undefined : 10} />
}
                    </div>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Closures by Person</div>
                        <button onClick={() => setClosuresByPersonExpanded(v => !v)} style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{closuresByPersonExpanded ? "Show Less ↑" : "View All ↓"}</button>
                      </div>
                      {dashboardStatsLoading ? <div style={{ ...shimmerStyle, height: 200, borderRadius: 8 }} /> : <HorizontalBarChart data={dashboardClosingUsersFull} maxItems={closuresByPersonExpanded ? undefined : 10} />
}
                    </div>
                  </div>

                  {/* Recent Tickets for Admin/Manager */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div style={{ background: "#faf8f4", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "#374151" }}>Recent Tickets</div>
                      {(currentUser?.role === "Admin" || currentUser?.role === "Manager" ? tickets : tickets.filter(t => t.reportedBy === currentUser?.name || (Array.isArray(t.assignees) ? t.assignees : []).some(a => a.id === currentUser?.id))).slice(0, 10).map(t => (
                        <div key={t.id} onClick={() => setSelTicket(t)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px", borderRadius: 8, cursor: "pointer", border: "1px solid #f1f5f9", marginBottom: 5 }}>
                          <div style={{ display: "flex" }}>{(Array.isArray(t.assignees) ? t.assignees : []).slice(0, 2).map((a, i) => <div key={a.id ?? `${t.id}-a-${i}`} style={{ marginLeft: i > 0 ? -6 : 0, border: "2px solid #fff", borderRadius: "50%" }}><Avatar name={a.name} size={24} /></div>)}{!(Array.isArray(t.assignees) && t.assignees.length) && <Avatar name="?" size={24} />}</div>
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.summary}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{t.id} · {t.org}</div></div>
                          <Badge label={t.status} style={{...STATUS_COLOR[t.status], fontSize: 10}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Viewer/Agent: 3 charts side by side */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <SmartChart title="Daily Ticket count (Over a Week)" data={dashboardDailyData} defaultColor="#3b82f6" size="small" hideTotal defaultType="hbar" />
                    <SmartChart title="Priority Distribution" data={priorityDist} defaultType="pie" size="small" />
                  </div>
                  <div style={{ background: "#faf8f4", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "#374151" }}>My Recent Tickets</div>
                    {tickets.filter(t => t.assignees?.some(a => a.id === currentUser?.id)).slice(0, 10).map(t => (
                      <div key={t.id} onClick={() => setSelTicket(t)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px", borderRadius: 8, cursor: "pointer", border: "1px solid #f1f5f9", marginBottom: 5 }}>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.summary}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{t.id} · {t.org}</div></div>
                        <Badge label={t.status} style={{...STATUS_COLOR[t.status], fontSize: 10}}/>
                      </div>
                    ))}
                    {tickets.filter(t => t.assignees?.some(a => a.id === currentUser?.id)).length === 0 && <div style={{ color: "#94a3b8", fontSize: 12 }}>No tickets assigned</div>}
                  </div>
                  {/* Viewer/Agent: Horizontal Bar Charts row */}
                  {/* NO Recent Tickets for Viewer/Agent */}
                </>
              )}
            </div>
          </>
  );
}