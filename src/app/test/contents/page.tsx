"use client";

import { useState } from "react";
import DemoJsonBlock from "@/components/DemoJsonBlock";

const DEFAULT_URLS = "https://arxiv.org/abs/2307.06435";

export default function ContentsDemoPage() {
  const [urlsText, setUrlsText] = useState(DEFAULT_URLS);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    const urls = urlsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setError("Add at least one URL.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/exa/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls,
          text: { maxCharacters: 4000 },
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
          <h1 className="demo-title">POST /contents</h1>
          <p className="demo-desc">
            Full page text for URLs you already have (one per line or comma-separated). See{" "}
            <a href="https://exa.ai/docs/reference/get-contents" target="_blank" rel="noreferrer">
              Contents API
            </a>
            .
          </p>
        </header>

        <div className="demo-panel">
          <label className="demo-label" htmlFor="contents-urls">
            urls
          </label>
          <textarea
            id="contents-urls"
            className="demo-input demo-textarea"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={4}
            placeholder="https://example.com"
          />
          <button type="button" className="demo-run" onClick={run} disabled={loading}>
            Fetch contents
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
