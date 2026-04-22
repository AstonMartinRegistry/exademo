"use client";

import DemoJsonBlock from "@/components/DemoJsonBlock";
import type { EdgarForm4Summary } from "@/lib/server/edgarForm4Enrichment";
import { useEffect, useMemo, useState } from "react";

type Props = {
  form4: EdgarForm4Summary;
  filingUrl: string;
};

function filingKey(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?sec\.gov/i, "https://www.sec.gov");
}

/** Issuer plus filing city, e.g. `Acme Inc (Austin)`. */
function form4ExaCompanySearchQuery(form4: EdgarForm4Summary): string {
  const company = (form4.issuerName ?? "").trim();
  const place = (form4.rptOwnerCity ?? "").trim();
  if (!company) return "";
  return place ? `${company} (${place})` : company;
}

function form4ExaPeopleQuery(form4: EdgarForm4Summary): string {
  const name = (form4.rptOwnerName ?? form4.ownerName ?? "").trim();
  const company = (form4.issuerName ?? "").trim();
  const place = (form4.rptOwnerCity ?? "").trim();

  if (!name && !company && !place) return "";

  const subject = name || "This person";

  if (company && place) {
    return `${subject} who works with ${company} and is from ${place}`;
  }
  if (company) {
    return `${subject} who works with ${company}`;
  }
  if (place) {
    return `${subject} who is from ${place}`;
  }
  return subject;
}

type ExaHit = {
  title?: string;
  url?: string;
  text?: string;
  summary?: string;
  highlights?: string[];
};

function getFirstHit(data: unknown): ExaHit | null {
  if (!data || typeof data !== "object" || !("results" in data)) return null;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  if (!first || typeof first !== "object") return null;
  return first as ExaHit;
}

function firstHitDescription(hit: ExaHit): string {
  const summary = typeof hit.summary === "string" ? hit.summary.trim() : "";
  if (summary) return summary;
  const hl = Array.isArray(hit.highlights)
    ? hit.highlights.filter((h) => typeof h === "string").join(" ").trim()
    : "";
  if (hl) return hl;
  const text = typeof hit.text === "string" ? hit.text.trim() : "";
  if (text) return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
  const title = typeof hit.title === "string" ? hit.title.trim() : "";
  return title || "(No description returned for this result.)";
}

function buildDeepResearchPrompt(
  form4: EdgarForm4Summary,
  companyHit: ExaHit,
  peopleHit: ExaHit,
): string {
  const person = (form4.rptOwnerName ?? form4.ownerName ?? "").trim() || "Unknown";
  const company = (form4.issuerName ?? "").trim() || "Unknown";
  const city = (form4.rptOwnerCity ?? "").trim();

  const cTitle = typeof companyHit.title === "string" ? companyHit.title : "—";
  const cDesc = firstHitDescription(companyHit);

  const pTitle = typeof peopleHit.title === "string" ? peopleHit.title : "—";
  const pUrl = typeof peopleHit.url === "string" ? peopleHit.url.trim() : "";
  const linkedinLine = pUrl.includes("linkedin.com")
    ? `LinkedIn: ${pUrl}`
    : pUrl
      ? `Profile / source URL: ${pUrl}`
      : "No URL on the first people hit.";

  return [
    `Person (SEC Form 4 reporting owner): ${person}.`,
    `Company (issuer): ${company}${city ? `. Filing lists city: ${city}.` : ""}`,
    ``,
    `From Exa company search — first result title: ${cTitle}.`,
    `First result description / text: ${cDesc}`,
    ``,
    `From Exa people search — first result title: ${pTitle}.`,
    `${linkedinLine}`,
    ``,
    `Use the above as seed evidence. Produce deep research: who this person is, how they relate to the company, and what additional reputable sources would confirm or refine this. Call out gaps and uncertainty.`,
  ].join("\n");
}

const EXA_SEARCH_BODY_BASE = {
  type: "auto" as const,
  numResults: 5,
  contents: {
    text: { maxCharacters: 2500 },
    highlights: { maxCharacters: 1200 },
  },
};

