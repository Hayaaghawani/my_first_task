const app = require('./app');
const { port, db, assertSolrConfigured } = require('./config');

assertSolrConfigured();

if (!db.host || !db.user || !db.database) {
  throw new Error('Missing database configuration. Please set DB_HOST, DB_USER, and DB_NAME in your environment.');
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});