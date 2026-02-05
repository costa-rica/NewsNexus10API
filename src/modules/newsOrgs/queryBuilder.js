const DEFAULT_TIME_RANGE = "180d";

function normalizeTimeRange(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { timeRange: DEFAULT_TIME_RANGE, timeRangeInvalid: false };
  }
  if (!/^\d+d$/.test(trimmed)) {
    return { timeRange: DEFAULT_TIME_RANGE, timeRangeInvalid: true };
  }
  const days = Number.parseInt(trimmed.slice(0, -1), 10);
  if (!Number.isFinite(days) || days <= 0) {
    return { timeRange: DEFAULT_TIME_RANGE, timeRangeInvalid: true };
  }
  return { timeRange: trimmed, timeRangeInvalid: false };
}

function splitCsv(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function normalizeTerm(term) {
  const trimmed = term.trim();
  if (!trimmed) {
    return "";
  }
  const hasQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (hasQuotes) {
    return trimmed;
  }
  if (trimmed.includes(" ")) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

function combineForDb(keywords, exactPhrases) {
  const parts = [...splitCsv(keywords), ...splitCsv(exactPhrases)];
  if (parts.length === 0) {
    return null;
  }
  return parts.join(", ");
}

/**
 * Build Google RSS query string and metadata from request parameters
 * @param {Object} params - Query parameters
 * @param {string} params.and_keywords - Comma-separated keywords for AND search
 * @param {string} params.and_exact_phrases - Quoted exact phrases for AND search
 * @param {string} params.or_keywords - Comma-separated keywords for OR search
 * @param {string} params.or_exact_phrases - Quoted exact phrases for OR search
 * @param {string} params.time_range - Time range (e.g., "7d", "30d")
 * @returns {Object} Query build result with query string and metadata
 */
function buildQuery(params) {
  const andKeywords = splitCsv(params.and_keywords);
  const andExact = splitCsv(params.and_exact_phrases);
  const orKeywords = splitCsv(params.or_keywords);
  const orExact = splitCsv(params.or_exact_phrases);

  const andTerms = [...andKeywords, ...andExact]
    .map(normalizeTerm)
    .filter(Boolean);
  const orTerms = [...orKeywords, ...orExact]
    .map(normalizeTerm)
    .filter(Boolean);

  const queryParts = [];
  if (andTerms.length > 0) {
    queryParts.push(andTerms.join(" "));
  }
  if (orTerms.length > 0) {
    const orExpression = orTerms.join(" OR ");
    queryParts.push(
      andTerms.length > 0 && orTerms.length > 1
        ? `(${orExpression})`
        : orExpression
    );
  }

  const { timeRange, timeRangeInvalid } = normalizeTimeRange(params.time_range);
  queryParts.push(`when:${timeRange}`);

  return {
    query: queryParts.join(" ").trim(),
    andString: combineForDb(params.and_keywords, params.and_exact_phrases),
    orString: combineForDb(params.or_keywords, params.or_exact_phrases),
    timeRange,
    timeRangeInvalid,
  };
}

/**
 * Build complete Google RSS URL from query string
 * @param {string} query - The encoded query string
 * @returns {string} Complete Google RSS URL
 */
function buildRssUrl(query) {
  const baseUrl = "https://news.google.com/rss/search";
  const params = new URLSearchParams({ q: query });

  const hl = process.env.GOOGLE_RSS_HL || "en-US";
  const gl = process.env.GOOGLE_RSS_GL || "US";
  const ceid = process.env.GOOGLE_RSS_CEID || "US:en";

  params.set("hl", hl);
  params.set("gl", gl);
  params.set("ceid", ceid);

  return `${baseUrl}?${params.toString()}`;
}

module.exports = {
  buildQuery,
  buildRssUrl,
};
