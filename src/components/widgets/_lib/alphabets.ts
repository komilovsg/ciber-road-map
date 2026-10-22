export type Lang = "ru" | "en";
export const ALPHABETS: Record<Lang, string> = {
  ru: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

/** Shift a single character within the alphabet; non-letters and foreign letters pass through. */
export function shiftChar(ch: string, shift: number, lang: Lang): string {
  const abc = ALPHABETS[lang];
  const n = abc.length;
  const up = ch.toUpperCase();
  const idx = ch.length === 1 ? abc.indexOf(up) : -1;
  if (idx < 0) return ch;
  const out = abc[(((idx + shift) % n) + n) % n];
  return ch === up ? out : out.toLowerCase();
}

export function caesar(text: string, shift: number, lang: Lang): string {
  return Array.from(text)
    .map((c) => shiftChar(c, shift, lang))
    .join("");
}

export function guessLang(text: string): Lang {
  let ru = 0;
  let en = 0;
  for (const c of text.toUpperCase()) {
    if (ALPHABETS.ru.includes(c)) ru++;
    else if (ALPHABETS.en.includes(c)) en++;
  }
  return ru > en ? "ru" : en > 0 ? "en" : "ru";
}
