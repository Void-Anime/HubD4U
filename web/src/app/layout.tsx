import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./ui/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HubD4u",
  description: "HubD4u - Stream and browse",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-white/5 py-6 text-xs text-gray-400 px-6">
          <div className="max-w-6xl mx-auto">© <span suppressHydrationWarning>{new Date().getFullYear()}</span> HubD4u</div>
        </footer>
      </body>
    </html>
  );
}
