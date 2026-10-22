// Tiny hand-written SQL WHERE simulator for the sqli-lab widget. NOT real SQL execution.

export type DbUser = { login: string; password: string; role: string };
export const USERS: DbUser[] = [
  { login: "admin", password: "s3cret!", role: "администратор" },
  { login: "alice", password: "hunter2", role: "покупатель" },
  { login: "bob", password: "qwerty99", role: "покупатель" },
];

export type CondTrace = { text: string; value: boolean };
export type SimResult =
  | { kind: "error"; message: string }
  | {
      kind: "rows";
      rows: DbUser[];
      conds: CondTrace[]; // per-condition truth value for the first matched/tested row
      ops: string[]; // "AND" | "OR" between conds
      commented: string; // removed tail (if any)
      injected: boolean;
    };

export const buildQuery = (l: string, p: string) =>
  `SELECT * FROM users WHERE login='${l}' AND password='${p}'`;

type Tok = { t: "str" | "word" | "eq" | "and" | "or"; v: string };

/** Cut comments outside string literals; detect unterminated strings. */
function stripComment(q: string): { sql: string; commented: string; openAt: number } {
  let inStr = false;
  let openAt = -1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === "'") {
      inStr = !inStr;
      openAt = inStr ? i : -1;
    } else if (!inStr && (q.startsWith("--", i) || c === "#")) {
      return { sql: q.slice(0, i), commented: q.slice(i), openAt: -1 };
    }
  }
  return { sql: q, commented: "", openAt: inStr ? openAt : -1 };
}

function tokenize(s: string): Tok[] | string {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) i++;
    else if (c === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) return "unterminated";
      out.push({ t: "str", v: s.slice(i + 1, j) });
      i = j + 1;
    } else if (c === "=") {
      out.push({ t: "eq", v: "=" });
      i++;
    } else {
      const m = /^[A-Za-z0-9_.]+/.exec(s.slice(i));
      if (!m) return s.slice(i);
      const w = m[0];
      const lw = w.toLowerCase();
      out.push({ t: lw === "and" ? "and" : lw === "or" ? "or" : "word", v: w });
      i += w.length;
    }
  }
  return out;
}

export function simulateUnsafe(login: string, password: string): SimResult {
  const q = buildQuery(login, password);
  const { sql, commented, openAt } = stripComment(q);
  if (openAt >= 0) {
    return {
      kind: "error",
      message: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${sql.slice(openAt)}' at line 1`,
    };
  }
  const whereIdx = sql.indexOf("WHERE ");
  const toks = tokenize(sql.slice(whereIdx + 6));
  const syntax = (near: string): SimResult => ({
    kind: "error",
    message: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${near}' at line 1`,
  });
  if (typeof toks === "string") return syntax(toks);
  // grammar: cond (AND|OR cond)* ; cond := operand '=' operand
  type Operand = { kind: "str" | "col" | "num"; v: string };
  const op = (t: Tok | undefined): Operand | null => {
    if (!t) return null;
    if (t.t === "str") return { kind: "str", v: t.v };
    if (t.t === "word") {
      if (/^\d+$/.test(t.v)) return { kind: "num", v: t.v };
      if (t.v === "login" || t.v === "password") return { kind: "col", v: t.v };
      return { kind: "col", v: "?" + t.v };
    }
    return null;
  };
  const conds: { a: Operand; b: Operand; text: string }[] = [];
  const ops: string[] = [];
  let k = 0;
  const show = (t: Tok) => (t.t === "str" ? `'${t.v}'` : t.v);
  while (k < toks.length) {
    const a = op(toks[k]);
    if (!a || toks[k + 1]?.t !== "eq") return syntax(toks.slice(k).map(show).join(" "));
    const b = op(toks[k + 2]);
    if (!b) return syntax(toks.slice(k + 2).map(show).join(" "));
    for (const o of [a, b]) {
      if (o.kind === "col" && o.v.startsWith("?"))
        return { kind: "error", message: `Unknown column '${o.v.slice(1)}' in 'where clause'` };
    }
    conds.push({ a, b, text: `${show(toks[k])}=${show(toks[k + 2])}` });
    k += 3;
    if (k < toks.length) {
      const o = toks[k];
      if (o.t !== "and" && o.t !== "or") return syntax(toks.slice(k).map(show).join(" "));
      ops.push(o.t.toUpperCase());
      k++;
      if (k >= toks.length) return syntax("");
    }
  }
  const evalRow = (u: DbUser) => {
    const vals = conds.map((c) => {
      const val = (o: Operand) => (o.kind === "col" ? u[o.v as "login" | "password"] : o.v);
      return val(c.a) === val(c.b);
    });
    // AND binds tighter than OR
    let res = false;
    let cur = vals[0];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === "AND") cur = cur && vals[i + 1];
      else {
        res = res || cur;
        cur = vals[i + 1];
      }
    }
    return { ok: res || cur, vals };
  };
  const results = USERS.map((u) => ({ u, ...evalRow(u) }));
  const rows = results.filter((r) => r.ok).map((r) => r.u);
  const shown = results.find((r) => r.ok) ?? results[0];
  const legit = USERS.some((u) => u.login === login && u.password === password);
  return {
    kind: "rows",
    rows,
    conds: conds.map((c, i) => ({ text: c.text, value: shown.vals[i] })),
    ops,
    commented,
    injected: rows.length > 0 && !legit,
  };
}

export function simulateSafe(login: string, password: string): DbUser | null {
  return USERS.find((u) => u.login === login && u.password === password) ?? null;
}
