import ExaSearchSteeringDemo from "@/components/ExaSearchSteeringDemo";

export default function CompanySearchDemoPage() {
  return (
    <ExaSearchSteeringDemo
      variant="company"
      defaultQuery="B2B SaaS analytics startups"
      title="POST /search · category: company"
      runLabel="Run company search"
      description={
        <>
          <p style={{ marginBottom: "0.65rem" }}>
            <strong>Company</strong> sets <code className="home-code">category: &quot;company&quot;</code>. Exa
            does not support <code className="home-code">excludeDomains</code> or published/crawl date range
            filters for this category (sending them yields 400).
          </p>
          <p>
            Under <strong>Contents</strong>, set <strong>highlights.query</strong> to steer highlights toward e.g.
            funding, employees, HQ location, or product category.
          </p>
        </>
      }
    />
  );
}
