process.env.SOLR_URL ||= 'http://127.0.0.1:8983/solr';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const config = require('../src/config');
const app = require('../src/app');
const { getPagingMeta, getListings, mapSolrDocument } = require('../src/services/listings');
const { buildSelectUrl, SolrError, searchListings } = require('../src/solr');
const { validateListingsQuery } = require('../src/validation/listings');

test('requires a valid Solr URL at startup', () => {
  assert.throws(() => config.assertSolrConfigured(''), /SOLR_URL/);
  assert.throws(() => config.assertSolrConfigured('file:///tmp/solr'), /HTTP or HTTPS/);
  assert.doesNotThrow(() => config.assertSolrConfigured('http://localhost:8983/solr'));
});

test('validates country, category, paging, and language parameters', () => {
  assert.deepEqual(validateListingsQuery({
    country: 'jo',
    category: 'CarsForSale',
  }).value, {
    country: 'jo',
    countryCore: 'country12',
    category: 'CarsForSale',
    page: 1,
    perPage: 20,
    lang: 'ar',
  });

  for (const [query, field] of [
    [{ category: 'CarsForSale' }, 'country'],
    [{ country: 'xx', category: 'CarsForSale' }, 'country'],
    [{ country: 'jo' }, 'category'],
    [{ country: 'jo', category: 'Cars For Sale' }, 'category'],
    [{ country: 'jo', category: 'Cars:ForSale' }, 'category'],
    [{ country: 'jo', category: 'CarsForSale', page: '0' }, 'page'],
    [{ country: 'jo', category: 'CarsForSale', per_page: '51' }, 'per_page'],
    [{ country: 'jo', category: 'CarsForSale', lang: 'fr' }, 'lang'],
  ]) {
    assert.equal(validateListingsQuery(query).error.field, field);
  }
});

test('builds a Solr select URL with category filters, duplicate and expiry filters, and stable sorting', () => {
  const url = buildSelectUrl({
    baseUrl: 'http://solr.test/solr',
    countryCore: 'country12',
    category: 'CarsForSale',
    start: 20,
    rows: 10,
    nowSeconds: 1_800_000_000,
    lang: 'en',
  });

  assert.equal(url.pathname, '/solr/country12/select');
  assert.equal(url.searchParams.get('q'), '*:*');
  assert.deepEqual(url.searchParams.getAll('fq'), [
    'tag_2_reporting_name_s:CarsForSale',
    'duplicate_i:0',
    'record_expiration_time_i:[1800000000 TO *]',
  ]);
  assert.equal(url.searchParams.get('sort'), 'record_posted_time_i desc,post_id asc');
  assert.equal(url.searchParams.get('start'), '20');
  assert.equal(url.searchParams.get('rows'), '10');
});

test('maps Solr documents and selects the requested city language', () => {
  const document = {
    post_id: 123,
    title_t: 'Car for sale',
    price_d: 12000.5,
    price_currency_code_s: 'JOD',
    city_name_s: 'عمّان',
    city_name_en_s: 'Amman',
    image_path_s: 'https://images.test/',
    post_image_s: 'car.jpg',
    image_count_i: 4,
  };

  assert.deepEqual(mapSolrDocument(document, 'en'), {
    id: 123,
    title: 'Car for sale',
    price: 12000.5,
    currency: 'JOD',
    city: 'Amman',
    image: 'https://images.test/car.jpg',
    image_count: 4,
  });
  assert.equal(mapSolrDocument({ post_image_s: null }, 'ar').image, '');
});

test('calculates page offsets and metadata from Solr numFound', async () => {
  let searchOptions;
  const result = await getListings({
    countryCore: 'country12',
    category: 'CarsForSale',
    page: 3,
    perPage: 10,
    lang: 'ar',
  }, {
    nowSeconds: 1_800_000_000,
    solrSearch: async (options) => {
      searchOptions = options;
      return { total: 25, docs: [{ post_id: 21 }] };
    },
  });

  assert.equal(searchOptions.start, 20);
  assert.equal(searchOptions.rows, 10);
  assert.deepEqual(result, {
    items: [{
      id: 21,
      title: '',
      price: null,
      currency: '',
      city: '',
      image: '',
      image_count: 0,
    }],
    meta: {
      page: 3,
      per_page: 10,
      total: 25,
      total_pages: 3,
      has_next: false,
    },
  });
  assert.deepEqual(getPagingMeta(4, 10, 25), {
    page: 4,
    per_page: 10,
    total: 25,
    total_pages: 3,
    has_next: false,
  });
});

test('converts an unreachable Solr server into a SolrError', async () => {
  await assert.rejects(
    searchListings({
      baseUrl: 'http://solr.test/solr',
      countryCore: 'country12',
      category: 'CarsForSale',
      start: 0,
      rows: 20,
      lang: 'ar',
    }, {
      fetchImpl: async () => {
        throw new Error('connection refused');
      },
      timeoutMs: 100,
    }),
    SolrError,
  );
});

test('returns 502 for Solr failures and keeps serving requests', async () => {
  const originalFetch = global.fetch;
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    global.fetch = async () => {
      throw new Error('connection refused');
    };

    const failedRequest = await requestJson(port, '/listings?country=jo&category=CarsForSale');
    assert.equal(failedRequest.status, 502);
    assert.deepEqual(failedRequest.body, { error: { message: 'Solr is unavailable' } });

    global.fetch = async () => ({
      ok: true,
      json: async () => ({ response: { numFound: 12, docs: [] } }),
    });

    const laterPage = await requestJson(
      port,
      '/listings?country=jo&category=CarsForSale&page=4&per_page=5',
    );
    assert.equal(laterPage.status, 200);
    assert.deepEqual(laterPage.body, {
      items: [],
      meta: {
        page: 4,
        per_page: 5,
        total: 12,
        total_pages: 3,
        has_next: false,
      },
    });
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('returns 502 for Solr timeouts and keeps serving requests', async () => {
  const originalFetch = global.fetch;
  const originalTimeout = AbortSignal.timeout;
  const controller = new AbortController();
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    AbortSignal.timeout = () => {
      setImmediate(() => controller.abort());
      return controller.signal;
    };
    global.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('request timed out')), {
        once: true,
      });
    });

    const timedOutRequest = await requestJson(port, '/listings?country=jo&category=CarsForSale');
    assert.equal(timedOutRequest.status, 502);
    assert.deepEqual(timedOutRequest.body, { error: { message: 'Solr is unavailable' } });

    global.fetch = async () => ({
      ok: true,
      json: async () => ({ response: { numFound: 0, docs: [] } }),
    });
    const followingRequest = await requestJson(
      port,
      '/listings?country=jo&category=CarsForSale',
    );
    assert.equal(followingRequest.status, 200);
    assert.equal(followingRequest.body.meta.total, 0);
  } finally {
    global.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

function requestJson(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(body) });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}
