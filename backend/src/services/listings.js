const { searchListings } = require('../solr');

const IMAGE_PREVIEW_BASE_URL = 'https://arbokv2-images.sooqdev1.com/previews/640x480';

function getPagingMeta(page, perPage, total) {
  const totalPages = Math.ceil(total / perPage);
  return {
    page,
    per_page: perPage,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
  };
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapSolrDocument(doc, lang = 'ar') {
  const imageUri = firstValue(doc.image_uri_s);
  const imagePath = imageUri
    ? String(imageUri)
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/')
    : '';
  return {
    id: firstValue(doc.post_id),
    title: firstValue(doc.title_t) ?? '',
    price: firstValue(doc.price_d) ?? null,
    currency: firstValue(doc.price_currency_code_s) ?? '',
    city: firstValue(lang === 'en' ? doc.city_name_en_s : doc.city_name_s) ?? '',
    image: imagePath ? `${IMAGE_PREVIEW_BASE_URL}/${imagePath}.webp` : '',
    image_count: firstValue(doc.image_count_i) ?? 0,
  };
}

async function getListings(query, { solrSearch = searchListings, nowSeconds } = {}) {
  const result = await solrSearch({
    countryCore: query.countryCore,
    category: query.category,
    start: (query.page - 1) * query.perPage,
    rows: query.perPage,
    lang: query.lang,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    title: query.title,
    nowSeconds,
  });

  return {
    items: result.docs.map((doc) => mapSolrDocument(doc, query.lang)),
    meta: getPagingMeta(query.page, query.perPage, result.total),
  };
}

module.exports = { getListings, getPagingMeta, mapSolrDocument };
