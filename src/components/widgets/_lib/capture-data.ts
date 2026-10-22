// Deterministic simulated packet capture (pure, no randomness at runtime except a seeded PRNG).
import { mulberry32 } from "@/components/ui/frames";

export type TreeNode = { label: string; range?: [number, number]; children?: TreeNode[] };
export type Packet = {
  no: number;
  time: string;
  src: string;
  dst: string;
  proto: string;
  len: number;
  info: string;
  bytes: number[];
  tree: TreeNode[];
  layers: string[];
  ips: string[];
  tcpPorts: number[];
  udpPorts: number[];
  method?: string;
  isResponse?: boolean;
  ascii: string;
};

export const PASSWORD = "Qwerty2024";

const rnd = mulberry32(2024);
const rbytes = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 256));
const hex = (b: number, w = 2) => b.toString(16).padStart(w, "0");
const be16 = (n: number) => [(n >> 8) & 255, n & 255];
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const mac = (s: string) => s.split(":").map((x) => parseInt(x, 16));
const ip4 = (s: string) => s.split(".").map(Number);
const str = (s: string) => Array.from(s).map((c) => c.charCodeAt(0) & 255);
const asciiOf = (b: number[]) => b.map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : ".")).join("");

function checksum(data: number[]) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 2) sum += (data[i] << 8) | (data[i + 1] ?? 0);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

const CLIENT = { ip: "192.168.1.23", mac: "3c:22:fb:11:a2:07" };
const GW = { ip: "192.168.1.1", mac: "8c:3b:ad:5e:10:01" };
const WEB = "203.0.113.80";
const TLS_HOST = "198.51.100.44";
const WEB_NAME = "shop.example.tj";
const TLS_NAME = "secure.example.tj";

type Out = Omit<Packet, "no" | "time" | "ascii">;

function ethernet(dst: string, src: string, type: number) {
  return [...mac(dst), ...mac(src), ...be16(type)];
}
const ethNode = (dst: string, src: string, type: number, name: string): TreeNode => ({
  label: `Ethernet II, Src: ${src}, Dst: ${dst}`,
  range: [0, 14],
  children: [
    { label: `Destination: ${dst}`, range: [0, 6] },
    { label: `Source: ${src}`, range: [6, 12] },
    { label: `Type: ${name} (0x${hex(type, 4)})`, range: [12, 14] },
  ],
});

function ipv4(src: string, dst: string, proto: number, payload: number[], ttl: number, id: number) {
  const hdr = [0x45, 0, ...be16(20 + payload.length), ...be16(id), 0x40, 0, ttl, proto, 0, 0, ...ip4(src), ...ip4(dst)];
  const cs = checksum(hdr);
  hdr[10] = cs >> 8;
  hdr[11] = cs & 255;
  return { hdr, cs };
}
const ipNode = (src: string, dst: string, proto: number, pname: string, total: number, ttl: number, id: number, cs: number, off: number): TreeNode => ({
  label: `Internet Protocol Version 4, Src: ${src}, Dst: ${dst}`,
  range: [off, off + 20],
  children: [
    { label: "0100 .... = Version: 4", range: [off, off + 1] },
    { label: ".... 0101 = Header Length: 20 bytes (5)", range: [off, off + 1] },
    { label: `Total Length: ${total}`, range: [off + 2, off + 4] },
    { label: `Identification: 0x${hex(id, 4)} (${id})`, range: [off + 4, off + 6] },
    { label: "Flags: 0x2, Don't fragment", range: [off + 6, off + 7] },
    { label: `Time to Live: ${ttl}`, range: [off + 8, off + 9] },
    { label: `Protocol: ${pname} (${proto})`, range: [off + 9, off + 10] },
    { label: `Header Checksum: 0x${hex(cs, 4)} [correct]`, range: [off + 10, off + 12] },
    { label: `Source Address: ${src}`, range: [off + 12, off + 16] },
    { label: `Destination Address: ${dst}`, range: [off + 16, off + 20] },
  ],
});

