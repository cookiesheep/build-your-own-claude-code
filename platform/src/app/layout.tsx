import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import Navbar from "@/components/Navbar";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Build Your Own Claude Code",
  description: "Learn Agent Harness Engineering by building Claude Code from scratch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-[var(--bg-page)]">
        <Navbar />
        <main className="h-screen pt-14">{children}</main>
      </body>
    </html>
  );
}
