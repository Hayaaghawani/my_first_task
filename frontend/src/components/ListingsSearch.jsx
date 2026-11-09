import { useState } from 'react';
import { fetchListings } from '../services/api.js';
import ErrorMessage from './ErrorMessage.jsx';
import Loading from './Loading.jsx';

const INITIAL_QUERY = {
  country: 'jo',
  category: 'CarsForSale',
  perPage: '20',
  lang: 'ar',
};

function formatPrice(price, currency) {
  if (price === null || price === undefined || price === '') {
    return 'Contact for price';
  }

  return [Number(price).toLocaleString(), currency].filter(Boolean).join(' ');
}

export default function ListingsSearch() {
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadPage(page, event) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetchListings({
        ...query,
        page,
        perPage: Number(query.perPage),
      });
      setResult(response);
    } catch (requestError) {
      setError(requestError.message || 'Could not load listings');
    } finally {
      setLoading(false);
    }
  }

  function updateQuery(event) {
    const { name, value } = event.target;
    setQuery((current) => ({ ...current, [name]: value }));
  }

  const meta = result?.meta;

  return (
    <>
      <form className="search-panel browse-form" onSubmit={(event) => loadPage(1, event)}>
        <div className="browse-fields">
          <label>
            Country code
            <input
              name="country"
              value={query.country}
              onChange={updateQuery}
              required
              autoComplete="off"
            />
          </label>
          <label>
            Category
            <input
              name="category"
              value={query.category}
              onChange={updateQuery}
              required
              autoComplete="off"
            />
          </label>
          <label>
            Per page
            <select name="perPage" value={query.perPage} onChange={updateQuery}>
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <label>
            City language
            <select name="lang" value={query.lang} onChange={updateQuery}>
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search listings'}
        </button>
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
              <button
                type="button"
                className="pagination-button"
                disabled={loading || meta.page <= 1}
                onClick={() => loadPage(meta.page - 1)}
              >
                Previous
              </button>
              <span>Page {meta.page}</span>
              <button
                type="button"
                className="pagination-button"
                disabled={loading || !meta.has_next}
                onClick={() => loadPage(meta.page + 1)}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </div>
    </>
  );
}
