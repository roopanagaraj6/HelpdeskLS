// ─────────────────────────────────────────────────────────────────────────────
// server.js  —  DeskFlow Backend (Node + Express + MySQL/Sequelize)
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes, Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── CACHE ────────────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = {
  paginated: 15 * 1000,      // 15s — ticket pages
  counts:    30 * 1000,      // 30s — ticket counts
  stats:     60 * 1000,      // 60s — dashboard/agent stats
  static:    5 * 60 * 1000,  // 5m  — orgs, categories, users, depts, locations, vendors
  alldata:   2 * 60 * 1000,  // 2m  — /api/all-data
  report:    2 * 60 * 1000,  // 2m  — /api/report
};

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { cache.delete(key); return null; }
  return entry.val;
}
function cacheSet(key, val, ttl) {
  cache.set(key, { val, exp: Date.now() + ttl });
}
function cacheDel(...patterns) {
  for (const pat of patterns)
    for (const key of cache.keys())
      if (key.startsWith(pat)) cache.delete(key);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. DATABASE CONNECTION ──────────────────────────────────────────────────
const sequelize = new Sequelize(
    process.env.DB_NAME || "deskflow",
    process.env.DB_USER || "root",
    process.env.DB_PASS || "",
    {
        host: process.env.DB_HOST || "127.0.0.1",
        dialect: "mysql",
        logging: false,
        dialectOptions: {
            ssl: false,
            authPlugins: {
                mysql_native_password: 'mysql_native_password'
            }
        }
    }
);

// ─── 2. SCHEMAS (MODELS) ─────────────────────────────────────────────────────

const User = sequelize.define("User", {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, defaultValue: "" },
    role: { type: DataTypes.ENUM("Super Admin", "Admin", "Manager", "Agent", "Viewer"), defaultValue: "Agent" },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    status: { type: DataTypes.STRING, defaultValue: "Off Duty" }, // On Duty | On Ticket | Idle | On Lunch | Off Duty
    confirmed: { type: DataTypes.BOOLEAN, defaultValue: true },
    // ✅ NEW: Agent tracking fields
    currentTicketId: { type: DataTypes.STRING, defaultValue: null },
    currentLocation: { type: DataTypes.STRING, defaultValue: null },
    lunchStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
    // ✅ NEW: Logout reason and validation fields
    logoutReason: { type: DataTypes.STRING, defaultValue: null }, // Reason for last logout/status change
    requiresLogoutReason: { type: DataTypes.BOOLEAN, defaultValue: false }, // Flag if user needs to provide reason before logout
    forceLogout: { type: DataTypes.BOOLEAN, defaultValue: false }, // Set by admin to remotely eject an agent
    loginTime: { type: DataTypes.DATE, defaultValue: null },
    idleAt: { type: DataTypes.DATE, defaultValue: null },
}, { timestamps: true });

const Org = sequelize.define("Org", {
    name: { type: DataTypes.STRING, allowNull: false },
    domain: { type: DataTypes.STRING, defaultValue: "" },
    phone: { type: DataTypes.STRING, defaultValue: "" },
}, { timestamps: true });

// ✅ NEW: Vendor Model
const Vendor = sequelize.define("Vendor", {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, defaultValue: "" },
    phone: { type: DataTypes.STRING, defaultValue: "" },
    address: { type: DataTypes.TEXT, defaultValue: "" },
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ["name"] }
    ]
});

const Category = sequelize.define("Category", {
    name: { type: DataTypes.STRING, allowNull: false },
    color: { type: DataTypes.STRING, defaultValue: "#3b82f6" },
    subcategories: { type: DataTypes.JSON, defaultValue: [] },
}, { timestamps: true });

const CustomAttr = sequelize.define("CustomAttr", {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM("text", "number", "select", "date", "checkbox"), defaultValue: "text" },
    options: { type: DataTypes.JSON, defaultValue: [] },
    required: { type: DataTypes.BOOLEAN, defaultValue: false },
    section: { type: DataTypes.STRING, defaultValue: "grid" }, // "grid" | "below-assignees" | "bottom"
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { timestamps: true });

const Satsang = sequelize.define("Satsang", {
    name: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    location: { type: DataTypes.STRING, defaultValue: "" },
    type: { type: DataTypes.STRING, defaultValue: "" },
    attendees: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM("Live", "Completed"), defaultValue: "Completed" },
}, { timestamps: true });

const Ticket = sequelize.define("Ticket", {
    // We explicitly mark this as the Primary Key so Sequelize is happy
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    summary: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    org: { type: DataTypes.STRING, defaultValue: "" },
    department: { type: DataTypes.STRING, defaultValue: "" },
    contact: { type: DataTypes.STRING, defaultValue: "" },
    reportedBy: { type: DataTypes.STRING, defaultValue: "" },
    assignees: { type: DataTypes.JSON, defaultValue: [] },
    cc: { type: DataTypes.JSON, defaultValue: [] },
    priority: { type: DataTypes.STRING, defaultValue: "Medium" },
    category: { type: DataTypes.STRING, defaultValue: "" },
    status: { type: DataTypes.STRING, defaultValue: "Open" },
    customAttrs: { type: DataTypes.JSON, defaultValue: {} },
    isWebcast: { type: DataTypes.BOOLEAN, defaultValue: false },
    satsangType: { type: DataTypes.STRING, defaultValue: "" },
    location: { type: DataTypes.STRING, defaultValue: "" },
    timeline: { type: DataTypes.JSON, defaultValue: [] },
    comments: { type: DataTypes.JSON, defaultValue: [] },
    vendor: { type: DataTypes.JSON, defaultValue: null },
    dueDate: { type: DataTypes.DATE, defaultValue: null },
    image: { type: DataTypes.TEXT("long"), defaultValue: null },
    satsangId: { type: DataTypes.INTEGER, defaultValue: null },
    closedAt: { type: DataTypes.DATE, defaultValue: null },
}, { timestamps: true });

// NOTE: Webcast model removed — webcast tickets are now stored in the Tickets table
// with category="Webcast" and isWebcast=true. The old Webcasts table is no longer used.

const Project = sequelize.define("Project", {
    id: { type: DataTypes.STRING, primaryKey: true, unique: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    org: { type: DataTypes.STRING, defaultValue: "" },
    department: { type: DataTypes.STRING, defaultValue: "" },
    reportedBy: { type: DataTypes.STRING, defaultValue: "" },
    category: { type: DataTypes.STRING, defaultValue: "" },
    location: { type: DataTypes.STRING, defaultValue: "" },
    priority: { type: DataTypes.STRING, defaultValue: "Medium" },
    status: { type: DataTypes.STRING, defaultValue: "Open" },
    progress: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0 to 100
    owner: { type: DataTypes.STRING, defaultValue: "" },
    assignees: { type: DataTypes.JSON, defaultValue: [] },
    cc: { type: DataTypes.JSON, defaultValue: [] },
    customAttrs: { type: DataTypes.JSON, defaultValue: {} },
    isWebcast: { type: DataTypes.BOOLEAN, defaultValue: false },
    satsangType: { type: DataTypes.STRING, defaultValue: "" },
    satsangId: { type: DataTypes.INTEGER, defaultValue: null },
    team: { type: DataTypes.JSON, defaultValue: [] },
    startDate: { type: DataTypes.DATEONLY, defaultValue: null },
    dueDate: { type: DataTypes.DATEONLY, defaultValue: null },
    comments: { type: DataTypes.JSON, defaultValue: [] },
    tasks: { type: DataTypes.JSON, defaultValue: [] },
    closedAt: { type: DataTypes.DATE, defaultValue: null },
    closedBy: { type: DataTypes.STRING, defaultValue: "" },
}, { timestamps: true });

// ✅ NEW: Department Model
const Department = sequelize.define("Department", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    orgName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "General",
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ["name", "orgName"] } // Same name allowed across different orgs
    ]
});

// ✅ NEW: Location Model
const Location = sequelize.define("Location", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, { timestamps: true,
    indexes: [
        { unique: true, fields: ["name"] }
    ]
 });

