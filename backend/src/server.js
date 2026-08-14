const { createApp } = require("./app");
const { createConnection } = require("./db");
const { seed } = require("./seed");

const PORT = process.env.PORT || 4000;

const db = createConnection();
seed(db); // no-op if data already exists

const app = createApp(db);

app.listen(PORT, () => {
  console.log(`TaskFlow API listening on http://localhost:${PORT}`);
});
