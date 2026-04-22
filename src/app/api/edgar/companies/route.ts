import { searchSecCompanies } from "@/lib/server/secCompanyTickers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  try {
    const suggestions = await searchSecCompanies(q, 15);
    return Response.json({
      suggestions: suggestions.map((s) => ({
        cik10: s.cik10,
        cik: s.cik,
        ticker: s.ticker,
        title: s.title,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lookup failed";
    return Response.json({ error: message, suggestions: [] }, { status: 502 });
  }
}
