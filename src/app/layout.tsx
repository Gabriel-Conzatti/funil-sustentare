import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Funil Sustentare",
  description: "CRM comercial configurável — funis, clientes, mensagens e auditoria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={hanken.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
