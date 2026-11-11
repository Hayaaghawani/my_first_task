const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .trim()
  .replace(/\/+$/, '');

const ERROR_MESSAGES = {
  400: 'Invalid ID',
  404: 'Listing not found',
  500: 'Something went wrong',
};

export async function fetchListing(id) {
  const normalizedId = String(id).trim();

  if (!/^[1-9]\d*$/.test(normalizedId)) {
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

  if (!response.ok) {
    throw new Error(ERROR_MESSAGES[response.status] || 'Something went wrong');
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Something went wrong');
  }
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

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The listings service returned an invalid response');
  }

  if (!response.ok) {
    const field = body?.error?.field;
    const message = body?.error?.message;
    throw new Error(field ? `${field}: ${message}` : message || 'Could not load listings');
  }

  return body;
}
