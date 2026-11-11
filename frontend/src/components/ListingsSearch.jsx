import { useEffect, useState } from 'react';
import { fetchListings } from '../services/api.js';
import { FILTER_LABELS } from '../config/filterLabels.js';
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
  has_images: 'false',
  has_reels: 'false',
  has_videos: 'false',
  premium: 'false',
  city: '',
  year_from: '',
  year_to: '',
  price_from: '',
  price_to: '',
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
  for (const field of ['city', 'year_from', 'year_to', 'price_from', 'price_to']) {
    if (!params.get(field)?.trim()) {
      params.delete(field);
    }
  }
  if (params.has('city')) {
    params.set(
      'city',
      params.get('city').split(',').map((cityId) => cityId.trim()).join(','),
    );
  }
  for (const field of ['has_images', 'has_reels', 'has_videos', 'premium']) {
    params.set(field, event.currentTarget.elements.namedItem(field).checked ? 'true' : 'false');
  }
  window.location.assign(`/listings?${params}`);
}

export default function ListingsSearch() {
  const [query] = useState(readQueryFromUrl);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const language = query.lang === 'en' ? 'en' : 'ar';
  const label = (name) => FILTER_LABELS[name][language];

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
            {label('city')}
            <input
              name="city"
              type="text"
              defaultValue={query.city}
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 1, 12"
              aria-describedby="city-filter-hint"
            />
            <span className="field-hint" id="city-filter-hint">
              Enter one or more city IDs, separated by commas.
            </span>
          </label>
          <fieldset className="range-filter">
            <legend>{label('year')}</legend>
            <div className="range-filter-fields">
              <label>
                <span>{label('from')}</span>
                <input
                  name="year_from"
                  type="number"
                  min="1900"
                  max="2100"
                  step="1"
                  defaultValue={query.year_from}
                  placeholder="1900"
                  aria-label={`${label('year')} ${label('from')}`}
                />
              </label>
              <label>
                <span>{label('to')}</span>
                <input
                  name="year_to"
                  type="number"
                  min="1900"
                  max="2100"
                  step="1"
                  defaultValue={query.year_to}
                  placeholder="2100"
                  aria-label={`${label('year')} ${label('to')}`}
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="range-filter">
            <legend>{label('price')}</legend>
            <div className="range-filter-fields">
              <label>
                <span>{label('from')}</span>
                <input
                  name="price_from"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={query.price_from}
                  placeholder="—"
                  aria-label={`${label('price')} ${label('from')}`}
                  aria-describedby="price-filter-hint"
                />
              </label>
              <label>
                <span>{label('to')}</span>
                <input
                  name="price_to"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={query.price_to}
                  placeholder="—"
                  aria-label={`${label('price')} ${label('to')}`}
                />
              </label>
            </div>
            <span className="field-hint" id="price-filter-hint">
              {language === 'ar'
                ? 'تُستخدم عملة السعر الموجودة في فهرس Solr.'
                : 'Uses the price currency in the Solr index.'}
            </span>
          </fieldset>
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
          <label className="filter-toggle">
            <input
              type="checkbox"
              name="has_images"
              defaultChecked={query.has_images === 'true' || query.has_images === '1'}
            />
            <span>{label('hasImages')}</span>
          </label>
          <label className="filter-toggle">
            <input
              type="checkbox"
              name="has_reels"
              defaultChecked={query.has_reels === 'true' || query.has_reels === '1'}
            />
            <span>{label('hasReels')}</span>
          </label>
          <label className="filter-toggle">
            <input
              type="checkbox"
              name="has_videos"
              defaultChecked={query.has_videos === 'true' || query.has_videos === '1'}
            />
            <span>{label('hasVideos')}</span>
          </label>
          <label className="filter-toggle">
            <input
              type="checkbox"
              name="premium"
              defaultChecked={query.premium === 'true' || query.premium === '1'}
            />
            <span>{label('premium')}</span>
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
              {(query.has_images === 'true'
                || query.has_reels === 'true'
                || query.has_videos === 'true'
                || query.premium === 'true'
                || query.city
                || query.year_from
                || query.year_to
                || query.price_from
                || query.price_to) && (
                <p>
                  Active filters:
                  {query.has_images === 'true' && ' images'}
                  {query.has_reels === 'true' && ' reels'}
                  {query.has_videos === 'true' && ' videos'}
                  {query.premium === 'true' && ' premium'}
                  {query.city && ` city IDs ${query.city}`}
                  {(query.year_from || query.year_to)
                    && ` years ${query.year_from || 'any'}–${query.year_to || 'any'}`}
                  {(query.price_from || query.price_to)
                    && ` price ${query.price_from || 'any'}–${query.price_to || 'any'}`}
                </p>
              )}
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
