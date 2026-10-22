import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geologica, Onest, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { locales } from "@/content/types";
import { getDict, isLocale } from "@/i18n";
import { Providers } from "@/components/shell/providers";

const geologica = Geologica({ subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["500", "600", "700", "800"], variable: "--font-geologica", display: "swap" });
const onest = Onest({ subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["400", "500", "600"], variable: "--font-onest", display: "swap" });
const jb = JetBrains_Mono({ subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["400", "500", "600"], variable: "--font-jb", display: "swap" });

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ciber-road-map.vercel.app";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t.siteName}: ${t.tagline}`, template: `%s · ${t.siteName}` },
    description: t.metaDescription,
    alternates: { canonical: `/${locale}`, languages: { ru: "/ru", tg: "/tj" } },
    openGraph: { title: t.siteName, description: t.metaDescription, siteName: t.siteName, type: "website", locale: locale === "ru" ? "ru_RU" : "tg_TJ" },
    twitter: { card: "summary", title: t.siteName, description: t.metaDescription },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F5F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1117" },
  ],
};

// Runs before paint: applies the saved theme (light/dark) so there is no flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("kr:theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  return (
    <html lang={t.htmlLang} className={`${geologica.variable} ${onest.variable} ${jb.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers locale={locale} dict={t}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-[10px] focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg">
            {t.skipToContent}
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
