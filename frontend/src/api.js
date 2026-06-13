const BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  searchPoliticians: (q, country_code = "") => {
    const params = new URLSearchParams({ q });
    if (country_code) params.append("country_code", country_code);
    return request(`/api/politicians?${params}`);
  },

  getPolitician: (slug) =>
    request(`/api/politicians/${slug}`),

  getSection: (slug, section, lang = "pt") =>
    request(`/api/politicians/${slug}/section/${section}?lang=${lang}`),

  getTrending: () =>
    request("/api/search/trending"),

  getCountries: () =>
    request("/api/politicians/countries"),

  logSearch: (query, politician_id, result_count) =>
    request("/api/search", {
      method: "POST",
      body: JSON.stringify({
        query, politician_id, result_count,
        session_id: sessionStorage.getItem("sid") || Math.random().toString(36).slice(2),
      }),
    }).catch(() => {}),
};