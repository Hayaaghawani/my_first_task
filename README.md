# OpenSooq listing lookup

This project is a small, read-only listing application. The Express backend reads an individual listing from MySQL (caching successful responses in Memcached for one hour) and provides a paginated `/listings` endpoint backed by Solr; the React frontend has separate views to search by ID or browse Solr results.

## Project structure

```text
backend/
  src/
    index.js                 # Express app and HTTP server
    config.js                # Environment configuration
    config/countries.js      # Country-code to Solr-core mapping
    db.js                    # MySQL connection pool
    cache.js                 # Memcached get/set helpers
    solr.js                  # Solr select URL, timeout, and response validation
    validation/listings.js  # /listings query validation
    services/listings.js    # Solr result mapping and paging metadata
    routes/listings.js      # GET /listings
    routes/listing.js        # GET /api/listing/:id
    services/listing.js      # Cache, query, and response formatting
    queries/listing.js       # Parameterized SELECT statements
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
npm start
```

Terminal 2 — start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Use **Find by ID** to enter a positive integer ID, or select **Browse listings** to search Solr by country/category and page through results. The ID lookup API endpoint can also be tested directly:

```text
GET http://localhost:3001/api/listing/12345
```

Replace `12345` with a listing ID available in the configured database. The API responds with `400` for an invalid ID, `404` when no listing is found, and a generic `500` response for server errors.

The Solr-backed listing endpoint is also available:

```text
GET http://localhost:3001/listings?country=jo&category=CarsForSale&page=1&per_page=20&lang=ar
```

It supports configurable country cores, category filters, pagination, and Arabic or English city names. Invalid or missing query parameters return `400`; an unavailable or timing-out Solr server returns `502`. See the [backend README](./backend/README.md#solr-listings-endpoint) for parameter rules, Solr configuration, response details, and tests.

## Production

Build the frontend from its directory:

```bash
cd frontend
npm ci
npm run build
```

Vite writes the production files to `frontend/dist/`. Serve that directory with a static web server. Configure `VITE_API_URL` before building, or proxy `/api` requests from the web server to the backend. Set the backend's `FRONTEND_ORIGIN` to the deployed frontend origin when serving the API on a different origin.

Deploy the backend separately with MySQL and Memcached connectivity and production environment variables. See the [backend deployment instructions](./backend/README.md#run-in-production) and [frontend build and serving instructions](./frontend/README.md#build-and-serve-for-production).

## Read-only and caching behavior

The backend uses only named-column `SELECT` statements with parameterized listing IDs; it does not modify database records. A successful listing response is stored in Memcached using a key based on the listing ID and a TTL of 3600 seconds. The route returns the listing JSON or the documented HTTP error status.
