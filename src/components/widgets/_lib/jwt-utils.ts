// Base64url + HMAC-SHA256 helpers for the jwt widget (UTF-8 correct).

const enc = new TextEncoder();

export function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export const b64urlEncode = (s: string) => b64urlEncodeBytes(enc.encode(s));

export function b64urlDecodeBytes(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("недопустимые символы для base64url");
  if (s.length % 4 === 1) throw new Error("неверная длина base64url");
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function b64urlDecode(s: string): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(b64urlDecodeBytes(s) as BufferSource);
}

async function hmacKey(secret: string, usage: KeyUsage) {
  return crypto.subtle.importKey("raw", enc.encode(secret) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
export async function hmacSign(data: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(data) as BufferSource);
  return b64urlEncodeBytes(new Uint8Array(sig));
}
export async function hmacVerify(data: string, sigB64: string, secret: string): Promise<boolean> {
  let sig: Uint8Array;
  try {
    sig = b64urlDecodeBytes(sigB64);
  } catch {
    return false;
  }
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig as BufferSource, enc.encode(data) as BufferSource);
}

export type Parsed =
  | { ok: false; error: string }
  | { ok: true; h: string; p: string; s: string; header: Record<string, unknown>; payload: Record<string, unknown> };

export function parseJwt(token: string): Parsed {
  const t = token.trim();
  if (!t) return { ok: false, error: "Пустой токен. Вставь JWT вида xxxxx.yyyyy.zzzzz" };
  const parts = t.split(".");
  if (parts.length !== 3) return { ok: false, error: `В JWT должно быть 3 части через точку, а найдено ${parts.length}.` };
  const [h, p, s] = parts;
  const dec = (name: string, v: string) => {
    let text: string;
    try {
      text = b64urlDecode(v);
    } catch (e) {
      throw new Error(`${name}: не удаётся декодировать base64url (${e instanceof Error ? e.message : "ошибка"}).`);
    }
    let obj: unknown;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new Error(`${name}: после декодирования это не JSON.`);
    }
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new Error(`${name}: ожидался JSON-объект.`);
    return obj as Record<string, unknown>;
  };
  try {
    return { ok: true, h, p, s, header: dec("Header", h), payload: dec("Payload", p) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ошибка разбора токена." };
  }
}
