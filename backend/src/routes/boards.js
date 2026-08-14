const express = require("express");

module.exports = function boardsRouter(db) {
  const router = express.Router();

  // GET /api/boards - list all boards (id + name), for a board picker
  router.get("/", (req, res) => {
    const boards = db.prepare("SELECT id, name, created_at FROM boards ORDER BY id").all();
    res.json(boards);
  });

  // POST /api/boards - create a board
  router.post("/", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Board name is required." });
    }
    const result = db.prepare("INSERT INTO boards (name) VALUES (?)").run(name);
    const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(board);
  });

  // GET /api/boards/:id - full board with columns + tasks nested
  router.get("/:id", (req, res) => {
    const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(req.params.id);
    if (!board) return res.status(404).json({ error: "Board not found." });

    const columns = db
      .prepare("SELECT * FROM columns WHERE board_id = ? ORDER BY position")
      .all(board.id);

    const taskStmt = db.prepare("SELECT * FROM tasks WHERE column_id = ? ORDER BY created_at DESC");
    const columnsWithTasks = columns.map((col) => ({
      ...col,
      tasks: taskStmt.all(col.id),
    }));

    res.json({ ...board, columns: columnsWithTasks });
  });

  // GET /api/boards/:id/task-counts
  // Query 1 (required "not just get all rows"): count of tasks per column on a board.
  router.get("/:id/task-counts", (req, res) => {
    const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(req.params.id);
    if (!board) return res.status(404).json({ error: "Board not found." });

    const rows = db
      .prepare(
        `SELECT c.id AS column_id, c.name AS column_name, COUNT(t.id) AS task_count
         FROM columns c
         LEFT JOIN tasks t ON t.column_id = c.id
         WHERE c.board_id = ?
         GROUP BY c.id
         ORDER BY c.position`
      )
      .all(board.id);

    res.json(rows);
  });

  // GET /api/boards/:id/tasks?priority=High&search=foo
  // Query 2 (required): tasks with a given priority, newest first.
  // Also supports an optional title search (nice-to-have from the spec).
  router.get("/:id/tasks", (req, res) => {
    const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(req.params.id);
    if (!board) return res.status(404).json({ error: "Board not found." });

    const { priority, search } = req.query;
    let sql = `SELECT t.* FROM tasks t
               JOIN columns c ON t.column_id = c.id
               WHERE c.board_id = ?`;
    const params = [board.id];

    if (priority) {
      sql += " AND t.priority = ?";
      params.push(priority);
    }
    if (search) {
      sql += " AND t.title LIKE ?";
      params.push(`%${search}%`);
    }
    sql += " ORDER BY t.created_at DESC";

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  return router;
};
