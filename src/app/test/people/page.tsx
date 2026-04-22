import ExaSearchSteeringDemo from "@/components/ExaSearchSteeringDemo";

export default function PeopleSearchDemoPage() {
  return (
    <ExaSearchSteeringDemo
      variant="people"
      defaultQuery="machine learning engineer researcher"
      title="POST /search · category: people"
      runLabel="Run people search"
      description={
        <>
          <p style={{ marginBottom: "0.65rem" }}>
            Same steering knobs as general search where Exa allows them.{" "}
            <strong>People</strong> mode sets <code className="home-code">category: &quot;people&quot;</code>. Exa
            does not support <code className="home-code">excludeDomains</code> or published/crawl date filters here;
            if you use <code className="home-code">includeDomains</code>, only LinkedIn domains are allowed — use
            the checkbox below to send <code className="home-code">[&quot;linkedin.com&quot;]</code>.
          </p>
          <p>
            Use <strong>highlights.query</strong> under Contents to bias snippets toward e.g. skills, titles, or
            education.
          </p>
        </>
      }
    />
  );
}
