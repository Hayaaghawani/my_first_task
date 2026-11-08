export default function SearchBar({ value, onChange, onSubmit, disabled }) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <label className="search-label" htmlFor="listing-id">
        Listing ID
      </label>
      <div className="search-controls">
        <input
          id="listing-id"
          name="listingId"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 289115914"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby="search-hint"
        />
        <button type="submit" disabled={disabled}>
          {disabled ? 'Searching…' : 'Search'}
        </button>
      </div>
      <p className="search-hint" id="search-hint">
        Use the numeric ID from the listing URL.
      </p>
    </form>
  );
}
