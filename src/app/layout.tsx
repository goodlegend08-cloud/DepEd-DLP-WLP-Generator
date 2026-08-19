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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased`}
      >
        {/* Background Ambient Orbs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-[30rem] w-[30rem] animate-pulse rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-[30rem] w-[30rem] rounded-full bg-brand-gold/10 blur-3xl dark:bg-brand-gold/10" />
          {/* Subtle Dot Mesh Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] opacity-40 [background-size:16px_16px]" />
        </div>

        {/* Main App Content */}
        <div className="relative z-10 flex min-h-screen flex-col">
          <I18nProvider>{children}</I18nProvider>
        </div>
      </body>
    </html>
  );
}
