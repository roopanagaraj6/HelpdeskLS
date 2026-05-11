import { useRef, useEffect } from "react";
import axios from "axios";
import { USERS_API } from "../constants/api";
/**
 * Agent status, lunch break, and activity-tracking handlers.
 */
export function useProfileHandlers(ctx) {
  const {
    currentUser, setCurrentUser,
    users, setUsers,
    setCustomAlert,
    setShowLocationModal,
    setShowConfirmation, setConfirmationConfig,
    agentUser, setAgentUser,
  } = ctx;

  // ─── PROFILE HANDLERS (v1) ─────────────────────────────────────────────────
  const saveProfile = async () => {
    try {
      const up = { ...currentUser, phone: profileForm.phone, name: profileForm.name };
      await axios.put(`${USERS_API}/${currentUser.id}`, up);
      saveSession(up); setCurrentUser(up); setUsers(users.map(u => u.id === currentUser.id ? up : u)); setEditProfileOpen(false);
    } catch (err) { setCustomAlert({ show: true, message: "Failed to save profile", type: "error" }); }
  };
  const updateStatusDirect = async (st) => {
    try {
      const up = { ...currentUser, status: st };
      await axios.put(`${USERS_API}/${currentUser.id}`, up);
      saveSession(up); setCurrentUser(up); setUsers(users.map(u => u.id === currentUser.id ? up : u));
    } catch (err) { setCustomAlert({ show: true, message: "Failed to update status", type: "error" }); }
  };

  // ✅ NEW: Handle lunch break toggle
  const handleLunchBreak = async () => {
    try {
      const isCurrentlyOnLunch = currentUser.status === "On Lunch";
      const newStatus = isCurrentlyOnLunch ? "On Duty" : "On Lunch";

      const up = {
        ...currentUser,
        status: newStatus,
        // ✅ If going to lunch, clear ticket and location tracking
        // If returning from lunch, restore to On Duty
        currentTicketId: isCurrentlyOnLunch ? currentUser.currentTicketId : null,
        currentLocation: isCurrentlyOnLunch ? currentUser.currentLocation : null
      };

      await axios.put(`${USERS_API}/${currentUser.id}`, up);
      saveSession(up);
      setCurrentUser(up);
      setUsers(users.map(u => u.id === currentUser.id ? up : u));

      const msg = newStatus === "On Lunch"
        ? "🍽️ You're now on lunch break"
        : "👤 You're back to on duty";
      setCustomAlert({ show: true, message: msg, type: "success" });
    } catch (err) {
      setCustomAlert({ show: true, message: "Failed to update status", type: "error" });
    }
  };

  // ✅ NEW: Log activity to session history
  const logActivity = async (action, details = {}) => {
    try {
      const activityLog = {
        userId: currentUser?.id,
        action: action, // "logout", "lunch_start", "lunch_end", "ticket_assigned", "location_updated"
        timestamp: new Date().toISOString(),
        details: {
          status: currentUser?.status,
          location: currentUser?.currentLocation,
          ticket: currentUser?.currentTicketId,
          ...details
        }
      };

      // Send to server for logging
      await axios.post(`${BASE_URL}/activity-logs`, activityLog);
      return activityLog;
    } catch (err) {
      console.error("Failed to log activity:", err);
      // Don't fail the entire operation if logging fails
    }
  };

  // ✅ NEW: Check idle status and flag user
  const checkAndMarkIdle = async () => {
    try {
      if (!currentUser) return;

      // User is idle if:
      // 1. Has assigned ticket
      // 2. Is logged in (On Duty / On Ticket)
      // 3. Location field is empty or not set

      const hasTicket = tickets.some(t =>
        t.assignees?.some(a => a.id === currentUser.id) &&
        (t.status === "Open" )
      );

      const isLoggedIn = currentUser.status === "On Duty" || currentUser.status === "On Ticket";
      const locationEmpty = !currentUser.currentLocation || currentUser.currentLocation.trim() === "";

      if (hasTicket && isLoggedIn && locationEmpty) {
        // Mark as Idle
        const up = {
          ...currentUser,
          status: "Idle",
          lastIdleCheck: new Date().toISOString()
        };

        await axios.put(`${USERS_API}/${currentUser.id}`, up);
        saveSession(up);
        setCurrentUser(up);
        setUsers(users.map(u => u.id === currentUser.id ? up : u));

        // Log the idle detection
        await logActivity("idle_detected", {
          reason: "Assigned ticket without location",
          ticketCount: tickets.filter(t => t.assignees?.some(a => a.id === currentUser.id)).length
        });
      }
    } catch (err) {
      console.error("Idle check error:", err);
    }
  };

  // ✅ NEW: Track session time
  const calculateSessionDuration = () => {
    if (!currentUser?.loginTime) return null;
    const loginTime = new Date(currentUser.loginTime);
    const now = new Date();
    const durationMs = now - loginTime;
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationHours = Math.floor(durationMinutes / 60);

    if (durationHours > 0) {
      return `${durationHours}h ${durationMinutes % 60}m`;
    }
    return `${durationMinutes}m`;
  };

  // ✅ NEW: Update location and ticket tracking
  const updateTracking = async () => {
    try {
      const up = {
        ...currentUser,
        currentTicketId: currentTicketId || null,
        currentLocation: currentLocation || null
      };
      await axios.put(`${USERS_API}/${currentUser.id}`, up);
      saveSession(up);
      setCurrentUser(up);
      setUsers(users.map(u => u.id === currentUser.id ? up : u));
      setCustomAlert({ show: true, message: "✅ Location and ticket updated", type: "success" });
    } catch (err) {
      setCustomAlert({ show: true, message: "Failed to update tracking", type: "error" });
    }
  };

  // ✅ NEW: Check and update idle status automatically
  const checkAndUpdateIdleStatus = async () => {
    // ✅ DISABLED: Idle is now only set manually when user has no ticket assigned
    // No auto-detection - user must explicitly set their status
  };

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const u = currentUserRef.current;
      if (!u || u.role === "Admin" || u.role === "Manager") return;

      const loginTime = u.loginTime ? new Date(u.loginTime) : null;
      if (!loginTime) return;
      const minutesElapsed = (new Date() - loginTime) / 60000;

      // Step 1: Set Idle after 15 min of On Duty — only once
      if (u.status === "On Duty" && minutesElapsed >= 5) {
        const idleUp = { ...u, status: "Idle", idleAt: new Date().toISOString(), _isSystemUpdate: true };
        try {
          await axios.put(`${USERS_API}/${u.id}`, idleUp);
          saveSession(idleUp);
          setCurrentUser(idleUp);
          setUsers(prev => prev.map(x => x.id === u.id ? idleUp : x));
          // Immediately auto-logout but keep status as Idle — admin/manager will set Off Duty later
          await axios.put(`${USERS_API}/${u.id}`, { forceLogout: true, _isSystemUpdate: true });
          clearSession();
          setCurrentUser(null);
          setCustomAlert({ show: true, message: "You have been logged out due to inactivity.", type: "error" });
        } catch (e) { console.error("Failed to set Idle / auto-logout", e); }
        return;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);



    return { updateStatusDirect,handleLunchBreak,updateTracking,calculateSessionDuration,saveProfile, };

}
