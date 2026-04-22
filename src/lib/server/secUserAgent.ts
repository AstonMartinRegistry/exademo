/**
 * SEC fair access — identify traffic; include contact in production.
 * @see https://www.sec.gov/os/accessing-edgar-data
 */
export function secEdgarUserAgent(): string {
  return (
    process.env.EDGAR_USER_AGENT?.trim() ||
    "exademo/1.0 (please-set-EDGAR_USER_AGENT-in-env-with-real-contact-email)"
  );
}
