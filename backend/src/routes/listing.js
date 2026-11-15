const express = require('express');
const { getListing } = require('../services/listing');
const { listingIdSchema } = require('../validation/listings');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const validation = listingIdSchema.safeParse(req.params.id);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const listing = await getListing(validation.data);

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
