import TopNav from "@/components/TopNav";

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
