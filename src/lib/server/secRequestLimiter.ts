/**
 * SEC fair access: max 10 HTTP request **starts** per rolling 1s window.
 * @see https://www.sec.gov/os/accessing-edgar-data
 *
 * All server-side SEC fetches should run through `withSecRateLimit`.
 *
 * Note: In serverless, each instance has its own limiter. Total site traffic
 * across many warm instances can exceed 10 req/s unless you centralize
 * (queue, single worker, or shared rate-limit store).
 */

const WINDOW_MS = 1000;
export const SEC_MAX_REQUESTS_PER_SECOND = 10;

const stampTimes: number[] = [];

let acquireChain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function acquireSlot(): Promise<void> {
  while (true) {
    const now = Date.now();
    while (stampTimes.length > 0 && stampTimes[0] <= now - WINDOW_MS) {
      stampTimes.shift();
    }
    if (stampTimes.length < SEC_MAX_REQUESTS_PER_SECOND) {
      stampTimes.push(Date.now());
      return;
    }
    await sleep(Math.max(1, stampTimes[0] + WINDOW_MS - now));
  }
}

/** Run `fn` after a rate-limit slot is acquired (counts one SEC request). */
export function withSecRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const acquired = acquireChain.then(() => acquireSlot());
  acquireChain = acquired.then(() => {}, () => {});
  return acquired.then(() => fn());
}
