const EXA_ORIGIN = "https://api.exa.ai";

export function getExaApiKey(): string | undefined {
  return process.env.EXA_KEY ?? process.env.EXA_API_KEY;
}

export async function exaPost(path: "/search" | "/contents" | "/findSimilar" | "/answer", body: unknown) {
  const key = getExaApiKey();
  if (!key) {
    throw new Error("EXA_KEY is not configured");
  }

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
}
