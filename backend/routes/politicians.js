const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { generateSection } = require("../services/mistral");
const { scrapePublicData, getStoredData } = require("../services/scraper");
const { scrapeLegalRecords, getLegalRecords, getExternalLinks } = require("../services/legal");

router.get("/", async (req, res) => {
  try {
    const { q, country_code } = req.query;
    let query = "SELECT id, slug, full_name, short_name, party, state, role, country, country_code FROM politicians WHERE active = true";
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      query += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(short_name) LIKE $${params.length} OR LOWER(party) LIKE $${params.length})`;
    }
    if (country_code) {
      params.push(country_code.toUpperCase());
      query += ` AND country_code = $${params.length}`;
    }

    query += " ORDER BY country ASC, full_name ASC LIMIT 40";
    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/countries", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT country, country_code, COUNT(*) as total
       FROM politicians WHERE active = true
       GROUP BY country, country_code ORDER BY country ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM politicians WHERE slug = $1 AND active = true",
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: "Politician not found" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug/section/:section", async (req, res) => {
  const { slug, section } = req.params;
  const VALID_SECTIONS = ["carreira", "projetos", "votacoes", "patrimonio", "polemicas", "ficha_judicial"];

  if (!VALID_SECTIONS.includes(section)) {
    return res.status(400).json({ error: "Invalid section" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM politicians WHERE slug = $1 AND active = true",
      [slug]
    );
    if (!rows[0]) return res.status(404).json({ error: "Politician not found" });

    const politician = rows[0];

    let lang = req.query.lang;
    if (!lang) {
      const accept = req.headers["accept-language"] || "";
      lang = accept.toLowerCase().startsWith("pt") ? "pt" : "en";
    }
    if (!lang && politician.country_code !== "BR") lang = "en";
    lang = ["en", "pt"].includes(lang) ? lang : "pt";

    const { text, cached, tokens } = await generateSection(politician, section, lang);

    let publicData = [];
    let legalRecords = [];
    let externalLinks = [];

    if (section === "projetos")       publicData  = await getStoredData(politician.id, "projeto", 5);
    if (section === "votacoes")       publicData  = await getStoredData(politician.id, "votacao", 5);
    if (section === "ficha_judicial") {
      legalRecords  = await getLegalRecords(politician.id);
      externalLinks = getExternalLinks(politician);
      if (legalRecords.length === 0) scrapeLegalRecords(politician).catch(console.error);
    }

    res.json({
      data: {
        section, lang,
        politician: { id: politician.id, slug, full_name: politician.full_name,
                      country: politician.country, country_code: politician.country_code },
        ai_response: text,
        public_data: publicData,
        legal_records: legalRecords,
        external_links: externalLinks,
        meta: { cached, tokens, generated_at: new Date().toISOString() },
      },
    });
  } catch (err) {
    console.error("Section error:", err);
    res.status(500).json({ error: "Error generating analysis: " + err.message });
  }
});

router.post("/:slug/scrape", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM politicians WHERE slug = $1", [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const [pub, legal] = await Promise.all([scrapePublicData(rows[0]), scrapeLegalRecords(rows[0])]);
    res.json({ data: { public: pub, legal }, message: "Scraping done" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;