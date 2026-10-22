/* Pyodide worker for python blocks. Classic worker (importScripts). */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js");

const HARNESS = String.raw`
import sys, builtins, json, traceback, linecache

_KR_LIMIT = 60000

def __kr_run(code, tests, stdin_json, emit):
    stdin = json.loads(stdin_json)
    state = {"i": 0, "n": 0, "emit": True}
    buf = []

    class W:
        def __init__(self, name):
            self.name = name
        def write(self, t):
            t = str(t)
            if not t:
                return 0
            if self.name == "out":
                buf.append(t)
            if state["emit"]:
                if state["n"] < _KR_LIMIT:
                    state["n"] += len(t)
                    emit(self.name, t)
                    if state["n"] >= _KR_LIMIT:
                        emit("err", "\n... вывод обрезан ...\n")
            return len(t)
        def flush(self):
            pass
        def isatty(self):
            return False

    def _input(prompt=""):
        if prompt:
            sys.stdout.write(str(prompt))
        if state["i"] >= len(stdin):
            raise EOFError("stdin пуст")
        v = str(stdin[state["i"]])
        state["i"] += 1
        return v

    def fmt(e, fname):
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == fname]
        lines = []
        if frames:
            lines.append("Traceback (most recent call last):\n")
            lines += traceback.format_list(frames)
        lines += traceback.format_exception_only(type(e), e)
        return "".join(lines)

    linecache.cache["<exec>"] = (len(code), None, code.splitlines(True), "<exec>")
    g = {"__name__": "__main__", "__builtins__": builtins}
    old = (sys.stdout, sys.stderr, builtins.input)
    sys.stdout, sys.stderr, builtins.input = W("out"), W("err"), _input
    res = {"status": "ok", "message": ""}
    try:
        try:
            exec(compile(code, "<exec>", "exec"), g)
        except SystemExit:
            pass
        except BaseException as e:
            res = {"status": "error", "message": fmt(e, "<exec>")}
        if res["status"] == "ok" and tests:
            state["emit"] = False
            g["__stdout__"] = "".join(buf)
            linecache.cache["<tests>"] = (len(tests), None, tests.splitlines(True), "<tests>")
            try:
                exec(compile(tests, "<tests>", "exec"), g)
            except AssertionError as e:
                res = {"status": "fail", "message": str(e) or "условие проверки не выполнено"}
            except BaseException as e:
                res = {"status": "testerror", "message": fmt(e, "<tests>")}
    finally:
        sys.stdout, sys.stderr, builtins.input = old
    return json.dumps(res)
`;

let pyodidePromise = null;

function init() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/" }).then((py) => {
      py.runPython(HARNESS, { filename: "<kr-harness>" });
      return py;
    });
  }
  return pyodidePromise;
}

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === "init") {
    try {
      await init();
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "init-error", message: String((e && e.message) || e) });
    }
    return;
  }
  if (m.type !== "run") return;
  let py;
  try {
    py = await init();
  } catch (e) {
    self.postMessage({ type: "init-error", id: m.id, message: String((e && e.message) || e) });
    return;
  }
  self.postMessage({ type: "started", id: m.id });
  try {
    const fn = py.globals.get("__kr_run");
    const emit = (stream, text) => self.postMessage({ type: "out", id: m.id, stream, text });
    const json = fn(m.code, m.tests || null, JSON.stringify(m.stdin || []), emit);
    self.postMessage({ type: "done", id: m.id, result: JSON.parse(json) });
  } catch (e) {
    self.postMessage({ type: "done", id: m.id, result: { status: "error", message: String((e && e.message) || e), stdout: "" } });
  }
};
