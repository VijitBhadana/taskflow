const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { createConnection } = require("../src/db");
const { createApp } = require("../src/app");
const { seed } = require("../src/seed");

// Each test run gets its own throwaway SQLite file so tests never touch the
// real dev database and can be run repeatedly/in parallel safely.
function freshApp() {
  const tmpFile = path.join(os.tmpdir(), `taskflow-test-${Date.now()}-${Math.random()}.db`);
  const db = createConnection(tmpFile);
  seed(db);
  const app = createApp(db);
  return { app, db, tmpFile };
}

function cleanup(tmpFile) {
  for (const ext of ["", "-wal", "-shm"]) {
    const f = tmpFile + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

// Minimal fetch-based request helper so we don't need supertest wired to a
// running server — we spin the app up on an ephemeral port per test.
async function withServer(app, fn) {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

test("creating a task with no title fails", async () => {
  const { app, db, tmpFile } = freshApp();
  await withServer(app, async (base) => {
    const column = db.prepare("SELECT id FROM columns LIMIT 1").get();

    const res = await fetch(`${base}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: column.id, title: "   " }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /title/i);
  });
  db.close();
  cleanup(tmpFile);
});

test("moving a task updates its column (status)", async () => {
  const { app, db, tmpFile } = freshApp();
  await withServer(app, async (base) => {
    const [colA, colB] = db.prepare("SELECT id FROM columns ORDER BY position LIMIT 2").all();
    const task = db.prepare("SELECT id FROM tasks WHERE column_id = ? LIMIT 1").get(colA.id);

    const res = await fetch(`${base}/api/tasks/${task.id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: colB.id }),
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.column_id, colB.id);

    const fromDb = db.prepare("SELECT column_id FROM tasks WHERE id = ?").get(task.id);
    assert.equal(fromDb.column_id, colB.id);
  });
  db.close();
  cleanup(tmpFile);
});

test("task-counts query returns correct counts per column for seed data", async () => {
  const { app, db, tmpFile } = freshApp();
  await withServer(app, async (base) => {
    const board = db.prepare("SELECT id FROM boards LIMIT 1").get();

    const res = await fetch(`${base}/api/boards/${board.id}/task-counts`);
    assert.equal(res.status, 200);
    const rows = await res.json();

    // Seed data: To Do=3, In Progress=2, Done=2
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r.task_count]));
    assert.equal(byName["To Do"], 3);
    assert.equal(byName["In Progress"], 2);
    assert.equal(byName["Done"], 2);
  });
  db.close();
  cleanup(tmpFile);
});

test("priority query returns only matching tasks, newest first", async () => {
  const { app, db, tmpFile } = freshApp();
  await withServer(app, async (base) => {
    const board = db.prepare("SELECT id FROM boards LIMIT 1").get();

    const res = await fetch(`${base}/api/boards/${board.id}/tasks?priority=High`);
    assert.equal(res.status, 200);
    const rows = await res.json();

    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.equal(row.priority, "High");
    }
    // newest first
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i - 1].created_at >= rows[i].created_at);
    }
  });
  db.close();
  cleanup(tmpFile);
});

test("deleting a task removes it", async () => {
  const { app, db, tmpFile } = freshApp();
  await withServer(app, async (base) => {
    const task = db.prepare("SELECT id FROM tasks LIMIT 1").get();

    const res = await fetch(`${base}/api/tasks/${task.id}`, { method: "DELETE" });
    assert.equal(res.status, 204);

    const fromDb = db.prepare("SELECT id FROM tasks WHERE id = ?").get(task.id);
    assert.equal(fromDb, undefined);
  });
  db.close();
  cleanup(tmpFile);
});
