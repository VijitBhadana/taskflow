const express = require("express");
const cors = require("cors");

const boardsRouter = require("./routes/boards");
const columnsRouter = require("./routes/columns");
const tasksRouter = require("./routes/tasks");

function createApp(db) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/boards", boardsRouter(db));
  app.use("/api/columns", columnsRouter(db));
  app.use("/api/tasks", tasksRouter(db));

  // 404 handler for unknown API routes
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  // Centralized error handler — anything thrown/passed via next(err) lands here
  // instead of crashing the process or leaking a stack trace to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}

module.exports = { createApp };
