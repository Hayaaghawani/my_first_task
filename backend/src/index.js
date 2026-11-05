const express = require('express');
const { port, db, frontendOrigin } = require('./config');
const listingRoute = require('./routes/listing');

const app = express();

if (!db.host || !db.user || !db.database) {
  throw new Error('Missing database configuration. Please set DB_HOST, DB_USER, and DB_NAME in your environment.');
}

app.use((req, res, next) => {
  const origin = req.get('Origin');

  if (origin === frontendOrigin) {
    res.set('Access-Control-Allow-Origin', frontendOrigin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use('/api/listing', listingRoute);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});