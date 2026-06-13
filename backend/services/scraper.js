const axios = require("axios");
const pool = require("../db/pool");

const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";

async function fetchProposicoesCamara(camaraId) {
  try {
    const { data } = await axios.get(`${CAMARA_API}/proposicoes`, {
      params: {
        idDeputadoAutor: camaraId,
        ordem: "DESC",
        ordenarPor: "dataApresentacao",
        itens: 20,
      },
      timeout: 8000,
    });
    return data.dados || [];
  } catch (err) {
    console.error("Erro ao buscar proposições Câmara:", err.message);
    return [];
  }
}

async function fetchVotacoesCamara(camaraId) {
  try {
    const { data } = await axios.get(`${CAMARA_API}/deputados/${camaraId}/votacoes`, {
      params: { ordem: "DESC", ordenarPor: "dataHoraVoto", itens: 20 },
      timeout: 8000,
    });
    return data.dados || [];
  } catch (err) {
    console.error("Erro ao buscar votações Câmara:", err.message);
    return [];
  }
}

async function savePublicData(politicianId, category, source, items) {
  if (!items.length) return 0;
  let saved = 0;
  for (const item of items) {
    try {
      await pool.query(
        `INSERT INTO public_data (politician_id, category, source, source_url, title, description, data, reference_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (politician_id, category, source, title) DO UPDATE
           SET data = EXCLUDED.data, scraped_at = NOW()`,
        [
          politicianId, category, source,
          item.uri || item.url || null,
          item.ementa || item.titulo || item.descricao || String(item.id || ""),
          item.descricaoTipo || item.tipo || null,
          JSON.stringify(item),
          item.dataApresentacao || item.dataHoraVoto
            ? new Date(item.dataApresentacao || item.dataHoraVoto)
            : null,
        ]
      );
      saved++;
    } catch (_) {}
  }
  return saved;
}

async function scrapePublicData(politician) {
  const results = { proposicoes: 0, votacoes: 0 };
  if (politician.camara_id) {
    const proposicoes = await fetchProposicoesCamara(politician.camara_id);
    results.proposicoes = await savePublicData(politician.id, "projeto", "camara", proposicoes);
    const votacoes = await fetchVotacoesCamara(politician.camara_id);
    results.votacoes = await savePublicData(politician.id, "votacao", "camara", votacoes);
  }
  return results;
}

async function getStoredData(politicianId, category, limit = 10) {
  const { rows } = await pool.query(
    `SELECT title, description, data, reference_date, source, source_url
     FROM public_data
     WHERE politician_id = $1 AND category = $2
     ORDER BY reference_date DESC NULLS LAST, scraped_at DESC
     LIMIT $3`,
    [politicianId, category, limit]
  );
  return rows;
}

module.exports = { scrapePublicData, getStoredData };