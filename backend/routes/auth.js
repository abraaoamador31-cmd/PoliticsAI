const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const crypto = require("crypto");

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Nome, email e senha obrigatorios" });
  }

  try {
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name`,
      [email.toLowerCase(), hash, name]
    );
    if (!rows[0]) return res.status(409).json({ error: "Email ja cadastrado" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatorios" });
  }

  try {
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    const { rows } = await pool.query(
      `SELECT id, email, name, is_pro, searches_this_month, last_search_reset
       FROM users WHERE email = $1 AND password_hash = $2`,
      [email.toLowerCase(), hash]
    );
    if (!rows[0]) return res.status(401).json({ error: "Email ou senha incorretos" });

    // Reset mensal de buscas
    const user = rows[0];
    const now = new Date();
    const lastReset = new Date(user.last_search_reset);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      await pool.query(
        "UPDATE users SET searches_this_month = 0, last_search_reset = NOW() WHERE id = $1",
        [user.id]
      );
      user.searches_this_month = 0;
    }

    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me/:userId ──────────────────────────────────────────────
router.get("/me/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, is_pro, searches_this_month, last_search_reset
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/search/:userId ─────────────────────────────────────────
router.post("/search/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET searches_this_month = searches_this_month + 1
       WHERE id = $1
       RETURNING id, searches_this_month, is_pro`,
      [req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;