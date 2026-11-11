const countries = require('../config/countries');

function invalidParameter(field, message) {
  return { field, message };
}

function parsePositiveInteger(value, field, defaultValue, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) {
    return { value: defaultValue };
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return { error: invalidParameter(field, `${field} must be a positive integer`) };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    return { error: invalidParameter(field, `${field} must be between 1 and ${maximum}`) };
  }

  return { value: parsed };
}

function parseToggle(query, field) {
  const value = query[field];

  if (value === undefined) {
    return { value: false };
  }

  if (value === 'true' || value === '1') {
    return { value: true };
  }

  if (value === 'false' || value === '0') {
    return { value: false };
  }

  return {
    error: invalidParameter(field, `${field} must be true, false, 1, or 0`),
  };
}
function parseOptionalRange(query, fromField, toField, { min, max } = {}) {
  const fromResult = parsePositiveInteger(
    query[fromField],
    fromField,
    undefined,
    max,
  );
  if (fromResult.error) return { error: fromResult.error };

  const toResult = parsePositiveInteger(
    query[toField],
    toField,
    undefined,
    max,
  );
  if (toResult.error) return { error: toResult.error };

  const { value: from } = fromResult;
  const { value: to } = toResult;

  for (const [field, value] of [[fromField, from], [toField, to]]) {
    if (value !== undefined && min !== undefined && value < min) {
      return {
        error: invalidParameter(field, `${field} must be at least ${min}`),
      };
    }
  }

  if (from !== undefined && to !== undefined && from > to) {
    return {
      error: invalidParameter(fromField, `${fromField} must be less than or equal to ${toField}`),
    };
  }

  return { value: { from, to } };
}
function parseCityIds(query) {
  if (query.city === undefined || query.city === '') {
    return { value: [] };
  }

  if (typeof query.city !== 'string') {
    return {
      error: invalidParameter('city', 'city must be a comma-separated list of positive integers'),
    };
  }

  const ids = query.city.split(',');
  const parsedIds = ids.map((id) => parsePositiveInteger(id, 'city'));

  const invalidId = parsedIds.find((result) => result.error);
  if (invalidId) {
    return {
      error: invalidParameter('city', 'city must be a comma-separated list of positive integers'),
    };
  }

  return { value: [...new Set(parsedIds.map((result) => result.value))] };
}

function validateListingsQuery(query) {
  const country = query.country;
  if (typeof country !== 'string' || !country.trim()) {
    return { error: invalidParameter('country', 'country is required') };
  }

  const normalizedCountry = country.trim().toLowerCase();
  if (!Object.hasOwn(countries, normalizedCountry)) {
    return { error: invalidParameter('country', 'country is not supported') };
  }

  const category = query.category;
  if (typeof category !== 'string' || !/^[A-Za-z0-9_-]+$/.test(category)) {
    return { error: invalidParameter('category', 'category must contain only letters, numbers, underscores, or hyphens') };
  }

  const page = parsePositiveInteger(query.page, 'page', 1);
  if (page.error) {
    return { error: page.error };
  }

  const perPage = parsePositiveInteger(query.per_page, 'per_page', 20, 50);
  if (perPage.error) {
    return { error: perPage.error };
  }

  if (!Number.isSafeInteger((page.value - 1) * perPage.value)) {
    return { error: invalidParameter('page', 'page is too large') };
  }

  const lang = query.lang === undefined ? 'ar' : query.lang;
  if (typeof lang !== 'string' || !['ar', 'en'].includes(lang)) {
    return { error: invalidParameter('lang', 'lang must be ar or en') };
  }

  const sortBy = query.sort_by === undefined ? 'record_posted_time_i' : query.sort_by;
  if (!['record_posted_time_i', 'post_id'].includes(sortBy)) {
    return { error: invalidParameter('sort_by', 'sort_by must be record_posted_time_i or post_id') };
  }

  const sortOrder = query.sort_order === undefined ? 'desc' : query.sort_order;
  if (!['asc', 'desc'].includes(sortOrder)) {
    return { error: invalidParameter('sort_order', 'sort_order must be asc or desc') };
  }

  const title = query.title === undefined ? '' : query.title;
  if (typeof title !== 'string' || title.length > 200) {
    return { error: invalidParameter('title', 'title must be text no longer than 200 characters') };
  }

  const hasImages = parseToggle(query, 'has_images');
  if (hasImages.error) return { error: hasImages.error };

  const hasReels = parseToggle(query, 'has_reels');
  if (hasReels.error) return { error: hasReels.error };

  const hasVideos = parseToggle(query, 'has_videos');
  if (hasVideos.error) return { error: hasVideos.error };

  const premium = parseToggle(query, 'premium');
  if (premium.error) return { error: premium.error };

  const year = parseOptionalRange(query, 'year_from', 'year_to', {
    min: 1900,
    max: 2100,
  });
  if (year.error) return { error: year.error };

  const price = parseOptionalRange(query, 'price_from', 'price_to', {
    min: 1,
  });
  if (price.error) return { error: price.error };

  const cityIds = parseCityIds(query);
  if (cityIds.error) return { error: cityIds.error };

  return {
    value: {
      country: normalizedCountry,
      countryCore: countries[normalizedCountry],
      category,
      page: page.value,
      perPage: perPage.value,
      lang,
      sortBy,
      sortOrder,
      title: title.trim(),
      hasImages: hasImages.value,
      hasReels: hasReels.value,
      hasVideos: hasVideos.value,
      premium: premium.value,
      yearFrom: year.value.from,
      yearTo: year.value.to,
      priceFrom: price.value.from,
      priceTo: price.value.to,
      cityIds: cityIds.value,
    },
  };
}

module.exports = { validateListingsQuery };
