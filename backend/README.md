# Listing lookup API

This service exposes read-only APIs for retrieving an OpenSooq listing by ID from MySQL and browsing listings from Solr. MySQL queries are parameterized, while Solr requests are constrained by configured country, category, duplicate, and expiry filters. The MySQL listing-by-ID endpoint caches successful responses in Memcached for one hour.

## Prerequisites

- Node.js 18 or newer
- MySQL access with a read-only account for the OpenSooq database
- A reachable Memcached server
- npm

## Configure the environment

From the `backend/` directory, copy the example file and fill in the values supplied for your environment:

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `DB_HOST` | MySQL server hostname | Required |
| `DB_PORT` | MySQL server port | `3306` |
| `DB_USER` | Read-only MySQL username | Required |
| `DB_PASSWORD` | MySQL password | Empty |
| `DB_NAME` | Database name | Required |
| `MEMCACHED_HOST` | Memcached hostname | `localhost` |
| `MEMCACHED_PORT` | Memcached port | `11211` |
| `PORT` | HTTP port for the API | `3001` |
| `FRONTEND_ORIGIN` | Browser origin allowed to call the API | `http://localhost:5173` |
| `SOLR_URL` | Base Solr URL, up to but not including the collection/core name | Required |
| `SOLR_TIMEOUT_MS` | Maximum time to wait for Solr | `3000` |

Keep `.env` private; do not commit database credentials. Use a database account that has only `SELECT` permission.

## Install and run locally

Start MySQL access, Memcached, and Solr, then run:

```bash
npm install
npm run build
npm start
```

The API listens on `http://localhost:3001` by default. Check it with a real listing ID:

```bash
curl -i http://localhost:3001/api/listing/12345
```

Replace `12345` with an ID that exists in the configured database. The endpoint is `GET /api/listing/:id`.

## Request flow

For `GET /listings`, `routes/listings.routes.ts` connects the URL to query-validation middleware and `ListingsController`. The middleware parses the raw query strings with the Zod schema and places its typed output in `response.locals`; invalid values become `AppError` before a service is called.

The controller calls `ListingsService`, which asks its injected `ListingsGateway` for results and builds paging metadata. At startup the gateway is a `SolrService`; it uses `SolrQueryBuilder` to build the request, calls Solr with Node's `fetch` and a timeout, checks the response, maps Solr documents to listing items, and returns that app-level result. The controller sends the success response.

The `/listings/cities` route follows the same path and uses Solr's city facet to populate the localized city dropdown. Only the city filter and returned city name use language-specific fields: `city_name_s` for Arabic and `city_name_en_s` for English. For `/api/listing/:id`, validation and HTTP handling use the same route/controller/error structure while `ListingService` keeps the existing parameterized SQL and cache behavior.

Failures are thrown as `AppError` or converted to a generic internal error by `middleware/error-handler.ts`. That middleware is the only place that logs request failures and writes error responses; the technical cause stays in logs and the user receives a stable code, safe message, and optional field.

### Solr listings endpoint

The Solr endpoint is `GET /listings`:

```text
GET http://localhost:3001/listings?country=jo&category=CarsForSale&page=1&per_page=20&lang=ar
```

`country` and `category` are required. The country code maps to a Solr core in [`src/config/countries.ts`](./src/config/countries.ts); currently `jo` maps to `country12`. `category` accepts letters, numbers, underscores, and hyphens. `page` defaults to `1`, `per_page` defaults to `20` and must be between `1` and `50`, and `lang` defaults to `ar` (`ar` or `en` are supported). `sort_by` accepts `record_posted_time_i` (the default) or `post_id`; `sort_order` accepts `asc` or `desc` (the default is `desc`). Sorting by posting time uses `post_id` as a unique tie-breaker in the same direction, so the selected direction also affects listings with matching timestamps. An optional `title` query parameter filters `title_t` by the entered phrase; it is limited to 200 characters and escaped before being sent to Solr. `has_images`, `has_reels`, `has_videos`, and `premium` are optional boolean toggles. Each accepts `true`, `false`, `1`, or `0` and defaults to `false`.

