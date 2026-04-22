"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import DemoJsonBlock from "@/components/DemoJsonBlock";

export type SearchDemoVariant = "general" | "people" | "company";

const SEARCH_TYPES = [
  "auto",
  "neural",
  "fast",
  "instant",
  "deep-lite",
  "deep",
  "deep-reasoning",
] as const;

function parseList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildRequestBody(
  variant: SearchDemoVariant,
  values: {
    query: string;
    type: (typeof SEARCH_TYPES)[number];
    numResults: number;
    userLocation: string;
    moderation: boolean;
    additionalQueries: string;
    includeDomains: string;
    excludeDomains: string;
    startPublishedDate: string;
    endPublishedDate: string;
    startCrawlDate: string;
    endCrawlDate: string;
    limitLinkedin: boolean;
    useContents: boolean;
    textOn: boolean;
    textMaxChars: string;
    highlightsOn: boolean;
    highlightsMaxChars: string;
    highlightsSteerQuery: string;
    summaryOn: boolean;
    summaryQuery: string;
    subpages: string;
    subpageTarget: string;
    extrasLinks: string;
    extrasImageLinks: string;
    maxAgeHours: string;
    systemPrompt: string;
    stream: boolean;
    outputSchemaJson: string;
  },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query: values.query.trim(),
    type: values.type,
    numResults: Math.min(100, Math.max(1, values.numResults || 10)),
  };

  if (variant === "people") {
    body.category = "people";
  } else if (variant === "company") {
    body.category = "company";
  }

  const loc = values.userLocation.trim().toUpperCase();
  if (loc.length >= 2) {
    body.userLocation = loc.slice(0, 2);
  }
  if (values.moderation) {
    body.moderation = true;
  }

  const addQ = parseList(values.additionalQueries);
  if (addQ.length) {
    body.additionalQueries = addQ;
  }

  if (variant === "general") {
    const inc = parseList(values.includeDomains);
    const exc = parseList(values.excludeDomains);
    if (inc.length) {
      body.includeDomains = inc;
    }
    if (exc.length) {
      body.excludeDomains = exc;
    }
    if (values.startPublishedDate.trim()) {
      body.startPublishedDate = values.startPublishedDate.trim();
    }
    if (values.endPublishedDate.trim()) {
      body.endPublishedDate = values.endPublishedDate.trim();
    }
    if (values.startCrawlDate.trim()) {
      body.startCrawlDate = values.startCrawlDate.trim();
    }
    if (values.endCrawlDate.trim()) {
      body.endCrawlDate = values.endCrawlDate.trim();
    }
  }

  if (variant === "people" && values.limitLinkedin) {
    body.includeDomains = ["linkedin.com"];
  }

  if (
    values.systemPrompt.trim() &&
    (values.type === "deep-lite" || values.type === "deep" || values.type === "deep-reasoning")
  ) {
    body.systemPrompt = values.systemPrompt.trim();
  }
  if (values.stream) {
    body.stream = true;
  }
  if (values.outputSchemaJson.trim()) {
    try {
      body.outputSchema = JSON.parse(values.outputSchemaJson) as object;
    } catch {
      /* skip invalid JSON; UI can show validation */
    }
  }

  if (values.useContents) {
    const contents: Record<string, unknown> = {};

    if (values.textOn) {
      const n = Number(values.textMaxChars);
      contents.text = Number.isFinite(n) && n > 0 ? { maxCharacters: n } : true;
    }

    if (values.highlightsOn) {
      const maxCh = Number(values.highlightsMaxChars);
      const highlights: Record<string, unknown> = {
        maxCharacters: Number.isFinite(maxCh) && maxCh > 0 ? maxCh : 2000,
      };
      const steer = values.highlightsSteerQuery.trim();
      if (steer) {
        highlights.query = steer;
      }
      contents.highlights = highlights;
    }

    if (values.summaryOn && values.summaryQuery.trim()) {
      contents.summary = { query: values.summaryQuery.trim() };
    }

    const subN = Number(values.subpages);
    if (Number.isFinite(subN) && subN > 0) {
      contents.subpages = subN;
      const st = values.subpageTarget.trim();
      if (st) {
        contents.subpageTarget = st;
      }
    }

    const xl = Number(values.extrasLinks);
    const xi = Number(values.extrasImageLinks);
    if ((Number.isFinite(xl) && xl > 0) || (Number.isFinite(xi) && xi > 0)) {
      contents.extras = {};
      if (Number.isFinite(xl) && xl > 0) {
        (contents.extras as Record<string, number>).links = xl;
      }
      if (Number.isFinite(xi) && xi > 0) {
        (contents.extras as Record<string, number>).imageLinks = xi;
      }
    }

    const mah = Number(values.maxAgeHours);
    if (values.maxAgeHours.trim() !== "" && Number.isFinite(mah)) {
      contents.maxAgeHours = mah;
    }

    if (Object.keys(contents).length > 0) {
      body.contents = contents;
    }
  }

  return body;
}

