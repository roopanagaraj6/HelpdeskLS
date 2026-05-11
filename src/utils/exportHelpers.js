// ─── EXPORT HELPERS ────────────────────────────────────────────────────────────

export function exportCSV(items, type = "tickets") {
  if (!items || items.length === 0) {
    alert(`No ${type} to export`);
    return;
  }

  let headers = [];
  let rows = [];

  if (type === "users") {
    headers = ["ID", "Name", "Email", "Phone", "Role", "Active", "Status"];
    rows = items.map(u => [
      u.id,
      `"${u.name || ""}"`,
      u.email || "",
      u.phone || "",
      u.role || "Viewer",
      u.active ? "Yes" : "No",
      u.status || "Logged-Out",
    ]);
  } else if (type === "orgs" || type === "organizations") {
    headers = ["ID", "Name", "Domain", "Phone"];
    rows = items.map(o => [o.id, `"${o.name || ""}"`, o.domain || "", o.phone || ""]);
  } else if (type === "categories") {
    headers = ["ID", "Name", "Color"];
    rows = items.map(c => [c.id, `"${c.name || ""}"`, c.color || ""]);
  } else if (type === "projects") {
    headers = ["ID", "Title", "Organization", "Department", "Reported By", "Assignees", "Priority", "Category", "Status", "Progress", "Due Date", "Created"];
    rows = items.map(t => [
      t.id,
      `"${t.title || ""}"`,
      t.org || "",
      t.department || "",
      t.reportedBy || "",
      `"${(t.assignees || []).map(a => a.name).join("; ")}"`,
      t.priority || "Medium",
      t.category || "",
      t.status || "Open",
      `${t.progress || 0}%`,
      t.dueDate?.toLocaleDateString() || "",
      new Date(t.created).toLocaleString(),
    ]);
  } else {
    // Default: tickets
    headers = ["ID", "Summary", "Organization", "Department", "Contact", "Reported By", "Assignees", "Priority", "Category", "Status", "Created", "Updated"];
    rows = items.map(t => [
      t.id,
      `"${t.summary || ""}"`,
      t.org || "",
      t.department || "",
      t.contact || "",
      t.reportedBy || "",
      `"${(t.assignees || []).map(a => a.name).join("; ")}"`,
      t.priority || "Medium",
      t.category || "",
      t.status || "Open",
      new Date(t.created).toLocaleString(),
      new Date(t.updated).toLocaleString(),
    ]);
  }

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

export function exportJSON(items) {
  if (!items || items.length === 0) {
    alert("No data to export");
    return;
  }
  const data = items.map(t => ({
    ...t,
    assignees: (t.assignees || []).map(a => ({ id: a.id, name: a.name, role: a.role })),
  }));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `export_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}

export function exportPrint(items, type = "tickets") {
  if (!items || items.length === 0) {
    alert(`No ${type} to print`);
    return;
  }

  const isProject = type === "projects";
  const rows = items
    .map(t =>
      isProject
        ? `<tr><td>${t.id}</td><td>${t.title}</td><td>${t.org}</td><td>${t.priority}</td><td>${t.status}</td><td>${t.progress}%</td><td>${new Date(t.created).toLocaleDateString()}</td></tr>`
        : `<tr><td>${t.id}</td><td>${t.summary}</td><td>${t.org}</td><td>${t.priority}</td><td>${t.status}</td><td>${new Date(t.created).toLocaleDateString()}</td></tr>`
    )
    .join("");

  const w = window.open("", "_blank");
  const colHeaders = isProject
    ? "<th>ID</th><th>Title</th><th>Org</th><th>Priority</th><th>Status</th><th>Progress</th><th>Created</th>"
    : "<th>ID</th><th>Summary</th><th>Org</th><th>Priority</th><th>Status</th><th>Created</th>";
  w.document.write(`
    <html>
      <head>
        <title>${type} Export</title>
        <style>
          body { font-family: sans-serif; font-size: 12px }
          table { border-collapse: collapse; width: 100% }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left }
          th { background: #f1f5f9 }
        </style>
      </head>
      <body>
        <h2>${type} Export — ${new Date().toLocaleDateString()}</h2>
        <p>${items.length} ${type}</p>
        <table>
          <thead><tr>${colHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  w.document.close();
  w.print();
}
