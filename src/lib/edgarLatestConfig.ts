/** Shared config for latest filings UI + API (no server-only imports). */

/** Number of Atom rows requested per pagination step (`count` param). */
export const LATEST_EDGAR_BATCH_SIZE = 10;

/** Milliseconds between pagination steps. 1000 → 10 rows/sec. */
export const LATEST_FILL_INTERVAL_MS = 1000;

/** Hard cap on matching filings shown in the list. */
export const LATEST_EDGAR_MAX_MATCHES = 10;

/** Form 4 rows hidden unless gross priced sales exceed this. */
export const FORM4_MIN_DISPLAY_GROSS_USD = 150_000;
