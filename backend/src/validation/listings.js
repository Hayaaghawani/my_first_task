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
    },
  };
}

module.exports = { validateListingsQuery };
