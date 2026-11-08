import { useState } from 'react';
import { fetchListing } from './services/api.js';
import CustomParams from './components/CustomParams.jsx';
import ErrorMessage from './components/ErrorMessage.jsx';
import ListingCard from './components/ListingCard.jsx';
import Loading from './components/Loading.jsx';
import SearchBar from './components/SearchBar.jsx';

export default function App() {
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
        <h1>Listing lookup</h1>
        <p className="page-intro">
          Enter a listing ID to view its details and custom attributes.
        </p>
      </header>

      <section className="search-panel" aria-label="Search listings">
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
    </main>
  );
}
