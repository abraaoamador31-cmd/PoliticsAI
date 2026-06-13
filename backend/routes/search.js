const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.post("/", async (req, res) => {
  const { query, politician_id, session_id, result_count } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    await pool.query(
      `INSERT INTO search_history (query, politician_id, session_id, result_count)
       VALUES ($1, $2, $3, $4)`,
      [query, politician_id || null, session_id || null, result_count || 0]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/trending", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.full_name, p.slug, p.party, p.state, p.country, p.country_code, COUNT(*) as searches
       FROM search_history sh
       JOIN politicians p ON sh.politician_id = p.id
       WHERE sh.searched_at > NOW() - INTERVAL '24 hours'
         AND sh.politician_id IS NOT NULL
       GROUP BY p.id, p.full_name, p.slug, p.party, p.state, p.country, p.country_code
       ORDER BY searches DESC
       LIMIT 8`
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;