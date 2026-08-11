import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </>
  );
}
