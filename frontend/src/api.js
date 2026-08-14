// Small fetch wrapper — centralizes the "/api" base and turns non-2xx
// responses into thrown Errors with a readable message, so callers can
// just try/catch instead of checking res.ok everywhere.

const BASE = "/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkErr) {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (e.g. unexpected server error) — fall through
  }

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status}).`);
  }
  return body;
}

export const api = {
  getBoard: (id) => request(`/boards/${id}`),
  getTaskCounts: (boardId) => request(`/boards/${boardId}/task-counts`),
  createTask: (data) => request(`/tasks`, { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  moveTask: (id, columnId) =>
    request(`/tasks/${id}/move`, { method: "PATCH", body: JSON.stringify({ column_id: columnId }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