let ipId = 0x3a10;
const nextId = () => (ipId += 7);

/** Flow state for a TCP connection (relative seq numbers like Wireshark). */
type Flow = { cp: number; sp: number; cIsn: number; sIsn: number; c: number; s: number; sIp: string; sTtl: number };
const FLAG_BITS: [string, number][] = [["FIN", 1], ["SYN", 2], ["RST", 4], ["PSH", 8], ["ACK", 16]];

type Extra = { proto: string; infoText?: string; node?: (payloadOff: number) => TreeNode; layers: string[]; method?: string; isResponse?: boolean };

function tcp(flow: Flow, from: "c" | "s", flags: number, payload: number[] = [], extra?: Extra): Out {
  const c2s = from === "c";
  const srcIp = c2s ? CLIENT.ip : flow.sIp;
  const dstIp = c2s ? flow.sIp : CLIENT.ip;
  const sp = c2s ? flow.cp : flow.sp;
  const dp = c2s ? flow.sp : flow.cp;
  const rel = c2s ? flow.c : flow.s;
  const ackRel = c2s ? flow.s : flow.c;
  const hasAck = !!(flags & 16);
  const syn = !!(flags & 2);
  const seqAbs = ((c2s ? flow.cIsn : flow.sIsn) + rel) >>> 0;
  const ackAbs = hasAck ? ((c2s ? flow.sIsn : flow.cIsn) + ackRel) >>> 0 : 0;
  const win = c2s ? 64240 : 65160;
  const opts = syn ? [2, 4, 5, 0xb4] : [];
  const hl = 20 + opts.length;
  const th = [...be16(sp), ...be16(dp), ...be32(seqAbs), ...be32(ackAbs), (hl / 4) << 4, flags, ...be16(win), 0, 0, 0, 0, ...opts];
  const seg = [...th, ...payload];
  const pseudo = [...ip4(srcIp), ...ip4(dstIp), 0, 6, ...be16(seg.length)];
  const tcs = checksum([...pseudo, ...seg]);
  seg[16] = tcs >> 8;
  seg[17] = tcs & 255;
  const ttl = c2s ? 64 : flow.sTtl;
  const id = nextId();
  const { hdr, cs } = ipv4(srcIp, dstIp, 6, seg, ttl, id);
  const ethDst = c2s ? GW.mac : CLIENT.mac;
  const ethSrc = c2s ? CLIENT.mac : GW.mac;
  const eth = ethernet(ethDst, ethSrc, 0x0800);
  const bytes = [...eth, ...hdr, ...seg];
  const flagNames = FLAG_BITS.filter(([, b]) => flags & b).map(([n]) => n);
  const flagStr = flagNames.join(", ");
  const flagHex = `0x${hex(flags, 3)}`;
  const tOff = 34;
  const tcpNode: TreeNode = {
    label: `Transmission Control Protocol, Src Port: ${sp}, Dst Port: ${dp}, Seq: ${rel}${hasAck ? `, Ack: ${ackRel}` : ""}, Len: ${payload.length}`,
    range: [tOff, tOff + hl],
    children: [
      { label: `Source Port: ${sp}`, range: [tOff, tOff + 2] },
      { label: `Destination Port: ${dp}`, range: [tOff + 2, tOff + 4] },
      { label: `Sequence Number: ${rel}    (relative sequence number)`, range: [tOff + 4, tOff + 8] },
      { label: `Acknowledgment Number: ${hasAck ? ackRel : 0}    (relative ack number)`, range: [tOff + 8, tOff + 12] },
      { label: `${hl === 20 ? "0101" : "0110"} .... = Header Length: ${hl} bytes (${hl / 4})`, range: [tOff + 12, tOff + 13] },
      { label: `Flags: ${flagHex} (${flagStr})`, range: [tOff + 13, tOff + 14] },
      { label: `Window: ${win}`, range: [tOff + 14, tOff + 16] },
      { label: `Checksum: 0x${hex(tcs, 4)} [unverified]`, range: [tOff + 16, tOff + 18] },
      ...(syn ? [{ label: "Options: (4 bytes), Maximum segment size: 1460", range: [tOff + 20, tOff + 24] as [number, number] }] : []),
    ],
  };
  const pOff = tOff + hl;
  const tree: TreeNode[] = [
    { label: `Frame: ${bytes.length} bytes on wire (${bytes.length * 8} bits), ${bytes.length} bytes captured`, range: [0, bytes.length] },
    ethNode(ethDst, ethSrc, 0x0800, "IPv4"),
    ipNode(srcIp, dstIp, 6, "TCP", 20 + seg.length, ttl, id, cs, 14),
    tcpNode,
  ];
  if (extra?.node && payload.length) tree.push(extra.node(pOff));
  const info =
    extra?.infoText ??
    `${sp} → ${dp} [${flagStr}] Seq=${rel}${hasAck ? ` Ack=${ackRel}` : ""} Win=${win} Len=${payload.length}${syn ? " MSS=1460" : ""}`;
  // advance state
  const adv = payload.length + (syn ? 1 : 0) + (flags & 1 ? 1 : 0);
  if (c2s) flow.c += adv;
  else flow.s += adv;
  return {
    src: srcIp,
    dst: dstIp,
    proto: extra?.proto ?? "TCP",
    len: bytes.length,
    info,
    bytes,
    tree,
    layers: ["eth", "ip", "tcp", ...(extra?.layers ?? [])],
    ips: [srcIp, dstIp],
    tcpPorts: [sp, dp],
    udpPorts: [],
    method: extra?.method,
    isResponse: extra?.isResponse,
  };
}

