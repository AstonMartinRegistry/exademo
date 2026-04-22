/**
 * Pull related persons + exemption / industry tags from Form D / D/A primary_doc.xml.
 */

import { withSecRateLimit } from "@/lib/server/secRequestLimiter";
import { secEdgarUserAgent } from "@/lib/server/secUserAgent";

export type EdgarAffiliatePerson = {
  name: string;
  relationships: string[];
  clarification?: string;
};

export type EdgarFormDEnrichment = {
  people: EdgarAffiliatePerson[];
  tags: string[];
};

const FORM_D_PATTERN = /^D(\/[AW])?$/i;

export function isFormDFamily(formType: string): boolean {
  return FORM_D_PATTERN.test(formType.trim());
}

/** /Archives/edgar/data/{cik}/{accessionFolder}/... */
export function parseEdgarArchivesPath(
  url: string,
): { cik: string; accessionFolder: string } | null {
  const m = url.match(/\/Archives\/edgar\/data\/(\d+)\/(\d+)\//);
  if (!m) return null;
  return { cik: m[1], accessionFolder: m[2] };
}

function textContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() ?? "";
}

function parseRelatedPersonBlock(block: string): EdgarAffiliatePerson | null {
  const first = textContent(block, "firstName");
  const middle = textContent(block, "middleName");
  const last = textContent(block, "lastName");
  const name = [first, middle, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!name) return null;

  const relationships: string[] = [];
  const relRe = /<relationship>([^<]*)<\/relationship>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = relRe.exec(block)) !== null) {
    const v = rm[1].trim();
    if (v) relationships.push(v);
  }

  const clarification = textContent(block, "relationshipClarification") || undefined;

  return { name, relationships, clarification };
}

function extractSection(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1] ?? null;
}

/** Issuer line + offering / investor / fee facts as display tags (Form D primary_doc). */
function appendIssuerAndOfferingTags(
  xml: string,
  addTag: (raw: string) => void,
): void {
  const pi = extractSection(xml, "primaryIssuer");
  if (pi) {
    const entityName = textContent(pi, "entityName");
    if (entityName) addTag(entityName);

    const addr = extractSection(pi, "issuerAddress");
    if (addr) {
      const st = textContent(addr, "stateOrCountry");
      const stDesc = textContent(addr, "stateOrCountryDescription");
      if (st || stDesc) {
        addTag([st, stDesc].filter(Boolean).join(" · "));
      }
    }
  }

  const od = extractSection(xml, "offeringData");
  if (!od) return;

  const osa = extractSection(od, "offeringSalesAmounts");
  if (osa) {
    const toa = textContent(osa, "totalOfferingAmount");
    const tas = textContent(osa, "totalAmountSold");
    const tr = textContent(osa, "totalRemaining");
    if (toa) addTag(`Offering total: ${toa}`);
    if (tas !== "") addTag(`Amount sold: ${tas}`);
    if (tr) addTag(`Remaining: ${tr}`);
  }

  const inv = extractSection(od, "investors");
  if (inv) {
    const hna = textContent(inv, "hasNonAccreditedInvestors");
    const tni = textContent(inv, "totalNumberAlreadyInvested");
    if (hna) addTag(`Non-accredited investors: ${hna}`);
    if (tni !== "") addTag(`Investors recorded: ${tni}`);
  }

  const fees = extractSection(od, "salesCommissionsFindersFees");
  if (fees) {
    const sc = extractSection(fees, "salesCommissions");
    const ff = extractSection(fees, "findersFees");
    if (sc) {
      const amt = textContent(sc, "dollarAmount");
      addTag(`Sales commissions: ${amt === "" ? "—" : amt}`);
    }
    if (ff) {
      const amt = textContent(ff, "dollarAmount");
      addTag(`Finders fees: ${amt === "" ? "—" : amt}`);
    }
  }
}

export function parseFormDPrimaryDocXml(xml: string): EdgarFormDEnrichment {
  const people: EdgarAffiliatePerson[] = [];
  const tags: string[] = [];
  const seenTag = new Set<string>();

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seenTag.has(key)) return;
    seenTag.add(key);
    tags.push(t);
  };

  const listXml = extractSection(xml, "relatedPersonsList");
  if (listXml) {
    const blockRe = /<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(listXml)) !== null) {
      const person = parseRelatedPersonBlock(bm[1]);
      if (person) people.push(person);
    }
  }

  appendIssuerAndOfferingTags(xml, addTag);

  const exemptXml = extractSection(xml, "federalExemptionsExclusions");
  if (exemptXml) {
    const itemRe = /<item>([^<]*)<\/item>/gi;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(exemptXml)) !== null) {
      addTag(im[1]);
    }
  }

  const igType = textContent(xml, "industryGroupType");
  if (igType) addTag(igType);

  const fundType = textContent(xml, "investmentFundType");
  if (fundType) addTag(fundType);

  return { people, tags };
}

export async function enrichFormDFiling(
  filingUrl: string,
  formType: string,
): Promise<EdgarFormDEnrichment | null> {
  if (!isFormDFamily(formType)) return null;

  const path = parseEdgarArchivesPath(filingUrl);
  if (!path) return null;

  const primaryUrl = `https://www.sec.gov/Archives/edgar/data/${path.cik}/${path.accessionFolder}/primary_doc.xml`;

  try {
    const res = await withSecRateLimit(() =>
      fetch(primaryUrl, {
        headers: {
          "User-Agent": secEdgarUserAgent(),
          Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
        },
        next: { revalidate: 600 },
      }),
    );

    if (!res.ok) return null;

    const xml = await res.text();
    if (!xml.includes("<edgarSubmission")) {
      return null;
    }

    return parseFormDPrimaryDocXml(xml);
  } catch {
    return null;
  }
}
