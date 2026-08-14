const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function formatDate(sqliteDatetime) {
  // SQLite gives "YYYY-MM-DD HH:MM:SS" (UTC). Make it Date-parseable, then format.
  const iso = sqliteDatetime.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateFormatter.format(d);
}

export default function TaskCard({ task, columns, onEdit, onDelete, onMove, dragHandlers }) {
  return (
    <div
      className="task"
      data-priority={task.priority}
      draggable
      onDragStart={(e) => dragHandlers.onDragStart(e, task)}
      onDragEnd={dragHandlers.onDragEnd}
      tabIndex={0}
    >
      <div className="task__top">
        <div className="task__title">{task.title}</div>
        <div className="task__actions">
          <button className="btn-icon" title="Edit task" onClick={() => onEdit(task)} aria-label="Edit task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            className="btn-icon"
            title="Delete task"
            onClick={() => onDelete(task)}
            aria-label="Delete task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      {task.description ? <div className="task__desc">{task.description}</div> : null}

      <div className="task__footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="priority-pill" data-priority={task.priority}>
            {task.priority}
          </span>
          <span className="task__date">{formatDate(task.created_at)}</span>
        </div>
        <select
          className="move-select"
          value={task.column_id}
          onChange={(e) => onMove(task, Number(e.target.value))}
          aria-label="Move task to column"
          title="Move to column"
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