async function postExaSearch(body: Record<string, unknown>): Promise<{
  ok: boolean;
  json: unknown;
  status: number;
}> {
  const res = await fetch("/api/exa/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, json, status: res.status };
}

export function Form4ExaPipeline({ form4, filingUrl }: Props) {
  const baseKey = filingKey(filingUrl);
  const companyQuery = form4ExaCompanySearchQuery(form4);
  const peopleQuery = form4ExaPeopleQuery(form4);

  const [companyLoading, setCompanyLoading] = useState(Boolean(companyQuery));
  const [companyData, setCompanyData] = useState<unknown | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [peopleLoading, setPeopleLoading] = useState(Boolean(peopleQuery));
  const [peopleData, setPeopleData] = useState<unknown | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  const [deepLoading, setDeepLoading] = useState(false);
  const [deepData, setDeepData] = useState<unknown | null>(null);
  const [deepError, setDeepError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runCompany = async () => {
      if (!companyQuery) {
        setCompanyLoading(false);
        setCompanyError("No Exa query (issuer / company name missing).");
        setCompanyData(null);
        return;
      }
      setCompanyLoading(true);
      setCompanyError(null);
      setCompanyData(null);
      const { ok, json } = await postExaSearch({
        ...EXA_SEARCH_BODY_BASE,
        query: companyQuery,
        category: "company",
      });
      if (cancelled) return;
      if (!ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "Company search failed";
        setCompanyError(msg);
        setCompanyData(null);
      } else {
        setCompanyData(json);
        setCompanyError(null);
      }
      setCompanyLoading(false);
    };

    const runPeople = async () => {
      if (!peopleQuery) {
        setPeopleLoading(false);
        setPeopleError("No Exa query (issuer / owner / city missing).");
        setPeopleData(null);
        return;
      }
      setPeopleLoading(true);
      setPeopleError(null);
      setPeopleData(null);
      const { ok, json } = await postExaSearch({
        ...EXA_SEARCH_BODY_BASE,
        query: peopleQuery,
        category: "people",
      });
      if (cancelled) return;
      if (!ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "People search failed";
        setPeopleError(msg);
        setPeopleData(null);
      } else {
        setPeopleData(json);
        setPeopleError(null);
      }
      setPeopleLoading(false);
    };

    void Promise.all([runCompany(), runPeople()]);

    return () => {
      cancelled = true;
    };
  }, [baseKey, companyQuery, peopleQuery]);

  const deepPrompt = useMemo(() => {
    if (companyLoading || peopleLoading) return null;
    if (companyError || peopleError) {
      return { kind: "skip" as const, reason: "Fix company and people search errors before deep research runs." };
    }
    if (!companyQuery || !peopleQuery) {
      return {
        kind: "skip" as const,
        reason: "Company and people queries must both be present for deep research.",
      };
    }
    const cHit = getFirstHit(companyData);
    const pHit = getFirstHit(peopleData);
    if (!cHit) {
      return {
        kind: "skip" as const,
        reason: "Deep research needs at least one company search result.",
      };
    }
    if (!pHit) {
      return {
        kind: "skip" as const,
        reason: "Deep research needs at least one people search result.",
      };
    }
    return {
      kind: "prompt" as const,
      text: buildDeepResearchPrompt(form4, cHit, pHit),
    };
  }, [
    companyLoading,
    peopleLoading,
    companyError,
    peopleError,
    companyQuery,
    peopleQuery,
    companyData,
    peopleData,
    form4,
  ]);

  useEffect(() => {
    if (!deepPrompt || deepPrompt.kind !== "prompt") {
      setDeepLoading(false);
      setDeepData(null);
      if (deepPrompt?.kind === "skip") {
        setDeepError(null);
      }
      return;
    }

    const promptText = deepPrompt.text;
    let cancelled = false;
    setDeepLoading(true);
    setDeepError(null);
    setDeepData(null);

    void (async () => {
      try {
        const res = await fetch("/api/exa/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: promptText,
            type: "deep",
            numResults: 5,
          }),
        });
        const json: unknown = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const errMsg =
            typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          setDeepError(errMsg);
          setDeepData(null);
        } else {
          setDeepData(json);
          setDeepError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setDeepError(e instanceof Error ? e.message : "Request failed");
          setDeepData(null);
        }
      } finally {
        if (!cancelled) setDeepLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deepPrompt, baseKey]);

  const deepSkipReason = deepPrompt?.kind === "skip" ? deepPrompt.reason : null;

  return (
    <div
      className="home-edgar-form4-exa-stack"
      aria-label="Exa company, people, and deep research"
    >
      <div className="home-edgar-form4-exa-block">
        <span className="home-edgar-form-label">Exa · company search</span>
        <p className="home-edgar-exa-query">
          Query: <strong>{companyQuery || "—"}</strong>
        </p>
        <div className="home-edgar-exa-json">
          <DemoJsonBlock
            data={companyData}
            error={companyError}
            loading={companyLoading}
          />
        </div>
      </div>

      <div className="home-edgar-form4-exa-block">
        <span className="home-edgar-form-label">Exa · people search</span>
        <p className="home-edgar-exa-query">
          Query: <strong>{peopleQuery || "—"}</strong>
        </p>
        <div className="home-edgar-exa-json">
          <DemoJsonBlock
            data={peopleData}
            error={peopleError}
            loading={peopleLoading}
          />
        </div>
      </div>

      <div className="home-edgar-form4-exa-block home-edgar-form4-exa-deep">
        <span className="home-edgar-form-label">Exa · deep research</span>
        {deepPrompt?.kind === "prompt" ? (
          <p className="home-edgar-exa-query home-edgar-exa-query--multiline">
            Query:{" "}
            <strong className="home-edgar-exa-deep-prompt">{deepPrompt.text}</strong>
          </p>
        ) : deepSkipReason ? (
          <p className="home-edgar-exa-query home-edgar-exa-meta">
            {deepSkipReason}
          </p>
        ) : (
          <p className="home-edgar-exa-query home-edgar-exa-meta">
            Waiting for company and people search to finish…
          </p>
        )}
        <div className="home-edgar-exa-json">
          <DemoJsonBlock
            data={deepData}
            error={deepError}
            loading={
              companyLoading ||
              peopleLoading ||
              (deepPrompt?.kind === "prompt" && deepLoading)
            }
          />
        </div>
      </div>
    </div>
  );
}
