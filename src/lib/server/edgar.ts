/**
 * Latest EDGAR filings via SEC's public Atom feed (no API key).
 * Per SEC fair access: set EDGAR_USER_AGENT; outbound SEC HTTP uses
 * `withSecRateLimit` (10 req/s per process).
 * @see https://www.sec.gov/os/accessing-edgar-data
 */

import {
  FORM4_MIN_DISPLAY_GROSS_USD,
  LATEST_EDGAR_BATCH_SIZE,
} from "@/lib/edgarLatestConfig";
import { enrichFormDFiling, isFormDFamily } from "@/lib/server/edgarFormDEnrichment";
import type { EdgarAffiliatePerson } from "@/lib/server/edgarFormDEnrichment";
import type { EdgarForm4SaleLine, EdgarForm4Summary } from "@/lib/server/edgarForm4Enrichment";
import { enrichForm4Filing } from "@/lib/server/edgarForm4Enrichment";
import { withSecRateLimit } from "@/lib/server/secRequestLimiter";
import { secEdgarUserAgent } from "@/lib/server/secUserAgent";

export type { EdgarAffiliatePerson, EdgarForm4SaleLine, EdgarForm4Summary };
export {
  FORM4_MIN_DISPLAY_GROSS_USD,
  LATEST_EDGAR_BATCH_SIZE,
  LATEST_EDGAR_MAX_MATCHES,
  LATEST_FILL_INTERVAL_MS,
} from "@/lib/edgarLatestConfig";

export type EdgarFiling = {
  title: string;
  url: string;
  updated: string;
  formType: string;
  summaryText: string;
  affiliates?: EdgarAffiliatePerson[];
  affiliateTags?: string[];
  form4?: EdgarForm4Summary;
};

const ATOM_FETCH_MAX_ATTEMPTS = 6;
const ATOM_RETRY_BASE_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeEdgarFilingUrl(href: string): string {
  const t = href.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return `https://www.sec.gov${t}`;
  return `https://www.sec.gov/${t}`;
}

/**
 * Form 8 family (current reports, etc.): 8-K, 8-A, 8-K12B, 8-K/A, …
 * Matched by type prefix after Atom `term` / title guess.
 */
function isForm8Family(formType: string): boolean {
  return /^8[-/]/i.test(formType.trim());
}

/**
 * Form 10 family (periodic reports): 10-K, 10-Q, 10-KT, 10-QT, 10-D, …
 */
function isForm10Family(formType: string): boolean {
  return /^10[-/]/i.test(formType.trim());
}

/** Forms we keep from the feed: 4, D family, 8-* , 10-* (others skipped). */
function isCollectedFormType(formType: string): boolean {
  const t = formType.trim();
  if (t === "4") return true;
  if (isFormDFamily(formType)) return true;
  if (isForm8Family(formType)) return true;
  if (isForm10Family(formType)) return true;
  return false;
}

function passesForm4DisplayRules(f: EdgarFiling): boolean {
  if (f.formType.trim() !== "4") return true;
  const total = f.form4?.saleSummary?.totalGrossUsd;
  return total != null && total > FORM4_MIN_DISPLAY_GROSS_USD;
}

function getCurrentAtomUrl(entryCount: number, start: number): string {
  const u = new URL("https://www.sec.gov/cgi-bin/browse-edgar");
  u.searchParams.set("action", "getcurrent");
  u.searchParams.set("output", "atom");
  u.searchParams.set("count", String(entryCount));
  if (start > 0) u.searchParams.set("start", String(start));
  return u.toString();
}

async function fetchAtomSlice(start: number, count: number): Promise<EdgarFiling[]> {
  const url = getCurrentAtomUrl(count, start);
  let lastStatus = 0;

  for (let attempt = 1; attempt <= ATOM_FETCH_MAX_ATTEMPTS; attempt++) {
    const res = await withSecRateLimit(() =>
      fetch(url, {
        headers: {
          "User-Agent": secEdgarUserAgent(),
          Accept: "application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        next: { revalidate: 30 },
      }),
    );

    if (res.ok) {
      const xml = await res.text();
      return parseGetCurrentAtom(xml, count);
    }

    lastStatus = res.status;
    await res.text().catch(() => {});
    const retryable =
      res.status === 503 || res.status === 502 || res.status === 429 || res.status === 504;
    if (!retryable || attempt === ATOM_FETCH_MAX_ATTEMPTS) {
      throw new Error(`SEC getcurrent atom: HTTP ${res.status}`);
    }

    let waitMs = ATOM_RETRY_BASE_MS * 2 ** (attempt - 1);
    const retryAfter = res.headers.get("Retry-After");
    if (retryAfter) {
      const sec = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(sec)) waitMs = Math.max(waitMs, sec * 1000);
    }
    waitMs += Math.floor(Math.random() * 300);
    await sleep(waitMs);
  }

  throw new Error(`SEC getcurrent atom: HTTP ${lastStatus}`);
}

