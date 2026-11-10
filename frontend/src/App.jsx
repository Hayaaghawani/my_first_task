import ListingsSearch from './components/ListingsSearch.jsx';
import SearchListingPage from './components/SearchListingPage.jsx';

export default function App() {
  const isListingsPage = window.location.pathname.replace(/\/+$/, '') === '/listings';
  const searchParams = new URLSearchParams(window.location.search);
  const language = searchParams.get('lang') === 'en' ? 'en' : 'ar';

  function changeLanguage(event) {
    const params = new URLSearchParams(window.location.search);
    params.set('lang', event.target.value);
    if (!params.has('country')) params.set('country', 'jo');
    if (!params.has('category')) params.set('category', 'CarsForSale');
    window.location.assign(`/listings?${params}`);
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        {isListingsPage && (
          <label className="language-switcher">
            <span>Language</span>
            <select value={language} onChange={changeLanguage} aria-label="City language">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
        )}
        <p className="eyebrow">OpenSooq</p>
        <h1>{isListingsPage ? 'Browse listings' : 'Find a listing'}</h1>
        <p className="page-intro">
          {isListingsPage
            ? 'Search and browse listings by country and category.'
            : 'Look up a listing by its ID to view its details and custom attributes.'}
        </p>
      </header>

      <nav className="page-nav" aria-label="Listing pages">
        <a
          href="/search-listing"
          aria-current={isListingsPage ? undefined : 'page'}
        >
          Find by ID
        </a>
        <a
          href="/listings"
          aria-current={isListingsPage ? 'page' : undefined}
        >
          Browse listings
        </a>
      </nav>

      {isListingsPage ? <ListingsSearch /> : <SearchListingPage />}
    </main>
  );
}
