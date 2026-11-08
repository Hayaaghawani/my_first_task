# Listing lookup API

This service exposes a read-only API for retrieving an OpenSooq listing by ID. It uses Express and parameterized MySQL queries to load listing data, and caches successful listing responses in Memcached for one hour.

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

Keep `.env` private; do not commit database credentials. Use a database account that has only `SELECT` permission.

## Install and run locally

Start MySQL access and Memcached, then run:

```bash
npm install
npm start
```

The API listens on `http://localhost:3001` by default. Check it with a real listing ID:

```bash
curl -i http://localhost:3001/api/listing/12345
```

Replace `12345` with an ID that exists in the configured database. The endpoint is `GET /api/listing/:id`.

### Responses

- `200`: listing JSON
- `400`: ID is not a positive integer
- `404`: no listing exists for that ID
- `500`: a server-side error occurred; internal error details are not included in the response

## Database query and relationships

The SQL is kept in [`src/queries/listing.js`](./src/queries/listing.js). The basic listing query reads from `posts`, joining `cities` through `posts.cities_id = cities.id` and `neighborhood` through `posts.neighborhood_id = neighborhood.id`.

The custom-parameter query starts from `post_dynamic_attribute_value`, joins `post_dynamic_attribute_field` through `field_id`, and optionally joins `post_dynamic_attribute_option` through `field_option_id_1` and `unit` through `unit_id`. Both queries select named columns and bind the listing ID as a parameter; user input is not concatenated into SQL. All database queries are read-only `SELECT` statements.

The returned listing is assembled in [`src/services/listing.js`](./src/services/listing.js). Review the SQL against the schema available in your environment, since database column names can vary by version.

## Run in production

Set the environment variables in the production process manager or deployment platform, make sure MySQL and Memcached are reachable, and install production dependencies:

```bash
npm ci --omit=dev
```

For example, with PM2:

```bash
pm2 start npm --name listing-api -- start
pm2 save
```

Configure the production frontend origin with `FRONTEND_ORIGIN`. Keep secrets in the process manager or hosting platform's secret store, not in source control. Configure the production web server or load balancer to expose the API over HTTPS and forward requests to the Node.js process.