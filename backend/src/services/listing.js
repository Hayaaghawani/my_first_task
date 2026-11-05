const db = require('../db');
const cache = require('../cache');
const { BASIC_LISTING, CUSTOM_PARAMS } = require('../queries/listing');

const LISTING_CACHE_TTL_SECONDS = 3600;

function pickValue(row) {
  if (row.value_1_integer !== null && row.value_1_integer !== undefined) {
    return row.value_1_integer;
  }

  if (row.value_1_double !== null && row.value_1_double !== undefined) {
    return row.value_1_double;
  }

  if (row.value_string !== null && row.value_string !== undefined) {
    return row.value_string;
  }

  if (row.value_text !== null && row.value_text !== undefined) {
    return row.value_text;
  }

  if (row.value_date_1 !== null && row.value_date_1 !== undefined) {
    return row.value_date_1;
  }

  return null;
}

function toCustomParam(row) {
  return {
    field_name: row.field_name,
    value: pickValue(row),
    option_label_ar: row.option_label_ar,
    option_label_en: row.option_label_en,
    unit: row.unit,
  };
}

function toListing(row, customParams) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: {
      amount: row.price_amount,
      currency: row.price_currency,
      has_price: Boolean(row.has_price),
    },
    city: {
      id: row.city_id,
      name: row.city_name,
    },
    neighborhood: {
      id: row.neighborhood_id,
      name: row.neighborhood_name,
    },
    custom_params: customParams,
  };
}

async function getListing(id) {
  const cacheKey = `listing:${id}`;
  const cachedListing = await cache.get(cacheKey);

  if (cachedListing !== null) {
    return cachedListing;
  }

  const [listingRows] = await db.query(BASIC_LISTING, [id]);

  if (!listingRows.length) {
    return null;
  }

  const [customRows] = await db.query(CUSTOM_PARAMS, [id]);

  const listing = toListing(listingRows[0], customRows.map(toCustomParam));
  await cache.set(cacheKey, listing, LISTING_CACHE_TTL_SECONDS);

  return listing;
}

module.exports = { getListing };