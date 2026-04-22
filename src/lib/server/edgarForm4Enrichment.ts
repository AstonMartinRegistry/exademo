/**
 * Form 4 — parse `<ownershipDocument>` from the filing’s submission `.txt`
 * (same accession as the Atom `*-index.htm` link), with XML-only fallback.
 * Output: insider name + total gross on priced sales (pre-fee; not net cash).
 */

import { withSecRateLimit } from "@/lib/server/secRequestLimiter";
import { secEdgarUserAgent } from "@/lib/server/secUserAgent";

export type EdgarForm4SaleLine = {
  security: string;
  /** Gross $ for this security (shares sold × price), summed if multiple lots */
  grossUsd: number;
  sharesSold: string;
  /** Volume-weighted average price across lots */
  avgPricePerShare?: string;
};

export type EdgarForm4Summary = {
  /** Reporting-owner name (from `rptOwnerName`); primary display name */
  ownerName: string;
  /** Issuer company name from `issuer` / `issuerName` */
  issuerName: string;
  /** Same as ownerName; kept for clarity next to issuer / city */
  rptOwnerName: string;
  /** `reportingOwnerAddress` / `rptOwnerCity` when present */
  rptOwnerCity: string;
  /** Null when no disposition (D) rows with both shares and price */
  saleSummary: {
    totalGrossUsd: number;
    lines: EdgarForm4SaleLine[];
  } | null;
};

type ParsedTx = {
  security: string;
  acquiredDisposed?: string;
  shares?: string;
  pricePerShare?: string;
};

function decodeXmlText(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function extractSection(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1] ?? null;
}

function textContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return decodeXmlText(m?.[1]?.trim() ?? "");
}

function valueIn(block: string, tag: string): string {
  const inner = extractSection(block, tag);
  if (!inner) return "";
  const v = textContent(inner, "value");
  return decodeXmlText(v || inner.trim());
}

function securityTitleFrom(block: string): string {
  const st = extractSection(block, "securityTitle");
  if (!st) return "";
  const v = textContent(st, "value");
  return decodeXmlText(v || st.trim());
}

function parseTransactionBlock(b: string): ParsedTx | null {
  const security = securityTitleFrom(b);
  if (!security) return null;

  const amounts = extractSection(b, "transactionAmounts");
  let shares = "";
  let price = "";
  let ad = "";
  if (amounts) {
    shares = valueIn(amounts, "transactionShares");
    price = valueIn(amounts, "transactionPricePerShare");
    ad = valueIn(amounts, "transactionAcquiredDisposedCode");
  }

  return {
    security,
    acquiredDisposed: ad || undefined,
    shares: shares || undefined,
    pricePerShare: price || undefined,
  };
}

function formatShareSum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 1e6) / 1e6;
  return String(r).replace(/\.?0+$/, "");
}

function buildSaleSummary(transactions: ParsedTx[]): EdgarForm4Summary["saleSummary"] {
  type Agg = { gross: number; shareSum: number };
  const bySec = new Map<string, Agg>();

  for (const tx of transactions) {
    if (tx.acquiredDisposed !== "D") continue;
    const shRaw = tx.shares;
    const prRaw = tx.pricePerShare;
    if (!shRaw || !prRaw) continue;
    const sh = parseFloat(String(shRaw).replace(/,/g, ""));
    const pr = parseFloat(String(prRaw).replace(/,/g, ""));
    if (!Number.isFinite(sh) || !Number.isFinite(pr) || sh <= 0 || pr < 0) continue;
    const gross = sh * pr;
    const prev = bySec.get(tx.security) ?? { gross: 0, shareSum: 0 };
    prev.gross += gross;
    prev.shareSum += sh;
    bySec.set(tx.security, prev);
  }

  if (bySec.size === 0) return null;

  let total = 0;
  const lines: EdgarForm4SaleLine[] = [];
  for (const [security, { gross, shareSum }] of bySec) {
    total += gross;
    const avg = shareSum > 0 ? gross / shareSum : 0;
    lines.push({
      security,
      grossUsd: Math.round(gross * 100) / 100,
      sharesSold: formatShareSum(shareSum),
      avgPricePerShare: (Math.round(avg * 100) / 100).toFixed(2),
    });
  }
  lines.sort((a, b) => b.grossUsd - a.grossUsd);

  return {
    totalGrossUsd: Math.round(total * 100) / 100,
    lines,
  };
}

