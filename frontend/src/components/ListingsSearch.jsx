import { useEffect, useState } from 'react';
import { fetchListings } from '../services/api.js';
import ErrorMessage from './ErrorMessage.jsx';
import Loading from './Loading.jsx';

const DEFAULT_QUERY = {
  country: 'jo',
  category: 'CarsForSale',
  page: '1',
  per_page: '20',
  lang: 'ar',
  sort_by: 'record_posted_time_i',
  sort_order: 'desc',
  title: '',
};

function readQueryFromUrl() {
  const search = new URLSearchParams(window.location.search);
  const query = Object.fromEntries(
    Object.keys(DEFAULT_QUERY).map((key) => [key, search.get(key) ?? DEFAULT_QUERY[key]]),
  );
  const canonicalQuery = new URLSearchParams(query);
  if (!query.title.trim()) {
    canonicalQuery.delete('title');
  }
  const canonicalUrl = `/listings?${canonicalQuery}`;

  if (`${window.location.pathname}${window.location.search}` !== canonicalUrl) {
    window.history.replaceState(null, '', canonicalUrl);
  }

  return query;
}

function buildPageUrl(query, page) {
  const params = new URLSearchParams({ ...query, page: String(page) });
  if (!query.title.trim()) {
    params.delete('title');
  }
  return `/listings?${params}`;
}

function formatPrice(price, currency) {
  if (price === null || price === undefined || price === '') {
    return 'Contact for price';
  }

  return [Number(price).toLocaleString(), currency].filter(Boolean).join(' ');
}

function submitSearch(event, language) {
  event.preventDefault();
  const params = new URLSearchParams(new FormData(event.currentTarget));
  params.set('country', 'jo');
  params.set('lang', language);
  params.set('page', '1');
  window.location.assign(`/listings?${params}`);
}

export default function ListingsSearch() {
  const [query] = useState(readQueryFromUrl);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchListings(query)
      .then((response) => {
        if (active) {
          setResult(response);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Could not load listings');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  const meta = result?.meta;

  return (
    <>
      <form
        className="search-panel browse-form"
        onSubmit={(event) => submitSearch(event, query.lang)}
      >
        <div className="browse-fields">
          <label>
            Country code
            <input
              name="country"
              defaultValue={query.country}
              readOnly
              aria-readonly="true"
            />
          </label>
          <label>
            Category
            <input
              name="category"
              defaultValue={query.category}
              required
              autoComplete="off"
            />
          </label>
          <label>
            Title contains
            <input
              name="title"
              type="search"
              defaultValue={query.title}
              maxLength={200}
              autoComplete="off"
              placeholder="Search listing titles"
            />
          </label>
          <label>
            Per page
            <select name="per_page" defaultValue={query.per_page}>
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select name="sort_by" defaultValue={query.sort_by}>
              <option value="record_posted_time_i">Date posted</option>
              <option value="post_id">Listing ID</option>
            </select>
          </label>
          <label>
            Sort direction
            <select name="sort_order" defaultValue={query.sort_order}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
        <button type="submit">Search listings</button>
      </form>

      <div className="result-area" aria-live="polite">
        {loading && <Loading />}
        {!loading && error && <ErrorMessage message={error} />}
        {!loading && result && (
          <>
            <div className="browse-summary">
              <p>
                {meta.total.toLocaleString()} listings
                <span> · </span>
                Page {meta.page} of {meta.total_pages}
              </p>
              <p>
                Sorted by {query.sort_by === 'post_id' ? 'listing ID' : 'date posted'}
                {' · '}
                {query.sort_order === 'asc' ? 'ascending' : 'descending'}
              </p>
            </div>
            {result.items.length === 0 ? (
              <p className="empty-results">No listings found on this page.</p>
            ) : (
              <div className="browse-results">
                {result.items.map((item) => (
                  <article className="browse-card" key={item.id}>
                    {item.image ? (
                      <img
                        className="browse-image"
                        src={item.image}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="browse-image browse-image-placeholder" aria-hidden="true">
                        No image
                      </div>
                    )}
                    <div className="browse-card-content">
                      <h2>{item.title || 'Untitled listing'}</h2>
                      <p className="browse-price">{formatPrice(item.price, item.currency)}</p>
                      <p className="browse-location">{item.city || '—'}</p>
                      <p className="browse-image-count">{item.image_count} photos</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <nav className="pagination" aria-label="Listing pages">
              {meta.page > 1 ? (
                <a
                  className="pagination-button"
                  href={buildPageUrl(query, meta.page - 1)}
                >
                  Previous
                </a>
              ) : (
                <span className="pagination-button is-disabled" aria-disabled="true">
                  Previous
                </span>
              )}
              <span>Page {meta.page}</span>
              {meta.has_next ? (
                <a
                  className="pagination-button"
                  href={buildPageUrl(query, meta.page + 1)}
                >
                  Next
                </a>
              ) : (
                <span className="pagination-button is-disabled" aria-disabled="true">
                  Next
                </span>
              )}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
