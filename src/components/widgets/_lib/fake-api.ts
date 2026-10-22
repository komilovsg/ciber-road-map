// Simulated server for api.example.tj. Pure functions, no network.

export type Hdr = { k: string; v: string };
export type Req = { method: string; path: string; host: string; headers: Hdr[]; body: string };
export type Res = { status: number; reason: string; headers: Hdr[]; body: string };

export const API_HOST = "api.example.tj";
export const FIXED_DATE = "Thu, 23 Oct 2026 10:00:00 GMT";

const USERS = [
  { id: 1, name: "Алиса", role: "admin" },
  { id: 2, name: "Фаррух", role: "user" },
  { id: 3, name: "Мадина", role: "user" },
];

const REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  422: "Unprocessable Content",
  500: "Internal Server Error",
};

const enc = (s: string) => new TextEncoder().encode(s).length;

function make(status: number, ctype: string | null, body: string, extra: Hdr[] = [], method = "GET"): Res {
  const headers: Hdr[] = [
    { k: "Date", v: FIXED_DATE },
    { k: "Server", v: "nginx/1.18.0" },
  ];
  if (ctype) headers.push({ k: "Content-Type", v: ctype });
  headers.push({ k: "Content-Length", v: String(enc(body)) });
  headers.push(...extra);
  headers.push({ k: "Connection", v: "close" });
  return { status, reason: REASONS[status] ?? "", headers, body: method === "HEAD" ? "" : body };
}

const json = (status: number, obj: unknown, extra: Hdr[] = [], method = "GET") =>
  make(status, "application/json; charset=utf-8", JSON.stringify(obj, null, 2) + "\n", extra, method);

const hv = (h: Hdr[], name: string) => h.find((x) => x.k.trim().toLowerCase() === name)?.v.trim();

export function respond(req: Req): Res {
  const m = req.method;
  const [path] = req.path.split("?");
  const err = (status: number, message: string, extra: Hdr[] = []) => json(status, { error: message }, extra, m);
  const notAllowed = (allow: string) => err(405, `метод ${m} не разрешён для ${path}`, [{ k: "Allow", v: allow }]);

  if (path === "/") {
    if (m !== "GET" && m !== "HEAD") return notAllowed("GET, HEAD");
    return make(200, "text/html; charset=utf-8", "<!doctype html>\n<h1>API example.tj</h1>\n<p>Попробуй /users</p>\n", [], m);
  }
  if (path === "/users") {
    if (m === "GET" || m === "HEAD") return json(200, USERS, [], m);
    if (m === "POST") {
      let data: unknown;
      try {
        data = JSON.parse(req.body);
      } catch {
        return err(400, "тело запроса не является корректным JSON");
      }
      const name = data && typeof data === "object" ? (data as Record<string, unknown>).name : undefined;
      if (typeof name !== "string" || !name.trim()) return err(422, "поле name обязательно");
      return json(201, { id: 4, name }, [{ k: "Location", v: "/users/4" }]);
    }
    return notAllowed("GET, HEAD, POST");
  }
  const um = /^\/users\/(\d+)$/.exec(path);
  if (um) {
    const u = USERS.find((x) => x.id === Number(um[1]));
    if (m === "GET" || m === "HEAD") return u ? json(200, u, [], m) : err(404, `пользователь ${um[1]} не найден`);
    if (m === "PUT") {
      if (!u) return err(404, `пользователь ${um[1]} не найден`);
      try {
        const d = JSON.parse(req.body);
        return json(200, { ...u, ...(d && typeof d === "object" ? d : {}) });
      } catch {
        return err(400, "тело запроса не является корректным JSON");
      }
    }
    if (m === "DELETE") return u ? make(204, null, "", [], m) : err(404, `пользователь ${um[1]} не найден`);
    return notAllowed("GET, HEAD, PUT, DELETE");
  }
  if (path === "/admin") {
    if (m !== "GET" && m !== "HEAD") return notAllowed("GET, HEAD");
    const auth = hv(req.headers, "authorization");
    if (auth && /^Bearer\s+\S+/.test(auth)) return json(200, { panel: "admin", secret: "flag{demo-only}" }, [], m);
    return err(403, "нужен заголовок Authorization: Bearer <токен>");
  }
  if (path === "/old") return make(301, "text/html; charset=utf-8", "", [{ k: "Location", v: "/users" }], m);
  if (path === "/crash") return err(500, "необработанное исключение на сервере");
  return err(404, `путь ${path} не найден`);
}

export type StatusInfo = { cls: string; name: string; meaning: string; color: string };
export function statusInfo(code: number): StatusInfo {
  const c = Math.floor(code / 100);
  const map: Record<number, StatusInfo> = {
    1: { cls: "1xx", name: "Информационные", meaning: "Запрос принят, обработка продолжается.", color: "var(--muted)" },
    2: { cls: "2xx", name: "Успех", meaning: "Запрос понят и выполнен.", color: "var(--ok)" },
    3: { cls: "3xx", name: "Перенаправление", meaning: "Нужно сходить по другому адресу (заголовок Location).", color: "var(--accent)" },
    4: { cls: "4xx", name: "Ошибка клиента", meaning: "Проблема в запросе: неверный адрес, права, формат.", color: "var(--xp)" },
    5: { cls: "5xx", name: "Ошибка сервера", meaning: "Запрос корректен, но сервер не справился.", color: "var(--bad)" },
  };
  return map[c] ?? map[5];
}

export const CODE_NOTES: Record<number, string> = {
  200: "OK: всё хорошо, в теле ответа запрошенные данные.",
  201: "Created: ресурс создан, его адрес в заголовке Location.",
  204: "No Content: действие выполнено, тела ответа нет.",
  301: "Moved Permanently: ресурс переехал навсегда, браузер сам перейдёт на Location.",
  400: "Bad Request: сервер не смог разобрать запрос (например, сломанный JSON).",
  403: "Forbidden: сервер понял, кто ты (или не понял), но доступа нет. Формально «не авторизован» это 401, но многие API отвечают 403.",
  404: "Not Found: по этому адресу ничего нет.",
  405: "Method Not Allowed: адрес есть, но этот метод не поддерживается; разрешённые перечислены в Allow.",
  422: "Unprocessable Content: JSON корректен, но данные не прошли проверку.",
  500: "Internal Server Error: сбой на стороне сервера. Для атакующего это сигнал, что ввод что-то сломал; для защитника — ошибка, которую надо логировать, а не показывать пользователю.",
};
