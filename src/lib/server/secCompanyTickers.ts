/**
 * SEC listed-company names and tickers from the public JSON index.
 * @see https://www.sec.gov/search-filings/edgar-full-index-landing
 */

import { withSecRateLimit } from "@/lib/server/secRequestLimiter";
import { secEdgarUserAgent } from "@/lib/server/secUserAgent";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

export type SecCompanyRow = {
  /** Zero-padded 10-digit CIK for submissions URLs */
  cik10: string;
  cik: number;
  ticker: string;
  title: string;
};

type RawEntry = { cik_str: number; ticker: string; title: string };

function padCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

export function secCompanyBrowseUrl(cik10: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik10}&owner=exclude&count=40`;
}

async function loadAllRows(): Promise<SecCompanyRow[]> {
  const res = await withSecRateLimit(() =>
    fetch(TICKERS_URL, {
      headers: {
        "User-Agent": secEdgarUserAgent(),
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    }),
  );

  if (!res.ok) {
    throw new Error(`SEC company_tickers.json: HTTP ${res.status}`);
  }

  const data = (await res.json()) as Record<string, RawEntry>;
  return Object.values(data).map((row) => ({
    cik: row.cik_str,
    cik10: padCik(row.cik_str),
    ticker: String(row.ticker ?? "").trim(),
    title: String(row.title ?? "").trim(),
  }));
}

function scoreMatch(q: string, row: SecCompanyRow): number {
  const qt = q.trim().toLowerCase();
  if (!qt) return 0;

  const ticker = row.ticker.toLowerCase();
  const title = row.title.toLowerCase();

  if (ticker === qt) return 1000;
  if (ticker.startsWith(qt)) return 850;
  if (title.startsWith(qt)) return 700;
  const tw = title.split(/\s+/);
  if (tw.some((w) => w.startsWith(qt))) return 650;
  if (title.includes(qt)) return 400;
  if (ticker.includes(qt)) return 350;
  return 0;
}

export async function searchSecCompanies(
  query: string,
  limit = 15,
): Promise<SecCompanyRow[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await loadAllRows();
  const scored = rows
    .map((row) => ({ row, score: scoreMatch(q, row) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title));

  const seen = new Set<string>();
  const out: SecCompanyRow[] = [];
  for (const { row } of scored) {
    const key = row.cik10;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
