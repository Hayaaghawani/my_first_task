import { listingIdSchema, validateListingsInput } from '../validation/listings.js';
import { FILTER_LABELS } from '../config/filterLabels.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .trim()
  .replace(/\/+$/, '');

async function readJsonResponse(response, invalidResponseMessage) {
  try {
    return await response.json();
  } catch {
    throw new Error(invalidResponseMessage);
  }
}

const API_FIELD_LABELS = {
  id: 'listingId',
  country: 'countryCode',
  category: 'category',
  page: 'page',
  per_page: 'perPage',
  lang: 'language',
  sort_by: 'sortResults',
  sort_order: 'sortResults',
  title: 'titleContains',
  city: 'city',
  year_from: 'year',
  year_to: 'year',
  price_from: 'price',
  price_to: 'price',
  has_images: 'hasImages',
  has_reels: 'hasReels',
  has_videos: 'hasVideos',
  premium: 'premium',
};

function getApiErrorMessage({ body, fallbackMessage, language = 'en' }) {
  const field = body?.error?.field;
  const message = body?.error?.message;
  if (field && message) {
    const labelKey = API_FIELD_LABELS[field];
    const label = labelKey ? FILTER_LABELS[labelKey][language] : field;
    return `${label}: ${message}`;
  }
  return message || fallbackMessage;
}

export async function fetchListing(id) {
  const normalizedId = String(id).trim();
  if (!listingIdSchema.safeParse(normalizedId).success) {
    throw new Error('Invalid ID');
  }

  let response;
  try {
    response = await fetch(
      `${API_URL}/api/listing/${encodeURIComponent(normalizedId)}`,
    );
  } catch {
    throw new Error('Something went wrong');
  }

  const body = await readJsonResponse(response, 'The listing service returned an invalid response');
  if (!response.ok) {
    throw new Error(getApiErrorMessage({
      body,
      fallbackMessage: 'Could not load this listing',
    }));
  }
  return body;
}

export async function fetchListings({
  country,
  category,
  page,
  perPage,
  per_page: perPageParam,
  lang,
  sort_by: sortBy = 'record_posted_time_i',
  sort_order: sortOrder = 'desc',
  title = '',
  has_images: hasImages = 'false',
  has_reels: hasReels = 'false',
  has_videos: hasVideos = 'false',
  premium = 'false',
  city = '',
  year_from: yearFrom = '',
  year_to: yearTo = '',
  price_from: priceFrom = '',
  price_to: priceTo = '',
}) {
  const validation = validateListingsInput({
    country, category, page: String(page), perPage: String(perPage ?? perPageParam), lang,
    sortBy, sortOrder, title, city,
    yearFrom: String(yearFrom), yearTo: String(yearTo),
    priceFrom: String(priceFrom), priceTo: String(priceTo),
    hasImages: String(hasImages), hasReels: String(hasReels),
    hasVideos: String(hasVideos), premium: String(premium),
  });
  if (!validation.success) {
    const labelKey = API_FIELD_LABELS[validation.field];
    const fieldLabel = labelKey ? FILTER_LABELS[labelKey][lang] : validation.field;
    throw new Error(`${fieldLabel}: ${validation.message}`);
  }

  const params = new URLSearchParams({
    country,
    category,
    page: String(page),
    per_page: String(perPage ?? perPageParam),
    lang,
    sort_by: sortBy,
    sort_order: sortOrder,
    has_images: String(hasImages),
    has_reels: String(hasReels),
    has_videos: String(hasVideos),
    premium: String(premium),
  });
  if (title.trim()) {
    params.set('title', title.trim());
  }
  for (const [name, value] of [
    ['city', city],
    ['year_from', yearFrom],
    ['year_to', yearTo],
    ['price_from', priceFrom],
    ['price_to', priceTo],
  ]) {
    if (value !== '' && value !== undefined && value !== null) {
      params.set(name, String(value));
    }
  }

  let response;
  try {
    response = await fetch(`${API_URL}/listings?${params}`);
  } catch {
    throw new Error('Could not connect to the listings service');
  }

  const body = await readJsonResponse(
    response,
    'The listings service returned an invalid response',
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage({
      body,
      fallbackMessage: 'Could not load listings',
      language: lang,
    }));
  }

  return body;
}

export async function fetchCityOptions({ country, category, lang }) {
  const params = new URLSearchParams({ country, category, lang });
  let response;

  try {
    response = await fetch(`${API_URL}/listings/cities?${params}`);
  } catch {
    throw new Error('Could not connect to the city list service');
  }

  const body = await readJsonResponse(
    response,
    'The city list service returned an invalid response',
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage({
      body,
      fallbackMessage: 'Could not load cities',
      language: lang,
    }));
  }

  if (!Array.isArray(body?.cities) || body.cities.some((city) => typeof city !== 'string')) {
    throw new Error('The city list service returned an invalid response');
  }

  return body.cities;
}

