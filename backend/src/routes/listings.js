const express = require('express');
const { searchCities, SolrError } = require('../solr');
const { getListings } = require('../services/listings');
const {
  validateCityOptionsQuery,
  validateListingsQuery,
} = require('../validation/listings');

const router = express.Router();

router.get('/cities', async (req, res) => {
  const validation = validateCityOptionsQuery(req.query);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const cities = await searchCities(validation.value);
    return res.json({ cities });
  } catch (error) {
    if (error instanceof SolrError) {
      console.error('Solr city lookup failed:', error.message);
      return res.status(502).json({ error: { message: 'Solr is unavailable' } });
    }

    console.error('Failed to fetch cities:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.get('/', async (req, res) => {
  const validation = validateListingsQuery(req.query);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const result = await getListings(validation.value);
    return res.json(result);
  } catch (error) {
    if (error instanceof SolrError) {
      console.error('Solr listings request failed:', error.message);
      return res.status(502).json({ error: { message: 'Solr is unavailable' } });
    }

    console.error('Failed to fetch listings:', error);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

module.exports = router;
