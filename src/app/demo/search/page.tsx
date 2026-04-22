"use client";

import { useState } from "react";
import DemoJsonBlock from "@/components/DemoJsonBlock";

const DEFAULT_QUERY = "Latest developments in small language models";

export default function SearchDemoPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/exa/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          type: "auto",
          numResults: 5,
          contents: {
            highlights: { maxCharacters: 2000 },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : JSON.stringify(json, null, 2));
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main-layout demo-page">
      <div className="demo-inner">
        <header className="demo-header">
          <h1 className="demo-title">POST /search</h1>
          <p className="demo-desc">
            Neural / auto web search with optional <code>contents</code> (here: highlights). See{" "}
            <a href="https://exa.ai/docs/reference/search" target="_blank" rel="noreferrer">
              Search API
            </a>
            .
          </p>
        </header>

        <div className="demo-panel">
          <label className="demo-label" htmlFor="search-query">
            query
          </label>
          <textarea
            id="search-query"
            className="demo-input demo-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
          />
          <button type="button" className="demo-run" onClick={run} disabled={loading || !query.trim()}>
            Run search
          </button>
        </div>

        <section className="demo-output" aria-live="polite">
          <h2 className="demo-output-title">Response</h2>
          <DemoJsonBlock data={data} error={error} loading={loading} />
        </section>
      </div>
    </main>
  );
}
