function formatPrice(price) {
  if (!price?.has_price) {
    return 'Contact for price';
  }

  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) {
    return price.currency
      ? `${price.amount ?? ''} ${price.currency}`.trim()
      : String(price.amount ?? '—');
  }

  if (typeof price.currency === 'string' && /^[A-Z]{3}$/.test(price.currency)) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: price.currency,
    }).format(amount);
  }

  return [amount.toLocaleString(), price.currency].filter(Boolean).join(' ');
}

function truncateDescription(description = '') {
  if (description.length <= 200) {
    return description;
  }

  return `${description.slice(0, 200).trimEnd()}...`;
}

export default function ListingCard({ listing, children }) {
  return (
    <article className="listing-card">
      <div className="listing-heading">
        <div>
          <p className="eyebrow">Listing #{listing.id}</p>
          <h2>{listing.title || 'Untitled listing'}</h2>
        </div>
        <p className="listing-price">{formatPrice(listing.price)}</p>
      </div>

      <p className="listing-description">
        {truncateDescription(listing.description) || 'No description available.'}
      </p>

      <dl className="location-list">
        <div>
          <dt>City</dt>
          <dd>{listing.city?.name || '—'}</dd>
        </div>
        <div>
          <dt>Neighborhood</dt>
          <dd>{listing.neighborhood?.name || '—'}</dd>
        </div>
      </dl>

      {children}
    </article>
  );
}
