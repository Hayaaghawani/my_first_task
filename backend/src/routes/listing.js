const express = require('express');
const { getListing } = require('../services/listing');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const listing = await getListing(Number(id));

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    return res.json(listing);
  } catch (error) {
    console.error('Failed to fetch listing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;