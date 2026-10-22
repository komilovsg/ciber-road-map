import Link from "next/link";
import "./globals.css";
import { Onest } from "next/font/google";

const onest = Onest({ subsets: ["cyrillic", "latin"], weight: ["400", "600"], variable: "--font-onest" });

export const metadata = { title: "404 · Кибер-маршрут" };

export default function GlobalNotFound() {
  return (
    <html lang="ru" className={onest.variable}>
      <body style={{ display: "grid", placeItems: "center", minHeight: "100dvh", textAlign: "center", padding: 24 }}>
        <div>
          <p className="eyebrow">404</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>Станция не найдена</h1>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>Такой страницы нет.</p>
          <Link className="btn btn-primary" href="/ru">На карту</Link>
        </div>
      </body>
    </html>
  );
}
