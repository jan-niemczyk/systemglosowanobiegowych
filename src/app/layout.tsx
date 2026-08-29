import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.scss";
import Providers from "./providers";

// next/font: self-hosting automatyczny (bez blokującego requestu do Google Fonts).
// latin-ext wymagany dla polskich znaków diakrytycznych (ą, ć, ę, ł, ń, ó, ś, ź, ż).
// Inter zostaje jako font treści; Manrope (cieplejsze, zaokrąglone kroje) - nagłówki,
// zgodnie z kierunkiem "miększego", bardziej nowoczesnego wyglądu.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: "iGŁOSOWANIA - System Głosowań Obiegowych",
  description: "Platforma do przygotowywania, przeprowadzania i dokumentowania głosowań obiegowych organów kolegialnych.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${inter.variable} ${manrope.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
