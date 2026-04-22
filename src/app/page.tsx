import TopNav, { HOME_TOP_NAV } from "@/components/TopNav";
import { LatestFilingsLoader } from "@/components/LatestFilingsLoader";

export default function HomePage() {
  return (
    <>
      <TopNav items={HOME_TOP_NAV} ariaLabel="Navigation" />
      <main className="main-layout main-layout--page">
        <div className="content-area content-area--page">
          <div className="page-stack">
            <div className="title-box">
              <h1 className="title" id="home-edgar-heading">
                Latest Form 4, D, 8 &amp; 10 filings
              </h1>
              <div className="title-box-grain" aria-hidden="true" />
            </div>
            <section className="home-edgar" aria-labelledby="home-edgar-heading">
              <LatestFilingsLoader />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
