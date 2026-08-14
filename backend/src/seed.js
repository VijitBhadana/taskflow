// Populates a fresh database with one demo board so the app isn't empty on first run.
const { createConnection } = require("./db");

function seed(db) {
  const boardCount = db.prepare("SELECT COUNT(*) AS c FROM boards").get().c;
  if (boardCount > 0) {
    console.log("Database already has data — skipping seed.");
    return;
  }

  const insertBoard = db.prepare("INSERT INTO boards (name) VALUES (?)");
  const boardId = insertBoard.run("Product Launch").lastInsertRowid;

  const insertColumn = db.prepare(
    "INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)"
  );
  const todoId = insertColumn.run(boardId, "To Do", 0).lastInsertRowid;
  const inProgressId = insertColumn.run(boardId, "In Progress", 1).lastInsertRowid;
  const doneId = insertColumn.run(boardId, "Done", 2).lastInsertRowid;

  const insertTask = db.prepare(
    "INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)"
  );

  insertTask.run(todoId, "Design landing page", "Hero section + pricing table", "High");
  insertTask.run(todoId, "Write launch blog post", null, "Medium");
  insertTask.run(todoId, "Set up analytics", "GA4 + basic funnel events", "Low");
  insertTask.run(inProgressId, "Build signup flow", "Email + password, no OAuth yet", "High");
  insertTask.run(inProgressId, "API rate limiting", null, "Medium");
  insertTask.run(doneId, "Buy domain name", null, "Low");
  insertTask.run(doneId, "Set up repo & CI", "GitHub Actions running tests on push", "Medium");

  console.log(`Seeded board #${boardId} with 3 columns and 7 tasks.`);
}

if (require.main === module) {
  const db = createConnection();
  seed(db);
  db.close();
}

module.exports = { seed };