const FORM_D_ENRICH_CONCURRENCY = 8;

export { secEdgarUserAgent } from "@/lib/server/secUserAgent";

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripHtmlToText(html: string): string {
  return decodeBasicEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function guessFormFromTitle(title: string): string {
  const idx = title.indexOf(" - ");
  if (idx <= 0) return "";
  const head = title.slice(0, idx).trim();
  if (/^[\dA-Z][\dA-Z.\-]{0,20}$/.test(head)) return head;
  return "";
}

function formTypeFromEntry(block: string, decodedTitle: string): string {
  const fromCategory =
    block
      .match(/<category[^>]+label="form type"[^>]+term="([^"]+)"/)?.[1]
      ?.trim() ??
    block
      .match(/<category[^>]+term="([^"]+)"[^>]+label="form type"/)?.[1]
      ?.trim() ??
    "";
  if (fromCategory) return decodeBasicEntities(fromCategory);
  const guessed = guessFormFromTitle(decodedTitle);
  return guessed ? decodeBasicEntities(guessed) : "";
}

function parseGetCurrentAtom(xml: string, limit: number): EdgarFiling[] {
  const chunks = xml.split("<entry>");
  const out: EdgarFiling[] = [];

  for (let i = 1; i < chunks.length && out.length < limit; i++) {
    const block = chunks[i];
    const titleMatch = block.match(/<title>([^<]*)<\/title>/);
    const linkMatch =
      block.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/) ??
      block.match(/<link[^>]+href="([^"]+)"[^>]+rel="alternate"/);
    const updatedMatch = block.match(/<updated>([^<]+)<\/updated>/);
    const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);

    if (!titleMatch || !linkMatch) {
      continue;
    }

    const titleDecoded = decodeBasicEntities(titleMatch[1].trim());
    const summaryRaw = summaryMatch?.[1] ?? "";
    out.push({
      title: titleDecoded,
      url: normalizeEdgarFilingUrl(linkMatch[1]),
      updated: updatedMatch?.[1]?.trim() ?? "",
      formType: formTypeFromEntry(block, titleDecoded),
      summaryText: stripHtmlToText(summaryRaw),
    });
  }

  return out;
}

async function enrichOneFiling(f: EdgarFiling): Promise<EdgarFiling> {
  try {
    if (f.formType.trim() === "4") {
      const form4 = await enrichForm4Filing(f.url);
      if (form4?.ownerName) {
        return { ...f, form4 };
      }
      return f;
    }

    const extra = await enrichFormDFiling(f.url, f.formType);
    if (!extra) return f;
    const hasPeople = extra.people.length > 0;
    const hasTags = extra.tags.length > 0;
    if (!hasPeople && !hasTags) return f;
    return {
      ...f,
      ...(hasPeople ? { affiliates: extra.people } : {}),
      ...(hasTags ? { affiliateTags: extra.tags } : {}),
    };
  } catch {
    return f;
  }
}

async function enrichFilingsWithPool(base: EdgarFiling[]): Promise<EdgarFiling[]> {
  if (base.length === 0) return base;
  const out: EdgarFiling[] = new Array(base.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= base.length) return;
      out[i] = await enrichOneFiling(base[i]);
    }
  }

  const pool = Math.min(FORM_D_ENRICH_CONCURRENCY, base.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return out;
}

/**
 * One Atom slice (`count` = {@link LATEST_EDGAR_BATCH_SIZE}): fetch → keep Form
 * 4 / D / 8 / 10 families → enrich 4 & D only → Form 4 gross &gt; threshold.
 */
export async function processLatestEdgarBatch(atomStart: number): Promise<{
  items: EdgarFiling[];
  nextStart: number;
  feedExhausted: boolean;
}> {
  const count = LATEST_EDGAR_BATCH_SIZE;
  const raw = await fetchAtomSlice(atomStart, count);
  const candidates = raw.filter((f) => isCollectedFormType(f.formType));
  const enriched = await enrichFilingsWithPool(candidates);
  const items = enriched.filter(passesForm4DisplayRules);
  return {
    items,
    nextStart: atomStart + raw.length,
    feedExhausted: raw.length < count,
  };
}
