export default function TestHubPage() {
  return (
    <main className="main-layout">
      <div className="content-area">
        <div className="home-stack">
          <div className="title-box">
            <h1 className="title">Exa demos</h1>
            <div className="title-box-grain" aria-hidden="true" />
          </div>
          <p className="home-lead">
            Nav: <strong>search</strong>, <strong>people</strong>, <strong>company</strong>,{" "}
            <strong>contents</strong>, <strong>similar</strong>, <strong>answer</strong>,{" "}
            <strong>2-step</strong> (contents → search). People/company use Exa&apos;s{" "}
            <code className="home-code">category</code> filter. Set{" "}
            <code className="home-code">EXA_KEY</code> in the environment.
          </p>
        </div>
      </div>
    </main>
  );
}
