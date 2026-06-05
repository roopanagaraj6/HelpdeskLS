import axios from "axios";
import { AUTH_API, USERS_API, VALIDATE_SESSIONS_API, BASE_URL } from "../constants/api";
import { saveSession, clearSession } from "../utils/session";

/**
 * Login, logout, and signup handlers.
 */
export function useAuthHandlers(ctx) {
  const {
    authForm, setAuthForm,
    currentUser, setCurrentUser, setAuthError, setAuthMessage,
    loadData,
    tickets, users, locations,
    setUsers,
    setCustomAlert,
    setShowConfirmation,
    setView,
  } = ctx;

  // ─── AUTH HANDLERS (v1) ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");

    try {
      // 1. Post to the login endpoint with credentials
      const response = await axios.post(AUTH_API, {
        email: authForm.email,
        password: authForm.password
      });

      const u = response.data;

      // 2. Check if user is deactivated
      if (!u.active) {
        setAuthError("Your account has been deactivated. Please contact an administrator.");
        return;
      }

      // 3. Set status to On Duty immediately on login
      const onDutyUser = {
        ...u,
        status: "On Duty",
        currentTicketId: null,
        currentLocation: null,
        lunchStatus: false,
        loginTime: new Date().toISOString(),
      };
      try {
        await axios.put(`${USERS_API}/${u.id}`, onDutyUser);
      } catch (e) { console.error("Failed to set On Duty on login"); }

      // 4. Cache in session and local state
      saveSession(onDutyUser);
      setCurrentUser(onDutyUser);
      setShowConfirmation({ show: false });
      setView("dashboard");
      localStorage.setItem("deskflow_view", "dashboard");

      // 5. Show welcome popup with On Duty status
      setCustomAlert({
        show: true,
        message: `✅ Welcome ${u.name}! You are now On Duty`,
        type: "success"
      });

      // 6. Reload all data
      await loadData(onDutyUser);

    } catch (err) {
      console.error("Login error:", err);
      setAuthError(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = async () => {
    try {
      const currentStatus = currentUser?.status || "Off Duty";

      // Off Duty or Idle: go straight to logout (no dialog needed)
      if (currentStatus === "Off Duty" || currentStatus === "Idle") {
        await axios.put(`${USERS_API}/${currentUser.id}`, { status: "Off Duty", idleAt: null, _isSystemUpdate: true });
        clearSession();
        setCurrentUser(null);
        return;
      }

      // ✅ ENHANCED: Show comprehensive logout form with conditional fields
      // - Always show: Location
      // - On Lunch: Show "On Lunch" status confirmation (no reason needed)
      // - On Ticket/On Duty: Show reason dropdown + ticket dropdown
      // - Idle: Show reason dropdown + location field

      const fields = [];

      // ✅ If On Lunch Break: Show simple confirmation, no reason needed
      if (currentStatus === "On Lunch") {
        // User on lunch just needs to mark Off Duty when logging out
        fields.push({
          name: "lunchConfirm",
          label: "📝 Note",
          type: "readonly",
          value: "You're currently on lunch. Logging out will mark you as Off Duty.",
          required: false
        });
      } else {
        // ✅ Always add reason for logout when not on lunch
        fields.push({
          name: "logoutReason",
          label: "📝 Reason for logout",
          type: "select",
          options: [
            { value: "End of shift", label: "End of shift" },
            { value: "Going for ticket", label: "Going for ticket" },
            { value: "Going for lunch", label: "Going for lunch" }
          ],
          value: "",
          required: true
        });
        
        // Add ticket dropdown shown only when reason is "Going for ticket"
        fields.push({
            name: "ticketId",
            label: "🎫 Select Ticket",
            type: "searchable-select",
            options: (Array.isArray(tickets) ? tickets : [])
              .filter(t => (t.status === "Open") && t.assignees?.some(a => String(a.id) === String(currentUser.id)))
              .map(t => ({ value: t.id, label: `${t.id} — ${t.summary}` })),
            value: "",
            required: false
          });
        }

        // ✅ Add location field (will be conditionally shown only when reason is "Going for ticket")
        fields.push({
          name: "location",
          label: "📍 Location",
          type: "select",
          options: locations.map(loc => ({ value: loc.name, label: loc.name })),
          value: currentUser?.currentLocation || "",
          required: false
        });

      setShowConfirmation({
        show: true,
        title: currentStatus === "On Lunch" ? "Logout from Lunch Break" : "Set Status to Off Duty",
        confirmLabel: "Mark Off Duty & Logout",
        message: `Current status: ${currentStatus}. Mark yourself as Off Duty and logout.`,
        fields: fields,
        onConfirm: async (data) => {
          try {
            // ✅ Validation: Reason required only when NOT on lunch
            if (currentStatus !== "On Lunch" && (!data.logoutReason || data.logoutReason.trim() === "")) {
              setCustomAlert({ show: true, message: "Please provide a reason for logout", type: "error" });
              return;
            }

            // ✅ Validation: Location only required when reason is "Going for ticket"
            if (data.logoutReason === "Going for ticket" && (!data.location || data.location.trim() === "")) {
              setCustomAlert({ show: true, message: "Please select your location for ticket", type: "error" });
              return;
            }

            if (data.logoutReason === "Going for ticket" && (!data.ticketId || data.ticketId.trim() === "")) {
              setCustomAlert({ show: true, message: "Please select the ticket you are going for", type: "error" });
              return;
            }

            // Build update object
            const isGoingForTicket = data.logoutReason === "Going for ticket";
            const up = {
              status: isGoingForTicket ? "On Ticket" : "Off Duty",
              currentLocation: data.location ? data.location : currentUser.currentLocation,
              currentTicketId: isGoingForTicket ? (data.ticketId || data.location || "field") : null,
              lunchStatus: false,
              _isSystemUpdate: true
            };

            // ✅ Only add logoutReason if not on lunch
            if (currentStatus !== "On Lunch") {
              up.logoutReason = data.logoutReason;
            }

            // Send to server
            const res = await axios.put(`${USERS_API}/${currentUser.id}`, up);

            if (res.status === 200 || res.status === 201) {
              clearSession();
              setCurrentUser(null);
              setProfileOpen(false);
              setShowConfirmation({ show: false });
              setCustomAlert({ show: true, message: isGoingForTicket ? "✅ Logged out — status set to On Ticket" : "Logged out successfully", type: "success" });
            }
          } catch (err) {
            if (err.response?.status === 400) {
              setCustomAlert({
                show: true,
                message: err.response.data.reason || "Cannot change status: " + err.response.data.error,
                type: "error"
              });
            } else {
              setCustomAlert({ show: true, message: "Failed to update status", type: "error" });
            }
          }
        },
        onCancel: () => setShowConfirmation({ show: false })
      });

    } catch (err) {
      console.error("Logout check failed:", err);
      setCustomAlert({ show: true, message: "Logout error: " + (err.response?.data?.error || err.message), type: "error" });
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setAuthError(""); setAuthMessage("");
    if (authForm.password !== authForm.confirm) return setAuthError("Passwords do not match");
    if (!authForm.firstName || !authForm.lastName || !authForm.email || !authForm.password) return setAuthError("Please fill required fields");
    try {
      // Use already-loaded users state — no extra API call needed.
      // Avoids the GET /api/users 404 entirely.
      const isFirstUser = users.length === 0;

      const payload = {
        // Bug fix 2: don't pre-assign an id — let the backend assign it.
        // Some APIs reject records that come with a client-generated id.
        name: `${authForm.firstName} ${authForm.middleName ? authForm.middleName + " " : ""}${authForm.lastName}`.trim(),
        email: authForm.email,
        phone: `${authForm.countryCode} ${authForm.phone}`.trim(),
        password: authForm.password,
        role: isFirstUser ? "Admin" : "Viewer",
        active: true,
        status: "Off Duty",
        confirmed: true,
      };

      await axios.post(USERS_API, payload);
      setAuthMessage(`Account created! You are registered as ${payload.role}. Please log in.`);
      await loadData();

      // Bug fix 3: reset authForm to a clean login state (keep email pre-filled,
      // clear password fields) so the user can log in immediately after the flip.
      setAuthForm(prev => ({
        ...prev,
        password: "",
        confirm: "",
        firstName: "",
        middleName: "",
        lastName: "",
        phone: "",
      }));
      setTimeout(() => setIsLogin(true), 1500);
    } catch (err) {
      // Bug fix 4: always surface the real error so it's debuggable.
      setAuthError(err?.message || "Registration failed. Please try again.");
    }
  };


  return { handleLogin,handleLogout,handleSignup, };
}