/** Build an HTTP message node whose children map to header lines. */
function httpNode(text: string, bodyForm?: [string, string][], uri?: string): (off: number) => TreeNode {
  return (off) => {
    const [head, body = ""] = text.split("\r\n\r\n");
    let o = off;
    const children: TreeNode[] = head.split("\r\n").map((l) => {
      const n: TreeNode = { label: l + "\\r\\n", range: [o, o + l.length + 2] };
      o += l.length + 2;
      return n;
    });
    children.push({ label: "\\r\\n", range: [o, o + 2] });
    o += 2;
    if (uri) children.push({ label: `[Full request URI: http://${WEB_NAME}${uri}]` });
    if (body && bodyForm) {
      children.push({
        label: `HTML Form URL Encoded: application/x-www-form-urlencoded`,
        range: [o, o + body.length],
        children: bodyForm.map(([k, v]) => ({ label: `Form item: "${k}" = "${v}"`, range: [o, o + body.length] as [number, number] })),
      });
    } else if (body) {
      children.push({ label: `File Data: ${body.length} bytes`, range: [o, o + body.length] });
    }
    return { label: "Hypertext Transfer Protocol", range: [off, off + text.length], children };
  };
}

function udp(srcIp: string, dstIp: string, sp: number, dp: number, payload: number[], c2s: boolean, extra: { proto: string; info: string; node: (off: number) => TreeNode; layers: string[]; ttl: number }): Out {
  const ulen = 8 + payload.length;
  const pseudo = [...ip4(srcIp), ...ip4(dstIp), 0, 17, ...be16(ulen)];
  const head = [...be16(sp), ...be16(dp), ...be16(ulen), 0, 0];
  const ucs = checksum([...pseudo, ...head, ...payload]) || 0xffff;
  head[6] = ucs >> 8;
  head[7] = ucs & 255;
  const seg = [...head, ...payload];
  const id = nextId();
  const { hdr, cs } = ipv4(srcIp, dstIp, 17, seg, extra.ttl, id);
  const ethDst = c2s ? GW.mac : CLIENT.mac;
  const ethSrc = c2s ? CLIENT.mac : GW.mac;
  const bytes = [...ethernet(ethDst, ethSrc, 0x0800), ...hdr, ...seg];
  const tree: TreeNode[] = [
    { label: `Frame: ${bytes.length} bytes on wire (${bytes.length * 8} bits), ${bytes.length} bytes captured`, range: [0, bytes.length] },
    ethNode(ethDst, ethSrc, 0x0800, "IPv4"),
    ipNode(srcIp, dstIp, 17, "UDP", 20 + seg.length, extra.ttl, id, cs, 14),
    {
      label: `User Datagram Protocol, Src Port: ${sp}, Dst Port: ${dp}`,
      range: [34, 42],
      children: [
        { label: `Source Port: ${sp}`, range: [34, 36] },
        { label: `Destination Port: ${dp}`, range: [36, 38] },
        { label: `Length: ${ulen}`, range: [38, 40] },
        { label: `Checksum: 0x${hex(ucs, 4)} [unverified]`, range: [40, 42] },
      ],
    },
    extra.node(42),
  ];
  return { src: srcIp, dst: dstIp, proto: extra.proto, len: bytes.length, info: extra.info, bytes, tree, layers: ["eth", "ip", "udp", ...extra.layers], ips: [srcIp, dstIp], tcpPorts: [], udpPorts: [sp, dp] };
}

