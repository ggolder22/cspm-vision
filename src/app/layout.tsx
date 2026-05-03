import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSPM Vision AI",
  description: "Clasificación inteligente de paneles solares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}