const express = require('express');
const listingRoute = require('./routes/listing');
const listingsRoute = require('./routes/listings');
const { frontendOrigin } = require('./config');

const app = express();

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
app.use('/listings', listingsRoute);

module.exports = app;
