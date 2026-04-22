import ExaSearchSteeringDemo from "@/components/ExaSearchSteeringDemo";

export default function SearchDemoPage() {
  return (
    <ExaSearchSteeringDemo
      variant="general"
      defaultQuery="Latest developments in small language models"
      title="POST /search (general)"
      runLabel="Run search"
      description={
        <>
          <p style={{ marginBottom: "0.65rem" }}>
            All major steering fields from the{" "}
            <a href="https://exa.ai/docs/reference/search" target="_blank" rel="noreferrer">
              Search API
            </a>
            : <code className="home-code">type</code>, <code className="home-code">numResults</code>,{" "}
            <code className="home-code">userLocation</code>, <code className="home-code">moderation</code>,{" "}
            <code className="home-code">additionalQueries</code>, domain and date filters, plus{" "}
            <code className="home-code">contents</code> — including{" "}
            <strong>highlights.query</strong> to steer which passages are pulled,{" "}
            <code className="home-code">summary.query</code>, subpages, extras, and{" "}
            <code className="home-code">maxAgeHours</code>. Advanced: <code className="home-code">systemPrompt</code>,{" "}
            <code className="home-code">stream</code>, <code className="home-code">outputSchema</code>.
          </p>
        </>
      }
    />
  );
}
