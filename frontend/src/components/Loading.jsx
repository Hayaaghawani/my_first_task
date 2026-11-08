export default function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading listing…</span>
    </div>
  );
}
