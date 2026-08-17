import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DepEd Auto-DLP/DLL Generator",
  description:
    "Automated Daily Lesson Log & Detailed Lesson Plan Generator for Filipino Educators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}
      >
        {/* Background Ambient Orbs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-[30rem] w-[30rem] animate-pulse rounded-full bg-slate-300/30 blur-3xl dark:bg-slate-800/20" />
          <div className="absolute -bottom-20 -right-20 h-[30rem] w-[30rem] rounded-full bg-neutral-200/40 blur-3xl dark:bg-neutral-900/30" />
          {/* Subtle Dot Mesh Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] opacity-40 [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
        </div>

        {/* Main App Content */}
        <div className="relative z-10 flex min-h-screen flex-col">
          <I18nProvider>{children}</I18nProvider>
        </div>
      </body>
    </html>
  );
}
