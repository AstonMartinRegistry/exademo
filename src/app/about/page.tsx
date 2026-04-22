import TopNav, { HOME_TOP_NAV } from "@/components/TopNav";
import Link from "next/link";
import {
  FORM4_MIN_DISPLAY_GROSS_USD,
  LATEST_EDGAR_BATCH_SIZE,
  LATEST_EDGAR_MAX_MATCHES,
  LATEST_FILL_INTERVAL_MS,
} from "@/lib/edgarLatestConfig";

export default function AboutPage() {
  return (
    <>
      <TopNav items={HOME_TOP_NAV} ariaLabel="Navigation" />
      <main className="main-layout main-layout--page">
        <div className="content-area content-area--page">
          <div className="page-stack">
            <div className="title-box">
              <h1 className="title" id="about-heading">
                About this feed
              </h1>
              <div className="title-box-grain" aria-hidden="true" />
            </div>
            <section className="home-edgar" aria-labelledby="about-heading">
              <p className="home-edgar-sub">
                Loads <strong>{LATEST_EDGAR_BATCH_SIZE}</strong> rows from the
                SEC EDGAR Atom feed every{" "}
                <strong>{LATEST_FILL_INTERVAL_MS / 1000}s</strong> up to{" "}
                <strong>{LATEST_EDGAR_MAX_MATCHES}</strong> matches, and keeps{" "}
                <strong>Form 4</strong>, <strong>Form D</strong> family,{" "}
                <strong>Form 8</strong> family (e.g. 8-K, 8-A), and{" "}
                <strong>Form 10</strong> family (e.g. 10-K, 10-Q). Form{" "}
                <strong>4</strong> only if gross sales exceed{" "}
                <strong>
                  ${FORM4_MIN_DISPLAY_GROSS_USD.toLocaleString("en-US")}
                </strong>{" "}
                (with per-security breakdown). 8-K / 10-K style rows use feed
                metadata only. Form <strong>D</strong> uses{" "}
                <code className="home-code">primary_doc.xml</code>. The list is
                ephemeral — refreshing the page restarts from the newest slice
                (<code className="home-code">start=0</code>) with no persistence.
                Form <strong>4</strong> rows run Exa company + people search,
                then deep research from the first hits (
                <code className="home-code">EXA_KEY</code>) with JSON shown under
                each filing.
              </p>
              <p className="home-edgar-sub">
                SEC company lookup (tickers / names) is still available at{" "}
                <Link href="/edgar/search" className="home-edgar-inline-link">
                  /edgar/search
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
