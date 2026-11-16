# OpenSooq listing lookup

This project is a small, read-only listing application. The Express backend reads an individual listing from MySQL (caching successful responses in Memcached for one hour) and provides a paginated `/listings` endpoint backed by Solr; the React frontend has separate pages to search by ID or browse Solr results. Search filters and the listing ID are stored in the URL query string for refresh and sharing.

## Project structure

```text
backend/
  src/
    server.ts                # Validates configuration and wires dependencies
    app.ts                   # Express middleware and route composition
    config/                  # Zod-validated environment and country mapping
    schemas/                 # Zod request schemas and inferred types
    routes/                  # URL to middleware/controller mapping
    controllers/             # HTTP request/response handling
    services/                # Listing, SQL/cache, and Solr services
    middleware/              # Validation, 404, and central error handling
    errors/                  # AppError and stable error codes
    queries/listing.ts       # Parameterized SQL statements
  .env.example
  README.md
frontend/
  src/
    App.jsx
    components/
      SearchBar.jsx
      Loading.jsx
      ListingCard.jsx
      CustomParams.jsx
      ErrorMessage.jsx
    services/api.js
  .env.example
  README.md
```

## Prerequisites

- Node.js 18 or newer and npm
- MySQL access to the OpenSooq database using a read-only account
- A running Memcached server

## Configure

Configure the backend first:

```bash
cd backend
cp .env.example .env
```

Fill in the database host, username, password, and database name in `backend/.env`. Check that the MySQL account has read-only (`SELECT`) permissions and that Memcached is available at the configured host and port. Do not commit `.env` or share its secrets.

The frontend reads the backend origin from `VITE_API_URL`:

```bash
cd frontend
cp .env.example .env
```

The example value `http://localhost:3001` is the default local backend URL. For local browser access, the backend's `FRONTEND_ORIGIN` should match the frontend origin, normally `http://localhost:5173`.

## Run locally

Open two terminals from the project root.

Terminal 1 — start the API:

```bash
cd backend
npm install
npm run build
npm start
```

Terminal 2 — start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Find a listing at `/search-listing?id=289115914`, or browse Solr at `/listings?country=jo&category=CarsForSale&page=1&per_page=20&lang=ar`. Search filters and pagination are kept in the URL. The ID lookup API endpoint can also be tested directly:

```text
GET http://localhost:3001/api/listing/12345
```

Replace `12345` with a listing ID available in the configured database. The API responds with `400` for an invalid ID, `404` when no listing is found, and a generic `500` response for server errors.

The Solr-backed listing endpoint is also available:

```text
GET http://localhost:3001/listings?country=jo&category=CarsForSale&page=1&per_page=20&lang=ar&sort_by=record_posted_time_i&sort_order=desc&title=Toyota
```

It supports configurable country cores, category and optional title phrase filters, pagination, sorting by post time or listing ID, Arabic or English city names, and optional image/reel/video/premium toggles. Invalid query parameters return `400`; Solr error responses return `502`, unreachable Solr returns `503`, and Solr timeouts return `504`. See the [backend README](./backend/README.md#solr-listings-endpoint) for parameter rules, Solr configuration, response details, and tests.

## Validation structure

Validation runs at two boundaries:

1. `frontend/src/validation/listings.js` validates values before the browser calls the API. This gives quick feedback and avoids sending known-invalid filters.
2. `backend/src/schemas/listings.schema.ts` validates every incoming query independently. This is the correctness boundary because frontend checks can be bypassed.
3. The backend schema converts validated query strings into the typed, camelCase object used by `services/listings.service.ts`. Services and Solr query builders receive validated values, not `req.query`.
4. Validation middleware converts Zod issues into `AppError`; one error middleware returns safe errors to users and logs technical details for developers.

When adding a filter, define its accepted form and bounds in the backend schema, map it to the service input, use only that validated value in the Solr request, then add the matching frontend schema rule and form constraints. Keep cross-field rules (such as lower bound not exceeding upper bound) in schema refinements. Avoid one-off parsing helpers in route handlers.

For example, years accept whole numbers from 1900 through 2100. A value such as `9999999999` receives a field-specific `400` on the backend and is rejected in the frontend before fetch, so it cannot be misreported as a Solr outage. Listing IDs must also be positive, safe integers before conversion and database use. The city dropdown remains available and selects `city_name_s` for Arabic or `city_name_en_s` for English.

## Production

Build the frontend from its directory:

```bash
cd frontend
npm ci
npm run build
```

Vite writes the production files to `frontend/dist/`. Serve that directory with a static web server and configure it to return `index.html` for `/search-listing` and `/listings` (SPA history fallback). Configure `VITE_API_URL` before building, or proxy API requests from the web server to the backend. Set the backend's `FRONTEND_ORIGIN` to the deployed frontend origin when serving the API on a different origin.

Deploy the backend separately with MySQL and Memcached connectivity and production environment variables. See the [backend deployment instructions](./backend/README.md#run-in-production) and [frontend build and serving instructions](./frontend/README.md#build-and-serve-for-production).

## Read-only and caching behavior

The backend uses only named-column `SELECT` statements with parameterized listing IDs; it does not modify database records. A successful listing response is stored in Memcached using a key based on the listing ID and a TTL of 3600 seconds. The route returns the listing JSON or the documented HTTP error status.