function dnsName(n: string) {
  return [...n.split(".").flatMap((l) => [l.length, ...str(l)]), 0];
}

function dnsPkt(name: string, ansIp: string | null, id: number, sport: number): Out {
  const q = [...dnsName(name), 0, 1, 0, 1];
  const c2s = ansIp === null;
  const payload = c2s
    ? [...be16(id), 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0, ...q]
    : [...be16(id), 0x81, 0x80, 0, 1, 0, 1, 0, 0, 0, 0, ...q, 0xc0, 0x0c, 0, 1, 0, 1, ...be32(300), 0, 4, ...ip4(ansIp!)];
  return udp(c2s ? CLIENT.ip : GW.ip, c2s ? GW.ip : CLIENT.ip, c2s ? sport : 53, c2s ? 53 : sport, payload, c2s, {
    proto: "DNS",
    ttl: c2s ? 64 : 64,
    layers: ["dns"],
    info: c2s ? `Standard query 0x${hex(id, 4)} A ${name}` : `Standard query response 0x${hex(id, 4)} A ${name} A ${ansIp}`,
    node: (off) => ({
      label: `Domain Name System (${c2s ? "query" : "response"})`,
      range: [off, off + payload.length],
      children: [
        { label: `Transaction ID: 0x${hex(id, 4)}`, range: [off, off + 2] },
        { label: c2s ? "Flags: 0x0100 Standard query" : "Flags: 0x8180 Standard query response, No error", range: [off + 2, off + 4] },
        { label: "Questions: 1", range: [off + 4, off + 6] },
        { label: `Answer RRs: ${c2s ? 0 : 1}`, range: [off + 6, off + 8] },
        { label: "Queries", range: [off + 12, off + 12 + q.length], children: [{ label: `${name}: type A (Host Address) (1), class IN (0x0001)`, range: [off + 12, off + 12 + q.length] }] },
        ...(c2s ? [] : [{ label: "Answers", range: [off + 12 + q.length, off + payload.length] as [number, number], children: [{ label: `${name}: type A, class IN, ttl 300, addr ${ansIp}`, range: [off + 12 + q.length, off + payload.length] as [number, number] }] }]),
      ],
    }),
  });
}

