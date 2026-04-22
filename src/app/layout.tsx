import type { Metadata } from "next";
import "@/app/globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "exademo — Exa API demos",
  description: "Next.js demos for Exa search, contents, find similar, and answer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
