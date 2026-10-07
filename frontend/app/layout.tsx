import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SearchProvider } from "@/context/SearchContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { UserProvider } from "@/context/UserContext";

// Airbnb's own typeface (Cereal) is proprietary; Inter is the closest clean
// open substitute and is loaded and self-hosted by next/font.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Airbnb Clone — Book unique homes",
  description: "A full-stack Airbnb clone built with Next.js and FastAPI.",
};

// Runs before paint to avoid a flash of the wrong theme. Kept tiny and inline
// on purpose — it must execute before React hydrates.
const themeInitScript = `(function(){try{var t=localStorage.getItem('airbnb-clone:theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        {/* Providers are nested (not wrapped around <html>) so Next can still
            optimize the static parts of the document. */}
        <ThemeProvider>
          <UserProvider>
            <SearchProvider>
              <ToastProvider>
                {/* Navbar reads usePathname, so it lives in a Suspense boundary:
                    Cache Components prerenders the shell before URL data exists. */}
                <Suspense fallback={<div className="h-16 border-b border-hairline-soft" />}>
                  <Navbar />
                </Suspense>
                <main className="flex-1">{children}</main>
                <Footer />
              </ToastProvider>
            </SearchProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
