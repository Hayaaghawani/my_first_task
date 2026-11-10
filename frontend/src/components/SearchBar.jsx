export default function SearchBar({ value }) {
  return (
    <form className="search-form" action="/search-listing" method="get">
      <label className="search-label" htmlFor="listing-id">
        Listing ID
      </label>
      <div className="search-controls">
        <input
          id="listing-id"
          type="text"
          name="id"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 289115914"
          defaultValue={value}
          aria-describedby="search-hint"
        />
        <button type="submit">Search</button>
      </div>
      <p className="search-hint" id="search-hint">
        Use the numeric ID from the listing URL.
      </p>
    </form>
  );
}
