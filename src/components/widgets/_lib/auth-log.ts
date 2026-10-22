import { mulberry32 } from "@/components/ui/frames";

export const ATTACKER = "203.0.113.45";
export const NOISY = "198.51.100.23";

const fmt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `Oct 23 ${p(h)}:${p(m)}:${p(x)}`;
};

/** Deterministic auth.log (same on server and client). */
function build(): string[] {
  const rnd = mulberry32(20231023);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  type Ev = { t: number; f: (pid: number) => string };
  const ev: Ev[] = [];
  const sshd = (pid: number, msg: string) => `web01 sshd[${pid}]: ${msg}`;

  // brute force: 25 failures within ~2 minutes, mostly root/admin/oracle/test
  const users = ["root", "admin", "root", "oracle", "test", "root", "admin", "ubuntu"];
  let t = 2 * 3600 + 14 * 60 + 3;
  for (let i = 0; i < 25; i++) {
    t += ri(2, 6);
    const u = users[ri(0, users.length - 1)];
    const port = ri(40000, 60000);
    const invalid = u !== "root";
    ev.push({ t, f: (pid) => sshd(pid, `Failed password for ${invalid ? "invalid user " : ""}${u} from ${ATTACKER} port ${port} ssh2`) });
    if (i === 8 || i === 17) {
      const p2 = ri(40000, 60000);
      ev.push({ t: t + 1, f: (pid) => sshd(pid, `Connection closed by authenticating user root ${ATTACKER} port ${p2} [preauth]`) });
    }
  }
  // noisy but smaller
  let n = 8 * 3600 + 41 * 60;
  for (let i = 0; i < 7; i++) {
    n += ri(15, 90);
    const u = pick(["ubuntu", "pi", "deploy", "guest"]);
    const port = ri(30000, 65000);
    ev.push({ t: n, f: (pid) => sshd(pid, `Failed password for invalid user ${u} from ${NOISY} port ${port} ssh2`) });
  }
  // benign sessions
  const benign: [string, string, string, number][] = [
    ["192.0.2.17", "alice", "password", 1001],
    ["192.0.2.88", "deploy", "publickey", 1002],
    ["10.0.0.14", "bob", "password", 1003],
    ["192.0.2.51", "carol", "publickey", 1004],
  ];
  let b = 5 * 3600 + 5 * 60;
  for (let i = 0; i < 8; i++) {
    b += ri(900, 2400);
    const [ip, user, method, uid] = pick(benign);
    const port = ri(40000, 60000);
    ev.push({ t: b, f: (pid) => sshd(pid, `Accepted ${method} for ${user} from ${ip} port ${port} ssh2`) });
    ev.push({ t: b, f: (pid) => `web01 sshd[${pid}]: pam_unix(sshd:session): session opened for user ${user}(uid=${uid}) by (uid=0)` });
    ev.push({ t: b + ri(300, 1800), f: (pid) => sshd(pid, `Connection closed by ${ip} port ${port}`) });
  }
  // benign typos
  ev.push({ t: b + 7, f: (pid) => sshd(pid, `Failed password for alice from 192.0.2.17 port ${ri(40000, 60000)} ssh2`) });
  ev.push({ t: 6 * 3600 + 2 * 60, f: (pid) => sshd(pid, `Failed password for bob from 10.0.0.14 port ${ri(40000, 60000)} ssh2`) });

  ev.sort((x, y) => x.t - y.t);
  let pid = 1180;
  return ev.map((e) => {
    pid += ri(1, 9);
    return `${fmt(e.t)} ${e.f(pid)}`;
  });
}

export const LOG_LINES = build();

export function failedByIp(lines: string[]) {
  const m = new Map<string, number>();
  for (const l of lines) {
    const r = /Failed password for .* from (\d+\.\d+\.\d+\.\d+) port/.exec(l);
    if (r) m.set(r[1], (m.get(r[1]) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
