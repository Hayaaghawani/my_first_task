const assert = require('node:assert/strict');
const test = require('node:test');
const { loadConfig } = require('../dist/config/env');
const { ListingController } = require('../dist/controllers/listing.controller');
const { ListingsController } = require('../dist/controllers/listings.controller');
const { AppError, ErrorCode } = require('../dist/errors/app-error');
const { errorHandler } = require('../dist/middleware/error-handler');
const { notFoundHandler } = require('../dist/middleware/not-found');
const { validateQuery } = require('../dist/middleware/validate-query');
const { listingsQuerySchema } = require('../dist/schemas/listings.schema');
const { ListingsService, getPagingMeta } = require('../dist/services/listings.service');
const { SolrQueryBuilder } = require('../dist/services/solr/solr-query.builder');
const { SolrService } = require('../dist/services/solr/solr.service');

const validEnvironment = {
  SOLR_URL: 'http://solr.test/solr',
  DB_HOST: 'localhost',
  DB_USER: 'test-user',
  DB_NAME: 'test-db',
};

function createListingsQuery(overrides = {}) {
  return listingsQuerySchema.parse({
    country: 'jo',
    category: 'CarsForSale',
    ...overrides,
  });
}

function createResponse() {
  return {
    headersSent: false,
    locals: {},
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function handleError(error, path = '/listings') {
  const response = createResponse();
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    errorHandler(error, { method: 'GET', originalUrl: path }, response, (nextError) => {
      throw nextError;
    });
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  return response;
}

test('loads and validates application configuration once', () => {
  const config = loadConfig(validEnvironment);
  assert.equal(config.port, 3001);
  assert.equal(config.solrTimeoutMs, 3000);
  assert.equal(config.solrUrl, 'http://solr.test/solr');
  assert.throws(() => loadConfig({ ...validEnvironment, SOLR_URL: 'file:///tmp/solr' }));
  assert.throws(() => loadConfig({ ...validEnvironment, SOLR_TIMEOUT_MS: '0' }));
});

test('validates query fields, applies defaults, and rejects unsafe years', () => {
  const query = createListingsQuery();
  assert.equal(query.page, 1);
  assert.equal(query.perPage, 20);
  assert.equal(query.lang, 'ar');
  assert.equal(query.sortBy, 'record_posted_time_i');
  assert.equal(query.sortOrder, 'desc');
  assert.equal(query.hasImages, false);
  assert.equal(query.countryCore, 'country12');

  for (const [input, expectedField] of [
    [{ country: 'unknown', category: 'CarsForSale' }, 'country'],
    [{ country: 'jo', category: 'Cars For Sale' }, 'category'],
    [{ country: 'jo', category: 'CarsForSale', page: '0' }, 'page'],
    [{ country: 'jo', category: 'CarsForSale', per_page: '51' }, 'per_page'],
    [{ country: 'jo', category: 'CarsForSale', year_from: '9999999999' }, 'year_from'],
    [{ country: 'jo', category: 'CarsForSale', year_from: '2020', year_to: '2010' }, 'year_from'],
    [{ country: 'jo', category: 'CarsForSale', title: ['car', 'truck'] }, 'title'],
  ]) {
    const result = listingsQuerySchema.safeParse(input);
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].path[0], expectedField);
  }
});

test('validation middleware turns invalid query values into a field-specific AppError', async () => {
  const request = { query: { country: 'jo', category: 'CarsForSale', year_from: '9999999999' } };
  const response = createResponse();
  let validationError;

  await new Promise((resolve) => {
    validateQuery(listingsQuerySchema)(request, response, (error) => {
      validationError = error;
      resolve();
    });
  });

  assert.ok(validationError instanceof AppError);
  assert.equal(validationError.status, 400);
  assert.equal(validationError.code, ErrorCode.INVALID_INPUT);
  assert.equal(validationError.field, 'year_from');
  assert.match(validationError.publicMessage, /2100/);
});

test('builds Solr listing and localized city URLs using city-specific fields only', () => {
  const builder = new SolrQueryBuilder('http://solr.test/solr');
  const query = createListingsQuery({
    lang: 'en',
    title: 'Toyota (Corolla)',
    city: 'Amman',
    year_from: '2018',
    year_to: '2024',
    price_from: '5000',
    has_images: 'true',
  });
  const url = builder.buildListingsUrl({ query, nowSeconds: 1_800_000_000 });

  assert.equal(url.pathname, '/solr/country12/select');
  assert.equal(url.searchParams.get('start'), '0');
  assert.equal(url.searchParams.get('rows'), '20');
  assert.equal(url.searchParams.get('sort'), 'record_posted_time_i desc,post_id desc');
  assert.ok(url.searchParams.getAll('fq').includes('title_t:"Toyota \\(Corolla\\)"'));
  assert.ok(url.searchParams.getAll('fq').includes('city_name_en_s:"Amman"'));
  assert.ok(url.searchParams.getAll('fq').includes('cp_Car_Year_value_i:[2018 TO 2024]'));
  assert.ok(url.searchParams.getAll('fq').includes('image_count_i:[1 TO *]'));
  assert.ok(!url.searchParams.getAll('fq').includes('city_name_s:"Amman"'));

  const cityUrl = builder.buildCitiesUrl({
    query: { country: 'jo', countryCore: 'country12', category: 'CarsForSale', lang: 'ar' },
    nowSeconds: 1_800_000_000,
  });
  assert.equal(cityUrl.searchParams.get('facet.field'), 'city_name_s');
  assert.equal(cityUrl.searchParams.get('rows'), '0');
});