The request selects the country core and filters by the requested `tag_2_reporting_name_s`, `duplicate_i:0`, and `record_expiration_time_i` greater than or equal to the current Unix time. If `title` is supplied, the request adds a quoted, escaped `title_t` phrase filter. Toggle filters select listings with images, recent reels, recent videos, and premium status respectively. Reel and video freshness ranges use Unix seconds for the previous 24 hours. Results sort by the requested field and direction. When sorting by posting time, `post_id` is a unique tie-breaker in the same direction. The API's `meta.total` is Solr's `response.numFound` for the same filtered request. A page beyond `total_pages` returns HTTP 200 with an empty `items` array.

The response maps `post_id`, title, price/currency, the city name selected by `lang`, image URL, and image count. Zero matches return `200` with an empty `items` array. Solr error responses and invalid Solr data return `502`; unreachable Solr returns `503`; Solr request timeouts return `504`. These failures pass through the central error handler and do not terminate the Node.js process.

The localized city dropdown is populated by `GET /listings/cities?country=jo&category=CarsForSale&lang=en`. This endpoint returns city names from the `city_name_en_s` facet for English or `city_name_s` for Arabic. Its Solr facet request uses the same category, duplicate, and future-expiry filters as listing searches. Listing searches accept one selected localized `city` name and filter the matching city-name field; they do not accept city IDs.

### Solr query parameters and errors

- `400`: invalid or missing parameter; response has `error.code`, a user-facing `error.message`, and `error.field` when a single field caused the error.
- `404`: unknown route or listing ID was not found.
- `502`: Solr replied with an error or invalid data.
- `503`: Solr is unreachable.
- `504`: Solr timed out.
- `500`: unexpected server-side error.

The configured `SOLR_URL` is the Solr base URL, for example `http://localhost:8983/solr`; the service appends `<core>/select`. The service will not start if `SOLR_URL` is missing or is not an absolute HTTP(S) URL.

### Responses

- `200`: listing JSON, including an empty `items` array when there are no matches
- `400`: invalid query parameter or listing ID
- `404`: unknown route or listing does not exist
- `502`: Solr returned an error or invalid response data
- `503`: Solr could not be reached
- `504`: Solr did not respond before the configured timeout
- `500`: unexpected server-side error; internal details are logged but not sent to the user

## Database query and relationships

The SQL is kept in [`src/queries/listing.ts`](./src/queries/listing.ts). The basic listing query reads from `posts`, joining `cities` through `posts.cities_id = cities.id` and `neighborhood` through `posts.neighborhood_id = neighborhood.id`.

The custom-parameter query starts from `post_dynamic_attribute_value`, joins `post_dynamic_attribute_field` through `field_id`, and optionally joins `post_dynamic_attribute_option` through `field_option_id_1` and `unit` through `unit_id`. Both queries select named columns and bind the listing ID as a parameter; user input is not concatenated into SQL. All database queries are read-only `SELECT` statements.

The returned listing is assembled in [`src/services/listing.service.ts`](./src/services/listing.service.ts). Review the SQL against the schema available in your environment, since database column names can vary by version.

## Run in production

Set the environment variables in the production process manager or deployment platform and make sure MySQL and Memcached are reachable. Build TypeScript before pruning development dependencies:

```bash
npm ci
npm run build
npm prune --omit=dev
```

For example, with PM2:

```bash
pm2 start npm --name listing-api -- start
pm2 save
```

Configure the production frontend origin with `FRONTEND_ORIGIN`. Keep secrets in the process manager or hosting platform's secret store, not in source control. Configure the production web server or load balancer to expose the API over HTTPS and forward requests to the Node.js process.

## Tests

Run the unit and route tests with:

```bash
npm test
```

The tests cover configuration and query validation, Solr URL filters and localized city fields, response mapping, empty results, Solr status classification, and central error response formatting.
