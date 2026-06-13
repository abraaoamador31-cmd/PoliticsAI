const { Mistral } = require("@mistralai/mistralai");
const crypto = require("crypto");
const pool = require("../db/pool");

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || "86400", 10);

function buildPrompt(section, name, country, lang) {
  const isEn = lang === "en";
  const src = {
    BR: isEn ? "TSE, Câmara dos Deputados, Senate, Portal da Transparência"
             : "TSE, Câmara dos Deputados, Senado, Portal da Transparência",
    US: "Congress.gov, OpenSecrets, GovTrack, FEC, official congressional records",
    IL: "Knesset official records, Israeli government sources, Haaretz, Times of Israel",
    GB: "Parliament.uk, TheyWorkForYou, Electoral Commission, UK public records",
    FR: "Assemblée Nationale, Sénat, Journal Officiel, data.gouv.fr",
    DE: "Bundestag records, Bundeswahlleiter, official German government sources",
    default: "official government sources, verified public records, reputable press",
  };
  const sources = src[country] || src.default;
  const role = isEn
    ? "a political analyst specialized in public data and government transparency"
    : "um analista político especializado em dados públicos e transparência governamental";
  const tone = isEn
    ? "journalistic, neutral and objective tone. No intro like 'Sure' or 'Here is'."
    : "tom jornalístico, neutro e objetivo. Sem introduções como 'Claro' ou 'Aqui está'.";
  const paragraphs = isEn ? "4 short paragraphs" : "4 parágrafos curtos";

  const sections = {
    carreira: isEn
      ? `You are ${role}.\nWrite a factual report on the POLITICAL CAREER of "${name}" (${country}).\nInclude: offices held with years, party affiliations, elections contested and outcomes.\nSources: ${sources}.\n${paragraphs}, ${tone}`
      : `Você é ${role}.\nFaça um relatório factual sobre a TRAJETÓRIA POLÍTICA de "${name}" (${country}).\nInclua: cargos ocupados com anos, partidos filiados, eleições disputadas e resultados.\nFontes: ${sources}.\n${paragraphs}, ${tone}`,

    projetos: isEn
      ? `You are ${role}.\nList the main BILLS AND LEGISLATIVE PROPOSALS by "${name}" (${country}).\nInclude: bill number, year, topic, current status (enacted/archived/pending).\nSources: ${sources}.\n${paragraphs}, ${tone}`
      : `Você é ${role}.\nListe os principais PROJETOS DE LEI E PROPOSTAS apresentados por "${name}" (${country}).\nInclua: número, ano, tema, situação atual.\nFontes: ${sources}.\n${paragraphs}, ${tone}`,

    votacoes: isEn
      ? `You are ${role}.\nAnalyze the VOTING RECORD of "${name}" (${country}) in the legislature.\nInclude: key votes, alignment with party, notable absences.\nSources: ${sources}.\n${paragraphs}, ${tone}`
      : `Você é ${role}.\nAnalise o HISTÓRICO DE VOTAÇÕES de "${name}" (${country}).\nInclua: pautas importantes, como votou, alinhamento com partido, ausências.\nFontes: ${sources}.\n${paragraphs}, ${tone}`,

    patrimonio: isEn
      ? `You are ${role}.\nPresent the DECLARED ASSETS AND FINANCIAL DISCLOSURES of "${name}" (${country}).\nInclude: declared values by year, variation, main assets.\nSources: ${sources}.\n${paragraphs}, ${tone}`
      : `Você é ${role}.\nApresente a evolução do PATRIMÔNIO DECLARADO de "${name}" (${country}).\nInclua: valores por ano, variações, principais bens.\nFontes: ${sources}.\n${paragraphs}, ${tone}`,

    polemicas: isEn
      ? `You are ${role}.\nReport the main CONTROVERSIES AND INVESTIGATIONS involving "${name}" (${country}).\nInclude: lawsuits, investigations, committee hearings, major public scandals.\nSources: ${sources}.\n${paragraphs}, ${tone}`
      : `Você é ${role}.\nRelate as principais POLÊMICAS E INVESTIGAÇÕES envolvendo "${name}" (${country}).\nInclua: processos, investigações, CPIs, denúncias.\nFontes: ${sources}.\n${paragraphs}, ${tone}`,

    ficha_judicial: isEn
      ? `You are a legal analyst specialized in government transparency and public court records.\nWrite a JUDICIAL RECORD report for "${name}" (${country}) based on public sources.\n\nStructure in 4 blocks:\n1. ELIGIBILITY / DISQUALIFICATIONS: any court-ordered bans from office.\n2. AUDIT COURTS / FINANCIAL: fines, rejected accounts, bans from public service.\n3. CRIMINAL CASES: indictments, trials, status (ongoing/convicted/acquitted).\n4. CURRENT STATUS: whether they hold office, have convictions, or a clean record.\n\nUse ONLY verifiable public data. State clearly when no public record is known. ${tone}`
      : `Você é um analista jurídico especializado em transparência pública.\nRelatório de FICHA JUDICIAL de "${name}" (${country}) com base em fontes oficiais.\n\n4 blocos:\n1. FICHA LIMPA / INELEGIBILIDADE: condenações que geraram ou podem gerar inelegibilidade.\n2. TRIBUNAL DE CONTAS: contas rejeitadas, multas, inabilitações.\n3. AÇÕES PENAIS E INQUÉRITOS: processos como réu, situação atual.\n4. SITUAÇÃO ATUAL: elegível, condenado com trânsito em julgado, ou ficha limpa.\n\nUse apenas dados verificáveis. Indique quando não há registro público conhecido. ${tone}`,
  };

  return sections[section] || "";
}

function hashPrompt(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function getCachedResponse(politicianId, section, hash) {
  const { rows } = await pool.query(
    `SELECT response, tokens_used FROM ai_cache
     WHERE politician_id = $1 AND section = $2 AND prompt_hash = $3
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [politicianId, section, hash]
  );
  return rows[0] || null;
}

async function saveCache(politicianId, section, hash, response, tokens) {
  const expiresAt = new Date(Date.now() + CACHE_TTL * 1000);
  await pool.query(
    `INSERT INTO ai_cache (politician_id, section, prompt_hash, response, tokens_used, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (politician_id, section, prompt_hash)
     DO UPDATE SET response = EXCLUDED.response, tokens_used = EXCLUDED.tokens_used,
                   expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [politicianId, section, hash, response, tokens, expiresAt]
  );
}

async function generateSection(politician, section, lang = "pt") {
  const promptText = buildPrompt(
    section,
    politician.full_name,
    politician.country_code || "BR",
    lang
  ).trim();

  if (!promptText) throw new Error(`Invalid section: ${section}`);

  const hash = hashPrompt(promptText);
  const cached = await getCachedResponse(politician.id, section, hash);
  if (cached) return { text: cached.response, cached: true, tokens: cached.tokens_used };

  const result = await mistral.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "user", content: promptText }],
    temperature: 0.3,
    maxTokens: 900,
  });

  const text = result.choices[0].message.content;
  const tokens = result.usage?.totalTokens || 0;

  await saveCache(politician.id, section, hash, text, tokens);
  return { text, cached: false, tokens };
}

module.exports = { generateSection };