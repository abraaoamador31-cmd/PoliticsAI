const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// ── POST /webhook/hotmart ─────────────────────────────────────────────────
router.post("/hotmart", async (req, res) => {
  try {
    const event = req.body;
    const eventType = event.event;
    const buyer = event.data?.buyer;
    const purchase = event.data?.purchase;

    if (!buyer || !buyer.email) {
      return res.status(400).json({ error: "Dados invalidos" });
    }

    const email = buyer.email.toLowerCase();
    const name = buyer.name || email;

    if (eventType === "PURCHASE_COMPLETE" || eventType === "PURCHASE_APPROVED") {
      // Cria usuario se nao existir e ativa pro
      await pool.query(
        `INSERT INTO users (email, name, is_pro, pro_since)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (email) DO UPDATE SET
           is_pro = true,
           pro_since = NOW(),
           updated_at = NOW()`,
        [email, name]
      );
      console.log(`PRO ativado: ${email}`);
    }

    if (
      eventType === "PURCHASE_CANCELED" ||
      eventType === "PURCHASE_REFUNDED" ||
      eventType === "SUBSCRIPTION_CANCELLATION"
    ) {
      // Cancela pro
      await pool.query(
        `UPDATE users SET is_pro = false, updated_at = NOW() WHERE email = $1`,
        [email]
      );
      console.log(`PRO cancelado: ${email}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;