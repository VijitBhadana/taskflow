const express = require("express");

module.exports = function columnsRouter(db) {
  const router = express.Router();

  // POST /api/columns - create a column on a board
  router.post("/", (req, res) => {
    const boardId = Number(req.body.board_id);
    const name = (req.body.name || "").trim();

    if (!boardId) return res.status(400).json({ error: "board_id is required." });
    if (!name) return res.status(400).json({ error: "Column name is required." });

    const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(boardId);
    if (!board) return res.status(404).json({ error: "Board not found." });

    const maxPos = db
      .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM columns WHERE board_id = ?")
      .get(boardId).m;

    const result = db
      .prepare("INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)")
      .run(boardId, name, maxPos + 1);

    const column = db.prepare("SELECT * FROM columns WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(column);
  });

  return router;
};
