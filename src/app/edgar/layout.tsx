import TopNav, { HOME_TOP_NAV } from "@/components/TopNav";

export default function EdgarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav items={HOME_TOP_NAV} ariaLabel="Navigation" />
      {children}
    </>
  );
}
