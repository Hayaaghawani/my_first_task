# Listing lookup frontend

A small React app for looking up an OpenSooq listing by ID and browsing paginated Solr listings through the backend API. The ID lookup displays listing details and custom parameters; browsing supports country, category, page size, and city language.

## Prerequisites

- Node.js 18 or newer
- The backend running and connected to its MySQL and Memcached services

## Configure the API URL

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend origin. The default local value is:

```env
VITE_API_URL=http://localhost:3001
```

For local development, the backend's `FRONTEND_ORIGIN` must include the Vite origin (`http://localhost:5173`). The backend defaults to that origin; set `FRONTEND_ORIGIN` in the backend environment if the frontend is served from a different origin.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The app has separate pages:

- `/search-listing?id=289115914` looks up one listing through MySQL. The `id` parameter is optional until you search.
- `/listings?country=jo&category=CarsForSale&page=1&per_page=20&lang=ar&sort_by=record_posted_time_i&sort_order=desc&title=Toyota` browses Solr listings. Search filters (including the optional title phrase), language, sorting, and pagination live in the URL, so refreshing or sharing the URL keeps the same search. Country is fixed to `jo`; use the language selector in the page header for Arabic or English city names.

The Solr endpoint maps image filenames to the remote preview service at `https://arbokv2-images.sooqdev1.com/previews/640x480`.

## Build and serve for production

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. Configure the web server to serve `index.html` for the `/search-listing` and `/listings` paths (SPA history fallback), and proxy API requests to the backend or set `VITE_API_URL` to a backend origin that permits the deployed frontend origin. Because Vite embeds environment values at build time, set `VITE_API_URL` before running `npm run build`.
