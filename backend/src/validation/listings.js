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

  return {
    value: {
      country: normalizedCountry,
      countryCore: countries[normalizedCountry],
      category,
      page: page.value,
      perPage: perPage.value,
      lang,
    },
  };
}

module.exports = { validateListingsQuery };
