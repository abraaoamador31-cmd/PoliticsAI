require("dotenv").config();
const pool = require("./pool");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS politicians (
        id           SERIAL PRIMARY KEY,
        slug         TEXT UNIQUE NOT NULL,
        full_name    TEXT NOT NULL,
        short_name   TEXT NOT NULL,
        party        TEXT,
        state        TEXT,
        role         TEXT,
        country      TEXT NOT NULL DEFAULT 'Brazil',
        country_code TEXT NOT NULL DEFAULT 'BR',
        photo_url    TEXT,
        tse_id       TEXT,
        camara_id    TEXT,
        senado_id    TEXT,
        active       BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE politicians ADD COLUMN IF NOT EXISTS country      TEXT NOT NULL DEFAULT 'Brazil';
      ALTER TABLE politicians ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BR';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public_data (
        id             SERIAL PRIMARY KEY,
        politician_id  INT REFERENCES politicians(id) ON DELETE CASCADE,
        category       TEXT NOT NULL,
        source         TEXT NOT NULL,
        source_url     TEXT,
        title          TEXT,
        description    TEXT,
        data           JSONB,
        reference_date DATE,
        scraped_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(politician_id, category, source, title)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_cache (
        id             SERIAL PRIMARY KEY,
        politician_id  INT REFERENCES politicians(id) ON DELETE CASCADE,
        section        TEXT NOT NULL,
        prompt_hash    TEXT NOT NULL,
        response       TEXT NOT NULL,
        model          TEXT DEFAULT 'mistral-large-latest',
        tokens_used    INT,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        expires_at     TIMESTAMPTZ,
        UNIQUE(politician_id, section, prompt_hash)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS legal_records (
        id             SERIAL PRIMARY KEY,
        politician_id  INT REFERENCES politicians(id) ON DELETE CASCADE,
        source         TEXT NOT NULL,
        process_number TEXT,
        court          TEXT,
        type           TEXT,
        subject        TEXT,
        status         TEXT,
        year           INT,
        source_url     TEXT,
        raw_data       JSONB,
        scraped_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(politician_id, source, process_number)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id             SERIAL PRIMARY KEY,
        query          TEXT NOT NULL,
        politician_id  INT REFERENCES politicians(id) ON DELETE SET NULL,
        session_id     TEXT,
        result_count   INT DEFAULT 0,
        searched_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_politicians_slug     ON politicians(slug);
      CREATE INDEX IF NOT EXISTS idx_politicians_active   ON politicians(active);
      CREATE INDEX IF NOT EXISTS idx_public_data_pol      ON public_data(politician_id, category);
      CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup      ON ai_cache(politician_id, section);
      CREATE INDEX IF NOT EXISTS idx_ai_cache_expires     ON ai_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_search_history_date  ON search_history(searched_at DESC);
      CREATE INDEX IF NOT EXISTS idx_legal_records_pol    ON legal_records(politician_id);
      CREATE INDEX IF NOT EXISTS idx_legal_records_type   ON legal_records(type);
      CREATE INDEX IF NOT EXISTS idx_legal_records_status ON legal_records(status);
    `);

    await client.query("COMMIT");
    console.log("✅ Migration done!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();