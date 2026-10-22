// Shared Pyodide worker singleton (module-level, one per page). Client only.

export type PyStatus = "ok" | "error" | "fail" | "testerror" | "timeout" | "loaderror";
export type PyResult = { status: PyStatus; message: string };
export type PyPhase = "loading" | "running";

export const PY_TIMEOUT_MS = 8000;

type Job = {
  code: string;
  tests?: string;
  stdin: string[];
  onOut: (stream: "out" | "err", text: string) => void;
  onPhase: (p: PyPhase) => void;
};

let worker: Worker | null = null;
let chain: Promise<unknown> = Promise.resolve();
let seq = 0;

function getWorker(): Worker {
  if (!worker) worker = new Worker("/py-worker.js");
  return worker;
}

function drop() {
  worker?.terminate();
  worker = null;
}

function exec(job: Job): Promise<PyResult> {
  return new Promise<PyResult>((resolve) => {
    const id = ++seq;
    const w = getWorker();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let finished = false;
    const finish = (r: PyResult, kill: boolean) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      w.onmessage = null;
      w.onerror = null;
      if (kill) drop();
      resolve(r);
    };
    job.onPhase("loading");
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.id !== undefined && m.id !== id) return;
      if (m.type === "started") {
        job.onPhase("running");
        timer = setTimeout(() => finish({ status: "timeout", message: "" }, true), PY_TIMEOUT_MS);
      } else if (m.type === "out") {
        job.onOut(m.stream, m.text);
      } else if (m.type === "done") {
        finish(m.result as PyResult, false);
      } else if (m.type === "init-error") {
        finish({ status: "loaderror", message: String(m.message ?? "") }, true);
      }
    };
    w.onerror = (e) => finish({ status: "loaderror", message: e.message || "worker error" }, true);
    w.postMessage({ type: "run", id, code: job.code, tests: job.tests, stdin: job.stdin });
  });
}

/** Queue a run; runs execute strictly one at a time across all blocks on the page. */
export function runPython(opts: Job): Promise<PyResult> {
  const p = chain.then(() => exec(opts));
  chain = p.catch(() => undefined);
  return p;
}
