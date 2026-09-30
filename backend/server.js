// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)
//
// Endpoints you need to build:
//   GET    /api/expenses        return all expenses
//   GET    /api/expenses/:id    return one expense (404 if not found)
//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)
//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)
//   DELETE /api/expenses/:id    delete an expense (200, or 404)
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors());

//! It converts the JSON in the request body into `req.body` (post,put)
app.use(express.json());

// ={} --> title, amount, category, date = undefined
function validExpense({ title, amount, category, date } = {}) {
  const errors = [];
  if (typeof title !== "string" || title.trim() === "")
    errors.push("title is required and must be a non-empty string");
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
    errors.push("amount must be a number greater than 0");
  if (typeof category !== "string" || category.trim() === "")
    errors.push("category is required and must be a non-empty string");
  if (typeof date !== "string" || isNaN(Date.parse(date, "YYYY-MM-DD")))
    errors.push("date is invalid");
  return errors;
}

app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, amount::float8 AS amount, category, to_char(date, 'YYYY-MM-DD') AS date FROM expenses ORDER BY id",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(404).json({ error: "Data not found" });
  }

  try {
    const result = await pool.query(
      " SELECT id, title, amount::float8 AS amount, category, to_char(date, 'YYYY-MM-DD') AS date FROM expenses WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/expenses", async (req, res) => {
  const errors = validExpense(req.body);

  // اذا كان فيها شي يعني في خطا بناء على دالة لانها بتضيف الخطا
  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: "Invalid expense data", message: errors.join(", ") });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO expenses (title, amount, category, date) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, amount, category, date],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(404).json({ error: "Data not found" });
  }

  const errors = validExpense(req.body);
  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: "Invalid expense data", message: errors.join(", ") });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      "UPDATE expenses SET title = $1, amount = $2, category = $3, date = $4 WHERE id = $5 RETURNING *",
      [title, amount, category, date, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    res.json({ message: "Updated successfully", updated: result.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(404).json({ error: "Data not found" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    res.json({ message: "Deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