type Props = {
  variant: SearchDemoVariant;
  defaultQuery: string;
  title: string;
  description: ReactNode;
  runLabel: string;
};

export default function ExaSearchSteeringDemo({
  variant,
  defaultQuery,
  title,
  description,
  runLabel,
}: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<(typeof SEARCH_TYPES)[number]>("auto");
  const [numResults, setNumResults] = useState(variant === "general" ? 5 : 8);
  const [userLocation, setUserLocation] = useState("");
  const [moderation, setModeration] = useState(false);
  const [additionalQueries, setAdditionalQueries] = useState("");

  const [includeDomains, setIncludeDomains] = useState("");
  const [excludeDomains, setExcludeDomains] = useState("");
  const [startPublishedDate, setStartPublishedDate] = useState("");
  const [endPublishedDate, setEndPublishedDate] = useState("");
  const [startCrawlDate, setStartCrawlDate] = useState("");
  const [endCrawlDate, setEndCrawlDate] = useState("");

  const [limitLinkedin, setLimitLinkedin] = useState(true);

  const [useContents, setUseContents] = useState(true);
  const [textOn, setTextOn] = useState(false);
  const [textMaxChars, setTextMaxChars] = useState("4000");
  const [highlightsOn, setHighlightsOn] = useState(true);
  const [highlightsMaxChars, setHighlightsMaxChars] = useState("2000");
  const [highlightsSteerQuery, setHighlightsSteerQuery] = useState("");
  const [summaryOn, setSummaryOn] = useState(false);
  const [summaryQuery, setSummaryQuery] = useState("Main facts and entities");
  const [subpages, setSubpages] = useState("0");
  const [subpageTarget, setSubpageTarget] = useState("");
  const [extrasLinks, setExtrasLinks] = useState("0");
  const [extrasImageLinks, setExtrasImageLinks] = useState("0");
  const [maxAgeHours, setMaxAgeHours] = useState("");

  const [systemPrompt, setSystemPrompt] = useState("Prefer official sources; avoid duplicate domains.");
  const [stream, setStream] = useState(false);
  const [outputSchemaJson, setOutputSchemaJson] = useState("");

  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const values = useMemo(
    () => ({
      query,
      type,
      numResults,
      userLocation,
      moderation,
      additionalQueries,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      startCrawlDate,
      endCrawlDate,
      limitLinkedin,
      useContents,
      textOn,
      textMaxChars,
      highlightsOn,
      highlightsMaxChars,
      highlightsSteerQuery,
      summaryOn,
      summaryQuery,
      subpages,
      subpageTarget,
      extrasLinks,
      extrasImageLinks,
      maxAgeHours,
      systemPrompt,
      stream,
      outputSchemaJson,
    }),
    [
      query,
      type,
      numResults,
      userLocation,
      moderation,
      additionalQueries,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      startCrawlDate,
      endCrawlDate,
      limitLinkedin,
      useContents,
      textOn,
      textMaxChars,
      highlightsOn,
      highlightsMaxChars,
      highlightsSteerQuery,
      summaryOn,
      summaryQuery,
      subpages,
      subpageTarget,
      extrasLinks,
      extrasImageLinks,
      maxAgeHours,
      systemPrompt,
      stream,
      outputSchemaJson,
    ],
  );

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    setSchemaError(null);

    if (outputSchemaJson.trim()) {
      try {
        JSON.parse(outputSchemaJson);
      } catch {
        setSchemaError("outputSchema is not valid JSON.");
        setLoading(false);
        return;
      }
    }

    const body = buildRequestBody(variant, values);

    try {
      const res = await fetch("/api/exa/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          <h1 className="demo-title">{title}</h1>
          <div className="demo-desc">{description}</div>
        </header>

        <div className="demo-panel">
          <fieldset className="demo-fieldset">
            <legend className="demo-legend">Query</legend>
            <label className="demo-label" htmlFor="steer-query">
              query (required)
            </label>
            <textarea
              id="steer-query"
              className="demo-input demo-textarea"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
          </fieldset>

          <fieldset className="demo-fieldset">
            <legend className="demo-legend">Search mode &amp; scope</legend>
            <div className="demo-grid-2">
              <div>
                <label className="demo-label" htmlFor="steer-type">
                  type
                </label>
                <select
                  id="steer-type"
                  className="demo-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as (typeof SEARCH_TYPES)[number])}
                >
                  {SEARCH_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="demo-hint">
                  auto / neural / fast / instant; deep-* for synthesized planning + tools per Exa docs.
                </p>
              </div>
              <div>
                <label className="demo-label" htmlFor="steer-num">
                  numResults
                </label>
                <input
                  id="steer-num"
                  className="demo-input"
                  type="number"
                  min={1}
                  max={100}
                  value={numResults}
                  onChange={(e) => setNumResults(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="demo-grid-2">
              <div>
                <label className="demo-label" htmlFor="steer-loc">
                  userLocation (optional)
                </label>
                <input
                  id="steer-loc"
                  className="demo-input"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="US"
                  maxLength={2}
                />
                <p className="demo-hint">Two-letter ISO country code, e.g. US.</p>
              </div>
              <div className="demo-check-row" style={{ alignSelf: "end", paddingBottom: "0.35rem" }}>
                <input
                  id="steer-mod"
                  type="checkbox"
                  checked={moderation}
                  onChange={(e) => setModeration(e.target.checked)}
                />
                <label htmlFor="steer-mod">moderation (filter unsafe results)</label>
              </div>
            </div>
            <label className="demo-label" htmlFor="steer-addq">
              additionalQueries (optional, one per line)
            </label>
            <textarea
              id="steer-addq"
              className="demo-input demo-textarea"
              value={additionalQueries}
              onChange={(e) => setAdditionalQueries(e.target.value)}
              rows={2}
              placeholder="Extra phrasings for deep search variants"
            />
          </fieldset>

          {variant === "people" && (
            <fieldset className="demo-fieldset">
              <legend className="demo-legend">People category</legend>
              <div className="demo-check-row">
                <input
                  id="steer-li"
                  type="checkbox"
                  checked={limitLinkedin}
                  onChange={(e) => setLimitLinkedin(e.target.checked)}
                />
                <label htmlFor="steer-li">
                  includeDomains: linkedin.com only (recommended for{" "}
                  <code className="home-code">people</code>)
                </label>
              </div>
              <p className="demo-hint">
                Exa: <code className="home-code">people</code> cannot use excludeDomains or published/crawl
                date filters.
              </p>
            </fieldset>
          )}

          {variant === "company" && (
            <fieldset className="demo-fieldset">
              <legend className="demo-legend">Company category</legend>
              <p className="demo-hint">
                Exa: <code className="home-code">company</code> cannot use excludeDomains or published/crawl
                date filters.
              </p>
            </fieldset>
          )}

          {variant === "general" && (
            <fieldset className="demo-fieldset">
              <legend className="demo-legend">Domains &amp; dates (general search only)</legend>
              <label className="demo-label" htmlFor="steer-inc">
                includeDomains (optional, comma or newline)
              </label>
              <textarea
                id="steer-inc"
                className="demo-input demo-textarea"
                value={includeDomains}
                onChange={(e) => setIncludeDomains(e.target.value)}
                rows={2}
                placeholder="arxiv.org"
              />
              <label className="demo-label" htmlFor="steer-exc">
                excludeDomains (optional)
              </label>
              <textarea
                id="steer-exc"
                className="demo-input demo-textarea"
                value={excludeDomains}
                onChange={(e) => setExcludeDomains(e.target.value)}
                rows={2}
              />
              <div className="demo-grid-2">
                <div>
                  <label className="demo-label" htmlFor="steer-spd">
                    startPublishedDate (ISO 8601)
                  </label>
                  <input
                    id="steer-spd"
                    className="demo-input"
                    value={startPublishedDate}
                    onChange={(e) => setStartPublishedDate(e.target.value)}
                    placeholder="2023-01-01T00:00:00.000Z"
                  />
                </div>
                <div>
                  <label className="demo-label" htmlFor="steer-epd">
                    endPublishedDate
                  </label>
                  <input
                    id="steer-epd"
                    className="demo-input"
                    value={endPublishedDate}
                    onChange={(e) => setEndPublishedDate(e.target.value)}
                    placeholder="2024-12-31T23:59:59.000Z"
                  />
                </div>
                <div>
                  <label className="demo-label" htmlFor="steer-scd">
                    startCrawlDate
                  </label>
                  <input
                    id="steer-scd"
                    className="demo-input"
                    value={startCrawlDate}
                    onChange={(e) => setStartCrawlDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="demo-label" htmlFor="steer-ecd">
                    endCrawlDate
                  </label>
                  <input
                    id="steer-ecd"
                    className="demo-input"
                    value={endCrawlDate}
                    onChange={(e) => setEndCrawlDate(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          )}

          <fieldset className="demo-fieldset">
            <legend className="demo-legend">Contents (per-result enrichment)</legend>
            <div className="demo-check-row" style={{ marginBottom: "0.35rem" }}>
              <input
                id="steer-use-cont"
                type="checkbox"
                checked={useContents}
                onChange={(e) => setUseContents(e.target.checked)}
              />
              <label htmlFor="steer-use-cont">Send a contents object on the search request</label>
            </div>

            <div className="demo-check-row">
              <input
                id="steer-text"
                type="checkbox"
                checked={textOn}
                onChange={(e) => setTextOn(e.target.checked)}
                disabled={!useContents}
              />
              <label htmlFor="steer-text">text — full page text (or cap length)</label>
            </div>
            {textOn && useContents && (
              <input
                className="demo-input"
                style={{ marginLeft: "1.25rem", marginTop: "0.25rem", maxWidth: "8rem" }}
                type="number"
                min={1}
                placeholder="maxCharacters"
                value={textMaxChars}
                onChange={(e) => setTextMaxChars(e.target.value)}
              />
            )}

            <div className="demo-check-row" style={{ marginTop: "0.5rem" }}>
              <input
                id="steer-hi"
                type="checkbox"
                checked={highlightsOn}
                onChange={(e) => setHighlightsOn(e.target.checked)}
                disabled={!useContents}
              />
              <label htmlFor="steer-hi">highlights — LLM-picked snippets</label>
            </div>
            {highlightsOn && useContents && (
              <>
                <label className="demo-label" htmlFor="steer-himc" style={{ marginTop: "0.35rem" }}>
                  highlights.maxCharacters
                </label>
                <input
                  id="steer-himc"
                  className="demo-input"
                  type="number"
                  min={1}
                  value={highlightsMaxChars}
                  onChange={(e) => setHighlightsMaxChars(e.target.value)}
                />
                <label className="demo-label" htmlFor="steer-hiq">
                  highlights.query (steer what the highlights focus on)
                </label>
                <input
                  id="steer-hiq"
                  className="demo-input"
                  value={highlightsSteerQuery}
                  onChange={(e) => setHighlightsSteerQuery(e.target.value)}
                  placeholder="e.g. methodology, pricing, leadership changes"
                />
                <p className="demo-hint">
                  Optional. Custom query directing which passages are selected for highlights (Exa docs).
                </p>
              </>
            )}

            <div className="demo-check-row" style={{ marginTop: "0.5rem" }}>
              <input
                id="steer-sum"
                type="checkbox"
                checked={summaryOn}
                onChange={(e) => setSummaryOn(e.target.checked)}
                disabled={!useContents}
              />
              <label htmlFor="steer-sum">summary — LLM summary with optional guiding query</label>
            </div>
            {summaryOn && useContents && (
              <>
                <label className="demo-label" htmlFor="steer-sumq">
                  summary.query
                </label>
                <input
                  id="steer-sumq"
                  className="demo-input"
                  value={summaryQuery}
                  onChange={(e) => setSummaryQuery(e.target.value)}
                />
              </>
            )}

            <div className="demo-grid-2" style={{ marginTop: "0.5rem" }}>
              <div>
                <label className="demo-label" htmlFor="steer-sub">
                  subpages
                </label>
                <input
                  id="steer-sub"
                  className="demo-input"
                  type="number"
                  min={0}
                  value={subpages}
                  onChange={(e) => setSubpages(e.target.value)}
                />
              </div>
              <div>
                <label className="demo-label" htmlFor="steer-subt">
                  subpageTarget
                </label>
                <input
                  id="steer-subt"
                  className="demo-input"
                  value={subpageTarget}
                  onChange={(e) => setSubpageTarget(e.target.value)}
                  placeholder="sources"
                />
              </div>
            </div>

            <div className="demo-grid-2">
              <div>
                <label className="demo-label" htmlFor="steer-xl">
                  extras.links
                </label>
                <input
                  id="steer-xl"
                  className="demo-input"
                  type="number"
                  min={0}
                  value={extrasLinks}
                  onChange={(e) => setExtrasLinks(e.target.value)}
                />
              </div>
              <div>
                <label className="demo-label" htmlFor="steer-xi">
                  extras.imageLinks
                </label>
                <input
                  id="steer-xi"
                  className="demo-input"
                  type="number"
                  min={0}
                  value={extrasImageLinks}
                  onChange={(e) => setExtrasImageLinks(e.target.value)}
                />
              </div>
            </div>

            <label className="demo-label" htmlFor="steer-mah">
              maxAgeHours (contents freshness; optional)
            </label>
            <input
              id="steer-mah"
              className="demo-input"
              type="number"
              value={maxAgeHours}
              onChange={(e) => setMaxAgeHours(e.target.value)}
              placeholder="omit = default crawl behavior"
            />
            <p className="demo-hint">
              Positive: use cache if newer than N hours; 0 = always livecrawl; -1 = cache only (per Exa).
            </p>
          </fieldset>

          <details className="demo-advanced">
            <summary>Advanced (deep search &amp; streaming)</summary>
            <label className="demo-label" htmlFor="steer-sys">
              systemPrompt (deep / planning)
            </label>
            <textarea
              id="steer-sys"
              className="demo-input demo-textarea"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
            />
            <p className="demo-hint">Only added to the request when type is deep-lite, deep, or deep-reasoning.</p>
            <div className="demo-check-row" style={{ marginTop: "0.35rem" }}>
              <input
                id="steer-stream"
                type="checkbox"
                checked={stream}
                onChange={(e) => setStream(e.target.checked)}
              />
              <label htmlFor="steer-stream">stream (SSE; demo still expects JSON — use carefully)</label>
            </div>
            <label className="demo-label" htmlFor="steer-schema">
              outputSchema (JSON, optional)
            </label>
            <textarea
              id="steer-schema"
              className="demo-input demo-textarea"
              value={outputSchemaJson}
              onChange={(e) => setOutputSchemaJson(e.target.value)}
              rows={4}
              placeholder='{"type":"object","properties":{...}}'
            />
            {schemaError && (
              <p className="demo-status" style={{ color: "#b91c1c" }}>
                {schemaError}
              </p>
            )}
          </details>

          <button
            type="button"
            className="demo-run"
            style={{ marginTop: "0.75rem" }}
            onClick={run}
            disabled={loading || !query.trim()}
          >
            {runLabel}
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