// ─── Notification Model ───────────────────────────────────────────────────────
const Notification = sequelize.define("Notification", {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "The recipient user's ID"
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        // Values: forward_request | forward_response | ticket_assigned | ticket_created | ticket_closed | project_created | activity
    },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    ticketId: { type: DataTypes.STRING, defaultValue: null },
    ticketSummary: { type: DataTypes.STRING, defaultValue: null },
    requestId: { type: DataTypes.STRING, defaultValue: null },
    fromUser: { type: DataTypes.STRING, defaultValue: null },
    fromUserId: { type: DataTypes.INTEGER, defaultValue: null },
    toAgent: { type: DataTypes.JSON, defaultValue: null },
    reason: { type: DataTypes.TEXT, defaultValue: null },
    status: { type: DataTypes.STRING, defaultValue: null },
    resolved: { type: DataTypes.STRING, defaultValue: null },
    from: { type: DataTypes.STRING, defaultValue: null },
    broadcastIcon: { type: DataTypes.STRING, defaultValue: null },
    broadcastType: { type: DataTypes.STRING, defaultValue: null },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    alerted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

const SavedReport = sequelize.define("SavedReport", {
  name: { type: DataTypes.STRING, allowNull: false },
  filters: { type: DataTypes.JSON, defaultValue: {} },
  rowCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  savedBy: { type: DataTypes.STRING, defaultValue: "" },
}, { timestamps: true });

// ─── SERIALIZER (Matches your original fmt) ──────────────────────────────────

// --- Scheduled Task Model ---
const ScheduledTask = sequelize.define("ScheduledTask", {
    name:        { type: DataTypes.STRING, allowNull: false },
    summary:     { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    org:         { type: DataTypes.STRING, defaultValue: "" },
    department:  { type: DataTypes.STRING, defaultValue: "" },
    priority:    { type: DataTypes.STRING, defaultValue: "Standard" },
    category:    { type: DataTypes.STRING, defaultValue: "" },
    assignees:   { type: DataTypes.JSON, defaultValue: [] },
    location:    { type: DataTypes.STRING, defaultValue: "" },
    reportedBy:  { type: DataTypes.STRING, defaultValue: "" },
    frequency: { type: DataTypes.ENUM("daily","weekly","biweekly","monthly","quarterly","halfyearly","yearly"), defaultValue: "weekly" },
    dayOfWeek:   { type: DataTypes.INTEGER, defaultValue: 1 },
    dayOfMonth:  { type: DataTypes.INTEGER, defaultValue: 1 },
    timeOfDay:   { type: DataTypes.STRING, defaultValue: "09:00" },
    active:      { type: DataTypes.BOOLEAN, defaultValue: true },
    startDate:   { type: DataTypes.DATEONLY, defaultValue: null },
    endDate:     { type: DataTypes.DATEONLY, defaultValue: null },
    lastRunAt:   { type: DataTypes.DATE, defaultValue: null },
    nextRunAt:   { type: DataTypes.DATE, defaultValue: null },
    createdBy:   { type: DataTypes.STRING, defaultValue: "" },
}, { timestamps: true });

const fmt = (doc) => {
    if (!doc) return null;
    const obj = doc.get ? doc.get({ plain: true }) : { ...doc };
    if (obj.password) delete obj.password;
    ["timeline","comments","assignees","cc","customAttrs","vendor"].forEach(f => {
        if (typeof obj[f] === "string") {
            try { obj[f] = JSON.parse(obj[f]); } catch { obj[f] = []; }
        }
    });
    return obj;
};

// ─── AUTO-INVALIDATION MIDDLEWARE ─────────────────────────────────────────────
// Any POST/PUT/DELETE automatically clears relevant cache keys
app.use((req, res, next) => {
  if (!["POST","PUT","DELETE","PATCH"].includes(req.method)) return next();
  const url = req.path;
  if (url.includes("/tickets"))   cacheDel("paginated:", "counts", "stats:", "static:categories", "report:");
  if (url.includes("/orgs"))      cacheDel("static:orgs", "alldata");
  if (url.includes("/categories"))cacheDel("static:categories", "alldata", "paginated:", "stats:");
  if (url.includes("/departments"))cacheDel("static:departments", "alldata");
  if (url.includes("/locations")) cacheDel("static:locations", "alldata");
  if (url.includes("/vendors"))   cacheDel("static:vendors", "alldata");
  if (url.includes("/users"))     cacheDel("static:users", "alldata", "stats:");
  if (url.includes("/all-data"))  cacheDel("alldata");
  next();
});
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Required fields missing" });
        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user || !user.active) return res.status(401).json({ error: "Account not found or inactive" });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Incorrect password" });
        // Set On Duty and clear lunch/location state on every login
        await user.update({
            status: "On Duty",
            lunchStatus: false,
            currentTicketId: null,
            currentLocation: null,
            forceLogout: false,
            loginTime: new Date(),
            idleAt: null,
            });
        res.json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/users/:id/status", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: ["id", "active", "role", "status", "forceLogout"]
        });
        res.json(user ? user.get({ plain: true }) : null);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/signup", async (req, res) => {
    try {
        const { email, password, ...rest } = req.body;
        const exists = await User.findOne({ where: { email: email.toLowerCase() } });
        if (exists) return res.status(409).json({ error: "Email exists" });
        const count = await User.count();
        const role = count === 0 ? "Admin" : (rest.role || "Agent");
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ ...rest, email: email.toLowerCase(), password: hashed, role });
        res.status(201).json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 4. USERS, ORGS, CATEGORIES, ATTRS (FULL CRUD) ───────────────────────────

