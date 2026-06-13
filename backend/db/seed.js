require("dotenv").config();
const pool = require("./pool");

const politicians = [
  // ── Brazil ──────────────────────────────────────────────────────────────
  { slug: "lula",             full_name: "Luiz Inácio Lula da Silva",      short_name: "Lula",       party: "PT",                 state: "SP", role: "President of Brazil",                       country: "Brazil",         country_code: "BR" },
  { slug: "bolsonaro",        full_name: "Jair Messias Bolsonaro",          short_name: "Bolsonaro",  party: "PL",                 state: "RJ", role: "Former President / Congressman",             country: "Brazil",         country_code: "BR" },
  { slug: "arthur-lira",      full_name: "Arthur Lira",                     short_name: "Lira",       party: "PP",                 state: "AL", role: "Federal Congressman",                       country: "Brazil",         country_code: "BR", camara_id: "74693" },
  { slug: "rodrigo-pacheco",  full_name: "Rodrigo Pacheco",                 short_name: "Pacheco",    party: "PSD",                state: "MG", role: "Senator / Senate President",                country: "Brazil",         country_code: "BR", senado_id: "5529" },
  { slug: "sergio-moro",      full_name: "Sergio Moro",                     short_name: "Moro",       party: "União Brasil",       state: "PR", role: "Senator",                                   country: "Brazil",         country_code: "BR", senado_id: "6257" },
  { slug: "marina-silva",     full_name: "Marina Silva",                    short_name: "Marina",     party: "Rede",               state: "AC", role: "Minister of Environment",                   country: "Brazil",         country_code: "BR" },
  { slug: "simone-tebet",     full_name: "Simone Tebet",                    short_name: "Tebet",      party: "MDB",                state: "MS", role: "Minister of Planning",                      country: "Brazil",         country_code: "BR" },
  { slug: "tabata-amaral",    full_name: "Tabata Amaral",                   short_name: "Tabata",     party: "PSB",                state: "SP", role: "Federal Congresswoman",                     country: "Brazil",         country_code: "BR", camara_id: "221399" },
  { slug: "guilherme-boulos", full_name: "Guilherme Boulos",                short_name: "Boulos",     party: "PSOL",               state: "SP", role: "Federal Congressman",                       country: "Brazil",         country_code: "BR", camara_id: "220683" },
  { slug: "renan-calheiros",  full_name: "Renan Calheiros",                 short_name: "Renan",      party: "MDB",                state: "AL", role: "Senator",                                   country: "Brazil",         country_code: "BR" },
  { slug: "alexandre-moraes", full_name: "Alexandre de Moraes",             short_name: "Moraes",     party: "–",                  state: "SP", role: "STF Justice / TSE President",               country: "Brazil",         country_code: "BR" },
  { slug: "ciro-gomes",       full_name: "Ciro Gomes",                      short_name: "Ciro",       party: "PDT",                state: "CE", role: "Former Governor / Minister",                country: "Brazil",         country_code: "BR" },

  // ── United States ────────────────────────────────────────────────────────
  { slug: "joe-biden",                 full_name: "Joe Biden",                       short_name: "Biden",      party: "Democrat",           state: "DE", role: "Former President of the USA",               country: "United States",  country_code: "US" },
  { slug: "donald-trump",              full_name: "Donald Trump",                    short_name: "Trump",      party: "Republican",         state: "FL", role: "President of the USA",                      country: "United States",  country_code: "US" },
  { slug: "kamala-harris",             full_name: "Kamala Harris",                   short_name: "Harris",     party: "Democrat",           state: "CA", role: "Former Vice-President",                     country: "United States",  country_code: "US" },
  { slug: "bernie-sanders",            full_name: "Bernie Sanders",                  short_name: "Sanders",    party: "Democrat",           state: "VT", role: "Senator",                                   country: "United States",  country_code: "US" },
  { slug: "nancy-pelosi",              full_name: "Nancy Pelosi",                    short_name: "Pelosi",     party: "Democrat",           state: "CA", role: "Former House Speaker",                      country: "United States",  country_code: "US" },
  { slug: "mitch-mcconnell",           full_name: "Mitch McConnell",                 short_name: "McConnell",  party: "Republican",         state: "KY", role: "Senator / Former Majority Leader",          country: "United States",  country_code: "US" },
  { slug: "ron-desantis",              full_name: "Ron DeSantis",                    short_name: "DeSantis",   party: "Republican",         state: "FL", role: "Governor of Florida",                       country: "United States",  country_code: "US" },
  { slug: "alexandria-ocasio-cortez",  full_name: "Alexandria Ocasio-Cortez",        short_name: "AOC",        party: "Democrat",           state: "NY", role: "Congresswoman",                             country: "United States",  country_code: "US" },

  // ── Israel ───────────────────────────────────────────────────────────────
  { slug: "benjamin-netanyahu", full_name: "Benjamin Netanyahu",  short_name: "Netanyahu", party: "Likud",              state: "–", role: "Prime Minister of Israel",                  country: "Israel",         country_code: "IL" },
  { slug: "yoav-gallant",       full_name: "Yoav Gallant",        short_name: "Gallant",   party: "Likud",              state: "–", role: "Former Defense Minister",                   country: "Israel",         country_code: "IL" },
  { slug: "benny-gantz",        full_name: "Benny Gantz",          short_name: "Gantz",     party: "National Unity",     state: "–", role: "Former Defense Minister / Opposition Leader", country: "Israel",       country_code: "IL" },
  { slug: "itamar-ben-gvir",    full_name: "Itamar Ben-Gvir",      short_name: "Ben-Gvir",  party: "Otzma Yehudit",      state: "–", role: "National Security Minister",                country: "Israel",         country_code: "IL" },
  { slug: "bezalel-smotrich",   full_name: "Bezalel Smotrich",     short_name: "Smotrich",  party: "Religious Zionism",  state: "–", role: "Finance Minister",                          country: "Israel",         country_code: "IL" },
  { slug: "yair-lapid",         full_name: "Yair Lapid",           short_name: "Lapid",     party: "Yesh Atid",          state: "–", role: "Opposition Leader / Former PM",             country: "Israel",         country_code: "IL" },

  // ── United Kingdom ───────────────────────────────────────────────────────
  { slug: "keir-starmer", full_name: "Keir Starmer", short_name: "Starmer", party: "Labour",       state: "–", role: "Prime Minister of the UK",  country: "United Kingdom", country_code: "GB" },
  { slug: "rishi-sunak",  full_name: "Rishi Sunak",  short_name: "Sunak",   party: "Conservative", state: "–", role: "Former Prime Minister",     country: "United Kingdom", country_code: "GB" },
  { slug: "nigel-farage", full_name: "Nigel Farage", short_name: "Farage",  party: "Reform UK",    state: "–", role: "MP / Reform UK Leader",     country: "United Kingdom", country_code: "GB" },

  // ── France ───────────────────────────────────────────────────────────────
  { slug: "emmanuel-macron", full_name: "Emmanuel Macron", short_name: "Macron", party: "Renaissance", state: "–", role: "President of France",              country: "France", country_code: "FR" },
  { slug: "marine-le-pen",   full_name: "Marine Le Pen",   short_name: "Le Pen", party: "RN",          state: "–", role: "MP / Former Presidential Candidate", country: "France", country_code: "FR" },

  // ── Germany ──────────────────────────────────────────────────────────────
  { slug: "olaf-scholz",    full_name: "Olaf Scholz",    short_name: "Scholz", party: "SPD", state: "–", role: "Former Chancellor of Germany", country: "Germany", country_code: "DE" },
  { slug: "friedrich-merz", full_name: "Friedrich Merz", short_name: "Merz",   party: "CDU", state: "–", role: "Chancellor of Germany",        country: "Germany", country_code: "DE" },

  // ── Argentina ────────────────────────────────────────────────────────────
  { slug: "javier-milei",      full_name: "Javier Milei",                      short_name: "Milei",    party: "La Libertad Avanza",  state: "–", role: "President of Argentina",      country: "Argentina", country_code: "AR" },
  { slug: "cristina-kirchner", full_name: "Cristina Fernández de Kirchner",    short_name: "Kirchner", party: "PJ/Frente de Todos",  state: "–", role: "Former President / Senator",  country: "Argentina", country_code: "AR" },

  // ── Venezuela ────────────────────────────────────────────────────────────
  { slug: "nicolas-maduro", full_name: "Nicolás Maduro", short_name: "Maduro", party: "PSUV", state: "–", role: "President of Venezuela", country: "Venezuela", country_code: "VE" },

  // ── Russia ───────────────────────────────────────────────────────────────
  { slug: "vladimir-putin", full_name: "Vladimir Putin", short_name: "Putin", party: "United Russia", state: "–", role: "President of Russia", country: "Russia", country_code: "RU" },

  // ── China ────────────────────────────────────────────────────────────────
  { slug: "xi-jinping", full_name: "Xi Jinping", short_name: "Xi", party: "CPC", state: "–", role: "President of China / CPC General Secretary", country: "China", country_code: "CN" },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of politicians) {
      await client.query(
        `INSERT INTO politicians (slug, full_name, short_name, party, state, role, country, country_code, tse_id, camara_id, senado_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (slug) DO UPDATE SET
           full_name    = EXCLUDED.full_name,
           party        = EXCLUDED.party,
           state        = EXCLUDED.state,
           role         = EXCLUDED.role,
           country      = EXCLUDED.country,
           country_code = EXCLUDED.country_code,
           updated_at   = NOW()`,
        [p.slug, p.full_name, p.short_name, p.party, p.state, p.role,
         p.country, p.country_code,
         p.tse_id || null, p.camara_id || null, p.senado_id || null]
      );
    }
    await client.query("COMMIT");
    console.log(`✅ Seed done: ${politicians.length} politicians inserted.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();