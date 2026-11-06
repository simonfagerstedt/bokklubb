import type { Metadata } from "next";
import "./globals.css";
import { club } from "@/club";

export const metadata: Metadata = {
  title: club.name,
  description: club.name,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
