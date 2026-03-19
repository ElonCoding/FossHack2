import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "DevEvent - Open Source Event Registration",
  description: "Ticketing platform for tech fests and hackathons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