function arp(op: 1 | 2): Out {
  const sMac = op === 1 ? CLIENT.mac : GW.mac;
  const sIp = op === 1 ? CLIENT.ip : GW.ip;
  const tMac = op === 1 ? "00:00:00:00:00:00" : CLIENT.mac;
  const tIp = op === 1 ? GW.ip : CLIENT.ip;
  const ethDst = op === 1 ? "ff:ff:ff:ff:ff:ff" : CLIENT.mac;
  const bytes = [...ethernet(ethDst, sMac, 0x0806), 0, 1, 8, 0, 6, 4, 0, op, ...mac(sMac), ...ip4(sIp), ...mac(tMac), ...ip4(tIp)];
  return {
    src: sMac,
    dst: op === 1 ? "Broadcast" : CLIENT.mac,
    proto: "ARP",
    len: bytes.length,
    info: op === 1 ? `Who has ${GW.ip}? Tell ${CLIENT.ip}` : `${GW.ip} is at ${GW.mac}`,
    bytes,
    tree: [
      { label: `Frame: ${bytes.length} bytes on wire (${bytes.length * 8} bits), ${bytes.length} bytes captured`, range: [0, bytes.length] },
      ethNode(ethDst, sMac, 0x0806, "ARP"),
      {
        label: `Address Resolution Protocol (${op === 1 ? "request" : "reply"})`,
        range: [14, 42],
        children: [
          { label: "Hardware type: Ethernet (1)", range: [14, 16] },
          { label: "Protocol type: IPv4 (0x0800)", range: [16, 18] },
          { label: `Opcode: ${op === 1 ? "request (1)" : "reply (2)"}`, range: [20, 22] },
          { label: `Sender MAC address: ${sMac}`, range: [22, 28] },
          { label: `Sender IP address: ${sIp}`, range: [28, 32] },
          { label: `Target MAC address: ${tMac}`, range: [32, 38] },
          { label: `Target IP address: ${tIp}`, range: [38, 42] },
        ],
      },
    ],
    layers: ["eth", "arp"],
    ips: [],
    tcpPorts: [],
    udpPorts: [],
  };
}

/* ---- TLS helpers ---- */
function tlsRecord(type: number, ver: number, body: number[]) {
  return [type, ...be16(ver), ...be16(body.length), ...body];
}
function clientHello(sni: string) {
  const name = str(sni);
  const sniExt = [0, 0, ...be16(name.length + 5), ...be16(name.length + 3), 0, ...be16(name.length), ...name];
  const verExt = [0, 0x2b, 0, 3, 2, 3, 4];
  const exts = [...sniExt, ...verExt];
  const body = [3, 3, ...rbytes(32), 32, ...rbytes(32), 0, 4, 0x13, 1, 0x13, 2, 1, 0, ...be16(exts.length), ...exts];
  const hs = [1, 0, ...be16(body.length), ...body];
  return tlsRecord(0x16, 0x0301, hs);
}
function serverHelloFlight() {
  const exts = [0, 0x2b, 0, 2, 3, 4];
  const body = [3, 3, ...rbytes(32), 32, ...rbytes(32), 0x13, 1, 0, ...be16(exts.length), ...exts];
  const hs = [2, 0, ...be16(body.length), ...body];
  const sh = tlsRecord(0x16, 0x0303, hs);
  const ccs = tlsRecord(0x14, 0x0303, [1]);
  const app = tlsRecord(0x17, 0x0303, rbytes(180));
  return { sh, ccs, app, all: [...sh, ...ccs, ...app] };
}

const tlsAppNode = (rec: number[], off: number): TreeNode => ({
  label: "TLSv1.3 Record Layer: Application Data Protocol: Application Data",
  range: [off, off + rec.length],
  children: [
    { label: "Opaque Type: Application Data (23)", range: [off, off + 1] },
    { label: "Version: TLS 1.2 (0x0303)", range: [off + 1, off + 3] },
    { label: `Length: ${rec.length - 5}`, range: [off + 3, off + 5] },
    { label: `Encrypted Application Data: ${rec.slice(5, 21).map((b) => hex(b)).join("")}...`, range: [off + 5, off + rec.length] },
    { label: "[Содержимое зашифровано: без ключа сессии прочитать нельзя]" },
  ],
});

