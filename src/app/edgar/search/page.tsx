import type { Metadata } from "next";
import EdgarCompanySearch from "@/components/EdgarCompanySearch";

export const metadata: Metadata = {
  title: "EDGAR company search · exademo",
  description: "Look up SEC EDGAR filers by name or ticker",
};

export default function EdgarSearchPage() {
  return (
    <main className="main-layout main-layout--page">
      <div className="content-area content-area--page">
        <div className="page-stack">
          <div className="title-box">
            <h1 className="title">EDGAR company search</h1>
            <div className="title-box-grain" aria-hidden="true" />
          </div>
          <section className="edgar-search" aria-label="Company lookup">
            <p className="edgar-search-lead">
              Type a company name or stock ticker. Suggestions come from the
              SEC&apos;s public{" "}
              <code className="home-code">company_tickers.json</code> index.
            </p>
            <EdgarCompanySearch />
          </section>
        </div>
      </div>
    </main>
  );
}