export function parseOwnershipDocumentXml(xml: string): EdgarForm4Summary | null {
  const ro = extractSection(xml, "reportingOwner");
  if (!ro) return null;

  const rptOwnerNameRaw = textContent(ro, "rptOwnerName");
  if (!rptOwnerNameRaw) return null;

  const rptOwnerName = decodeXmlText(rptOwnerNameRaw);
  const addr = extractSection(ro, "reportingOwnerAddress");
  const rptOwnerCity = decodeXmlText(addr ? textContent(addr, "rptOwnerCity") : "");

  const issuerBlock = extractSection(xml, "issuer");
  const issuerName = decodeXmlText(issuerBlock ? textContent(issuerBlock, "issuerName") : "");

  const transactions: ParsedTx[] = [];

  const ndt = extractSection(xml, "nonDerivativeTable");
  if (ndt) {
    const txRe = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = txRe.exec(ndt)) !== null) {
      const row = parseTransactionBlock(tm[1]);
      if (row) transactions.push(row);
    }
  }

  const dt = extractSection(xml, "derivativeTable");
  if (dt) {
    const txRe = /<derivativeTransaction>([\s\S]*?)<\/derivativeTransaction>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = txRe.exec(dt)) !== null) {
      const row = parseTransactionBlock(tm[1]);
      if (row) transactions.push(row);
    }
  }

  return {
    ownerName: rptOwnerName,
    issuerName,
    rptOwnerName,
    rptOwnerCity,
    saleSummary: buildSaleSummary(transactions),
  };
}

function absSecUrl(path: string): string {
  return path.startsWith("http") ? path : `https://www.sec.gov${path}`;
}

/** `{accession}-index.htm` → `{accession}.txt` (full submission bundle). */
function submissionTxtUrlFromIndex(indexPageUrl: string): string | null {
  try {
    const u = new URL(indexPageUrl);
    if (!/-index\.htm$/i.test(u.pathname)) return null;
    u.pathname = u.pathname.replace(/-index\.htm$/i, ".txt");
    return u.toString();
  } catch {
    const clean = indexPageUrl.split("?")[0].trim();
    if (!/-index\.htm$/i.test(clean)) return null;
    return clean.replace(/-index\.htm$/i, ".txt");
  }
}

function extractOwnershipDocumentXmlFromSubmissionTxt(txt: string): string | null {
  const m = txt.match(/<ownershipDocument>([\s\S]*?)<\/ownershipDocument>/i);
  if (!m) return null;
  return `<ownershipDocument>${m[1]}</ownershipDocument>`;
}

export async function resolveForm4XmlUrl(indexPageUrl: string): Promise<string | null> {
  const res = await withSecRateLimit(() =>
    fetch(indexPageUrl, {
      headers: {
        "User-Agent": secEdgarUserAgent(),
        Accept: "text/html,*/*;q=0.8",
      },
      next: { revalidate: 600 },
    }),
  );
  if (!res.ok) return null;
  const html = await res.text();
  const candidates = [
    ...html.matchAll(/href=(["'])(\/Archives\/edgar\/data\/[^"']+\.xml)\1/gi),
  ].map((m) => m[2]);

  const ownership = candidates.find((h) => /\/ownership\.xml$/i.test(h));
  if (ownership) return absSecUrl(ownership);

  const wkPlain = candidates.find(
    (h) => /wk-form4_/i.test(h) && !/\/xsl/i.test(h),
  );
  if (wkPlain) return absSecUrl(wkPlain);

  const wkAny = candidates.find((h) => /wk-form4_/i.test(h));
  if (wkAny) return absSecUrl(wkAny);

  return null;
}

function parseForm4FromXmlResponseBody(body: string): EdgarForm4Summary | null {
  const fragment = extractOwnershipDocumentXmlFromSubmissionTxt(body);
  const xml = fragment ?? (body.includes("<ownershipDocument>") ? body : null);
  if (!xml) return null;
  return parseOwnershipDocumentXml(xml);
}

export async function enrichForm4Filing(
  indexPageUrl: string,
): Promise<EdgarForm4Summary | null> {
  const txtUrl = submissionTxtUrlFromIndex(indexPageUrl);
  if (txtUrl) {
    try {
      const txtRes = await withSecRateLimit(() =>
        fetch(txtUrl, {
          headers: {
            "User-Agent": secEdgarUserAgent(),
            Accept: "text/plain,*/*;q=0.8",
          },
          next: { revalidate: 600 },
        }),
      );
      if (txtRes.ok) {
        const txt = await txtRes.text();
        const parsed = parseForm4FromXmlResponseBody(txt);
        if (parsed) return parsed;
      }
    } catch {
      /* try XML path */
    }
  }

  const xmlUrl = await resolveForm4XmlUrl(indexPageUrl);
  if (!xmlUrl) return null;

  const res = await withSecRateLimit(() =>
    fetch(xmlUrl, {
      headers: {
        "User-Agent": secEdgarUserAgent(),
        Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 600 },
    }),
  );
  if (!res.ok) return null;

  return parseForm4FromXmlResponseBody(await res.text());
}