app.get("/api/users", async (req, res) => {
    try { res.json((await User.findAll({ order: [['createdAt', 'ASC']] })).map(fmt)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/users/:id", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/users", async (req, res) => {
    try {
        const { email, password, ...rest } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
        const exists = await User.findOne({ where: { email: email.toLowerCase() } });
        if (exists) return res.status(409).json({ error: "Email already exists" });
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ ...rest, email: email.toLowerCase(), password: hashed });
        res.status(201).json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/users/:id/force-logout", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        const finalStatus = req.body.finalStatus || "Off Duty";
        const isLunchForce = (req.body.logoutReason || "").toLowerCase().includes("lunch");
        await user.update({
            forceLogout: true,
            status: finalStatus,
            logoutReason: req.body.logoutReason || "Force logged out by admin",
            lunchStatus: isLunchForce,
            currentTicketId: req.body.currentTicketId || null,
            currentLocation: req.body.currentLocation || user.currentLocation,
            idleAt: null,
        });
        res.json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/users/:id", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Validate status transitions and logout reason requirements
        const currentStatus = user.status;
        const newStatus = req.body.status;
        const logoutReason = req.body.logoutReason;

        // If status is being changed
        if (newStatus && newStatus !== currentStatus) {
            // Check if attempting to logout (change to Off Duty)
            if (newStatus === "Off Duty" && currentStatus !== "Off Duty" && !req.body.forceLogout && !req.body._isSystemUpdate) {
                if (currentStatus === "Idle") {
                    return res.status(403).json({ error: "Idle agents can only be set Off Duty by admin or by logging in again." });
                }
                if (!logoutReason || logoutReason.trim() === "") {
                    return res.status(400).json({
                        error: "Logout reason is required",
                        requiresReason: true,
                        reason: "You must provide a reason before logging out from " + currentStatus
                    });
                }
                req.body.logoutReason = logoutReason;
            }

            // ✅ Idle is not manually set - only server determines this
            // Prevent manual idle status setting
            if (newStatus === "Idle" && req.body.currentTicketId === undefined) {
                // Only allow Idle if coming from server auto-detection
                // For manual updates, reject Idle unless it's from system
                if (!req.body._isSystemUpdate) {
                    // This is a user trying to manually set Idle - keep previous status
                    req.body.status = currentStatus;
                }
            }

            // ✅ Validate On Lunch transition
            if (newStatus === "On Lunch") {
                // On Lunch can only be set during logout, not as a standalone status
                if (!logoutReason) {
                    req.body.logoutReason = "On Lunch Break";
                }
            }

            // ✅ Validate On Ticket transition
            if (newStatus === "On Ticket") {
                // currentTicketId is optional — agent may be going for a physical ticket
            }
        }

        // Hash password if provided
        if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
        if (req.body.email) req.body.email = req.body.email.toLowerCase();

        // Strip non-column keys to prevent Sequelize errors
        const { _isSystemUpdate, forceLogout: incomingForceLogout, ...updateData } = req.body;

        // Only allow forceLogout changes if explicitly passed as true (admin setting it)
        // or if this is the agent's own poll clearing it (forceLogout: false with _isSystemUpdate)
        if (incomingForceLogout === true) {
            updateData.forceLogout = true;
        } else if (incomingForceLogout === false && _isSystemUpdate) {
            updateData.forceLogout = false;
        }
        // If forceLogout not passed or passed as false without _isSystemUpdate, don't touch it
        // Update user
        await user.update(updateData);
        res.json(fmt(user));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        await user.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: Endpoint to validate logout requirements
app.post("/api/check-logout-requirements", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const currentStatus = user.status;

        // Check if user is already Off Duty
        if (currentStatus === "Off Duty") {
            return res.json({
                canLogout: true,
                requiresReason: false,
                message: "User already Off Duty"
            });
        }

        // All statuses except Off Duty require a reason to logout
        const requiresReason = currentStatus !== "Off Duty";

        res.json({
            canLogout: false, // Cannot logout until status is Off Duty
            requiresReason: requiresReason,
            currentStatus: currentStatus,
            message: `Must set status to Off Duty with reason before logging out. Current status: ${currentStatus}`
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/validate-sessions", async (req, res) => {
    try {
        // ✅ FIXED: Accept both 'emails' and 'activeUsers' parameters for compatibility
        const { emails, activeUsers } = req.body;
        const userEmails = emails || activeUsers || [];

        if (!Array.isArray(userEmails)) {
            return res.status(400).json({ error: "Emails array is required" });
        }

        if (userEmails.length === 0) {
            return res.json({
                active: [],
                inactive: []
            });
        }

        const users = await User.findAll({
            where: { email: { [Op.in]: userEmails } }
        });

        const validUsers = new Set(users.map(u => u.email));
        const inactive = userEmails.filter(e => !validUsers.has(e)); // emails no longer in DB

        res.json({
            active: users.map(u => u.email),
            inactive: inactive,
        });
    } catch (err) {
        console.error("Session validation error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/orgs", async (req, res) => {
    try {
        const hit = cacheGet("static:orgs");
        if (hit) return res.json(hit);
        const data = await Org.findAll();
        cacheSet("static:orgs", data, CACHE_TTL.static);
        res.json(data);
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/orgs", async (req, res) => {
    try { cacheDel("static:orgs", "alldata"); res.status(201).json(await Org.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/orgs/:id", async (req, res) => {
    try {
        cacheDel("static:orgs", "alldata");
        const org = await Org.findByPk(req.params.id);
        if (!org) return res.status(404).json({ error: "Org not found" });
        await org.update({
            domain: req.body.domain ?? org.domain,
            phone: req.body.phone ?? org.phone,
        });
        res.json(org);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/orgs/:id", async (req, res) => {
    try {
        const org = await Org.findByPk(req.params.id);
        if (org) {
            console.log(`[deleteOrg] Deleting org: "${org.name}" (id=${org.id})`);
            const depts = await Department.findAll({ where: { orgName: org.name } });
            console.log(`[deleteOrg] Found ${depts.length} departments:`, depts.map(d => ({ id: d.id, name: d.name, orgName: d.orgName })));
            for (const dept of depts) await dept.destroy();
            await org.destroy();
            console.log(`[deleteOrg] Done`);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(`[deleteOrg] ERROR:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ NEW: Vendor Endpoints
app.get("/api/vendors", async (req, res) => {
    try {
        const hit = cacheGet("static:vendors");
        if (hit) return res.json(hit);
        const vendors = await Vendor.findAll({ order: [['name', 'ASC']] });
        cacheSet("static:vendors", vendors, CACHE_TTL.static);
        res.json(vendors);
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/vendors", async (req, res) => {
    try {
        cacheDel("static:vendors", "alldata");
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ error: "Vendor name is required" });
        }
        res.status(201).json(await Vendor.create({
            name: req.body.name.trim(),
            email: req.body.email || "",
            phone: req.body.phone || "",
            address: req.body.address || ""
        }));
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/vendors/:id", async (req, res) => {
    try {
        cacheDel("static:vendors", "alldata");
        const vendor = await Vendor.findByPk(req.params.id);
        if (!vendor) return res.status(404).json({ error: "Vendor not found" });
        await vendor.update({
            name: req.body.name?.trim() || vendor.name,
            email: req.body.email ?? vendor.email,
            phone: req.body.phone ?? vendor.phone,
            address: req.body.address ?? vendor.address,
        });
        res.json(vendor);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/vendors/:id", async (req, res) => {
    try {
        cacheDel("static:vendors", "alldata");
        const vendor = await Vendor.findByPk(req.params.id);
        if (vendor) await vendor.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/categories", async (req, res) => {
    try {
        const hit = cacheGet("static:categories");
        if (hit) return res.json(hit);
        const cats = await Category.findAll({ order: [['name', 'ASC']] });
        const counts = await sequelize.query(
            `SELECT category, COUNT(*) as cnt FROM Tickets WHERE status != 'Bin' GROUP BY category`,
            { type: sequelize.QueryTypes.SELECT }
        );
        const countMap = Object.fromEntries(counts.map(r => [r.category, Number(r.cnt)]));
        const result = cats.map(c => ({ ...fmt(c), ticketCount: countMap[c.name] || 0 }));
        cacheSet("static:categories", result, CACHE_TTL.static);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/categories", async (req, res) => {
    try { cacheDel("static:categories", "alldata"); res.status(201).json(await Category.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put("/api/categories/:id", async (req, res) => {
    try {
        cacheDel("static:categories", "alldata", "paginated:");
        const cat = await Category.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ error: "Not found" });
        const oldName = cat.name;
        const newName = req.body.name?.trim();
        await cat.update(req.body);
        if (newName && newName !== oldName) {
            await Ticket.update({ category: newName }, { where: { category: oldName } });
        }
        res.json(fmt(cat));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/categories/:id", async (req, res) => {
    try {
        cacheDel("static:categories", "alldata", "paginated:");
        const cat = await Category.findByPk(req.params.id);
        if (cat) {
            let fallback = await Category.findOne({ where: { name: "Uncategorised" } });
            if (!fallback) {
                fallback = await Category.create({ name: "Uncategorised", color: "#94a3b8", subcategories: [] });
            }
            await Ticket.update({ category: "Uncategorised" }, { where: { category: cat.name } });
            await cat.destroy();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/satsangs", async (req, res) => {
    try { res.json(await Satsang.findAll({ order: [['date', 'DESC']] })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/satsangs", async (req, res) => {
    try { res.status(201).json(await Satsang.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/satsangs/:id", async (req, res) => {
    try {
        const s = await Satsang.findByPk(req.params.id);
        if (s) await s.update(req.body);
        res.json(fmt(s));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/satsangs/:id", async (req, res) => {
    try {
        const s = await Satsang.findByPk(req.params.id);
        if (s) await s.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/customAttrs", async (req, res) => {
    try { res.json(await CustomAttr.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/customAttrs", async (req, res) => {
    try { res.status(201).json(await CustomAttr.create(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put("/api/customAttrs/:id", async (req, res) => {
    try {
        const attr = await CustomAttr.findByPk(req.params.id);
        if (!attr) return res.status(404).json({ error: "Attribute not found" });
        await attr.update(req.body);
        res.json(fmt(attr));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/customAttrs/:id", async (req, res) => {
    try {
        const attr = await CustomAttr.findByPk(req.params.id);
        if (attr) await attr.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ Departments (Full CRUD — org-aware)
app.get("/api/departments", async (req, res) => {
    try {
        const hit = cacheGet("static:departments");
        if (hit) return res.json(hit);
        const departments = await Department.findAll({
            order: [['orgName', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']]
        });
        const result = departments.map(fmt);
        cacheSet("static:departments", result, CACHE_TTL.static);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/departments", async (req, res) => {
    try {
        const { name, orgName } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Department name is required" });
        }

        const org = (orgName || "General").trim();

        const existing = await Department.findOne({ where: { name: name.trim(), orgName: org } });
        if (existing) {
            return res.status(409).json({ error: `Department "${name.trim()}" already exists under ${org}` });
        }

        // Set sortOrder to end of this org's list
        const maxOrder = await Department.max('sortOrder', { where: { orgName: org } });
        const dept = await Department.create({
            name: name.trim(),
            orgName: org,
            sortOrder: (maxOrder || 0) + 1,
        });
        res.status(201).json(fmt(dept));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/departments/reorder — bulk update sortOrders (must come BEFORE /:id)
app.put("/api/departments/reorder", async (req, res) => {
    try {
        const { orders } = req.body; // [{ id, sortOrder }, ...]
        if (!Array.isArray(orders)) return res.status(400).json({ error: "orders array required" });
        await Promise.all(orders.map(o => Department.update(
            { sortOrder: o.sortOrder, ...(o.orgName ? { orgName: o.orgName } : {}) },
            { where: { id: o.id } }
        )));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/departments/:id — update name, orgName, or sortOrder
app.put("/api/departments/:id", async (req, res) => {
    try {
        const dept = await Department.findByPk(req.params.id);
        if (!dept) return res.status(404).json({ error: "Department not found" });
        const { name, orgName, sortOrder } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (orgName !== undefined) updates.orgName = orgName.trim();
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;
        await dept.update(updates);
        res.json(fmt(dept));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/departments/:id", async (req, res) => {
    try {
        const dept = await Department.findByPk(req.params.id);
        if (!dept) return res.status(404).json({ error: "Department not found" });
        await dept.destroy();
        res.json({ success: true, message: "Department deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ NEW: Locations (Full CRUD)
app.get("/api/locations", async (req, res) => {
    try {
        const hit = cacheGet("static:locations");
        if (hit) return res.json(hit);
        const locations = await Location.findAll({ order: [['name', 'ASC']] });
        const result = locations.map(fmt);
        cacheSet("static:locations", result, CACHE_TTL.static);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/locations", async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Location name is required" });
        }

        const existing = await Location.findOne({ where: { name: name.trim() } });
        if (existing) {
            return res.status(409).json({ error: "Location already exists" });
        }

        const loc = await Location.create({ name: name.trim() });
        res.status(201).json(fmt(loc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/locations/:id", async (req, res) => {
    try {
        const location = await Location.findByPk(req.params.id);
        if (!location) return res.status(404).json({ error: "Location not found" });
        const oldName = location.name;
        const newName = req.body.name?.trim() || location.name;
        await location.update({ name: newName });
        if (newName !== oldName) {
            await Ticket.update({ location: newName }, { where: { location: oldName } });
        }
        res.json(location);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/locations/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const loc = await Location.findByPk(id);
        if (!loc) {
            return res.status(404).json({ error: "Location not found" });
        }
        await Ticket.update({ location: "" }, { where: { location: loc.name } });
        await loc.destroy();
        res.json({ success: true, message: "Location deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── NOTIFICATIONS (Inbox — DB-backed per user) ─────────────────────────────

// GET /api/notifications?userId=<id>
// Returns all notifications for a user newest first (personal inbox + activity feed)
app.get("/api/notifications", async (req, res) => {
    try {
        const { userId } = req.query;
        if (userId == null || userId === "") return res.status(400).json({ error: "userId query param required" });

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const items = await Notification.findAll({
            where: {
                userId: parseInt(userId, 10),
                createdAt: { [Op.gte]: oneDayAgo }
            },
            order: [["createdAt", "DESC"]],
            limit: 300,
        });
        res.json(items.map(fmt));
    } catch (err) {
        console.error("GET /api/notifications error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications
// Two modes:
//   Single:  { userId, type, title, ... }         — one row
//   Bulk:    { recipientIds:[1,2,3], type, ... }  — one row per recipient, one request
app.post("/api/notifications", async (req, res) => {
    try {
        const {
            userId, recipientIds,
            type, title, message,
            ticketId, ticketSummary, requestId,
            fromUser, fromUserId, toAgent, reason,
            status, resolved, from,
            broadcastIcon, broadcastType,
            read = false, alerted = false,
            createdAt,
        } = req.body;

        if (!type) return res.status(400).json({ error: "type is required" });
        if (!title) return res.status(400).json({ error: "title is required" });
        if (!message) return res.status(400).json({ error: "message is required" });

        const base = {
            type, title, message,
            ticketId: ticketId || null,
            ticketSummary: ticketSummary || null,
            requestId: requestId || null,
            fromUser: fromUser || null,
            fromUserId: fromUserId ? parseInt(fromUserId, 10) : null,
            toAgent: toAgent || null,
            reason: reason || null,
            status: status || null,
            resolved: resolved || null,
            from: from || null,
            broadcastIcon: broadcastIcon || null,
            broadcastType: broadcastType || null,
            read,
            alerted,
            ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
        };

        // Bulk fan-out — one DB bulkCreate instead of N separate requests
        if (Array.isArray(recipientIds) && recipientIds.length > 0) {
            const rows = recipientIds.map(uid => ({ ...base, userId: parseInt(uid, 10) }));
            await Notification.bulkCreate(rows);
            return res.status(201).json({ success: true, count: rows.length });
        }

        // Single recipient — userId can be 0 (global), explicit null check required since 0 is falsy
        if (userId == null) return res.status(400).json({ error: "userId or recipientIds is required" });
        const notif = await Notification.create({ ...base, userId: parseInt(userId, 10) });
        res.status(201).json(fmt(notif));
    } catch (err) {
        console.error("POST /api/notifications error:", err.message, err.errors?.map(e => e.message));
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/notifications/:id
// Update a notification (mark read, alerted, resolved, etc.)
app.put("/api/notifications/:id", async (req, res) => {
    try {
        const notif = await Notification.findByPk(req.params.id);
        if (!notif) return res.status(404).json({ error: "Notification not found" });

        const { read, alerted, resolved, status } = req.body;
        const updates = {};
        if (read !== undefined) updates.read = read;
        if (alerted !== undefined) updates.alerted = alerted;
        if (resolved !== undefined) updates.resolved = resolved;
        if (status !== undefined) updates.status = status;

        await notif.update(updates);

        // If resolving a forward_request, resolve all other pending ones for same ticket
        if (resolved && notif.type === "forward_request" && notif.ticketId) {
            await Notification.update(
                { resolved, read: true, alerted: true },
                { where: { type: "forward_request", ticketId: notif.ticketId, resolved: null, id: { [Op.ne]: notif.id } } }
            );
            // Push SSE to all admins so their popups dismiss instantly
            const affected = await Notification.findAll({
                where: { type: "forward_request", ticketId: notif.ticketId }
            });
            affected.forEach(n => pushSSE(n.userId, { event: "forward_resolved", ticketId: notif.ticketId, resolved }));
        }

        res.json(fmt(notif));
    } catch (err) {
        console.error("PUT /api/notifications/:id error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/notifications/:id  (optional cleanup)
app.delete("/api/notifications/:id", async (req, res) => {
    try {
        const notif = await Notification.findByPk(req.params.id);
        if (notif) await notif.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/saved-reports", async (req, res) => {
  try { res.json(await SavedReport.findAll({ order: [["createdAt", "DESC"]] })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/saved-reports", async (req, res) => {
  try { res.status(201).json(await SavedReport.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/saved-reports/:id", async (req, res) => {
  try {
    const r = await SavedReport.findByPk(req.params.id);
    if (r) await r.destroy();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─── 5. TICKETS (FULL LOGIC) ─────────────────────────────────────────────────

app.get("/api/tickets", async (req, res) => {
    try {
        const tickets = await Ticket.findAll({ order: [['createdAt', 'DESC']] });
        res.json(tickets.map(fmt));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/tickets", async (req, res) => {
    try {
        if (!req.body.summary || !req.body.summary.trim()) {
            return res.status(400).json({ error: "Summary is required" });
        }
        if (!req.body.org || !req.body.org.trim()) {
            return res.status(400).json({ error: "Organisation is required" });
        }
        // Webcast tickets require satsangType and location
        if (req.body.category === "Webcast") {
            if (!req.body.satsangType || !String(req.body.satsangType).trim()) {
                return res.status(400).json({ error: "Satsang Type is required for Webcast tickets" });
            }
            if (!req.body.location || !String(req.body.location).trim()) {
                return res.status(400).json({ error: "Location is required for Webcast tickets" });
            }
        }

        // Generate next TKT-XXXX id
        const [maxRow] = await sequelize.query(
            `SELECT MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)) as maxNum FROM Tickets WHERE id LIKE 'TKT-%'`,
            { type: sequelize.QueryTypes.SELECT }
        );
        let nextIdNum = (maxRow?.maxNum || 1000) + 1;
        let ticketId = `TKT-${String(nextIdNum).padStart(4, "0")}`;

        // ✅ STRICT WHITELIST — only pass fields the Ticket model actually has.
        const ticketData = {
            id: ticketId,
            summary: req.body.summary.trim(),
            org: req.body.org.trim(),
        };

        // Validate and sanitize each field
        if (req.body.description !== undefined) ticketData.description = req.body.description || "";
        if (req.body.department !== undefined) ticketData.department = req.body.department || "";
        if (req.body.contact !== undefined) ticketData.contact = req.body.contact || "";
        if (req.body.reportedBy !== undefined) ticketData.reportedBy = req.body.reportedBy || "";
        if (req.body.priority !== undefined) ticketData.priority = req.body.priority || "Medium";
        if (req.body.category !== undefined) ticketData.category = req.body.category || "";
        if (req.body.status !== undefined) ticketData.status = req.body.status || "Open";
        if (req.body.satsangType !== undefined) ticketData.satsangType = req.body.satsangType || "";
        if (req.body.location !== undefined) ticketData.location = req.body.location || "";
        if (req.body.dueDate !== undefined) ticketData.dueDate = req.body.dueDate || null;
        if (req.body.image !== undefined) ticketData.image = req.body.image || null;
        if (req.body.satsangId !== undefined) ticketData.satsangId = req.body.satsangId || null;

        // Handle boolean isWebcast — automatically true for Webcast category
        if (req.body.category === "Webcast") {
            ticketData.isWebcast = true;
        } else if (req.body.isWebcast !== undefined) {
            ticketData.isWebcast = req.body.isWebcast === true || req.body.isWebcast === "true";
        }

        // Handle arrays - ensure they are arrays
        if (req.body.assignees !== undefined) {
            ticketData.assignees = Array.isArray(req.body.assignees) ? req.body.assignees : [];
        }
        if (req.body.cc !== undefined) {
            ticketData.cc = Array.isArray(req.body.cc) ? req.body.cc : [];
        }
        if (req.body.timeline !== undefined) {
            ticketData.timeline = Array.isArray(req.body.timeline) ? req.body.timeline : [];
        }
        if (req.body.comments !== undefined) {
            ticketData.comments = Array.isArray(req.body.comments) ? req.body.comments : [];
        }

        // Handle JSON objects
        if (req.body.customAttrs !== undefined) {
            if (typeof req.body.customAttrs === 'object' && !Array.isArray(req.body.customAttrs)) {
                ticketData.customAttrs = req.body.customAttrs || {};
            } else {
                ticketData.customAttrs = {};
            }
        }
        if (req.body.vendor !== undefined) {
            if (typeof req.body.vendor === 'object' && !Array.isArray(req.body.vendor)) {
                ticketData.vendor = req.body.vendor || null;
            } else {
                ticketData.vendor = null;
            }
        }

        const assignees = Array.isArray(ticketData.assignees) ? ticketData.assignees : [];

        if (assignees.length <= 1) {
            // 0 or 1 assignee — original behavior
            const ticket = await Ticket.create(ticketData);
            return res.status(201).json(fmt(ticket));
        }

        // Multiple assignees — one ticket per assignee
        // Re-fetch latest ticket ID to avoid collision with parallel requests
        const [maxRow2] = await sequelize.query(
            `SELECT MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)) as maxNum FROM Tickets WHERE id LIKE 'TKT-%'`,
            { type: sequelize.QueryTypes.SELECT }
        );
        let counter = (maxRow2?.maxNum || 1000) + 1;

        const createdTickets = [];
        for (const assignee of assignees) {
            let tid = `TKT-${String(counter).padStart(4, "0")}`;
            while (await Ticket.findByPk(tid)) {
                counter++;
                tid = `TKT-${String(counter).padStart(4, "0")}`;
            }
            const t = await Ticket.create({ ...ticketData, id: tid, assignees: [assignee] });
            createdTickets.push(fmt(t));
            counter++;
        }
        return res.status(201).json(createdTickets);
    } catch (err) {
        console.error("Ticket creation error:", err.message, err.errors);
        res.status(500).json({ error: err.message || "Failed to create ticket" });
    }
});

app.put("/api/tickets/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });
        const updateData = { ...req.body };
        // Auto-set isWebcast when category is updated to Webcast
        if (updateData.category === "Webcast") updateData.isWebcast = true;
        if (updateData.status === "Closed" && !ticket.closedAt && !updateData.closedAt) updateData.closedAt = new Date();
        if (updateData.status && updateData.status !== "Closed") updateData.closedAt = null;
        await ticket.update(updateData);
        res.json(fmt(ticket));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/tickets/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (ticket) await ticket.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/tickets", async (req, res) => {
    try {
        const count = await Ticket.destroy({ where: {}, truncate: false });
        res.json({ success: true, deleted: count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/stats/agents", async (req, res) => {
    try {
        const hit = cacheGet("stats:agents");
        if (hit) return res.json(hit);

        // Fetch all non-Bin tickets with assignees — use application-side aggregation
        // to avoid JSON_TABLE compatibility issues across MySQL versions
        const allTickets = await Ticket.findAll({
            where: { status: { [Op.ne]: "Bin" } },
            attributes: ["assignees", "status"],
            raw: true,
        });

        const assignedMap = {};
        const closedMap = {};
        const openMap = {};

        for (const t of allTickets) {
            let assignees = t.assignees;
            if (typeof assignees === "string") {
                try { assignees = JSON.parse(assignees); } catch { assignees = []; }
            }
            if (!Array.isArray(assignees)) continue;
            for (const a of assignees) {
                const name = a?.name;
                if (!name) continue;
                assignedMap[name] = (assignedMap[name] || 0) + 1;
                if (t.status === "Closed") closedMap[name] = (closedMap[name] || 0) + 1;
                if (t.status === "Open")   openMap[name]   = (openMap[name]   || 0) + 1;
            }
        }

        const result = { assigned: assignedMap, closed: closedMap, open: openMap };
        cacheSet("stats:agents", result, CACHE_TTL.stats);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/stats/dashboard", async (req, res) => {
    try {
        const org      = req.query.org      || "";
        const dateFrom = req.query.dateFrom || "";
        const dateTo   = req.query.dateTo   || "";
        const cacheKey = `stats:dashboard:${org}:${dateFrom}:${dateTo}`;
        const hit = cacheGet(cacheKey);
        if (hit) return res.json(hit);

        const orgClause  = org ? `AND t.org = ${sequelize.escape(org)}` : "";
        const dateFromNorm = dateFrom ? (dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00") : "";
        const dateToNorm   = dateTo   ? (dateTo.includes("T")   ? dateTo   : dateTo   + "T23:59:59") : "";
        const dateClause = dateFromNorm
            ? `AND t.createdAt >= ${sequelize.escape(dateFromNorm)}${dateToNorm ? ` AND t.createdAt <= ${sequelize.escape(dateToNorm)}` : ""}`
            : "";
        const closedDateClause = dateFromNorm
            ? `AND t.closedAt >= ${sequelize.escape(dateFromNorm)}${dateToNorm ? ` AND t.closedAt <= ${sequelize.escape(dateToNorm)}` : ""}`
            : "";

        const [byStatus, priority, category, daily, totals, unassignedRows, reopenedRows, closingUsersRows, assignedUsersRows] = await Promise.all([
            sequelize.query(
                `SELECT status, COUNT(*) as cnt FROM Tickets t
                 WHERE t.status != 'Bin' ${orgClause} ${dateClause} GROUP BY status`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            sequelize.query(
                `SELECT priority, COUNT(*) as cnt FROM Tickets t
                 WHERE t.status != 'Bin' ${orgClause} ${dateClause} GROUP BY priority`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            sequelize.query(
                `SELECT category, COUNT(*) as cnt FROM Tickets t
                 WHERE t.status != 'Bin' ${orgClause} ${dateClause}
                 GROUP BY category ORDER BY cnt DESC LIMIT 20`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            sequelize.query(
                `SELECT DATE(createdAt) as day, COUNT(*) as cnt FROM Tickets t
                 WHERE t.status != 'Bin' ${orgClause}
                 AND t.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY day ORDER BY day`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            sequelize.query(
                `SELECT COUNT(*) as total,
                        SUM(CASE WHEN status='Open'     THEN 1 ELSE 0 END) as open,
                        SUM(CASE WHEN status='Closed'   THEN 1 ELSE 0 END) as closed,
                        SUM(CASE WHEN priority='Critical' AND status='Open' THEN 1 ELSE 0 END) as critical
                 FROM Tickets t WHERE t.status != 'Bin' ${orgClause} ${dateClause}`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            sequelize.query(
                `SELECT COUNT(*) as cnt FROM Tickets t
                 WHERE t.status = 'Open'
                 AND (t.assignees IS NULL OR JSON_LENGTH(t.assignees) = 0)
                 ${orgClause} ${dateClause}`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            // Reopened: tickets where a timeline event has action='Reopened' within IST date range
            sequelize.query(
                dateFromNorm
                ? `SELECT COUNT(DISTINCT t.id) as cnt FROM Tickets t
                   JOIN JSON_TABLE(t.timeline, '$[*]' COLUMNS(
                     action VARCHAR(255) PATH '$.action',
                     evt_date VARCHAR(50) PATH '$.date'
                   )) jt ON TRUE
                   WHERE t.status != 'Bin' ${orgClause}
                   AND jt.action = 'Reopened'
                   AND CONVERT_TZ(
                     CASE
                       WHEN jt.evt_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
                         THEN STR_TO_DATE(LEFT(jt.evt_date, 19), '%Y-%m-%dT%H:%i:%s')
                       WHEN jt.evt_date LIKE '__/__/____,%'
                         THEN STR_TO_DATE(LEFT(jt.evt_date, 19), '%d/%m/%Y, %H:%i:%s')
                       ELSE NULL
                     END,
                     '+00:00', '+05:30'
                   ) >= ${sequelize.escape(dateFromNorm)}`
                : `SELECT COUNT(*) as cnt FROM Tickets t
                   WHERE t.status != 'Bin' ${orgClause}
                   AND JSON_SEARCH(t.timeline, 'one', 'Reopened', NULL, '$[*].action') IS NOT NULL`,
                { type: sequelize.QueryTypes.SELECT }
            ),
            // Closures by person: fetch closed tickets, aggregate in app to avoid JSON_TABLE compat issues
            Ticket.findAll({
                where: {
                    status: "Closed",
                    ...(org ? { org } : {}),
                    ...(dateFromNorm ? { closedAt: { [Op.gte]: new Date(dateFromNorm), ...(dateToNorm ? { [Op.lte]: new Date(dateToNorm) } : {}) } } : {}),
                },
                attributes: ["assignees"],
                raw: true,
            }),
            // Assignments by person: all non-Bin tickets filtered by createdAt, split by open/closed
            Ticket.findAll({
                where: {
                    status: { [Op.ne]: "Bin" },
                    ...(org ? { org } : {}),
                    ...(dateFromNorm ? { createdAt: { [Op.gte]: new Date(dateFromNorm), ...(dateToNorm ? { [Op.lte]: new Date(dateToNorm) } : {}) } } : {}),
                },
                attributes: ["assignees", "status"],
                raw: true,
            }),
        ]);

        const r = totals[0] || {};
        // closingUsersRows is now an array of ticket rows with assignees — aggregate in app
        const closingUsersMap = {};
        for (const t of closingUsersRows) {
            let assignees = t.assignees;
            if (typeof assignees === "string") { try { assignees = JSON.parse(assignees); } catch { assignees = []; } }
            if (!Array.isArray(assignees)) continue;
            for (const a of assignees) {
                if (a?.name) closingUsersMap[a.name] = (closingUsersMap[a.name] || 0) + 1;
            }
        }
        const assignedUsersMap = {};
        for (const t of assignedUsersRows) {
            let assignees = t.assignees;
            if (typeof assignees === "string") { try { assignees = JSON.parse(assignees); } catch { assignees = []; } }
            if (!Array.isArray(assignees)) continue;
            for (const a of assignees) {
                if (a?.name) {
                    if (!assignedUsersMap[a.name]) assignedUsersMap[a.name] = { open: 0, closed: 0 };
                    if (t.status === "Closed") assignedUsersMap[a.name].closed++;
                    else assignedUsersMap[a.name].open++;
                }
            }
        }
        const result = {
            byStatus,
            priority,
            category,
            daily,
            total:    Number(r.total)    || 0,
            critical: Number(r.critical) || 0,
            counts: {
                total:      Number(r.total)    || 0,
                open:       Number(r.open)     || 0,
                closed:     Number(r.closed)   || 0,
                critical:   Number(r.critical) || 0,
                reopened:   Number(reopenedRows[0]?.cnt) || 0,
                unassigned: Number(unassignedRows[0]?.cnt) || 0,
            },
            closingUsers: closingUsersMap,
            assignedUsers: assignedUsersMap,
        };
        cacheSet(cacheKey, result, CACHE_TTL.stats);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/tickets/paginated", async (req, res) => {
    try {
        const cacheKey = "paginated:" + JSON.stringify(req.query);
        const hit = cacheGet(cacheKey);
        if (hit) return res.json(hit);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search    = req.query.search    || "";
        const status    = req.query.status    || "";
        const priority  = req.query.priority  || "";
        const org       = req.query.org       || "";
        const category  = req.query.category  || "";
        const assignee  = req.query.assignee  || "";
        const dateFrom  = req.query.dateFrom  || "";
        const dateTo    = req.query.dateTo    || "";
        const dateField = ["createdAt","closedAt","updatedAt","dueDate"].includes(req.query.dateField)
                          ? req.query.dateField : "createdAt";

        const where = {};
        if (status)   { where.status   = status;   }
        else          { where.status   = { [Op.ne]: "Bin" }; }
        if (priority) where.priority = priority;
        if (org)      where.org      = org;
        if (category) where.category = category;
        if (search) {
            where[Op.or] = [
                { summary: { [Op.like]: `%${search}%` } },
                { id:      { [Op.like]: `%${search}%` } },
                { org:     { [Op.like]: `%${search}%` } },
            ];
        }
        if (assignee) {
            where[Op.and] = [
                sequelize.literal(`assignees LIKE ${sequelize.escape('%' + assignee + '%')}`)
            ];
        }
        if (dateFrom || dateTo) {
            where[dateField] = {};
            if (dateFrom) where[dateField][Op.gte] = new Date(dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00");
            if (dateTo)   where[dateField][Op.lte] = new Date(dateTo.includes("T")   ? dateTo   : dateTo   + "T23:59:59");
        }

        // Reopened filter — filter by reopen event date when dateFrom is provided
        if (req.query.reopened === "1") {
            delete where[dateField];
            if (dateFrom) {
                const escapedDate = sequelize.escape(dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00");
                where[Op.and] = [...(where[Op.and] || []),
                    sequelize.literal(`EXISTS (
                        SELECT 1 FROM JSON_TABLE(timeline, '$[*]' COLUMNS(
                            action VARCHAR(255) PATH '$.action',
                            evt_date VARCHAR(50) PATH '$.date'
                        )) jt
                        WHERE jt.action = 'Reopened'
                        AND CONVERT_TZ(
                            CASE
                                WHEN jt.evt_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
                                    THEN STR_TO_DATE(LEFT(jt.evt_date, 19), '%Y-%m-%dT%H:%i:%s')
                                WHEN jt.evt_date LIKE '__/__/____,%'
                                    THEN STR_TO_DATE(LEFT(jt.evt_date, 19), '%d/%m/%Y, %H:%i:%s')
                                ELSE NULL
                            END,
                            '+00:00', '+05:30'
                        ) >= ${escapedDate}
                    )`)
                ];
            } else {
                where[Op.and] = [...(where[Op.and] || []),
                    sequelize.literal(`JSON_SEARCH(timeline, 'one', 'Reopened', NULL, '$[*].action') IS NOT NULL`)
                ];
            }
        }

        // Past due filter
        if (req.query.pastdue === "1") {
            where.dueDate = { [Op.lt]: new Date() };
            if (!where.status || where.status === "Open") where.status = "Open";
        }

        // Unassigned filter
        if (req.query.unassigned === "1") {
            where[Op.and] = [...(where[Op.and] || []),
                sequelize.literal(`JSON_LENGTH(assignees) = 0`)
            ];
        }

        // Has vendor filter
        if (req.query.hasVendor === "1") {
            where[Op.and] = [...(where[Op.and] || []),
                sequelize.literal(`vendor IS NOT NULL AND vendor != 'null' AND vendor != ''`)
            ];
        }

        const ALLOWED_SORT = ["createdAt","updatedAt","summary","org","priority","category","status","id"];
        const sortField = ALLOWED_SORT.includes(req.query.sortField) ? req.query.sortField : "createdAt";
        const sortDir = req.query.sortDir === "asc" ? "ASC" : "DESC";

        const { count, rows } = await Ticket.findAndCountAll({
            where,
            attributes: { exclude: ["image", "comments"] },
            order: [["createdAt", sortDir]],
            limit,
            offset,
        });

        const result = {
            tickets: rows.map(fmt),
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
        cacheSet(cacheKey, result, CACHE_TTL.paginated);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REPORT ENDPOINT — lean columns, single query, longer cache ───────────────
app.get("/api/tickets/report", async (req, res) => {
    try {
        const cacheKey = "report:" + JSON.stringify(req.query);
        const hit = cacheGet(cacheKey);
        if (hit) return res.json(hit);

        const status    = req.query.status    || "";
        const priority  = req.query.priority  || "";
        const org       = req.query.org       || "";
        const category  = req.query.category  || "";
        const assignee  = req.query.assignee  || "";
        const dateFrom  = req.query.dateFrom  || "";
        const dateTo    = req.query.dateTo    || "";
        const dateField = ["createdAt","closedAt","updatedAt","dueDate"].includes(req.query.dateField)
                          ? req.query.dateField : "createdAt";

        const where = {};
        if (status)   { where.status = status; }
        else          { where.status = { [Op.ne]: "Bin" }; }
        if (priority) where.priority = priority;
        if (org)      where.org      = org;
        if (category) where.category = category;
        if (assignee) {
            where[Op.and] = [
                sequelize.literal(`assignees LIKE ${sequelize.escape('%' + assignee + '%')}`)
            ];
        }
        if (dateFrom || dateTo) {
            where[dateField] = {};
            if (dateFrom) where[dateField][Op.gte] = new Date(dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00");
            if (dateTo)   where[dateField][Op.lte] = new Date(dateTo.includes("T")   ? dateTo   : dateTo   + "T23:59:59");
        }

        // Only fetch columns reports actually display — skip image/timeline/comments/description/cc/customAttrs/vendor
        const rows = await Ticket.findAll({
            where,
            attributes: [
                "id","summary","status","priority","category","org",
                "department","contact","reportedBy","assignees","location",
                "createdAt","updatedAt","dueDate","closedAt","timeline",
            ],
            order: [["createdAt", "DESC"]],
            raw: true,
        });

        const result = { tickets: rows, total: rows.length };
        cacheSet(cacheKey, result, CACHE_TTL.report);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/tickets/counts", async (req, res) => {
    try {
        const hit = cacheGet("counts");
        if (hit) return res.json(hit);
        const [byStatus] = await Promise.all([
            sequelize.query(
                `SELECT status, COUNT(*) as cnt FROM Tickets WHERE status != 'Bin' GROUP BY status`,
                { type: sequelize.QueryTypes.SELECT }
            )
        ]);
        const total = byStatus.reduce((sum, r) => sum + parseInt(r.cnt), 0);
        const critical = await Ticket.count({ where: { priority: "Critical", status: "Open" } });
        const reopened = (await sequelize.query(`SELECT COUNT(*) as cnt FROM Tickets WHERE JSON_SEARCH(timeline, 'one', 'Reopened', NULL, '$[*].action') IS NOT NULL AND status != 'Bin'`, { type: sequelize.QueryTypes.SELECT }))[0]?.cnt || 0;
        const unassigned = (await sequelize.query(`SELECT COUNT(*) as cnt FROM Tickets WHERE status = 'Open' AND (assignees IS NULL OR JSON_LENGTH(assignees) = 0)`, { type: sequelize.QueryTypes.SELECT }))[0]?.cnt || 0;
        const result = { byStatus, total, critical, reopened, unassigned };
        cacheSet("counts", result, CACHE_TTL.counts);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(fmt(ticket));
  } catch (err) { res.status(500).json({ error: err.message }); }
})

// /api/webcasts/* — redirected to /api/tickets (webcasts are now stored in Tickets table)
app.get("/api/webcasts", async (req, res) => {
    try {
        const webcasts = await Ticket.findAll({ where: { isWebcast: true }, order: [['createdAt', 'DESC']] });
        res.json(webcasts.map(fmt));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put("/api/webcasts/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });
        const updateData = { ...req.body };
        if (updateData.status === "Closed" && !ticket.closedAt && !updateData.closedAt) updateData.closedAt = new Date();
        if (updateData.status && updateData.status !== "Closed") updateData.closedAt = null;
        await ticket.update(updateData);
        res.json(fmt(ticket));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete("/api/webcasts/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (ticket) await ticket.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 6. PROJECTS (FULL LOGIC) ────────────────────────────────────────────────

app.get("/api/projects", async (req, res) => {
    try {
        const projects = await Project.findAll({ order: [['createdAt', 'DESC']] });
        res.json(projects.map(fmt));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/projects", async (req, res) => {
    try {
        // ✅ Validate required fields FIRST
        if (!req.body.title || !req.body.title.trim()) {
            return res.status(400).json({ error: "Project title is required" });
        }
        if (!req.body.org || !req.body.org.trim()) {
            return res.status(400).json({ error: "Organisation is required" });
        }

        // Generate project ID (PRJ-1001, PRJ-1002, etc.)
        // Find ALL projects and filter for 4-digit sequential IDs only
        const allProjects = await Project.findAll({
            where: { id: { [Op.like]: "PRJ-%" } },
            order: [['createdAt', 'DESC']]
        });

        // ✅ Filter projects to only 4-digit sequential IDs (PRJ-XXXX)
        const sequentialProjects = allProjects.filter(p => {
            const parts = p.id.split("-");
            return parts.length === 2 && parts[1].length === 4 && /^\d{4}$/.test(parts[1]);
        });

        let nextIdNum = 1001;
        if (sequentialProjects.length > 0) {
            const lastNum = parseInt(sequentialProjects[0].id.split("-")[1], 10);
            if (!isNaN(lastNum)) nextIdNum = lastNum + 1;
        }

        const projectId = `PRJ-${String(nextIdNum).padStart(4, "0")}`;

        // ✅ Clean data - remove created/updated if sent (Sequelize handles these)
        const projectData = {
            ...req.body,
            id: projectId,
            title: req.body.title.trim(),
            org: req.body.org.trim()
        };
        delete projectData.created;
        delete projectData.updated;
        delete projectData.createdAt;
        delete projectData.updatedAt;

        const project = await Project.create(projectData);
        res.status(201).json(fmt(project));
    } catch (err) {
        console.error("Project creation error:", err.message);
        res.status(500).json({ error: err.message || "Failed to create project" });
    }
});

app.put("/api/projects/:id", async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) return res.status(404).json({ error: "Project not found" });
        await project.update(req.body);
        res.json(fmt(project));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/projects/:id", async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (project) await project.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 7. ALL-DATA ENDPOINT ────────────────────────────────────────────────────

app.get("/api/all-data", async (req, res) => {
    try {
        const hit = cacheGet("alldata");
        if (hit) return res.json(hit);
        const [users, orgs, categoriesRaw, customAttrs, satsangs, departments, locations, vendors, projects, catCounts] = await Promise.all([
        User.findAll(), Org.findAll(), Category.findAll({ order: [['name', 'ASC']] }), CustomAttr.findAll(),
        Satsang.findAll(), Department.findAll(), Location.findAll(), Vendor.findAll(),
        Project.findAll({ order: [['createdAt', 'DESC']] }),
        sequelize.query(`SELECT category, COUNT(*) as cnt FROM Tickets WHERE status != 'Bin' GROUP BY category`, { type: sequelize.QueryTypes.SELECT })
        ]);
        const catCountMap = Object.fromEntries(catCounts.map(r => [r.category, Number(r.cnt)]));
        const categories = categoriesRaw.map(c => ({ ...fmt(c), ticketCount: catCountMap[c.name] || 0 }));
        const result = {
            users: users.map(fmt), orgs: orgs.map(fmt), categories,
            customAttrs: customAttrs.map(fmt), satsangs: satsangs.map(fmt),
            departments: departments.map(fmt), locations: locations.map(fmt), vendors: vendors.map(fmt),
            projects: projects.map(fmt),
        };
        cacheSet("alldata", result, CACHE_TTL.alldata);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Selective Import: Merges data into a specific table (CSV or JSON)
app.post("/api/import/:table", async (req, res) => {
    try {
        const { table } = req.params;
        // Ensure data is an array even if a single object is sent
        const rawData = Array.isArray(req.body) ? req.body : [req.body];

        const models = {
            tickets: Ticket,
            satsangs: Satsang,
            orgs: Org,
            categories: Category,
            customAttrs: CustomAttr,
            users: User,
            projects: Project,
            departments: Department,
            locations: Location,
            vendors: Vendor
        };

        const Model = models[table];
        if (!Model) return res.status(400).json({ error: "Invalid table specified" });

        // Get all valid column names for this specific database table
        const validColumns = Object.keys(Model.rawAttributes);

        // ─── TICKETS, WEBCASTS & PROJECTS IMPORT LOGIC ────────────
        if (table === "tickets" || table === "projects") {

            let prefix = "TKT";
            if (table === "projects") prefix = "PRJ";

            const lastRecord = await Model.findOne({
                where: { id: { [Op.like]: `${prefix}-%` } },
                order: [['createdAt', 'DESC']]
            });

            let nextIdNum = 1001;
            if (lastRecord && lastRecord.id) {
                const lastNum = parseInt(lastRecord.id.split("-")[1], 10);
                if (!isNaN(lastNum)) nextIdNum = lastNum + 1;
            } else {
                nextIdNum = 1001 + await Model.count();
            }

            for (let item of rawData) {
                // 🛑 1. Bulletproof Header Skip: Check if any value in the row is "Summary" or "Ticket #"
                const rowValues = Object.values(item);
                if (rowValues.includes("Summary") || rowValues.includes("Ticket #")) {
                    continue; // Skip the header row completely
                }

                // 2. Strict Filter: Keep ONLY valid columns. Strip empty strings and old IDs.
                const cleanItem = {};
                for (const key in item) {
                    if (validColumns.includes(key) && key !== 'id') {
                        cleanItem[key] = item[key] ?? null;
                    }
                }

                // Skip completely empty rows
                if (Object.keys(cleanItem).length === 0) continue;

                // Webcast rows: enforce isWebcast=true and default satsangType + location
                if (cleanItem.category === "Webcast" || cleanItem.isWebcast === true || cleanItem.isWebcast === "true") {
                    cleanItem.isWebcast = true;
                    if (!cleanItem.satsangType || !String(cleanItem.satsangType).trim()) {
                        cleanItem.satsangType = "Satsang With GuruDev";
                    }
                    if (!cleanItem.location || !String(cleanItem.location).trim()) {
                        cleanItem.location = "Amphitheater";
                    }
                }

                // 3. Force Organization to VVMVP (overrides whatever the CSV says)
                //cleanItem.org = "VVMVP";

                // 4. Clean up JSON fields if they come in as strings from CSV
                const jsonFields = ['assignees', 'cc', 'customAttrs', 'timeline', 'comments', 'vendor'];
                jsonFields.forEach(field => {
                    if (typeof cleanItem[field] === 'string') {
                        try { cleanItem[field] = JSON.parse(cleanItem[field]); }
                        catch (e) { cleanItem[field] = []; }
                    }
                });

                // 5. Generate the next ID in the sequence
                // Ensure JSON fields are stored as strings if DB expects strings
                ['assignees','cc','customAttrs','timeline','comments'].forEach(f => {
                    if (cleanItem[f] !== undefined && typeof cleanItem[f] !== 'string') {
                        cleanItem[f] = JSON.stringify(cleanItem[f]);
                    }
                });
                // Ensure assignees have id field
                if (cleanItem.assignees) {
                    const parsed = typeof cleanItem.assignees === 'string' ? JSON.parse(cleanItem.assignees) : cleanItem.assignees;
                    const fixed = parsed.map(a => ({ ...a, id: a.id || a.name }));
                    cleanItem.assignees = JSON.stringify(fixed);
                }
                // 5. Generate the next ID in the sequence
                cleanItem.id = `${prefix}-${String(nextIdNum).padStart(4, "0")}`;
                nextIdNum++;

                // 6. Create the record! Missing fields get ignored.
                await Model.create(cleanItem);
                await sequelize.query(
                    `UPDATE \`${Model.getTableName()}\` SET createdAt=?, updatedAt=? WHERE id=?`,
                    { replacements: [
                        item.createdAt ? new Date(item.createdAt) : new Date(),
                        item.updatedAt ? new Date(item.updatedAt) : new Date(),
                        cleanItem.id
                    ]}
                );
            }
        }
        // ─── IMPORT LOGIC FOR USERS, ORGS, CATEGORIES, SATSANGS, DEPARTMENTS, LOCATIONS ────────────
        else {
            const matchField = table === 'users' ? 'email' : 'name';

            for (let item of rawData) {
                // 🛑 Bulletproof Header Skip for other tables
                const rowValues = Object.values(item);
                if (rowValues.includes("Name") || rowValues.includes("Email")) {
                    continue;
                }

                // 1. Strict Filter: Keep ONLY valid columns. Strip empty strings and old IDs.
                const cleanItem = {};
                for (const key in item) {
                    if (validColumns.includes(key) && !['id', 'createdAt', 'updatedAt'].includes(key)) {
                        cleanItem[key] = item[key];
                    }
                }

                // Skip completely empty rows or if the critical matching field is missing
                if (Object.keys(cleanItem).length === 0 || !cleanItem[matchField]) continue;

                // Hash passwords for imported users if needed
                if (table === 'users' && cleanItem.password && !cleanItem.password.startsWith("$2")) {
                    cleanItem.password = await bcrypt.hash(cleanItem.password, 10);
                }

                // Parse JSON options for custom attributes
                if (typeof cleanItem.options === 'string') {
                    try { cleanItem.options = JSON.parse(cleanItem.options); }
                    catch (e) { cleanItem.options = []; }
                }

                // Merge: Find by unique field, then update or create
                const [record, created] = await Model.findOrCreate({
                    where: { [matchField]: cleanItem[matchField] },
                    defaults: cleanItem
                });

                if (!created) {
                    await record.update(cleanItem);
                }
            }
        }

        res.json({ success: true, message: `Successfully imported data into ${table}` });
    } catch (err) {
        console.error("Import Error:", err);
        res.status(500).json({ error: "Import failed: " + err.message });
    }
});

// Original "Full Bundle" Import (kept for backward compatibility with full backups)
app.post("/api/all-data/import", async (req, res) => {
    try {
        const { users = [], orgs = [], categories = [], customAttrs = [], tickets = [], satsangs = [], projects = [], departments = [], locations = [] } = req.body;

        const merge = async (model, data, field) => {
            for (const item of data) {
                const { createdAt, updatedAt, ...c } = item;
                const [r, created] = await model.findOrCreate({ where: { [field]: c[field] }, defaults: c });
                if (!created) await r.update(c);
            }
        };

        if (orgs.length) await merge(Org, orgs, 'name');
        if (categories.length) await merge(Category, categories, 'name');
        if (customAttrs.length) await merge(CustomAttr, customAttrs, 'name');
        if (tickets.length) await merge(Ticket, tickets, 'id');
        if (satsangs.length) await merge(Satsang, satsangs, 'name');
        if (projects.length) await merge(Project, projects, 'id');
        if (departments.length) await merge(Department, departments, 'name');
        if (locations.length) await merge(Location, locations, 'name');

        res.json({ success: true, message: "Full database merge complete" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── NOTIFICATION CLEANUP JOB (runs once on startup, then every 24h) ────────
async function cleanupOldNotifications() {
    try {
        // 1. Bell (activity) rows: delete after 24h — these are daily-only
        const activityCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deletedActivity = await Notification.destroy({
            where: {
                type: "activity",
                createdAt: { [Op.lt]: activityCutoff }
            }
        });

        // 2. Inbox rows: keep forward_request items until they are resolved.
        //    Delete all other inbox items (responses, assignments) after 30 days.
        //    Delete resolved forward_request items after 30 days too.
        const inboxCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deletedInbox = await Notification.destroy({
            where: {
                type: { [Op.notIn]: ["activity"] },
                createdAt: { [Op.lt]: inboxCutoff },
                [Op.or]: [
                    { type: { [Op.notIn]: ["forward_request"] } },
                    { resolved: { [Op.not]: null } }
                ]
            }
        });

        if (deletedActivity > 0 || deletedInbox > 0)
            console.log(`Cleaned up ${deletedInbox} old inbox items, ${deletedActivity} activity entries`);
    } catch (err) {
        console.error("Notification cleanup error:", err.message);
    }
}

// ─── HEALTH ───────────────────────────────────────────────────────────────────
let serverReady = false;
app.get("/", (req, res) => res.json({ msg: "🚀 DeskFlow API v1", ready: serverReady }));
app.get("/api/ready", (req, res) => {
  if (serverReady) res.json({ ready: true });
  else res.status(503).json({ ready: false });
});

// ── SSE: real-time push to browser clients ──
const sseClients = new Map();

app.get("/api/sse/:userId", (req, res) => {
  const uid = String(req.params.userId);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.set(uid, res);
  req.on("close", () => sseClients.delete(uid));
});

function pushSSE(userId, data) {
  const client = sseClients.get(String(userId));
  if (client) client.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function migrateWebcastsOnStartup() {
    try {
        // Ensure Webcast category exists
        await Category.findOrCreate({
            where: { name: 'Webcast' },
            defaults: { name: 'Webcast', color: '#f97316' }
        });

        // Backfill: any ticket with isWebcast=true should have category='Webcast'
        await Ticket.update(
            { category: 'Webcast' },
            { where: { isWebcast: true, category: { [Op.ne]: 'Webcast' } } }
        );
        // Any ticket with category='Webcast' should have isWebcast=true
        await Ticket.update(
            { isWebcast: true },
            { where: { category: 'Webcast', isWebcast: false } }
        );
        console.log("✅ Webcast ticket sync complete");
    } catch (err) {
        console.error('❌ Webcast sync error:', err.message);
    }
}

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: true }).then(async () => {
    console.log("✅ MySQL Synced & Connected");
    try {
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_status      ON Tickets(status)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_priority    ON Tickets(priority)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_org         ON Tickets(org)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_category    ON Tickets(category)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_createdAt   ON Tickets(createdAt)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_closedAt    ON Tickets(closedAt)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_tkt_status_cre  ON Tickets(status, createdAt)`);
        console.log("✅ Ticket indexes ensured");
    } catch (e) { console.warn("⚠️ Index creation warning:", e.message); }

    // Data Migration: Normalize user statuses
    try {
        // Normalize legacy status values to current ones
        await User.update({ status: "On Duty" }, { where: { status: { [Op.in]: ["Active", "Logged-In", "Logged-in"] } } });
        await User.update({ status: "Off Duty" }, { where: { status: { [Op.in]: ["Not Active", "Logged-Out", "Logged-out", "Inactive"] } } });
        // On Duty / Off Duty / On Ticket / On Lunch are valid — leave them as-is
        console.log("📊 User status data migrated successfully");
    } catch (migErr) {
        console.error("⚠️ Status migration warning:", migErr.message);
    }

    // Data Migration: Extend ScheduledTasks frequency ENUM
    try {
        await sequelize.query(
            `ALTER TABLE ScheduledTasks MODIFY COLUMN frequency ENUM('daily','weekly','biweekly','monthly','quarterly','halfyearly','yearly') NOT NULL DEFAULT 'weekly'`
        );
        console.log("✅ ScheduledTasks frequency ENUM migrated");
    } catch (e) { console.warn("⚠️ frequency ENUM migration:", e.message); }
    
    // Data Migration: Backfill orgName = "General" for old departments missing it
    try {
        const [deptCount] = await sequelize.query(
            `UPDATE Departments SET orgName = 'General' WHERE orgName IS NULL OR orgName = ''`
        );
        if (deptCount > 0) console.log(`📊 Backfilled orgName for ${deptCount} departments`);
    } catch (migErr) {
        console.error("⚠️ Department orgName backfill warning:", migErr.message);
    }

    // ✅ RUN AUTOMATIC WEBCAST MIGRATION
    await migrateWebcastsOnStartup();

    // 🗑️ Clean up old notifications (>30 days) on startup
    await cleanupOldNotifications();
    // Schedule daily cleanup
    setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);

    // Run scheduled tasks every minute
    runScheduledTasks();
    setInterval(runScheduledTasks, 60 * 1000);

    // ✅ NO HARDCODED DEPARTMENTS & LOCATIONS - Only add via frontend!
    // Departments and Locations must be created manually through Settings tabs


// --- Scheduled Tasks CRUD ---

// IST = UTC+5:30. All task times are entered as IST in the UI.
// On GCP (UTC), new Date() local methods would misfire. Convert explicitly.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function nowIST() { return new Date(Date.now() + IST_OFFSET_MS); }
function istToUtc(d) { return new Date(d.getTime() - IST_OFFSET_MS); }

function calcNextRun(task, fromDate) {
    const hhmm = (task.timeOfDay || "09:00").split(":");
    const hh = parseInt(hhmm[0]); const mm = parseInt(hhmm[1]);
    // Work in IST throughout, convert to UTC only at return
    const nowUTC = fromDate ? new Date(fromDate) : new Date();
    const now = new Date(nowUTC.getTime() + IST_OFFSET_MS); // now in IST
    const next = new Date(now);
    next.setSeconds(0); next.setMilliseconds(0);
    if (task.frequency === "daily") {
        next.setHours(hh, mm, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
    } else if (task.frequency === "weekly") {
        const target = task.dayOfWeek != null ? task.dayOfWeek : 1;
        let days = (7 + target - next.getDay()) % 7;
        next.setDate(next.getDate() + days);
        next.setHours(hh, mm, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 7);
    } else if (task.frequency === "biweekly") {
        const targets = (task.daysOfWeek && task.daysOfWeek.length === 2) ? task.daysOfWeek : [1, 4];
        let best = null;
        for (const target of targets) {
            let days = (7 + target - now.getDay()) % 7;
            const candidate = new Date(now);
            candidate.setDate(candidate.getDate() + days);
            candidate.setHours(hh, mm, 0, 0);
            if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
            if (!best || candidate < best) best = candidate;
        }
        return istToUtc(best);
    } else if (task.frequency === "monthly") {
        const dom = task.dayOfMonth != null ? task.dayOfMonth : 1;
        next.setDate(dom); next.setHours(hh, mm, 0, 0);
        if (next <= now) { next.setMonth(next.getMonth() + 1); next.setDate(dom); }
    } else if (task.frequency === "quarterly") {
        const dom = task.dayOfMonth != null ? task.dayOfMonth : 1;
        next.setDate(dom); next.setHours(hh, mm, 0, 0);
        if (next <= now) { next.setMonth(next.getMonth() + 3); next.setDate(dom); }
    } else if (task.frequency === "halfyearly") {
        const dom = task.dayOfMonth != null ? task.dayOfMonth : 1;
        next.setDate(dom); next.setHours(hh, mm, 0, 0);
        if (next <= now) { next.setMonth(next.getMonth() + 6); next.setDate(dom); }
    } else if (task.frequency === "yearly") {
        const dom = task.dayOfMonth != null ? task.dayOfMonth : 1;
        next.setDate(dom); next.setHours(hh, mm, 0, 0);
        if (next <= now) { next.setFullYear(next.getFullYear() + 1); next.setDate(dom); }
    }
    return istToUtc(next);
}

app.get("/api/scheduled-tasks", async (req, res) => {
    try { res.json((await ScheduledTask.findAll({ order: [["createdAt","DESC"]] })).map(fmt)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/scheduled-tasks", async (req, res) => {
    try {
        const task = await ScheduledTask.create(req.body);
        await task.update({ nextRunAt: calcNextRun(task) });
        res.status(201).json(fmt(task));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/scheduled-tasks/:id", async (req, res) => {
    try {
        const task = await ScheduledTask.findByPk(req.params.id);
        if (!task) return res.status(404).json({ error: "Not found" });
        await task.update(req.body);
        await task.update({ nextRunAt: calcNextRun(task) });
        res.json(fmt(task));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/scheduled-tasks/:id", async (req, res) => {
    try {
        const task = await ScheduledTask.findByPk(req.params.id);
        if (task) await task.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function runScheduledTasks() {
    try {
        const now = new Date();
        const due = await ScheduledTask.findAll({ where: { active: true, nextRunAt: { [Op.lte]: now } } });
        if (!due.length) return;
        const [maxRow] = await sequelize.query(
            "SELECT MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)) as maxNum FROM Tickets WHERE id LIKE 'TKT-%'",
            { type: sequelize.QueryTypes.SELECT }
        );
        let counter = (maxRow && maxRow.maxNum ? maxRow.maxNum : 1000) + 1;
        for (const task of due) {
            try {
                const todayIST = new Date(new Date().getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
                if (task.startDate && todayIST < task.startDate) { await task.update({ nextRunAt: calcNextRun(task, now) }); continue; }
                if (task.endDate && todayIST > task.endDate) { await task.update({ active: false, nextRunAt: null }); continue; }
                const taskAssignees = Array.isArray(task.assignees) && task.assignees.length > 0 ? task.assignees : [null];
                for (const assignee of taskAssignees) {
                    let tid = "TKT-" + String(counter).padStart(4, "0");
                    while (await Ticket.findByPk(tid)) { counter++; tid = "TKT-" + String(counter).padStart(4, "0"); }
                    await Ticket.create({                        id: tid,
                        summary: task.summary,
                        description: task.description || "",
                        org: task.org || "",
                        department: task.department || "",
                        reportedBy: task.reportedBy || "Scheduled Task",
                        assignees: assignee ? [assignee] : [],
                        priority: task.priority || "Standard",
                        category: task.category || "",
                        status: "Open",
                        location: task.location || "",
                        timeline: [{ action: "Created", by: "Scheduled Task", date: now.toISOString(), note: "Auto-created by scheduled task: " + task.name }],
                        comments: [],
                        customAttrs: {},
                    });
                    counter++;
                }
                cacheDel("paginated:", "counts", "stats:", "static:categories");
                await task.update({ lastRunAt: now, nextRunAt: calcNextRun(task, now) });
                console.log("Scheduled task [" + task.name + "] created ticket " + tid);
            } catch (taskErr) {
                console.error("Scheduled task [" + task.name + "] failed:", taskErr.message);
            }
        }
    } catch (err) {
        console.error("Scheduled task runner error:", err.message);
    }
}

    app.listen(PORT, () => {
      serverReady = true;
      console.log(`🚀 DeskFlow API → http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ Sync Error. Check if MySQL service is running.");
    console.error(err.message);
});