require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const pool = require("./db/pool");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
}));
app.use(express.json());

app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Wait 1 minute." },
}));

app.use("/api/politicians", require("./routes/politicians"));
app.use("/api/search", require("./routes/search"));

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM ai_cache WHERE expires_at < NOW()"
    );
    console.log(`Cache cleaned: ${rowCount} entries removed.`);
  } catch (err) {
    console.error("Cron error:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`PoliticsAI backend running on port ${PORT}`);
});