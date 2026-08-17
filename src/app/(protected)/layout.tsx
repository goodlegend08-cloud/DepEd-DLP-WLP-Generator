import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto w-full max-w-full px-3 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
