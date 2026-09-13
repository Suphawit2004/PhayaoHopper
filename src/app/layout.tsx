import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/i18n/LangProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { SearchProvider } from "@/components/SearchProvider";
import Navbar from "@/components/Navbar";
import { getCatalog } from "@/lib/catalog";
import { CatalogProvider } from "@/components/CatalogProvider";

import Footer from "@/components/Footer";
import { getSiteUrl } from "@/lib/site-url";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "เที่ยวไหนดี | Thiao Nai Dee — คาเฟ่เมืองพะเยา",
    template: "%s | Thiao Nai Dee",
  },
  description:
    "รวมคาเฟ่น่านั่งในเมืองพะเยา ทั้งริมกว๊านถึงโซนมหาวิทยาลัย พร้อมพิกัด เวลาเปิด-ปิด เมนูแนะนำ และรีวิว A curated guide to cafes in Phayao from the lakefront to the university area, with map, reviews and filters.",
  openGraph: {
    type: "website",
    siteName: "Thiao Nai Dee",
    locale: "th_TH",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cafes = await getCatalog();
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <AuthProvider>
            <CatalogProvider cafes={cafes}><FavoritesProvider>
              <SearchProvider>
                <a href="#main-content" className="skip-link">ข้ามไปเนื้อหา / Skip to content</a>
                <Navbar />
                <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
                <Footer />
              </SearchProvider>
            </FavoritesProvider></CatalogProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