function build(): Packet[] {
  const out: Out[] = [];
  const push = (o: Out) => out.push(o);

  // HTTP flow (plain)
  const web: Flow = { cp: 49822, sp: 80, cIsn: 0x1a2b3c4d, sIsn: 0x5e6f7a8b, c: 0, s: 0, sIp: WEB, sTtl: 56 };
  const req = (m: string, path: string, extraHdr: string[], body = "") => {
    const lines = [`${m} ${path} HTTP/1.1`, `Host: ${WEB_NAME}`, "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Firefox/131.0", ...extraHdr];
    if (body) lines.push(`Content-Length: ${body.length}`);
    return lines.join("\r\n") + "\r\n\r\n" + body;
  };
  const resp = (status: string, hdrs: string[], body = "") =>
    [`HTTP/1.1 ${status}`, "Server: nginx/1.18.0", "Date: Thu, 23 Oct 2026 10:00:03 GMT", ...hdrs, `Content-Length: ${body.length}`, "Connection: keep-alive"].join("\r\n") + "\r\n\r\n" + body;
  const FORM = "Content-Type: application/x-www-form-urlencoded";

  const httpReq = (text: string, path: string, method: string, form?: [string, string][]) =>
    tcp(web, "c", 0x18, str(text), {
      proto: "HTTP",
      layers: ["http"],
      method,
      infoText: `${method} ${path} HTTP/1.1${form ? "  (application/x-www-form-urlencoded)" : ""}`,
      node: httpNode(text, form, path),
    });
  const httpRes = (text: string, statusInfo: string) =>
    tcp(web, "s", 0x18, str(text), { proto: "HTTP", layers: ["http"], isResponse: true, infoText: `HTTP/1.1 ${statusInfo}`, node: httpNode(text) });

  push(arp(1));
  push(arp(2));
  push(dnsPkt(WEB_NAME, null, 0x4a21, 53412));
  push(dnsPkt(WEB_NAME, WEB, 0x4a21, 53412));
  push(tcp(web, "c", 0x02));
  push(tcp(web, "s", 0x12));
  push(tcp(web, "c", 0x10));
  push(httpReq(req("GET", "/login", ["Accept: text/html"]), "/login", "GET"));
  push(tcp(web, "s", 0x10));
  push(httpRes(resp("200 OK", ["Content-Type: text/html; charset=utf-8"], '<form action="/login" method="post"><input name="login"><input name="password" type="password"></form>'), "200 OK  (text/html)"));
  push(tcp(web, "c", 0x10));
  const ana = "event=page_view&page=%2Flogin";
  push(httpReq(req("POST", "/api/analytics", [FORM], ana), "/api/analytics", "POST", [["event", "page_view"], ["page", "%2Flogin"]]));
  push(httpRes(resp("204 No Content", []), "204 No Content"));
  const loginBody = `login=admin&password=${PASSWORD}`;
  push(httpReq(req("POST", "/login", [FORM, `Origin: http://${WEB_NAME}`], loginBody), "/login", "POST", [["login", "admin"], ["password", PASSWORD]]));
  push(tcp(web, "s", 0x10));
  push(httpRes(resp("302 Found", ["Location: /account", "Set-Cookie: session=9f2c41ab7e; HttpOnly"]), "302 Found"));
  push(httpReq(req("GET", "/account", ["Accept: text/html", "Cookie: session=9f2c41ab7e"]), "/account", "GET"));
  push(httpRes(resp("200 OK", ["Content-Type: text/html; charset=utf-8"], "<h1>Welcome, admin</h1>"), "200 OK  (text/html)"));
  push(tcp(web, "c", 0x10));

  // HTTPS flow
  push(dnsPkt(TLS_NAME, null, 0x7c05, 53977));
  push(dnsPkt(TLS_NAME, TLS_HOST, 0x7c05, 53977));
  const tls: Flow = { cp: 49830, sp: 443, cIsn: 0x2c4d6e8f, sIsn: 0x71829304, c: 0, s: 0, sIp: TLS_HOST, sTtl: 58 };
  push(tcp(tls, "c", 0x02));
  push(tcp(tls, "s", 0x12));
  push(tcp(tls, "c", 0x10));
  const ch = clientHello(TLS_NAME);
  push(
    tcp(tls, "c", 0x18, ch, {
      proto: "TLSv1.3",
      layers: ["tls", "ssl"],
      infoText: `Client Hello (SNI=${TLS_NAME})`,
      node: (off) => ({
        label: "Transport Layer Security",
        range: [off, off + ch.length],
        children: [
          {
            label: "TLSv1.3 Record Layer: Handshake Protocol: Client Hello",
            range: [off, off + ch.length],
            children: [
              { label: "Content Type: Handshake (22)", range: [off, off + 1] },
              { label: "Version: TLS 1.0 (0x0301)", range: [off + 1, off + 3] },
              { label: `Length: ${ch.length - 5}`, range: [off + 3, off + 5] },
              { label: "Handshake Type: Client Hello (1)", range: [off + 5, off + 6] },
              { label: "Cipher Suites: TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384" },
              { label: `Extension: server_name (${TLS_NAME})`, range: [off + ch.length - 7 - 9 - TLS_NAME.length, off + ch.length - 7] },
            ],
          },
        ],
      }),
    }),
  );
  const sf = serverHelloFlight();
  push(
    tcp(tls, "s", 0x18, sf.all, {
      proto: "TLSv1.3",
      layers: ["tls", "ssl"],
      infoText: "Server Hello, Change Cipher Spec, Application Data",
      node: (off) => ({
        label: "Transport Layer Security",
        range: [off, off + sf.all.length],
        children: [
          { label: "TLSv1.3 Record Layer: Handshake Protocol: Server Hello", range: [off, off + sf.sh.length] },
          { label: "TLSv1.3 Record Layer: Change Cipher Spec Protocol: Change Cipher Spec", range: [off + sf.sh.length, off + sf.sh.length + sf.ccs.length] },
          tlsAppNode(sf.app, off + sf.sh.length + sf.ccs.length),
        ],
      }),
    }),
  );
  const appData = (from: "c" | "s", n: number) => {
    const rec = tlsRecord(0x17, 0x0303, rbytes(n));
    return tcp(tls, from, 0x18, rec, {
      proto: "TLSv1.3",
      layers: ["tls", "ssl"],
      infoText: "Application Data",
      node: (off) => ({ label: "Transport Layer Security", range: [off, off + rec.length], children: [tlsAppNode(rec, off)] }),
    });
  };
  push(appData("c", 74));
  push(appData("s", 412));
  push(tcp(tls, "c", 0x10));
  push(appData("c", 138));
  push(appData("s", 1020));

  // timestamps in microseconds
  const deltas = [0, 312, 98, 28110, 11, 14200, 15, 142, 63, 23100, 118, 12040, 41, 190600, 95, 16900, 55, 21800, 94, 31200, 26, 18, 41, 40, 77, 12040, 380, 52, 8800, 29000, 31];
  let t = 0;
  return out.map((o, i) => {
    t += deltas[i] ?? 20000;
    const sec = Math.floor(t / 1_000_000);
    const us = String(t % 1_000_000).padStart(6, "0");
    return { ...o, no: i + 1, time: `${sec}.${us}`, ascii: asciiOf(o.bytes) };
  });
}

