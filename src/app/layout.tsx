import type { Metadata } from "next";
// Fontes hospedadas no próprio app (sem depender do Google Fonts no build)
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/playfair-display";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import "@fontsource/bebas-neue";
import "./globals.css";
import { site } from "@/lib/site";
import { TrackingPixel } from "@/components/TrackingPixel";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Imobi Studio: vídeos de imóveis com IA", template: "%s | Imobi Studio" },
  description: site.tagline,
  applicationName: site.name,
  icons: { icon: "/logo.svg" },
  openGraph: { siteName: site.name, locale: "pt_BR", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://paytracking.com.br" crossOrigin="" />
        <link rel="preconnect" href="https://connect.facebook.net" />
      </head>
      <body className="antialiased">
        {children}
        <TrackingPixel />
      </body>
    </html>
  );
}
