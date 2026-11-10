import { useEffect, useState } from 'react';
import { fetchListing } from '../services/api.js';
import CustomParams from './CustomParams.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import ListingCard from './ListingCard.jsx';
import Loading from './Loading.jsx';
import SearchBar from './SearchBar.jsx';

export default function SearchListingPage() {
  const listingId = new URLSearchParams(window.location.search).get('id') || '';
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!listingId) {
      return undefined;
    }

    let active = true;
    fetchListing(listingId)
      .then((result) => {
        if (active) {
          setListing(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Something went wrong');
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
  }, [listingId]);

  return (
    <>
      <section className="search-panel" aria-label="Search listings by ID">
        <SearchBar value={listingId} />
      </section>

      <div className="result-area" aria-live="polite">
        {loading && <Loading />}
        {!loading && error && <ErrorMessage message={error} />}
        {!loading && !error && !listingId && (
          <p className="muted-text">Enter a listing ID to get started.</p>
        )}
        {!loading && listing && (
          <ListingCard listing={listing}>
            <CustomParams params={listing.custom_params} />
          </ListingCard>
        )}
      </div>
    </>
  );
}
