// Lazy, client-only loader for sql.js. Uses the prebuilt browser build copied to /public
// (sql-wasm.js + sql-wasm.wasm) via a runtime <script> tag, so the bundler never sees sql.js.
import type { SqlJsStatic } from "sql.js";

type InitFn = (cfg: { locateFile: (f: string) => string }) => Promise<SqlJsStatic>;
let loading: Promise<SqlJsStatic> | null = null;

export function loadSqlJs(): Promise<SqlJsStatic> {
  if (loading) return loading;
  loading = new Promise<SqlJsStatic>((resolve, reject) => {
    const init = () => {
      const fn = (window as unknown as { initSqlJs?: InitFn }).initSqlJs;
      if (!fn) return reject(new Error("initSqlJs missing"));
      fn({ locateFile: (f) => "/" + f }).then(resolve, reject);
    };
    if ((window as unknown as { initSqlJs?: InitFn }).initSqlJs) return init();
    const s = document.createElement("script");
    s.src = "/sql-wasm.js";
    s.async = true;
    s.onload = init;
    s.onerror = () => reject(new Error("не удалось загрузить /sql-wasm.js"));
    document.head.appendChild(s);
  }).catch((e) => {
    loading = null; // allow retry
    throw e;
  });
  return loading;
}

export type QueryResult = { columns: string[]; rows: unknown[][] };
export type Column = { name: string; type: string };
export type TableInfo = { name: string; columns: Column[] };

export function readSchema(db: import("sql.js").Database): TableInfo[] {
  const t = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const names = (t[0]?.values ?? []).map((r) => String(r[0]));
  return names.map((name) => {
    const info = db.exec(`PRAGMA table_info("${name.replace(/"/g, '""')}")`);
    const columns = (info[0]?.values ?? []).map((r) => ({ name: String(r[1]), type: String(r[2] || "") }));
    return { name, columns };
  });
}

/** Runs all statements; returns the LAST result set (or empty columns/rows for statements w/o output). */
export function runQuery(db: import("sql.js").Database, sql: string): QueryResult {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, rows: last.values as unknown[][] } : { columns: [], rows: [] };
}

const cell = (v: unknown) => (v === null || v === undefined ? "NULL" : String(v));

/** Compare student vs expected result. Returns null when OK, else a Russian reason. */
export function compareResults(got: QueryResult, exp: QueryResult, ordered: boolean): string | null {
  if (got.columns.length === 0 && exp.columns.length > 0) return "запрос ничего не вернул: нужен SELECT";
  if (got.columns.length !== exp.columns.length) {
    return `неверное число столбцов: ожидалось ${exp.columns.length}, получено ${got.columns.length}`;
  }
  if (got.rows.length !== exp.rows.length) {
    return `ожидалось ${exp.rows.length} строк, получено ${got.rows.length}`;
  }
  const key = (r: unknown[]) => JSON.stringify(r.map(cell));
  const g = got.rows.map(key);
  const e = exp.rows.map(key);
  if (ordered) {
    if (g.every((k, i) => k === e[i])) return null;
    const same = [...g].sort().every((k, i) => k === [...e].sort()[i]);
    return same ? "порядок строк важен: добавь ORDER BY" : "значения отличаются от ожидаемых";
  }
  const gs = [...g].sort();
  const es = [...e].sort();
  return gs.every((k, i) => k === es[i]) ? null : "строки отличаются от ожидаемых";
}

export const hasOrderBy = (sql: string) => /\border\s+by\b/i.test(sql);
