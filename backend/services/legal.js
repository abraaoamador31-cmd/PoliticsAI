const axios = require("axios");
const pool = require("../db/pool");

async function fetchTSEFichaLimpa(politician) {
  const results = [];
  try {
    const { data } = await axios.get(
      "https://dadosabertos.tse.jus.br/api/3/action/datastore_search",
      {
        params: {
          resource_id: "b8025888-4097-4754-99f6-60f7d97a5bf7",
          q: politician.short_name,
          limit: 5,
        },
        timeout: 8000,
      }
    );
    const records = data?.result?.records || [];
    for (const r of records) {
      if (r.DS_SIT_TOT_TURNO === "INELEGÍVEL" || r.DS_DETALHE_SITUACAO_CAND) {
        results.push({
          source: "tse_ficha_limpa",
          process_number: r.SQ_CANDIDATO?.toString() || null,
          court: "TSE",
          type: "inelegibilidade",
          subject: r.DS_DETALHE_SITUACAO_CAND || "Inelegibilidade declarada",
          status: "condenado",
          year: parseInt(r.ANO_ELEICAO) || null,
          source_url: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${r.ANO_ELEICAO}/${r.SQ_CANDIDATO}`,
          raw_data: r,
        });
      }
    }
  } catch (err) {
    console.error("Erro TSE:", err.message);
  }
  return results;
}

async function fetchTCURegistros(politician) {
  const results = [];
  try {
    results.push({
      source: "tcu",
      process_number: `tcu_${politician.id}`,
      court: "TCU",
      type: "consulta_tcu",
      subject: "Consulte o Portal de Contas do TCU para verificar contas julgadas, multas e inabilitações.",
      status: "verificar",
      year: null,
      source_url: "https://contas.tcu.gov.br/egestao/obterRelatorioSituacaoDebito.do?metodo=iniciar",
      raw_data: { hint: "manual_check", name: politician.full_name },
    });
  } catch (_) {}
  return results;
}

async function fetchSTFProcessos(politician) {
  const results = [];
  try {
    results.push({
      source: "stf",
      process_number: `stf_${politician.id}`,
      court: "STF",
      type: "consulta_stf",
      subject: "Verifique ações penais e inquéritos no portal do STF.",
      status: "verificar",
      year: null,
      source_url: `https://portal.stf.jus.br/processos/listarPartes.asp?nome=${encodeURIComponent(politician.full_name)}`,
      raw_data: { hint: "manual_check" },
    });
  } catch (_) {}
  return results;
}

async function saveLegalRecords(politicianId, records) {
  let saved = 0;
  for (const r of records) {
    try {
      await pool.query(
        `INSERT INTO legal_records
           (politician_id, source, process_number, court, type, subject, status, year, source_url, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (politician_id, source, process_number)
         DO UPDATE SET subject = EXCLUDED.subject, status = EXCLUDED.status,
                       raw_data = EXCLUDED.raw_data, scraped_at = NOW()`,
        [
          politicianId,
          r.source, r.process_number || `${r.source}_${Date.now()}`,
          r.court, r.type, r.subject, r.status,
          r.year, r.source_url, JSON.stringify(r.raw_data || {}),
        ]
      );
      saved++;
    } catch (_) {}
  }
  return saved;
}

async function getLegalRecords(politicianId) {
  const { rows } = await pool.query(
    `SELECT source, process_number, court, type, subject, status, year, source_url
     FROM legal_records
     WHERE politician_id = $1
     ORDER BY year DESC NULLS LAST, scraped_at DESC`,
    [politicianId]
  );
  return rows;
}

async function scrapeLegalRecords(politician) {
  const [tse, tcu, stf] = await Promise.all([
    fetchTSEFichaLimpa(politician),
    fetchTCURegistros(politician),
    fetchSTFProcessos(politician),
  ]);
  const all = [...tse, ...tcu, ...stf];
  const saved = await saveLegalRecords(politician.id, all);
  return { total: all.length, saved, sources: { tse: tse.length, tcu: tcu.length, stf: stf.length } };
}

function getExternalLinks(politician) {
  const name = encodeURIComponent(politician.full_name);
  return [
    {
      label: "TSE — Ficha do Candidato",
      url: "https://divulgacandcontas.tse.jus.br/divulga/#/home",
      description: "Situação eleitoral, condenações e inelegibilidades",
    },
    {
      label: "STF — Processos como Parte",
      url: `https://portal.stf.jus.br/processos/listarPartes.asp?nome=${name}`,
      description: "Ações penais e inquéritos no Supremo",
    },
    {
      label: "CNJ — Consulta Processual",
      url: "https://www.cnj.jus.br/poder-judiciario/transparencia-e-prestacao-de-contas/",
      description: "Processos em todo o Judiciário nacional",
    },
    {
      label: "TCU — Contas Julgadas",
      url: "https://contas.tcu.gov.br/egestao/obterRelatorioSituacaoDebito.do?metodo=iniciar",
      description: "Multas, contas rejeitadas e inabilitações",
    },
    {
      label: "Radar Ficha Limpa",
      url: "https://www.transparencia.org.br/projetos/ficha_limpa",
      description: "Consolidação independente de condenações",
    },
  ];
}

module.exports = { scrapeLegalRecords, getLegalRecords, getExternalLinks };