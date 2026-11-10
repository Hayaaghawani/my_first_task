const { solrTimeoutMs, solrUrl } = require('./config');

const SELECTED_FIELDS = [
  'post_id',
  'title_t',
  'price_d',
  'price_currency_code_s',
  'city_name_s',
  'city_name_en_s',
  'image_uri_s',
  'image_count_i',
];

function escapeSolrPhrase(value) {
  return value.replace(/[+\-!(){}[\]^"~*?:\\/]/g, '\\$&');
}

class SolrError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'SolrError';
  }
}

function buildSelectUrl({
  baseUrl = solrUrl,
  countryCore,
  category,
  start,
  rows,
  nowSeconds = Math.floor(Date.now() / 1000),
  lang,
  sortBy = 'record_posted_time_i',
  sortOrder = 'desc',
  title = '',
}) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${countryCore}/select`, normalizedBaseUrl);
  url.searchParams.set('q', '*:*');
  url.searchParams.append('fq', `tag_2_reporting_name_s:${category}`);
  url.searchParams.append('fq', 'duplicate_i:0');
  url.searchParams.append('fq', `record_expiration_time_i:[${nowSeconds} TO *]`);
  if (title) {
    url.searchParams.append('fq', `title_t:"${escapeSolrPhrase(title)}"`);
  }
  const sort = sortBy === 'post_id'
    ? `post_id ${sortOrder}`
    : `record_posted_time_i ${sortOrder},post_id ${sortOrder}`;
  url.searchParams.set('sort', sort);
  url.searchParams.set('start', String(start));
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('fl', SELECTED_FIELDS.join(','));
  url.searchParams.set('wt', 'json');
  return url;
}

async function searchListings(options, { fetchImpl = fetch, timeoutMs = solrTimeoutMs } = {}) {
  const url = buildSelectUrl(options);
  let response;

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new SolrError('Solr request failed', { cause: error });
  }

  if (!response.ok) {
    throw new SolrError(`Solr returned HTTP ${response.status}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new SolrError('Solr returned invalid JSON', { cause: error });
  }

  const result = body?.response;
  if (!Number.isSafeInteger(result?.numFound) || !Array.isArray(result?.docs)) {
    throw new SolrError('Solr response is missing listing results');
  }

  return { total: result.numFound, docs: result.docs };
}

module.exports = { SolrError, buildSelectUrl, escapeSolrPhrase, searchListings };
