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
