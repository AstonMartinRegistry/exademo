"use client";

import { useEffect, useId, useState } from "react";

type Suggestion = {
  cik10: string;
  cik: number;
  ticker: string;
  title: string;
};

const DEBOUNCE_MS = 280;

function browseUrl(cik10: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik10}&owner=exclude&count=40`;
}

export default function EdgarCompanySearch() {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNoResults, setShowNoResults] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setStatus("idle");
      setErrorMessage(null);
      setShowNoResults(false);
      return;
    }

    setShowNoResults(false);

    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        if (!cancelled) {
          setStatus("loading");
          setErrorMessage(null);
        }
        try {
          const res = await fetch(
            `/api/edgar/companies?q=${encodeURIComponent(trimmed)}`,
          );
          const data = (await res.json()) as {
            suggestions?: Suggestion[];
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok) {
            setSuggestions([]);
            setStatus("error");
            setErrorMessage(data.error ?? `HTTP ${res.status}`);
            setShowNoResults(false);
            return;
          }
          const next = data.suggestions ?? [];
          setSuggestions(next);
          setStatus("idle");
          setShowNoResults(next.length === 0);
        } catch {
          if (cancelled) return;
          setSuggestions([]);
          setStatus("error");
          setErrorMessage("Network error");
          setShowNoResults(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="edgar-search-inner">
      <label className="edgar-search-label" htmlFor={inputId}>
        Company or ticker
      </label>
      <input
        id={inputId}
        className="edgar-search-input"
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. Apple, AAPL, NVIDIA…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={suggestions.length > 0}
      />

      {status === "loading" && query.trim() ? (
        <p className="edgar-search-status" aria-live="polite">
          Searching…
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="edgar-search-status edgar-search-status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <ul className="edgar-search-suggestions" id={listId} role="listbox">
          {suggestions.map((s) => (
            <li key={s.cik10} className="edgar-search-suggestion" role="option">
              <button
                type="button"
                className="edgar-search-suggestion-btn"
                onClick={() => {
                  const label =
                    s.ticker && s.ticker.length > 0
                      ? `${s.title} (${s.ticker})`
                      : s.title;
                  setQuery(label);
                  window.open(browseUrl(s.cik10), "_blank", "noopener,noreferrer");
                }}
              >
                <span className="edgar-search-suggestion-title">{s.title}</span>
                {s.ticker ? (
                  <span className="edgar-search-suggestion-ticker">{s.ticker}</span>
                ) : null}
                <span className="edgar-search-suggestion-cik">CIK {s.cik10}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : showNoResults && query.trim() && status === "idle" ? (
        <p className="edgar-search-status">No matches.</p>
      ) : null}
    </div>
  );
}
