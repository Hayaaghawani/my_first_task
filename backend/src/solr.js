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
  return value.replace(/[+\-!(){}[\]^"~*?:\\/]/g, '\\$&'); //improve by comments
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
  hasImages = false,
  hasReels = false,
  hasVideos = false,
  premium = false,
  cityIds = [], 
  yearFrom,
  yearTo,
  priceFrom,
  priceTo,
}) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${countryCore}/select`, normalizedBaseUrl);
  const currentTimeSeconds = nowSeconds ?? Math.floor(Date.now() / 1000);
  url.searchParams.set('q', '*:*');
  url.searchParams.append('fq', `tag_2_reporting_name_s:${category}`);
  url.searchParams.append('fq', 'duplicate_i:0');
  url.searchParams.append('fq', `record_expiration_time_i:[${currentTimeSeconds} TO *]`);
  if (title) {
    url.searchParams.append('fq', `title_t:"${escapeSolrPhrase(title)}"`);
  }
  if (hasImages) {
    url.searchParams.append('fq', 'image_count_i:[1 TO *]');
  }
  if (hasReels) {
    url.searchParams.append('fq', 'with_reels_i:1');
  }
  if (hasVideos) {
    url.searchParams.append('fq', 'with_video_i:1');
  }
  if (premium) {
    url.searchParams.append('fq', 'status_i:301');
  }
  if (yearFrom !== undefined || yearTo !== undefined) {
  url.searchParams.append(
    'fq',
    `cp_Car_Year_value_i:[${yearFrom ?? '*'} TO ${yearTo ?? '*'}]`,
  );
}

if (priceFrom !== undefined || priceTo !== undefined) {
  url.searchParams.append(
    'fq',
    `price_d:[${priceFrom ?? '*'} TO ${priceTo ?? '*'}]`,
  );
  url.searchParams.append('fq', '-add_on_hide_price_i:1');
}

if (cityIds.length > 0) {
  url.searchParams.append(
    'fq',
    `{!tag=CITY}city_id:(${cityIds.join(' OR ')})`,
  );
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
  let body;

  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new SolrError('Solr request failed', { cause: error });
  }

  if (!response.ok) {
    throw new SolrError(`Solr returned HTTP ${response.status}`);
  }

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
