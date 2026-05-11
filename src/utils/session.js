// ─── SESSION HELPERS (12-hour localStorage session) ───────────────────────────

export const SESSION_KEY = "deskflow_session";
const SESSION_TTL = 12 * 60 * 60 * 1000;

export function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiresAt: Date.now() + SESSION_TTL }));
  } catch (_) {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch (_) {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}
