"use client";

import { useState } from "react";

const DEFAULT_URL = "https://arxiv.org/abs/2307.06435";
/** Keep search query bounded; full page text can be huge. */
const MAX_QUERY_CHARS = 2000;

type ExaContentResult = {
  text?: string;
  highlights?: string[];
};

function extractFirstContentText(contentsJson: unknown): string {
  if (typeof contentsJson !== "object" || contentsJson === null) {
    return "";
  }
  const results = (contentsJson as { results?: ExaContentResult[] }).results;
  const first = results?.[0];
  if (!first) {
    return "";
  }
  const fromText = typeof first.text === "string" ? first.text.trim() : "";
  if (fromText) {
    return fromText;
  }
  if (Array.isArray(first.highlights) && first.highlights.length > 0) {
    return first.highlights.join("\n\n").trim();
  }
  return "";
}

function buildSearchQueryFromContent(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_QUERY_CHARS) {
    return collapsed;
  }
  return `${collapsed.slice(0, MAX_QUERY_CHARS).trim()}…`;
}

export default function TwoStepDemoPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [contentsJson, setContentsJson] = useState<unknown>(null);
  const [searchJson, setSearchJson] = useState<unknown>(null);
  const [derivedQuery, setDerivedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passed, setPassed] = useState<boolean | null>(null);

  async function runTwoStep() {
    setLoading(true);
    setError(null);
    setContentsJson(null);
    setSearchJson(null);
    setDerivedQuery(null);
    setPassed(null);

    try {
      const urlTrim = url.trim();
      if (!urlTrim) {
        setError("Enter a URL for step 1 (contents).");
        setPassed(false);
        return;
      }

      const contentsRes = await fetch("/api/exa/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [urlTrim],
          text: { maxCharacters: 8000 },
        }),
      });
      const contentsBody = await contentsRes.json();
      if (!contentsRes.ok) {
        setError(
          typeof contentsBody.error === "string"
            ? `Contents: ${contentsBody.error}`
            : `Contents: ${JSON.stringify(contentsBody, null, 2)}`,
        );
        setPassed(false);
        return;
      }
      setContentsJson(contentsBody);

      const rawText = extractFirstContentText(contentsBody);
      if (!rawText) {
        setError(
          "Contents step succeeded but the first result had no text or highlights to feed into search.",
        );
        setPassed(false);
        return;
      }

      const query = buildSearchQueryFromContent(rawText);
      setDerivedQuery(query);

      const searchRes = await fetch("/api/exa/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          type: "auto",
          numResults: 5,
          contents: {
            highlights: { maxCharacters: 1200 },
          },
        }),
      });
      const searchBody = await searchRes.json();
      if (!searchRes.ok) {
        setError(
          typeof searchBody.error === "string"
            ? `Search: ${searchBody.error}`
            : `Search: ${JSON.stringify(searchBody, null, 2)}`,
        );
        setPassed(false);
        return;
      }
      setSearchJson(searchBody);

      const results = (searchBody as { results?: unknown[] }).results;
      const ok = Array.isArray(results) && results.length > 0;
      setPassed(ok);
      if (!ok) {
        setError((prev) =>
          prev
            ? `${prev}\nSearch returned no results.`
            : "Search returned no results.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPassed(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main-layout demo-page">
      <div className="demo-inner">
        <header className="demo-header">
          <h1 className="demo-title">2-step: contents → search</h1>
          <p className="demo-desc">
            <strong>Step 1:</strong> <code>POST /contents</code> for one URL and read the{" "}
            <strong>first result&apos;s</strong> text (or highlights). <strong>Step 2:</strong> use
            that string (trimmed to {MAX_QUERY_CHARS} chars) as the <code>query</code> for{" "}
            <code>POST /search</code>. This mimics &quot;read a page, then vector-search from what
            you read.&quot;
          </p>
        </header>

        <div className="demo-panel">
          <label className="demo-label" htmlFor="two-step-url">
            URL for contents
          </label>
          <input
            id="two-step-url"
            className="demo-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            autoComplete="off"
          />
          <button type="button" className="demo-run" onClick={runTwoStep} disabled={loading}>
            Run 2-step
          </button>
          {derivedQuery && (
            <p className="demo-status" style={{ marginTop: "0.75rem" }}>
              <span className="demo-status--muted">Derived search query (preview): </span>
              <code className="home-code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {derivedQuery.length > 280 ? `${derivedQuery.slice(0, 280)}…` : derivedQuery}
              </code>
            </p>
          )}
          {passed === true && (
            <p className="demo-status" style={{ color: "#15803d", marginTop: "0.5rem" }}>
              Both steps succeeded — search returned results.
            </p>
          )}
          {passed === false && error && (
            <p className="demo-status" style={{ color: "#b91c1c", marginTop: "0.5rem" }}>
              Failed — see below.
            </p>
          )}
        </div>

        <section className="demo-output" aria-live="polite">
          <h2 className="demo-output-title">Step 1 — contents response</h2>
          {loading && !contentsJson && <p className="demo-status">Fetching contents…</p>}
          {contentsJson !== null && (
            <pre className="demo-pre">{JSON.stringify(contentsJson, null, 2)}</pre>
          )}

          <h2 className="demo-output-title" style={{ marginTop: "1.25rem" }}>
            Step 2 — search response
          </h2>
          {loading && contentsJson !== null && searchJson === null && (
            <p className="demo-status">Running search with derived query…</p>
          )}
          {searchJson !== null && (
            <pre className="demo-pre">{JSON.stringify(searchJson, null, 2)}</pre>
          )}
          {!loading && contentsJson === null && searchJson === null && !error && (
            <p className="demo-status demo-status--muted">Run the 2-step flow to see both responses.</p>
          )}
          {error && (
            <pre className="demo-pre demo-pre--error" role="alert" style={{ marginTop: "1rem" }}>
              {error}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
