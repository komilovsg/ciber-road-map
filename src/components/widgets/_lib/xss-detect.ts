// Pattern-based XSS detection for the xss-lab widget. Nothing is ever executed.

export type XssHit = { kind: string; js: string };

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function detectXss(html: string): XssHit[] {
  const hits: XssHit[] = [];
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)(?:<\/script\s*>|$)/gi)) {
    hits.push({ kind: "<script>", js: m[1].trim() || "(пустой скрипт)" });
  }
  for (const m of html.matchAll(/<[a-z][^>]*?\s(on[a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    hits.push({ kind: `${m[1].toLowerCase()}=`, js: (m[2] ?? m[3] ?? m[4] ?? "").trim() });
  }
  for (const m of html.matchAll(/javascript\s*:\s*([^"'>\s][^"'>]*)/gi)) {
    hits.push({ kind: "javascript:", js: m[1].trim() });
  }
  return hits;
}

/** Document shown inside a sandbox="" iframe: no scripts, and CSP forbids any loads. */
export function commentDoc(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{margin:0;padding:10px 12px;font:15px/1.45 system-ui,sans-serif;color:#1c1b22;background:#fff;word-break:break-word}a{color:#2b59d6}</style></head><body>${html}</body></html>`;
}
