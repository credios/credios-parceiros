import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portal de Parceiros Credios",
    template: "%s | Portal de Parceiros Credios",
  },
  description:
    "Indique clientes, acompanhe cada etapa da operação e receba 1,50% de comissão sobre o crédito liberado. O programa de parcerias da Credios.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://parceiros.credios.com.br"
  ),
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
