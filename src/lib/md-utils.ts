/** Heading slug shared by the markdown renderer and the section nav. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const stripInlineMd = (s: string) =>
  s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();

export type Heading = { id: string; text: string; level: 2 | 3 };

/** Extract ## / ### headings (outside fenced code) from a markdown string. */
export function extractHeadings(md: string, blockIndex: number): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = stripInlineMd(m[2]);
      out.push({ id: headingId(blockIndex, text), text, level: m[1].length === 2 ? 2 : 3 });
    }
  }
  return out;
}
export const headingId = (blockIndex: number, text: string) => `h${blockIndex}-${slugify(text)}`;
