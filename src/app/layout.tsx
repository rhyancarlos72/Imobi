import type { Metadata } from "next";
import { Bebas_Neue, Bricolage_Grotesque, Geist, Geist_Mono, Montserrat, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { TrackingPixel } from "@/components/TrackingPixel";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
// fontes extras do editor (só baixadas quando usadas)
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["600", "800"], preload: false });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["500", "700"], preload: false });
const serif = Playfair_Display({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "700"], preload: false });
const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400", preload: false });

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
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${montserrat.variable} ${poppins.variable} ${serif.variable} ${bebas.variable} antialiased`}>
        {children}
        <TrackingPixel />
      </body>
    </html>
  );
}
