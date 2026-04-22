"use client";

import { useState } from "react";
import DemoJsonBlock from "@/components/DemoJsonBlock";

const DEFAULT_URL = "https://arxiv.org/abs/2307.06435";

export default function SimilarDemoPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/exa/find-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          numResults: 5,
          contents: {
            text: { maxCharacters: 1200 },
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
          <h1 className="demo-title">POST /findSimilar</h1>
          <p className="demo-desc">
            Embedding-style pages similar to a seed URL. See{" "}
            <a
              href="https://exa.ai/docs/reference/find-similar-links"
              target="_blank"
              rel="noreferrer"
            >
              Find similar links
            </a>
            .
          </p>
        </header>

        <div className="demo-panel">
          <label className="demo-label" htmlFor="similar-url">
            url
          </label>
          <input
            id="similar-url"
            className="demo-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            autoComplete="off"
          />
          <button type="button" className="demo-run" onClick={run} disabled={loading || !url.trim()}>
            Find similar
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
