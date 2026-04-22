"use client";

import type { EdgarFiling } from "@/lib/server/edgar";
import {
  FORM4_MIN_DISPLAY_GROSS_USD,
  LATEST_EDGAR_BATCH_SIZE,
  LATEST_EDGAR_MAX_MATCHES,
  LATEST_FILL_INTERVAL_MS,
} from "@/lib/edgarLatestConfig";
import { Form4ExaPipeline } from "@/components/Form4ExaPipeline";
import { useEffect, useState } from "react";

type BatchResponse = {
  items?: EdgarFiling[];
  nextStart?: number;
  feedExhausted?: boolean;
  error?: string;
};

function filingKey(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?sec\.gov/i, "https://www.sec.gov");
}

function mergeFilings(
  prev: EdgarFiling[],
  incoming: EdgarFiling[],
  max: number,
): EdgarFiling[] {
  const map = new Map<string, EdgarFiling>();
  for (const f of prev) map.set(filingKey(f.url), f);
  for (const f of incoming) {
    const k = filingKey(f.url);
    const old = map.get(k);
    if (!old || f.updated.localeCompare(old.updated) > 0) map.set(k, f);
  }
  return Array.from(map.values())
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, max);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function LatestFilingsLoader() {
  const [filings, setFilings] = useState<EdgarFiling[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedExhausted, setFeedExhausted] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let start = 0;
    let matches = 0;

    async function pump() {
      while (!cancelled && matches < LATEST_EDGAR_MAX_MATCHES) {
        try {
          const res = await fetch(`/api/edgar/latest-batch?start=${start}`);
          const data = (await res.json()) as BatchResponse;

          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
          if (cancelled) return;

          if (data.items?.length) {
            setFilings((prev) => {
              const next = mergeFilings(prev, data.items ?? [], LATEST_EDGAR_MAX_MATCHES);
              matches = next.length;
              return next;
            });
          }
          setError(null);
          setBootstrapping(false);

          start = data.nextStart ?? start;
          if (data.feedExhausted) {
            setFeedExhausted(true);
            break;
          }
          if (matches >= LATEST_EDGAR_MAX_MATCHES) break;
        } catch (e) {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : "Could not load batch.");
          setBootstrapping(false);
          break;
        }

        await sleep(LATEST_FILL_INTERVAL_MS);
      }
    }

    void pump();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <p className="home-edgar-live" aria-live="polite">
        Live — {LATEST_EDGAR_BATCH_SIZE} feed rows every{" "}
        {LATEST_FILL_INTERVAL_MS / 1000}s (up to{" "}
        {LATEST_EDGAR_MAX_MATCHES} matches)
        {filings.length >= LATEST_EDGAR_MAX_MATCHES ? " · target reached" : ""}
        {feedExhausted && filings.length < LATEST_EDGAR_MAX_MATCHES
          ? " · end of current feed slice"
          : ""}
      </p>

      {error ? (
        <p className="home-edgar-meta home-edgar-callout">{error}</p>
      ) : null}

      {bootstrapping && filings.length === 0 && !error ? (
        <div className="home-filings-fallback" aria-busy="true">
          <p className="home-edgar-meta home-filings-fallback-lead">
            Loading first batch from SEC…
          </p>
          <ul className="home-filings-fallback-bars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="home-filings-fallback-bar" />
            ))}
          </ul>
        </div>
      ) : null}

      {!error && filings.length === 0 && !bootstrapping ? (
        <p className="home-edgar-meta home-edgar-callout">
          No matching filings yet (Form D / 8 / 10 family, or Form 4 with gross
          over ${FORM4_MIN_DISPLAY_GROSS_USD.toLocaleString("en-US")}). Check{" "}
          <code className="home-code">EDGAR_USER_AGENT</code> in{" "}
          <code className="home-code">.env</code>.
        </p>
      ) : null}

      {filings.length > 0 ? (
        <ul className="home-edgar-list">
          {filings.map((f, i) => (
            <li key={`${f.url}-${i}`} className="home-edgar-item">
              <div className="home-edgar-item-main">
                <p className="home-edgar-form-row">
                  <span className="home-edgar-form-label">Form</span>
                  {f.formType ? (
                    <span className="home-edgar-form-pill">{f.formType}</span>
                  ) : (
                    <span className="home-edgar-form-pill home-edgar-form-pill--muted">
                      —
                    </span>
                  )}
                </p>
                <p className="home-edgar-item-title">
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    {f.title}
                  </a>
                </p>
                <p className="home-edgar-meta">
                  {f.updated && <time dateTime={f.updated}>{f.updated}</time>}
                </p>
                {f.summaryText ? (
                  <p className="home-edgar-summary">{f.summaryText}</p>
                ) : null}
                {f.affiliateTags && f.affiliateTags.length > 0 ? (
                  <div className="home-edgar-affiliate-block">
                    <span className="home-edgar-form-label">Tags</span>
                    <div className="home-edgar-tag-row">
                      {f.affiliateTags.map((t) => (
                        <span key={t} className="home-edgar-affiliate-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {f.affiliates && f.affiliates.length > 0 ? (
                  <div className="home-edgar-affiliate-block">
                    <span className="home-edgar-form-label">Related people</span>
                    <ul className="home-edgar-affiliate-list">
                      {f.affiliates.map((p, pi) => (
                        <li key={`${f.url}-${pi}-${p.name}`}>
                          <span className="home-edgar-affiliate-name">
                            {p.name}
                          </span>
                          {p.relationships.length > 0 ? (
                            <span className="home-edgar-affiliate-roles">
                              {" "}
                              — {p.relationships.join(", ")}
                            </span>
                          ) : null}
                          {p.clarification ? (
                            <span className="home-edgar-affiliate-note">
                              {" "}
                              ({p.clarification})
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {f.form4 ? (
                  <div className="home-edgar-form4">
                    <span className="home-edgar-form-label">Form 4</span>
                    <p className="home-edgar-form4-owner">
                      <strong>{f.form4.ownerName}</strong>
                    </p>
                    {f.form4.issuerName?.trim() ||
                    (f.form4.rptOwnerName ?? f.form4.ownerName)?.trim() ||
                    f.form4.rptOwnerCity?.trim() ? (
                      <div className="home-edgar-affiliate-block home-edgar-form4-exa-tags">
                        <span className="home-edgar-form-label">
                          Exa query terms
                        </span>
                        <div className="home-edgar-tag-row">
                          {f.form4.issuerName?.trim() ? (
                            <span
                              className="home-edgar-affiliate-tag"
                              title="issuerName"
                            >
                              {f.form4.issuerName.trim()}
                            </span>
                          ) : null}
                          {(f.form4.rptOwnerName ?? f.form4.ownerName)?.trim() ? (
                            <span
                              className="home-edgar-affiliate-tag"
                              title="rptOwnerName"
                            >
                              {(f.form4.rptOwnerName ?? f.form4.ownerName).trim()}
                            </span>
                          ) : null}
                          {f.form4.rptOwnerCity?.trim() ? (
                            <span
                              className="home-edgar-affiliate-tag"
                              title="rptOwnerCity"
                            >
                              {f.form4.rptOwnerCity.trim()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {f.form4.saleSummary ? (
                      <>
                        <p className="home-edgar-form4-total">
                          Total gross on sales:{" "}
                          <strong>
                            $
                            {f.form4.saleSummary.totalGrossUsd.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </strong>
                          <span className="home-edgar-form4-disclaimer">
                            {" "}
                            (shares × price; before fees/taxes; not net to insider)
                          </span>
                        </p>
                        <ul className="home-edgar-form4-sale-list">
                          {f.form4.saleSummary.lines.map((line) => (
                            <li key={`${f.url}-${line.security}`}>
                              <strong>{line.security}</strong>
                              : $
                              {line.grossUsd.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="home-edgar-form4-sale-detail">
                                ({line.sharesSold} sh @ $
                                {line.avgPricePerShare ?? "—"} avg)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="home-edgar-form4-meta">
                        No priced stock sales on this filing (only buys, awards,
                        or unpriced rows).
                      </p>
                    )}
                    <Form4ExaPipeline form4={f.form4} filingUrl={f.url} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
