export default function EdgarSegmentLoading() {
  return (
    <main className="main-layout main-layout--page">
      <div className="content-area content-area--page">
        <div className="page-stack">
          <p className="home-edgar-meta edgar-route-loading" aria-busy="true">
            Loading…
          </p>
        </div>
      </div>
    </main>
  );
}