test('Solr service maps listing responses and treats zero matches as a successful result', async () => {
  let requestedUrl;
  const solr = new SolrService({
    queryBuilder: new SolrQueryBuilder('http://solr.test/solr'),
    timeoutMs: 100,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return {
        ok: true,
        json: async () => ({
          response: {
            numFound: 1,
            docs: [{
              post_id: 21,
              title_t: 'Car for sale',
              price_d: 12000,
              price_currency_code_s: 'JOD',
              city_name_s: 'عمّان',
              city_name_en_s: 'Amman',
              image_uri_s: 'cars/car 1',
              image_count_i: 2,
            }],
          },
        }),
      };
    },
  });

  const result = await solr.search(createListingsQuery({ lang: 'en' }));
  assert.equal(requestedUrl.searchParams.get('fl').includes('city_name_en_s'), true);
  assert.deepEqual(result.items[0], {
    id: 21,
    title: 'Car for sale',
    price: 12000,
    currency: 'JOD',
    city: 'Amman',
    image: 'https://arbokv2-images.sooqdev1.com/previews/640x480/cars/car%201.webp',
    image_count: 2,
  });

  const emptySolr = new SolrService({
    queryBuilder: new SolrQueryBuilder('http://solr.test/solr'),
    timeoutMs: 100,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ response: { numFound: 0, docs: [] } }),
    }),
  });
  assert.deepEqual(await emptySolr.search(createListingsQuery()), { total: 0, items: [] });
});

test('maps Solr error replies, network failures, and timeouts to distinct statuses', async () => {
  const query = createListingsQuery();
  const builder = new SolrQueryBuilder('http://solr.test/solr');
  const cases = [
    [async () => { throw new Error('connection refused'); }, 503, ErrorCode.SOLR_UNAVAILABLE],
    [async () => { const error = new Error('timed out'); error.name = 'TimeoutError'; throw error; }, 504, ErrorCode.SOLR_TIMEOUT],
    [async () => ({ ok: false, status: 500 }), 502, ErrorCode.SOLR_ERROR],
  ];

  for (const [fetchImpl, status, code] of cases) {
    const solr = new SolrService({ queryBuilder: builder, timeoutMs: 100, fetchImpl });
    await assert.rejects(solr.search(query), (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, status);
      assert.equal(error.code, code);
      return true;
    });
  }
});

test('controllers preserve city options and return an empty successful search', async () => {
  const gateway = {
    search: async () => ({ total: 0, items: [] }),
    listCities: async (query) => [query.lang === 'en' ? 'Amman' : 'عمّان'],
  };
  const controller = new ListingsController(new ListingsService(gateway));
  const searchResponse = createResponse();
  searchResponse.locals.validatedQuery = createListingsQuery();
  await controller.search({}, searchResponse, (error) => { throw error; });
  assert.equal(searchResponse.statusCode, 200);
  assert.deepEqual(searchResponse.body, {
    items: [],
    meta: { page: 1, per_page: 20, total: 0, total_pages: 0, has_next: false },
  });

  const cityResponse = createResponse();
  cityResponse.locals.validatedQuery = {
    country: 'jo', countryCore: 'country12', category: 'CarsForSale', lang: 'en',
  };
  await controller.cities({}, cityResponse, (error) => { throw error; });
  assert.deepEqual(cityResponse.body, { cities: ['Amman'] });
});

test('central error middleware returns safe codes and unknown routes use 404', async () => {
  const invalidInput = new AppError({
    status: 400,
    code: ErrorCode.INVALID_INPUT,
    publicMessage: 'Year must be between 1900 and 2100.',
    field: 'year_from',
  });
  const response = handleError(invalidInput);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: {
      code: ErrorCode.INVALID_INPUT,
      message: 'Year must be between 1900 and 2100.',
      field: 'year_from',
    },
  });

  let notFoundError;
  notFoundHandler({ method: 'GET', path: '/missing' }, {}, (error) => {
    notFoundError = error;
  });
  assert.equal(notFoundError.status, 404);
  assert.equal(handleError(notFoundError, '/missing').statusCode, 404);

  const listingController = new ListingController({ getById: async () => null });
  const listingResponse = createResponse();
  listingResponse.locals.validatedParams = 12;
  await assert.rejects(
    listingController.getById({}, listingResponse, (error) => { throw error; }),
    (error) => error.status === 404 && error.code === ErrorCode.LISTING_NOT_FOUND,
  );
});

test('paging metadata supports zero results', () => {
  assert.deepEqual(getPagingMeta({ page: 1, perPage: 20, total: 0 }), {
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
  });
});
