# TaskFlow

A small Trello-style task board. React (Vite) frontend, Node.js/Express backend, SQLite database.

```
taskflow/
├── backend/     Express API + SQLite (better-sqlite3)
└── frontend/    React app (Vite)
```

## Quick start

You need Node.js 18+ installed. No Docker, no separate database server — SQLite lives in a file
inside `backend/data/`.

**1. Backend** (in one terminal)

```bash
cd backend
npm install
npm run dev        # http://localhost:4000
```

On first run this creates `backend/data/taskflow.db`, applies `src/schema.sql`, and seeds it with
one demo board ("Product Launch") so the app isn't empty. If the database already has data, seeding
is skipped automatically — safe to restart as often as you like.

**2. Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Open **http://localhost:5173**. The dev server proxies `/api/*` requests to the backend on port
4000 (see `frontend/vite.config.js`), so there's no CORS setup to think about locally.

**Run backend tests:**

```bash
cd backend
npm test
```

## What's implemented

- View a board with columns and tasks.
- Create / edit / delete tasks (title required, description + priority optional).
- Move a task between columns via **drag-and-drop**, with a dropdown-per-card as an accessible
  fallback (also fully keyboard-operable — tab to a card's move dropdown and use arrow keys).
- Everything persists to SQLite; reloading the page shows the same data.
- Filter visible tasks by priority, plus a title search box.
- Backend-enforced validation: empty/whitespace-only titles are rejected with a 400 and a message,
  not just blocked in the form.
- Failed requests show a dismissible error banner instead of a blank screen or silent failure.

## Database

Schema lives in `backend/src/schema.sql` and is applied automatically on startup (`CREATE TABLE IF
NOT EXISTS`, so it's safe to run repeatedly). Three tables: `boards` → `columns` → `tasks`, each with
an `INTEGER PRIMARY KEY`, a foreign key to its parent, and `NOT NULL` on required fields. A task's
"status" is represented by which column it belongs to (`tasks.column_id`), rather than a separate
status enum — moving a task is just updating that foreign key.

The two required non-trivial queries (see `backend/src/routes/boards.js`):

- **`GET /api/boards/:id/task-counts`** — count of tasks per column on a board, via `LEFT JOIN` +
  `GROUP BY` (so empty columns still show `0`, not disappear).
- **`GET /api/boards/:id/tasks?priority=High`** — tasks with a given priority, newest first, via a
  `JOIN` + `WHERE` + `ORDER BY created_at DESC`. The same endpoint also accepts `?search=` for the
  title search box.

Seed data: `backend/src/seed.js`, run automatically on server start (no-op if data already exists).

## Tests

`backend/tests/api.test.js`, using Node's built-in test runner (`node --test`) against a throwaway
SQLite file per test run — no mocking of the database layer. Covers:

1. Creating a task with a blank title fails (400 + message).
2. Moving a task updates its `column_id` (both in the API response and directly in the DB).
3. The task-counts query returns the right counts for known seed data.
4. The priority query returns only matching tasks, newest first.
5. Deleting a task actually removes it.

## Assumptions & decisions

- **Single board, no board switcher UI.** The backend supports multiple boards (`GET /api/boards`,
  `POST /api/boards`), but the frontend always loads board `id=1` — building a board-switcher felt
  out of scope given "multiple users or teams" was explicitly excluded, and one board is enough to
  demonstrate the required features.
- **Status = column, not a separate field.** The spec describes status as "which column it's in," so
  there's no redundant `status` column to keep in sync — a task's column *is* its status.
- **Drag-and-drop is the primary move interaction**, not a dropdown-first fallback, since the spec
  said drag-and-drop is nicer when it's not too much for the time budget. Every card also has a
  `<select>` to move it, both as a safety net if a drag is fumbled and so moving a task doesn't
  require a mouse.
- **Optimistic move updates.** Dragging a card updates the UI immediately and only reconciles with
  the server in the background; if the request fails, it refetches the board to revert. Create/edit/
  delete wait for the server response before closing their modal, since those already require a
  round trip.
- **No auth, single implicit "session."** Per the spec's explicit exclusions.

## What I'd add with more time

- A board switcher / "create board" UI (the API already supports it).
- Reordering tasks within a column (currently newest-first, fixed order).
- Undo for delete, instead of a plain `confirm()` dialog.
- Optimistic UI for create/edit, not just move.
- E2E tests (Playwright) covering the actual drag-and-drop interaction, not just the API layer.

## Time spent

Roughly 3–4 hours end to end: schema + API + tests first, then the frontend.

## Something I found interesting

Node's built-in test runner (`node:test`, stable since Node 18) is now genuinely good enough that I
didn't reach for Jest here — no config file, no transform step, and `node --test` picks up files
automatically. Combined with the global `fetch` that ships in modern Node, I could spin up the real
Express app on an ephemeral port per test and hit it with real HTTP requests instead of mocking
anything, which made the tests closer to what actually happens in production.
