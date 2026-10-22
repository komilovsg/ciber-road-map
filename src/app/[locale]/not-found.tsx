import Link from "next/link";
import { LogoMark } from "@/components/shell/logo";

// Rendered inside the [locale] layout when notFound() is thrown; locale is not available here, default to Russian copy with both links.
export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto w-fit"><LogoMark size={44} /></div>
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-2 font-display text-[32px] font-bold tracking-[-0.02em]">Станция не найдена · Истгоҳ ёфт нашуд</h1>
        <p className="mt-3 text-muted">Такой страницы нет. · Чунин саҳифа вуҷуд надорад.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/ru" className="btn btn-primary">На карту</Link>
          <Link href="/tj" className="btn">Ба харита</Link>
        </div>
      </div>
    </main>
  );
}
