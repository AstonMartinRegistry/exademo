/** Shown immediately while `HomeFilingsStream` waits on SEC fetches. */
export function HomeFilingsFallback() {
  return (
    <div className="home-filings-fallback" aria-busy="true" aria-live="polite">
      <p className="home-edgar-meta home-filings-fallback-lead">
        Loading filings from SEC…
      </p>
      <ul className="home-filings-fallback-bars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="home-filings-fallback-bar" />
        ))}
      </ul>
    </div>
  );
}
