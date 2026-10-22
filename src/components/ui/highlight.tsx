import { Fragment, type ReactNode } from "react";

export type Lang = "python" | "bash" | "sql" | "html" | "js" | "http" | "text";

const KW: Record<string, string[]> = {
  python: "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "),
  bash: "if then else elif fi for while do done case esac in function sudo cd ls cat echo grep find chmod chown mkdir rm cp mv touch head tail wc sort uniq pwd whoami id export man history exit".split(" "),
  sql: "SELECT FROM WHERE AND OR NOT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER ADD JOIN INNER LEFT RIGHT OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET AS DISTINCT COUNT SUM AVG MIN MAX LIKE IN IS NULL BETWEEN PRIMARY KEY FOREIGN REFERENCES INTEGER TEXT REAL UNION ASC DESC CASE WHEN THEN ELSE END EXISTS".split(" "),
  js: "const let var function return if else for while do break continue new class extends import export from default async await try catch finally throw typeof instanceof this null undefined true false of in switch case".split(" "),
  html: [],
  http: "GET POST PUT PATCH DELETE HEAD OPTIONS HTTP".split(" "),
  text: [],
};
const BUILTIN: Record<string, string[]> = {
  python: "print input len range int str float list dict set tuple bool open sum min max sorted enumerate zip map filter abs round type isinstance".split(" "),
  js: "console document window fetch JSON Math Array Object String Number Promise".split(" "),
};

type Tok = { t: "k" | "s" | "c" | "n" | "f" | "o" | "t" | null; v: string };

function tokenize(code: string, lang: Lang): Tok[] {
  if (lang === "text") return [{ t: null, v: code }];
  const kws = new Set((lang === "sql" ? KW.sql : KW[lang]).map((k) => (lang === "sql" ? k : k)));
  const builtins = new Set(BUILTIN[lang] ?? []);
  const out: Tok[] = [];
  const push = (t: Tok["t"], v: string) => v && out.push({ t, v });

  if (lang === "html") {
    const re = /(<!--[\s\S]*?-->)|(<\/?)([A-Za-z][\w-]*)|("[^"]*"|'[^']*')|(\/?>)|([A-Za-z-:@]+)(?==)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      push(null, code.slice(last, m.index));
      if (m[1]) push("c", m[1]);
      else if (m[3]) { push("o", m[2]); push("t", m[3]); }
      else if (m[4]) push("s", m[4]);
      else if (m[5]) push("o", m[5]);
      else if (m[6]) push("n", m[6]);
      last = m.index + m[0].length;
    }
    push(null, code.slice(last));
    return out;
  }

  const comment = lang === "python" || lang === "bash" ? "#.*" : lang === "sql" ? "--.*|/\\*[\\s\\S]*?\\*/" : lang === "js" ? "//.*|/\\*[\\s\\S]*?\\*/" : "(?!)";
  const str = lang === "python" ? `"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|f?"(?:\\\\.|[^"\\\\\\n])*"|f?'(?:\\\\.|[^'\\\\\\n])*'` : "\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`[^`]*`";
  const re = new RegExp(`(${comment})|(${str})|(\\b\\d[\\d_.]*(?:e[+-]?\\d+)?\\b|0x[0-9a-fA-F]+)|([A-Za-z_$][\\w$]*)|(\\n|[^\\w\\s])|(\\s+)`, "gi");
  let m: RegExpExecArray | null;
  const text = code;
  const lines = lang === "http" ? text.split("\n") : null;
  if (lines) {
    lines.forEach((ln, i) => {
      if (i === 0 && /^[A-Z]+ /.test(ln)) {
        const mm = /^([A-Z]+)(\s+)(\S+)(\s+)(HTTP\/[\d.]+)?/.exec(ln);
        if (mm) { push("k", mm[1]); push(null, mm[2]); push("s", mm[3]); push(null, mm[4]); push("o", mm[5] ?? ""); push(null, ln.slice(mm[0].length)); }
        else push(null, ln);
      } else if (i === 0 && /^HTTP\//.test(ln)) {
        push("o", ln);
      } else {
        const h = /^([A-Za-z-]+)(:)(.*)$/.exec(ln);
        if (h) { push("f", h[1]); push("o", h[2]); push(null, h[3]); } else push(null, ln);
      }
      if (i < lines.length - 1) push(null, "\n");
    });
    return out;
  }
  while ((m = re.exec(text))) {
    if (m[1]) push("c", m[1]);
    else if (m[2]) push("s", m[2]);
    else if (m[3]) push("n", m[3]);
    else if (m[4]) {
      const w = m[4];
      const key = lang === "sql" ? w.toUpperCase() : w;
      if (kws.has(key)) push("k", w);
      else if (builtins.has(w)) push("f", w);
      else if (lang === "python" && /^(self|cls)$/.test(w)) push("t", w);
      else if (lang === "bash" && /^-/.test(w)) push(null, w);
      else push(null, w);
    } else push(null, m[0]);
  }
  // function-call names (word followed by "(")
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].t === null && /^[A-Za-z_$][\w$]*$/.test(out[i].v) && out[i + 1].v === "(") out[i].t = "f";
  }
  return out;
}

export function Highlighted({ code, lang }: { code: string; lang: Lang }): ReactNode {
  const toks = tokenize(code, lang);
  return (
    <>
      {toks.map((t, i) => (
        <Fragment key={i}>{t.t ? <span className={`tok-${t.t}`}>{t.v}</span> : t.v}</Fragment>
      ))}
    </>
  );
}
