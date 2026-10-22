import { plural } from "./ui";

export const GUESSES_PER_SEC = 1e10;

const COMMON = [
  "password", "123456", "12345678", "qwerty", "123456789", "12345", "1234", "111111", "1234567", "dragon",
  "123123", "baseball", "abc123", "football", "monkey", "letmein", "shadow", "master", "666666", "qwertyuiop",
  "123321", "mustang", "1234567890", "michael", "superman", "1qaz2wsx", "trustno1", "iloveyou", "admin", "welcome",
  "passw0rd", "qwerty123", "000000", "11111111", "zaq12wsx", "qazwsx", "йцукен", "йцукенг", "пароль", "привет",
  "ghbdtn", "gfhjkm", "любовь", "12345qwert", "qwe123", "password1", "admin123",
];
const WORDS = [
  "password", "passwd", "admin", "qwerty", "welcome", "dragon", "monkey", "master", "letmein", "secret", "football",
  "iloveyou", "login", "root", "hello", "sunshine", "princess", "shadow", "ghbdtn", "gfhjkm", "пароль", "привет",
  "любовь", "админ", "секрет", "солнце", "москва", "душанбе", "qazwsx", "asdfgh", "zxcvbn", "йцукен", "фывапр",
];
const KEYROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю", "1234567890"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };

export type Level = 0 | 1 | 2 | 3;
export const LEVELS = ["Слабый", "Средний", "Хороший", "Сильный"] as const;

export type Analysis = {
  len: number;
  charset: number;
  sets: string[];
  raw: number;
  eff: number;
  seconds: number;
  level: Level;
  warnings: string[];
  tips: string[];
};

function leet(s: string, one: "i" | "l") {
  return Array.from(s)
    .map((c) => (c === "1" ? one : (LEET[c] ?? c)))
    .join("");
}

export function analyze(pw: string): Analysis {
  const chars = Array.from(pw);
  const len = chars.length;
  let charset = 0;
  const sets: string[] = [];
  const add = (re: RegExp, size: number, name: string) => {
    if (re.test(pw)) {
      charset += size;
      sets.push(name);
    }
  };
  add(/[a-z]/, 26, "a–z");
  add(/[A-Z]/, 26, "A–Z");
  add(/[0-9]/, 10, "0–9");
  add(/[а-яё]/, 33, "а–я");
  add(/[А-ЯЁ]/, 33, "А–Я");
  const other = chars.filter((c) => !/[a-zA-Z0-9а-яА-ЯёЁ]/.test(c));
  if (other.length) {
    charset += 33;
    sets.push("символы");
  }
  const bits = charset > 0 ? Math.log2(charset) : 0;
  const raw = len * bits;
  let eff = raw;
  const warnings: string[] = [];
  const low = pw.toLowerCase();

  if (len === 0) return { len, charset, sets, raw: 0, eff: 0, seconds: 0, level: 0, warnings, tips: [] };

  if (COMMON.includes(low)) {
    warnings.push("Это один из самых популярных паролей — его проверяют в первую очередь, за доли секунды.");
    eff = Math.min(eff, 12);
  } else {
    const l1 = leet(low, "i");
    const l2 = leet(low, "l");
    const word = WORDS.find((w) => l1.includes(w) || l2.includes(w));
    if (word) {
      const leetUsed = !low.includes(word);
      warnings.push(
        leetUsed
          ? `Слово «${word}» с заменой букв на цифры (a→4, o→0…). Эти подмены давно есть в словарях взломщиков.`
          : `Содержит слово из словаря: «${word}». Слова перебирают целиком, а не по буквам.`,
      );
      eff = Math.max(5, eff - word.length * bits + 12);
    }
    const row = KEYROWS.find((r) => {
      for (let i = 0; i + 4 <= r.length; i++) if (low.includes(r.slice(i, i + 4))) return true;
      return false;
    });
    if (row) {
      warnings.push("Подряд идущие клавиши на клавиатуре (qwer, йцук, 1234…) — такие шаблоны перебирают первыми.");
      eff = Math.max(5, eff - 4 * bits + 6);
    }
  }

  if (/(19|20)\d{2}/.test(pw)) {
    warnings.push("Похоже на год (19xx/20xx) — года и даты рождения легко угадать.");
    eff = Math.max(5, eff - Math.max(0, 4 * bits - 7));
  }
  const rep = pw.match(/(.)\1{2,}/g);
  if (rep) {
    warnings.push(`Повторы символов («${rep[0]}») добавляют длину, но почти не добавляют стойкости.`);
    eff = Math.max(5, eff - rep.reduce((s, r) => s + (r.length - 1), 0) * bits);
  }
  // ascending / descending runs of 3+ chars (abc, 123, cba)
  let run = 1;
  let dir = 0;
  let seqExtra = 0;
  for (let i = 1; i <= len; i++) {
    const d = i < len ? chars[i].codePointAt(0)! - chars[i - 1].codePointAt(0)! : 0;
    if ((d === 1 || d === -1) && (dir === 0 || dir === d)) {
      run++;
      dir = d;
    } else {
      if (run >= 3) seqExtra += run - 1;
      run = d === 1 || d === -1 ? 2 : 1;
      dir = d === 1 || d === -1 ? d : 0;
    }
  }
  if (seqExtra > 0) {
    warnings.push("Есть последовательность подряд (abc, 123, 987): она предсказуема.");
    eff = Math.max(5, eff - seqExtra * bits * 0.8);
  }
  if (/^\d+$/.test(pw)) warnings.push("Пароль состоит только из цифр: алфавит из 10 символов перебирается мгновенно.");
  if (len < 8) warnings.push("Короче 8 символов — длина решает больше всего.");

  const seconds = Math.pow(2, eff) / GUESSES_PER_SEC;
  const level: Level = eff < 36 ? 0 : eff < 60 ? 1 : eff < 80 ? 2 : 3;

  const tips: string[] = [];
  if (len < 14) tips.push("Удлини пароль до 14+ символов: каждый новый символ умножает число вариантов.");
  if (sets.length < 3 && len < 20) tips.push("Смешай строчные, заглавные, цифры и символы — или просто сделай пароль длиннее.");
  tips.push("Лучшая схема — парольная фраза из 4–5 случайных слов: легко запомнить, трудно подобрать.");
  tips.push("Используй уникальный пароль для каждого сайта и храни их в менеджере паролей.");
  tips.push("Включи двухфакторную аутентификацию там, где она есть.");

  return { len, charset, sets, raw, eff, seconds, level, warnings, tips };
}

function num(n: number) {
  return (n < 10 ? n.toFixed(1).replace(/\.0$/, "") : String(Math.round(n))).replace(".", ",");
}

export function humanTime(sec: number): string {
  if (sec < 1) return "меньше секунды";
  const r = (n: number, a: string, b: string, c: string) => `${Math.round(n)} ${plural(Math.round(n), a, b, c)}`;
  if (sec < 60) return r(sec, "секунда", "секунды", "секунд");
  if (sec < 3600) return r(sec / 60, "минута", "минуты", "минут");
  if (sec < 86400) return r(sec / 3600, "час", "часа", "часов");
  const days = sec / 86400;
  if (days < 365) return r(days, "день", "дня", "дней");
  const y = days / 365;
  if (y < 1000) return r(y, "год", "года", "лет");
  if (y < 1e6) return `${num(y / 1e3)} тыс. лет`;
  if (y < 1e9) return `${num(y / 1e6)} млн лет`;
  if (y < 1e12) return `${num(y / 1e9)} млрд лет`;
  return "больше 1000 млрд лет";
}
