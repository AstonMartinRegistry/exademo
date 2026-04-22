const EXA_ORIGIN = "https://api.exa.ai";

/** Stay under Exa's ~10 req/s (burst from many parallel /api/exa/search callers). */
const EXA_MIN_START_INTERVAL_MS = 110;

export function getExaApiKey(): string | undefined {
  return process.env.EXA_KEY ?? process.env.EXA_API_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let exaQueue: Promise<unknown> = Promise.resolve();
let nextAllowedStart = 0;

export async function exaPost(
  path: "/search" | "/contents" | "/findSimilar" | "/answer",
  body: unknown,
) {
  const key = getExaApiKey();
  if (!key) {
    throw new Error("EXA_KEY is not configured");
  }

  const result: Promise<unknown> = exaQueue.then(async () => {
    const now = Date.now();
    if (now < nextAllowedStart) {
      await sleep(nextAllowedStart - now);
    }
    nextAllowedStart = Date.now() + EXA_MIN_START_INTERVAL_MS;

    const res = await fetch(`${EXA_ORIGIN}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify(body),
    });

    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      const snippet =
        typeof data === "object" && data !== null ? JSON.stringify(data) : String(data);
      throw new Error(`Exa ${res.status}: ${snippet.slice(0, 800)}`);
    }

    return data;
  });

  exaQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}
