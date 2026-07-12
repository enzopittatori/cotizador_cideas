import { Archivo, Spline_Sans_Mono } from "next/font/google";

// Tipografías del design system (docs/diseno-ui.md §3):
// Archivo (display + UI, fundidora argentina Omnibus-Type) y
// Spline Sans Mono para todos los números. next/font las self-hostea
// en build: sin requests a Google en runtime, sin FOUT.

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
