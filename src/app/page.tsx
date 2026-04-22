import FooterNav from "@/components/FooterNav";

export default function Home() {
  return (
    <main className="main-layout">
      <div className="content-area">
        <div className="title-box">
          <h1 className="title">Hello World</h1>
          <div className="title-box-grain" aria-hidden="true" />
        </div>
      </div>
      <FooterNav />
    </main>
  );
}
