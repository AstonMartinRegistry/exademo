import { processLatestEdgarBatch } from "@/lib/server/edgar";

export const maxDuration = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = Number.parseInt(searchParams.get("start") ?? "0", 10);
  const atomStart = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

  try {
    const result = await processLatestEdgarBatch(atomStart);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Batch failed";
    return Response.json(
      { error: message, items: [], nextStart: atomStart, feedExhausted: false },
      { status: 502 },
    );
  }
}
