import { useEffect, useRef, useState } from "react";

const PRIORITIES = ["Low", "Medium", "High"];

export default function TaskModal({ mode, initial, columns, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [priority, setPriority] = useState(initial?.priority || "Medium");
  const [columnId, setColumnId] = useState(initial?.column_id || columns[0]?.id);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        column_id: columnId,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={mode === "create" ? "New task" : "Edit task"}>
        <div className="modal__header">
          <div className="modal__title">{mode === "create" ? "New task" : "Edit task"}</div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              ref={titleRef}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Write onboarding email"
              maxLength={200}
            />
          </div>

          <div className="field">
            <label htmlFor="task-desc">Description (optional)</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any extra detail worth capturing"
            />
          </div>

          <div className="field">
            <label>Priority</label>
            <div className="priority-choice">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  data-priority={p}
                  className={priority === p ? "active" : ""}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {columns.length > 1 && (
            <div className="field">
              <label htmlFor="task-column">Column</label>
              <select
                id="task-column"
                className="select"
                value={columnId}
                onChange={(e) => setColumnId(Number(e.target.value))}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error ? <div className="field-error">{error}</div> : null}

          <div className="modal__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create task" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
