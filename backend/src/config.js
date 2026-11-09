require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  memcached: {
    host: process.env.MEMCACHED_HOST || 'localhost',
    port: Number(process.env.MEMCACHED_PORT || 11211),
  },
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  solrUrl: process.env.SOLR_URL?.trim(),
  solrTimeoutMs: Number(process.env.SOLR_TIMEOUT_MS || 3000),
};

function assertSolrConfigured(url = config.solrUrl) {
  if (!url) {
    throw new Error('Missing Solr configuration. Please set SOLR_URL in your environment.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid SOLR_URL. It must be an absolute HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid SOLR_URL. It must be an absolute HTTP or HTTPS URL.');
  }

  if (!Number.isSafeInteger(config.solrTimeoutMs) || config.solrTimeoutMs <= 0) {
    throw new Error('SOLR_TIMEOUT_MS must be a positive integer.');
  }
}

module.exports = { ...config, assertSolrConfigured };