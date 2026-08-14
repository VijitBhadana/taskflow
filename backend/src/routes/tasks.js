const express = require("express");

const VALID_PRIORITIES = ["Low", "Medium", "High"];

module.exports = function tasksRouter(db) {
  const router = express.Router();

  // POST /api/tasks - create a task
  router.post("/", (req, res) => {
    const columnId = Number(req.body.column_id);
    const title = (req.body.title || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const priority = req.body.priority || "Medium";

    if (!columnId) return res.status(400).json({ error: "column_id is required." });
    if (!title) return res.status(400).json({ error: "Title is required." });
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of ${VALID_PRIORITIES.join(", ")}.` });
    }

    const column = db.prepare("SELECT id FROM columns WHERE id = ?").get(columnId);
    if (!column) return res.status(404).json({ error: "Column not found." });

    const result = db
      .prepare(
        "INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)"
      )
      .run(columnId, title, description, priority);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(task);
  });

  // PUT /api/tasks/:id - edit title/description/priority
  router.put("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const description =
      req.body.description !== undefined
        ? req.body.description
          ? String(req.body.description).trim()
          : null
        : existing.description;
    const priority = req.body.priority !== undefined ? req.body.priority : existing.priority;

    if (!title) return res.status(400).json({ error: "Title is required." });
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of ${VALID_PRIORITIES.join(", ")}.` });
    }

    db.prepare("UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?").run(
      title,
      description,
      priority,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    res.json(updated);
  });

  // PATCH /api/tasks/:id/move - move a task to a different column (i.e. change its status)
  router.patch("/:id/move", (req, res) => {
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const columnId = Number(req.body.column_id);
    if (!columnId) return res.status(400).json({ error: "column_id is required." });

    const column = db.prepare("SELECT * FROM columns WHERE id = ?").get(columnId);
    if (!column) return res.status(404).json({ error: "Target column not found." });

    db.prepare("UPDATE tasks SET column_id = ? WHERE id = ?").run(columnId, req.params.id);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    res.json(updated);
  });

  // DELETE /api/tasks/:id
  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Task not found." });

    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.status(204).send();
  });

  return router;
};
