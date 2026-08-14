import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import Column from "./components/Column.jsx";
import TaskModal from "./components/TaskModal.jsx";

const BOARD_ID = 1; // Single-board app — out of scope to support multiple boards/teams (see README).

export default function App() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', task?, columnId? }
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(BOARD_ID);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const maxCount = useMemo(() => {
    if (!board) return 0;
    return Math.max(1, ...board.columns.map((c) => c.tasks.length));
  }, [board]);

  const visibleTasksByColumn = useMemo(() => {
    if (!board) return {};
    const q = search.trim().toLowerCase();
    const map = {};
    for (const col of board.columns) {
      map[col.id] = col.tasks.filter((t) => {
        const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
        const matchesSearch = !q || t.title.toLowerCase().includes(q);
        return matchesPriority && matchesSearch;
      });
    }
    return map;
  }, [board, priorityFilter, search]);

  // ----- Mutations (optimistic-ish: refetch board after each write) -----

  async function handleCreate(payload) {
    await api.createTask(payload);
    await loadBoard();
    setModal(null);
  }

  async function handleUpdate(taskId, payload) {
    await api.updateTask(taskId, payload);
    await loadBoard();
    setModal(null);
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await api.deleteTask(task.id);
      await loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMove(task, newColumnId) {
    if (task.column_id === newColumnId) return;
    // Optimistic update so drag-and-drop feels instant.
    setBoard((prev) => {
      if (!prev) return prev;
      const columns = prev.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== task.id) }));
      const target = columns.find((c) => c.id === newColumnId);
      target.tasks.unshift({ ...task, column_id: newColumnId });
      return { ...prev, columns };
    });
    try {
      await api.moveTask(task.id, newColumnId);
    } catch (err) {
      setError(err.message);
      await loadBoard(); // revert to server truth on failure
    }
  }

  // ----- Drag and drop -----
  const dragHandlers = {
    onDragStart: (e, task) => {
      setDragTaskId(task.id);
      e.dataTransfer.effectAllowed = "move";
      e.currentTarget.classList.add("is-dragging");
    },
    onDragEnd: (e) => {
      e.currentTarget.classList.remove("is-dragging");
      setDragTaskId(null);
      setDragOverColumn(null);
    },
  };

  function findTask(taskId) {
    for (const col of board.columns) {
      const t = col.tasks.find((t) => t.id === taskId);
      if (t) return t;
    }
    return null;
  }

  function handleDropColumn(columnId) {
    setDragOverColumn(null);
    if (dragTaskId == null) return;
    const task = findTask(dragTaskId);
    if (task) handleMove(task, columnId);
    setDragTaskId(null);
  }

  if (loading) {
    return (
      <div className="app">
        <div className="state-screen">
          <div className="spinner" />
          <div>Loading board…</div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="app">
        <div className="state-screen">
          <div>Couldn't load the board.</div>
          <button className="btn btn-ghost" onClick={loadBoard}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span className="brand__name">TaskFlow</span>
        </div>
        <div className="board-title">
          Board: <strong>{board.name}</strong>
        </div>

        <div className="topbar__spacer" />

        <div className="toolbar">
          <input
            className="input search-input"
            placeholder="Search tasks by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks by title"
          />
          <select
            className="select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="All">All priorities</option>
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => setModal({ mode: "create", columnId: board.columns[0]?.id })}
          >
            + New task
          </button>
        </div>
      </header>

      <div className="board-scroll">
        <div className="board">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              allColumns={board.columns}
              tasks={visibleTasksByColumn[col.id] || []}
              maxCount={maxCount}
              isDragOver={dragOverColumn === col.id}
              onDragOverColumn={setDragOverColumn}
              onDragLeaveColumn={(id) => setDragOverColumn((cur) => (cur === id ? null : cur))}
              onDropColumn={handleDropColumn}
              onAddTask={(columnId) => setModal({ mode: "create", columnId })}
              onEditTask={(task) => setModal({ mode: "edit", task })}
              onDeleteTask={handleDelete}
              onMoveTask={handleMove}
              dragHandlers={dragHandlers}
            />
          ))}
        </div>
      </div>

      {modal && (
        <TaskModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.task : { column_id: modal.columnId, priority: "Medium" }}
          columns={board.columns}
          onClose={() => setModal(null)}
          onSave={(payload) =>
            modal.mode === "create" ? handleCreate(payload) : handleUpdate(modal.task.id, payload)
          }
        />
      )}

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