export const PACKETS: Packet[] = build();

/* ---------------- display filter ---------------- */

type Ast =
  | { t: "or" | "and"; a: Ast; b: Ast }
  | { t: "not"; a: Ast }
  | { t: "atom"; name: string; op?: string; val?: string };

export function parseFilter(src: string): Ast | null {
  const toks = src.match(/\|\||&&|==|!=|!|\(|\)|"[^"]*"|[^\s()!=&|"]+/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const parseOr = (): Ast => {
    let a = parseAnd();
    while (peek() === "||" || peek() === "or") {
      i++;
      a = { t: "or", a, b: parseAnd() };
    }
    return a;
  };
  const parseAnd = (): Ast => {
    let a = parseNot();
    while (peek() === "&&" || peek() === "and") {
      i++;
      a = { t: "and", a, b: parseNot() };
    }
    return a;
  };
  const parseNot = (): Ast => {
    if (peek() === "!" || peek() === "not") {
      i++;
      return { t: "not", a: parseNot() };
    }
    return parseAtom();
  };
  const parseAtom = (): Ast => {
    const tk = peek();
    if (tk === undefined) throw new Error("unexpected end");
    if (tk === "(") {
      i++;
      const e = parseOr();
      if (peek() !== ")") throw new Error("missing )");
      i++;
      return e;
    }
    if (/^(\)|==|!=|&&|\|\||and|or)$/.test(tk)) throw new Error("unexpected " + tk);
    i++;
    const name = tk.toLowerCase();
    const op = peek();
    if (op === "==" || op === "!=" || op === "contains") {
      i++;
      const v = toks[i++];
      if (v === undefined) throw new Error("missing value");
      return { t: "atom", name, op, val: v.replace(/^"|"$/g, "") };
    }
    return { t: "atom", name };
  };
  if (!toks.length) return null;
  const ast = parseOr();
  if (i < toks.length) throw new Error("trailing " + toks[i]);
  return ast;
}

