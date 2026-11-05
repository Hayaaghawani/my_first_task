const express = require('express');
const { port, db } = require('./config');
const listingRoute = require('./routes/listing');

const app = express();

if (!db.host || !db.user || !db.database) {
  throw new Error('Missing database configuration. Please set DB_HOST, DB_USER, and DB_NAME in your environment.');
}

app.use('/api/listing', listingRoute);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});