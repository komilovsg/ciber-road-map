import type { MetadataRoute } from "next";
import { allSlugs } from "@/content";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ciber-road-map.vercel.app";
const alt = (path: string) => ({ languages: { ru: `${base}/ru${path}`, tg: `${base}/tj${path}` } });

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", ...allSlugs().map((s) => `/learn/${s}`)];
  return paths.flatMap((p) =>
    (["ru", "tj"] as const).map((l) => ({
      url: `${base}/${l}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
      alternates: alt(p),
    })),
  );
}
