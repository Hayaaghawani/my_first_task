import { useState } from 'react';
import { fetchListing } from './services/api.js';
import CustomParams from './components/CustomParams.jsx';
import ErrorMessage from './components/ErrorMessage.jsx';
import ListingCard from './components/ListingCard.jsx';
import Loading from './components/Loading.jsx';
import SearchBar from './components/SearchBar.jsx';
import ListingsSearch from './components/ListingsSearch.jsx';

export default function App() {
  const [activeView, setActiveView] = useState('lookup');
  const [listingId, setListingId] = useState('');
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setListing(null);

    try {
      const result = await fetchListing(listingId);
      setListing(result);
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">OpenSooq</p>
        <h1>{activeView === 'lookup' ? 'Listing lookup' : 'Browse listings'}</h1>
        <p className="page-intro">
          {activeView === 'lookup'
            ? 'Enter a listing ID to view its details and custom attributes.'
            : 'Search Solr listings by country and category, then browse the results.'}
        </p>
      </header>

      <nav className="view-tabs" aria-label="Listing tools">
        <button
          type="button"
          className={`view-tab${activeView === 'lookup' ? ' is-active' : ''}`}
          aria-pressed={activeView === 'lookup'}
          onClick={() => setActiveView('lookup')}
        >
          Find by ID
        </button>
        <button
          type="button"
          className={`view-tab${activeView === 'browse' ? ' is-active' : ''}`}
          aria-pressed={activeView === 'browse'}
          onClick={() => setActiveView('browse')}
        >
          Browse listings
        </button>
      </nav>

      {activeView === 'lookup' ? (
        <>
          <section className="search-panel" aria-label="Search listings by ID">
            <SearchBar
              value={listingId}
              onChange={setListingId}
              onSubmit={handleSearch}
              disabled={loading}
            />
          </section>

          <div className="result-area" aria-live="polite">
            {loading && <Loading />}
            {!loading && error && <ErrorMessage message={error} />}
            {!loading && listing && (
              <ListingCard listing={listing}>
                <CustomParams params={listing.custom_params} />
              </ListingCard>
            )}
          </div>
        </>
      ) : (
        <ListingsSearch />
      )}
    </main>
  );
}
