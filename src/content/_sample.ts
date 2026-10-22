import type { Lesson, WidgetName } from "./types";

// QA fixtures for /dev: exercises every block kind and every widget.
const widgets: WidgetName[] = [
  "base-converter", "caesar", "vigenere", "xor", "hash", "password-strength", "encoder", "tcp-handshake", "http-builder", "dns-resolver",
  "port-scan", "packet-capture", "sqli-lab", "xss-lab", "jwt", "phishing", "cia-triad", "chmod", "log-analyzer",
];

export const sampleLessons: Lesson[] = [
  {
    n: 0,
    slug: "dev-blocks",
    week: 1,
    title: "Галерея: все блоки",
    type: "lesson",
    minutes: 30,
    goals: ["Проверить рендер каждого блока", "Проверить светлую и тёмную темы", "Проверить мобильную вёрстку"],
    homework: "Ничего делать не нужно. Это тестовая страница.",
    blocks: [
      { kind: "md", md: "## Теория: markdown\n\nОбычный абзац с `inline-кодом`, **жирным** и [ссылкой](https://example.com). Слово «байт» — это 8 бит.\n\n### Список и таблица\n\n- первый пункт\n- второй пункт\n\n1. шаг один\n2. шаг два\n\n| Система | Основание | Пример |\n|---|---|---|\n| Двоичная | 2 | `1010` |\n| Десятичная | 10 | `10` |\n| Шестнадцатеричная | 16 | `0xA` |\n\n```python\nfor i in range(3):\n    print(\"Привет\", i)  # комментарий\n```\n\n> Цитата: безопасность — это процесс, а не продукт." },
      { kind: "callout", tone: "info", title: "Информация", md: "Это обычная **подсказка** с `кодом`." },
      { kind: "callout", tone: "tip", md: "Совет: делай заметки по ходу урока." },
      { kind: "callout", tone: "warn", md: "Осторожно: не запускай чужие скрипты с правами администратора." },
      { kind: "callout", tone: "legal", md: "Тренируйся только на своих машинах и учебных площадках. Несанкционированный доступ к чужим системам — преступление." },
      { kind: "code", lang: "python", code: "def greet(name):\n    # приветствие\n    return f\"Привет, {name}!\"\n\nprint(greet(\"мир\"), 42)", caption: "Python" },
      { kind: "code", lang: "bash", code: "ls -la ~/projects | grep \".py\"\nchmod +x run.sh" },
      { kind: "code", lang: "sql", code: "SELECT name, COUNT(*) FROM users WHERE age >= 18 GROUP BY name; -- запрос" },
      { kind: "code", lang: "js", code: "const x = 5;\nfunction f(a) { return a * 2; } // js" },
      { kind: "code", lang: "html", code: "<div class=\"box\"><a href=\"/x\">link</a></div>" },
      { kind: "code", lang: "http", code: "GET /index.html HTTP/1.1\nHost: example.tj\nAccept: text/html" },
      {
        kind: "quiz",
        title: "Мини-тест",
        questions: [
          { q: "Сколько бит в байте?", options: ["4", "8", "16"], answer: 1, explain: "В байте 8 бит." },
          { q: "Что из этого — протоколы? (несколько)", options: ["HTTP", "DNS", "Python", "TCP"], answer: [0, 1, 3], multi: true, explain: "Python — язык программирования." },
        ],
      },
      {
        kind: "python",
        title: "Сумма двух чисел",
        task: "Напиши функцию `add(a, b)`, которая возвращает сумму.",
        starter: "def add(a, b):\n    # твой код здесь\n    pass\n",
        tests: "assert add(2, 3) == 5, \"2 + 3 должно быть 5\"\nassert add(-1, 1) == 0, \"-1 + 1 должно быть 0\"",
        solution: "def add(a, b):\n    return a + b\n",
        hints: ["Используй return.", "return a + b"],
      },
      {
        kind: "python",
        title: "Ввод и вывод",
        task: "Считай имя через `input()` и выведи `Привет, <имя>!`.",
        starter: "name = input()\n# твой код здесь\n",
        tests: "assert \"Привет, Аня!\" in __stdout__, \"Выведи: Привет, Аня!\"",
        solution: "name = input()\nprint(f\"Привет, {name}!\")\n",
        stdin: ["Аня"],
      },
      {
        kind: "terminal",
        title: "Первые команды",
        intro: "Попробуй команды в учебном терминале.",
        fs: { home: { student: { "notes.txt": "привет\nмир\nпривет\n", docs: { "a.md": "# A\n" } } } },
        tasks: [
          { prompt: "Выведи текущую папку командой pwd", check: { command: "^pwd$", output: "/home/student" } },
          { prompt: "Перейди в папку docs", check: { cwd: "/home/student/docs" }, hint: "cd docs" },
          { prompt: "Покажи содержимое a.md", check: { output: "# A" }, hint: "cat a.md" },
        ],
      },
      {
        kind: "sql",
        title: "Первые запросы",
        setup: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, city TEXT, age INTEGER);\nINSERT INTO users(name,city,age) VALUES ('Алия','Душанбе',17),('Фируз','Худжанд',16),('Мадина','Душанбе',18),('Рустам','Бохтар',15);",
        tasks: [
          { prompt: "Выведи имена всех пользователей.", expected: "SELECT name FROM users", hint: "SELECT name FROM users" },
          { prompt: "Выведи пользователей из Душанбе, отсортированных по возрасту.", expected: "SELECT * FROM users WHERE city='Душанбе' ORDER BY age" },
        ],
      },
      { kind: "flashcards", title: "Термины", cards: [{ front: "Бит", back: "Наименьшая единица информации: 0 или 1." }, { front: "Байт", back: "8 бит." }, { front: "Хеш", back: "Отпечаток данных фиксированной длины." }] },
      { kind: "match", title: "Порты и сервисы", pairs: [{ left: "22", right: "SSH" }, { left: "80", right: "HTTP" }, { left: "443", right: "HTTPS" }, { left: "53", right: "DNS" }] },
      { kind: "order", title: "Этапы TCP-рукопожатия", items: ["SYN", "SYN-ACK", "ACK", "Передача данных"] },
      { kind: "sort", title: "Безопасно или опасно?", buckets: ["Безопасно", "Опасно"], items: [{ text: "Менеджер паролей", bucket: 0 }, { text: "Один пароль везде", bucket: 1 }, { text: "Двухфакторная аутентификация", bucket: 0 }, { text: "Пароль на стикере", bucket: 1 }] },
      { kind: "answer", title: "Декодируй Base64", prompt: "Расшифруй строку `ZmxhZ3t3ZWxjb21lfQ==`.", accept: ["flag{welcome}"], hint: "Используй виджет encoder.", explain: "Base64 — это кодирование, а не шифрование." },
      { kind: "external", title: "OverTheWire: Bandit", url: "https://overthewire.org/wargames/bandit/", platform: "OverTheWire", steps: ["Подключись по SSH к уровню 0", "Найди файл readme", "Запиши пароль для уровня 1"], md: "Площадка **разрешает** такие тренировки." },
      ...widgets.map((w) => ({ kind: "widget" as const, widget: w, props: w === "caesar" ? { ciphertext: "Хпмпрпл" } : undefined })),
    ],
  },
];
