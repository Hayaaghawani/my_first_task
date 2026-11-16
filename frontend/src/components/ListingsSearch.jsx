import { useEffect, useState } from 'react';
import { fetchCityOptions, fetchListings } from '../services/api.js';
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
    return null;
  }

  return [Number(price).toLocaleString(), currency].filter(Boolean).join(' ');
}

function submitSearch(event, language) {
  event.preventDefault();
  const params = new URLSearchParams(new FormData(event.currentTarget));
  const [sortBy, sortOrder] = params.get('sort').split('|');
  params.delete('sort');
  params.set('country', 'jo');
  params.set('lang', language);
  params.set('page', '1');
  params.set('sort_by', sortBy);
  params.set('sort_order', sortOrder);
  for (const field of ['city', 'year_from', 'year_to', 'price_from', 'price_to']) {
    if (!params.get(field)?.trim()) {
      params.delete(field);
    }
  }
  for (const field of ['has_images', 'has_reels', 'has_videos', 'premium']) {
    params.set(field, event.currentTarget.elements.namedItem(field).checked ? 'true' : 'false');
  }
  window.location.assign(`/listings?${params}`);
}

export default function ListingsSearch() {
  const [query] = useState(readQueryFromUrl);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState('');
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

  useEffect(() => {
    let active = true;

    fetchCityOptions({
      country: query.country,
      category: query.category,
      lang: query.lang,
    })
      .then((options) => {
        if (active) {
          setCities(options);
        }
      })
      .catch((requestError) => {
        if (active) {
          setCitiesError(requestError.message || 'Could not load cities');
        }
      })
      .finally(() => {
        if (active) {
          setCitiesLoading(false);
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
            {label('countryCode')}
            <input
              name="country"
              defaultValue={query.country}
              readOnly
              aria-readonly="true"
            />
          </label>
          <label>
            {label('category')}
            <input
              name="category"
              defaultValue={query.category}
              required
              autoComplete="off"
            />
          </label>
          <label>
            {label('titleContains')}
            <input
              name="title"
              type="search"
              defaultValue={query.title}
              maxLength={200}
              autoComplete="off"
              placeholder={label('titlePlaceholder')}
            />
          </label>
          <label>
            {label('city')}
            <select
              name="city"
              defaultValue={query.city}
              disabled={citiesLoading || Boolean(citiesError)}
              aria-describedby={citiesError ? 'city-filter-hint' : undefined}
            >
              <option value="">
                {citiesLoading
                  ? label('loadingCities')
                  : label('allCities')}
              </option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {citiesError && (
              <span className="field-hint" id="city-filter-hint" role="status">
                {citiesError}
              </span>
            )}
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
              {label('solrPriceHint')}
            </span>
          </fieldset>
          <label>
            {label('perPage')}
            <select name="per_page" defaultValue={query.per_page}>
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <label>
            {label('sortResults')}
            <select
              name="sort"
              defaultValue={`${query.sort_by}|${query.sort_order}`}
            >
              <option value="record_posted_time_i|desc">{label('newestFirst')}</option>
              <option value="record_posted_time_i|asc">{label('oldestFirst')}</option>
              <option value="post_id|desc">{label('idHighToLow')}</option>
              <option value="post_id|asc">{label('idLowToHigh')}</option>
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
        <button type="submit">{label('searchListings')}</button>
      </form>

      <div className="result-area" aria-live="polite">
        {loading && <Loading />}
        {!loading && error && <ErrorMessage message={error} />}
        {!loading && result && (
          <>
            <div className="browse-summary">
              <p>
                {meta.total.toLocaleString()} {label('listings')}
                <span> · </span>
                {label('page')} {meta.page} {label('of')} {meta.total_pages}
              </p>
              <p>
                {label('sortedBy')} {query.sort_by === 'post_id' ? label('listingId') : label('datePosted')}
                {' · '}
                {query.sort_order === 'asc' ? label('ascending') : label('descending')}
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
                  {label('activeFilters')}
                  {query.has_images === 'true' && ` ${label('filterImages')}`}
                  {query.has_reels === 'true' && ` ${label('filterReels')}`}
                  {query.has_videos === 'true' && ` ${label('filterVideos')}`}
                  {query.premium === 'true' && ` ${label('filterPremium')}`}
                  {query.city && ` ${label('filterCity')} ${query.city}`}
                  {(query.year_from || query.year_to)
                    && ` ${label('filterYears')} ${query.year_from || label('any')}–${query.year_to || label('any')}`}
                  {(query.price_from || query.price_to)
                    && ` ${label('filterPrice')} ${query.price_from || label('any')}–${query.price_to || label('any')}`}
                </p>
              )}
            </div>
            {result.items.length === 0 ? (
              <p className="empty-results">{label('noListings')}</p>
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
                        {label('noImage')}
                      </div>
                    )}
                    <div className="browse-card-content">
                      <h2>{item.title || label('untitled')}</h2>
                      <p className="browse-price">
                        {formatPrice(item.price, item.currency) ?? label('contactForPrice')}
                      </p>
                      <p className="browse-location">{item.city || '—'}</p>
                      <p className="browse-image-count">{item.image_count} {label('photos')}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <nav className="pagination" aria-label={label('pagination')}>
              {meta.page > 1 ? (
                <a
                  className="pagination-button"
                  href={buildPageUrl(query, meta.page - 1)}
                >
                  {label('previous')}
                </a>
              ) : (
                <span className="pagination-button is-disabled" aria-disabled="true">
                  {label('previous')}
                </span>
              )}
              <span>{label('page')} {meta.page}</span>
              {meta.has_next ? (
                <a
                  className="pagination-button"
                  href={buildPageUrl(query, meta.page + 1)}
                >
                  {label('next')}
                </a>
              ) : (
                <span className="pagination-button is-disabled" aria-disabled="true">
                  {label('next')}
                </span>
              )}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