const PROTO_NAMES = new Set(["eth", "ip", "tcp", "udp", "arp", "dns", "http", "tls", "ssl"]);

function evalAtom(p: Packet, a: Extract<Ast, { t: "atom" }>): boolean {
  const { name, op, val } = a;
  if (!op) {
    if (PROTO_NAMES.has(name)) return p.layers.includes(name);
    if (name === "http.request") return p.layers.includes("http") && !p.isResponse;
    if (name === "http.response") return !!p.isResponse;
    throw new Error("unknown field " + name);
  }
  const eq = (x: boolean) => (op === "!=" ? !x : x);
  switch (name) {
    case "ip.addr":
      return op === "!=" ? !p.ips.includes(val!) : p.ips.includes(val!);
    case "ip.src":
      return eq(p.ips[0] === val);
    case "ip.dst":
      return eq(p.ips[1] === val);
    case "tcp.port":
      return op === "!=" ? !p.tcpPorts.includes(Number(val)) : p.tcpPorts.includes(Number(val));
    case "udp.port":
      return op === "!=" ? !p.udpPorts.includes(Number(val)) : p.udpPorts.includes(Number(val));
    case "http.request.method":
      return eq(p.method === val);
    case "frame":
    case "tcp.payload":
      if (op !== "contains") throw new Error("use contains");
      return p.ascii.toLowerCase().includes(val!.toLowerCase());
    default:
      throw new Error("unknown field " + name);
  }
}

export function matches(p: Packet, a: Ast): boolean {
  switch (a.t) {
    case "or":
      return matches(p, a.a) || matches(p, a.b);
    case "and":
      return matches(p, a.a) && matches(p, a.b);
    case "not":
      return !matches(p, a.a);
    default:
      return evalAtom(p, a);
  }
}

/** Returns filtered packets or an error flag. */
export function applyFilter(src: string): { list: Packet[]; error: boolean } {
  try {
    const ast = parseFilter(src.trim());
    if (!ast) return { list: PACKETS, error: false };
    return { list: PACKETS.filter((p) => matches(p, ast)), error: false };
  } catch {
    return { list: PACKETS, error: true };
  }
}
