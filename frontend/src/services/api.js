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
}) {
  const params = new URLSearchParams({
    country,
    category,
    page: String(page),
    per_page: String(perPage ?? perPageParam),
    lang,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

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
