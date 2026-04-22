export default function Home() {
  return (
    <main className="main-layout">
      <div className="content-area">
        <div className="home-stack">
          <div className="title-box">
            <h1 className="title">Exa demos</h1>
            <div className="title-box-grain" aria-hidden="true" />
          </div>
          <p className="home-lead">
            Use the nav above: <strong>search</strong>, <strong>contents</strong>,{" "}
            <strong>similar</strong>, and <strong>answer</strong>. Calls go through Next route
            handlers; set <code className="home-code">EXA_KEY</code> in the environment.
          </p>
        </div>
      </div>
    </main>
  );
}
