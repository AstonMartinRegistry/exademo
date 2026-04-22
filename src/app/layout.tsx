import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "exademo",
  description: "A Next.js 15 app with App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
