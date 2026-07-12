import type { Metadata } from "next";
import { archivo, splineSansMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotizador Multi-Industria — Cideas",
  description: "Cotizadores configurables multi-tenant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${archivo.variable} ${splineSansMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
