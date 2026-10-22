import type { Video } from "./types";

// Curated YouTube videos per lesson slug. ids verified via oEmbed.
export const videos: Record<string, Video[]> = {
  "how-computers-work": [
    { id: "tjbB2vh627s", title: "Как работает компьютерная память: что такое RAM, ROM, SSD, HDD и в чем разница?", channel: "Merion Academy", lang: "ru" },
    { id: "RcxvcLl1nAs", title: "Двоичная система счисления — самое простое объяснение", channel: "Zero to Hero", lang: "ru" },
    { id: "YBosK-_KF6c", title: "Как установить VS Code и Python | Пошаговая инструкция [2026]", channel: "О Коде", lang: "ru" },
  ],
  "variables-and-types": [
    { id: "DZvNZ9l9NT4", title: "Уроки Python с нуля / #4 – Переменные и типы данных", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "tpaEzuKhTyQ", title: "Основы Python - Урок 2: Переменные, типы данных, print, input | Пишем первую программу", channel: "FraglyDev", lang: "ru" },
  ],
  "conditions": [
    { id: "SUDNfS_0X-Q", title: "Уроки Python с нуля / #5 – Условные операторы", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "CBoKUNWNS2Q", title: "Python для начинающих. Урок 3: Условные операторы if, elif, else.", channel: "alishev", lang: "ru" },
  ],
  "loops": [
    { id: "vMD6-jzgDvI", title: "Уроки Python с нуля / #6 – Циклы и операторы в них (for, while)", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "sZ0EIwgLblY", title: "Python с нуля. Урок 4 | Циклы (for, while)", channel: "Иван Викторович", lang: "ru" },
  ],
  "strings": [
    { id: "GmMD6gQYWe4", title: "Урок 11 Строки и их методы Python", channel: "egoroff_channel", lang: "ru" },
    { id: "QlkQNWQUCLc", title: "F-строка. F-string. Программирование на Python", channel: "egoroff_channel", lang: "ru" },
  ],
  "project-calculator": [
    { id: "x5ffiDJCgX8", title: "Пишем простой калькулятор на Python | Гайд №1", channel: "Dixter Channel", lang: "ru" },
    { id: "YrSellOmt0A", title: "Пишем программу: перевод в разные системы счисления", channel: "Информатика ЕГЭ 2023", lang: "ru" },
  ],
  "lists-tuples": [
    { id: "-X2ubBdP2Ak", title: "Уроки Python с нуля / #7 – Списки (list). Функции и их методы", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "cQfu-hYo2o4", title: "Уроки Python с нуля / #9 – Кортежи (tuple)", channel: "Школа itProger / Программирование", lang: "ru" },
  ],
  "dicts-sets": [
    { id: "W2oO1Y-QDzo", title: "Уроки Python с нуля / #10 – Словари (dict) и работа с ними", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "wvvmn1Hnr58", title: "Коллекции Python list, tuple, set, dict | Python Course без воды [4]", channel: "О Коде", lang: "ru" },
  ],
  "functions": [
    { id: "6K5v4--G__U", title: "Уроки Python с нуля / #12 – Функции (def, lambda)", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "kYWaUfYqF9g", title: "Python функции. Создание функций, области видимости, аргументы, return", channel: "WebDev с нуля. Канал Алекса Лущенко", lang: "ru" },
  ],
  "files-exceptions": [
    { id: "t-xQAhLNYSs", title: "Уроки Python с нуля / #13 – Работа с файлами за счет Питон", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "3nveLco08Y0", title: "Уроки Python с нуля / #14 – Обработчик исключений. Конструкция «try - except»", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "UDvL9djXvJc", title: "try / except - обработка ошибок | Python Course без воды [10]", channel: "О Коде", lang: "ru" },
  ],
  "modules-stdlib": [
    { id: "F5SYEE6eT28", title: "#65. Модуль random стандартной библиотеки | Python для начинающих", channel: "selfedu", lang: "ru" },
    { id: "6DS_B6QZ6Kw", title: "#37. Модуль datetime. Классы time и date | The Python Standard Library", channel: "selfedu", lang: "ru" },
  ],
  "project-password-generator": [
    { id: "YenkcYnlk8Q", title: "Создание генератора паролей в Python.", channel: "Easy IT Way", lang: "ru" },
    { id: "W8bA9dMycFQ", title: "Как создать ГЕНЕРАТОР ПАРОЛЕЙ в Python", channel: "Либеральный Разработчик", lang: "ru" },
  ],
  "what-is-linux": [
    { id: "fE1VG1gpXjU", title: "Linux для начинающих / Урок #1 – Что такое дистрибутивы, Bash Shell и Ubuntu?", channel: "Гоша Дударь", lang: "ru" },
    { id: "hPR9IBsDdwc", title: "Linux для начинающих / Урок #2 – Установка VirtualBox и Ubuntu", channel: "Гоша Дударь", lang: "ru" },
    { id: "FWe67crv4Bs", title: "Linux для начинающих. Урок 2, Структура файловой системы, назначение основных папок (что где лежит?)", channel: "Cyrmax Кирилл Белоусов", lang: "ru" },
  ],
  "shell-commands": [
    { id: "ADRjhXGp_xk", title: "Команды cd, ls, mv, cp, grep, cat, whoami, rm, pwd для файлами и папками в Linux в терминале", channel: "Есть решение!", lang: "ru" },
    { id: "IjgwSbdjYKs", title: "Linux для начинающих / Урок #7 – Команды поиска FIND, GREP", channel: "Гоша Дударь", lang: "ru" },
  ],
  "users-permissions": [
    { id: "6hHPnoVsJ9Q", title: "Linux для самых маленьких | Пользователи и права доступа | RWX, chmod, chown, useradd | УРОК 2.1", channel: "SUPER VICTOR", lang: "ru" },
    { id: "az6DCucWS48", title: "Права доступа в Linux: БАЗА | ugo, rwx, chmod", channel: "Артём Кокорин", lang: "ru" },
  ],
  "processes-bash": [
    { id: "kix_vo3a5t4", title: "Linux для начинающих / Урок #11 – Bash Shell скрипты", channel: "Гоша Дударь", lang: "ru" },
    { id: "Vm7LyY6RT1g", title: "Как писать BASH скрипты? Закладывание основ или начало с нуля", channel: "IT-спец. Денис Курец", lang: "ru" },
  ],
  "git-github": [
    { id: "EeARyFrZsnU", title: "Git и GitHub для новичков", channel: "Merion Academy", lang: "ru" },
    { id: "XuFaQSW79rM", title: "Лучший Гайд по Git Для Начинающих За 15 Минут", channel: "Vlad Mishustin", lang: "ru" },
  ],
  "ctf-bandit": [
    { id: "K5MbYXC0h-0", title: "Подробное прохождение bandit overthewire 0-6 lvl | 2023", channel: "Mr-RedLik _", lang: "ru" },
    { id: "ff2Au8BIy_A", title: "OverTheWire Bandit Walkthrough - Level 0 - 6", channel: "HackerSploit", lang: "en" },
  ],
  "how-internet-works": [
    { id: "2I1HnSN1H9o", title: "Что такое TCP/IP: Объясняем на пальцах", channel: "Listen IT", lang: "ru" },
    { id: "yMSJKBQINAc", title: "TCP и UDP | Что это такое и в чем разница?", channel: "Merion Academy", lang: "ru" },
    { id: "PYHKOwBfsLI", title: "Сети для несетевиков // OSI/ISO, IP и MAC, NAT, TCP и UDP, DNS", channel: "Yuriy Semyenkov", lang: "ru" },
  ],
  "dns-http": [
    { id: "-edLY_aZSg4", title: "Как работает интернет? Клиент, сервер и HTTP объяснены с нуля. Перый запрос Flask. DevTools.", channel: "Препод объясняет (для детей и начинающих)", lang: "ru" },
    { id: "PpdQQjPS0MA", title: "HTTP за 36 минут. Методы, статус-коды, заголовки, редиректы, SSL", channel: "Флаг Софт", lang: "ru" },
    { id: "zMU6SpsxDZU", title: "Возможности CHROME DEVTOOLS за 10 минут", channel: "Listen IT", lang: "ru" },
  ],
  "html-css-js": [
    { id: "-neko7Bggco", title: "HTML & CSS за 1 ЧАС + проект", channel: "AlixHatsu", lang: "ru" },
    { id: "kqDIhCp5_hU", title: "Верстка сайта с нуля для начинающих HTML, CSS, JS | Часть 1", channel: "BrainsCloud", lang: "ru" },
  ],
  "python-networking": [
    { id: "bOZqmy9PAOk", title: "#1 | Python Socket | Как Работает Сеть?", channel: "Псевдо Программист", lang: "ru" },
    { id: "oJ2mtfF1_AY", title: "КЛИЕНТ-СЕРВЕРНОЕ ПРИЛОЖЕНИЕ НА PYTHON | ЧАСТЬ 1 | СВЯЗЬ КЛИЕНТА И СЕРВЕРА", channel: "DimPy", lang: "ru" },
    { id: "XwDlcW_WsmU", title: "PYTHON REQUESTS. ПЕРЕДАЧА COOKIE, SESSION, GET, POST ЗАПРОСЫ, ЗАГОЛОВКИ, API, JSON,СКАЧИВАНИЕ ФАЙЛОВ", channel: "PythonToday", lang: "ru" },
  ],
  "sql-basics": [
    { id: "IK6e1SFCdow", title: "Базы данных SQL уроки для начинающих. SELECT, JOINS, GROUP BY, INSERT, UPDATE, WHERE", channel: "Ulbi TV", lang: "ru" },
    { id: "XSuhd8ro4tI", title: "SQL для начинающих. SQL запрос SELECT WHERE: условие при выборке данных из базы данных SQLite", channel: "Кирилл Антонов", lang: "ru" },
  ],
  "project-site-checker": [
    { id: "3Tm34b7p_cM", title: "Python requests p.1 (status_code, headers, body, get, post)", channel: "python samurai", lang: "ru" },
    { id: "hyIKWEaclzk", title: "Работа с HTTP через Requests в Python", channel: "Китобойная", lang: "ru" },
  ],
  "cyber-intro": [
    { id: "ay19U3qi5Zw", title: "Информационная безопасность с нуля: большой гайд для начинающих", channel: "Юрта без дыр", lang: "ru" },
    { id: "BKolkif2yzk", title: "Базовая триада информационной безопасности", channel: "Инфобездна", lang: "ru" },
    { id: "YZbezI4p_vk", title: "#2 [Этичный хакинг с нуля] Кибербезопасность и закон. Что нужно знать этичному хакеру?", channel: "Школа этичного хакинга «Timcore»", lang: "ru" },
  ],
  "hashing-passwords": [
    { id: "VbB99SOR8OE", title: "Пароли, шифрование, хеширование и СОЛЬ", channel: "hasio", lang: "ru" },
    { id: "Bul0XYMa8Jg", title: "Что такое ХЭШ функция? | Хеширование | Хранение паролей", channel: "CryptoInside", lang: "ru" },
    { id: "8ZtInClXe1Q", title: "How NOT to Store Passwords! - Computerphile", channel: "Computerphile", lang: "en" },
  ],
  "cryptography": [
    { id: "e0BBMP1JmJg", title: "Симметричное шифрование Асимметричное шифрование Хэш", channel: "Дмитрий Гутовский", lang: "ru" },
    { id: "g2c6zhi2aH4", title: "Асимметричное шифрование простым языком", channel: "как бы школа", lang: "ru" },
    { id: "vooHjWxmcIE", title: "Алгоритм шифрования RSA", channel: "Научный канал", lang: "ru" },
  ],
  "encodings-cyberchef": [
    { id: "UtqmiI7k9lU", title: "Cryptography   Lab 5   Cooking with the Cyberchef", channel: "Level Effect", lang: "ru" },
    { id: "6S0v8lIk9oA", title: "A Beginner's Guide to CyberChef (ft. CTFGuide)", channel: "Almond Force", lang: "en" },
  ],
  "caesar-vigenere-python": [
    { id: "JIJWemSWAgM", title: "Шифр цезаря на python", channel: "Канал тортека", lang: "ru" },
    { id: "YICk6br-Lmg", title: "Пишем шифр Цезаря используя Python3 и обе руки", channel: "SolveMe", lang: "ru" },
    { id: "sEDQLI6DG0I", title: "Шифруем данные с помощью алгоритма Виженера", channel: "SolveMe", lang: "ru" },
  ],
  "ctf-picoctf-crypto": [
    { id: "jc6GqEJyj94", title: "How to sign up and get started with picoCTF", channel: "picoCTF, Carnegie Mellon University", lang: "en" },
    { id: "fMSKVW3Q2aQ", title: "Что такое CTF и зачем это нужно?", channel: "Константин Козловский", lang: "ru" },
    { id: "7Cb8pIB8Qv4", title: "Где тренируются хакеры? Полный гайд по тренажерам и CTF с нуля", channel: "Пакет Безопасности", lang: "ru" },
  ],
  "nmap": [
    { id: "qw0q7_SEBok", title: "КАК ПОЛЬЗОВАТЬСЯ NMAP | СКАНИРОВАНИЕ ПОРТОВ | Open Source", channel: "Катан  :}", lang: "ru" },
    { id: "Kfirh8cC-JI", title: "Как использовать Nmap. Подробная инструкция", channel: "Pulse", lang: "ru" },
  ],
  "wireshark": [
    { id: "S-tuIvOA0ac", title: "Как пользоваться Wireshark? Анализ трафика и расшифровка пакетов", channel: "IT-спец. Денис Курец", lang: "ru" },
    { id: "Kfnoy9TziNg", title: "Основы Wireshark. Настройка, захват и расшифровка трафика", channel: "Pulse", lang: "ru" },
  ],
  "firewall-vpn-tls": [
    { id: "cGr9LTYj1GE", title: "Как работает VPN? Объясняем на простом примере.", channel: "Обучение системных администраторов", lang: "ru" },
    { id: "OmlkEhRHRTA", title: "SSL и TLS - в чем разница?", channel: "Merion Academy", lang: "ru" },
    { id: "-enHfpHMBo4", title: "Man in the Middle Attacks & Superfish - Computerphile", channel: "Computerphile", lang: "en" },
  ],
  "python-port-scanner": [
    { id: "HkMJWFo-B-E", title: "Как легко написать сканер портов на python (питон) для этичного хакинга", channel: "Программируем", lang: "ru" },
    { id: "NAwvlkP8t20", title: "Как написать СКАНЕР портов на Python ?", channel: "Фсоки", lang: "ru" },
  ],
  "blue-team-logs": [
    { id: "-MX0nLTcJZo", title: "Detecting Brute Force Hackers with auth.log", channel: "NetSecProf", lang: "ru" },
    { id: "8sJCzoCGexE", title: "Cybersecurity SOC Analyst Lab - Brute Force (SSH)", channel: "MyDFIR", lang: "en" },
  ],
  "ctf-tryhackme": [
    { id: "9tcqamtWGXE", title: "TryHackMe | Pre Security | Ч.2", channel: "Golovastik", lang: "ru" },
    { id: "ROO2pDPgja4", title: "TryHackMe Getting Started Tutorial", channel: "DarkSec", lang: "en" },
  ],
  "owasp-top10": [
    { id: "4Ufdf3t3o3Y", title: "Весь OWASP Top 10 простыми словами", channel: "Reconholic", lang: "ru" },
    { id: "yZmKTqhfDMc", title: "OWASP TOP-10 | 2021 | Обзор классификации векторов атак и уязвимостей Web-приложений.", channel: "All about QA", lang: "ru" },
  ],
  "sql-injection": [
    { id: "pDvSNaQfuIc", title: "SQL-инъекции для начинающих: от теории к практике", channel: "CyberYozh", lang: "ru" },
    { id: "zjPAazlvWPI", title: "Кибербезопасность с нуля / Урок #2 – Что такое  SQL Injection и как их находить?", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "Nx_EDsqm884", title: "SQL ИНЪЕКЦИИ | КАК ЗАЩИТИТЬ САЙТ ОТ ВЗЛОМА | ПРАВИЛЬНАЯ РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ НА САЙТЕ", channel: "EduCatter — Канал о разработке и фрилансе", lang: "ru" },
  ],
  "xss-csrf": [
    { id: "AlRufzbkJoI", title: "Кибербезопасность с нуля / Урок #3 – XSS, CSRF и уязвимости во Front-end", channel: "Школа itProger / Программирование", lang: "ru" },
    { id: "ZFzn2AQPwRA", title: "ВСЁ Что нужно знать о БЕЗОПАСНОСТИ Фронтенд разработчику (XSS, CSRF)", channel: "Владилен Минин", lang: "ru" },
    { id: "4sFXSPFp26s", title: "Что такое XSS уязвимость. Тестируем безопасность", channel: "LearnQA: Онлайн обучение тестировщиков", lang: "ru" },
  ],
  "sessions-jwt-idor": [
    { id: "q0u4yRUSDzI", title: "Виды авторизации: сессии, JWT-токены. Для чего нужны сессии? Как работает JWT? (+ разбор ошибки)", channel: "David Dobryakov", lang: "ru" },
    { id: "IB9gsnlRt-4", title: "JWT авторизация. Основы JWT - механизма.", channel: "Хочу вАйти", lang: "ru" },
  ],
  "burp-suite": [
    { id: "b1j69Zw6TfY", title: "ПОЛНЫЙ гайд по Burp Suite для начинающих!", channel: "CyberYozh", lang: "ru" },
    { id: "PBwuawb_Oic", title: "Основы Burp Suite. Что это и как им пользоваться", channel: "Pulse", lang: "ru" },
  ],
  "ctf-portswigger": [
    { id: "r1ozZJ6LKVA", title: "Учусь взламывать Web | Поиск XSS уязвимостей в лабораторках PortSwigger", channel: "Александр Князев", lang: "ru" },
    { id: "wX6tszfgYp4", title: "What is SQL injection? - Web Security Academy", channel: "PortSwigger", lang: "en" },
  ],
  "social-engineering": [
    { id: "kZig2JDNpTU", title: "Как работает фишинг и как защититься", channel: "СЕРГЕЙ БЕЛОУСОВ - REALITY", lang: "ru" },
    { id: "-bW6Mhzwq_I", title: "Социальная инженерия. Управляешь ТЫ или ТОБОЙ? | Морфеус.", channel: "Морфеус", lang: "ru" },
  ],
  "malware": [
    { id: "AtgAENlJ2Ek", title: "Что такое вредоносное ПО?", channel: "Kaspersky Russia", lang: "ru" },
    { id: "x6BMM7W7a9o", title: "ВСЕ компьютерные ВИРУСЫ: объясняю за 7 минут", channel: "Vik Bil", lang: "ru" },
  ],
  "mini-ctf": [
    { id: "7Cb8pIB8Qv4", title: "Где тренируются хакеры? Полный гайд по тренажерам и CTF с нуля", channel: "Пакет Безопасности", lang: "ru" },
    { id: "eAAPF-x3ezk", title: "CTF-соревнования | Как выигрывать, создавать задания и строить карьеру?", channel: "The Codeby", lang: "ru" },
  ],
  "final-project-start": [
    { id: "REBaNjYr41E", title: "Python for Cybersecurity Beginners: 7 Skills + 3 Projects You Actually Need in 2026", channel: "ZeroDave Security", lang: "en" },
  ],
  "final-project-polish": [
    { id: "NXNf9aYTCZ0", title: "Как Оформить README-Файл На GitHub | Основы Markdown", channel: "PyLounge - программирование на Python и всё о Айти", lang: "ru" },
  ],
  "final-defense": [
    { id: "49CN9E-OuFU", title: "Как бы я изучал кибербезопасность с нуля в 2025 году (дорожная карта для начинающих)", channel: "IT-спец. Денис Курец", lang: "ru" },
    { id: "T9577b24VCQ", title: "Кибербезопасность с нуля за 6 месяцев: что я бы учил, если бы начинал заново", channel: "Пакет Безопасности", lang: "ru" },
    { id: "w2umqyqYW_I", title: "Как начать карьеру в кибербезопасности: с чего начать и что учить?", channel: "CyberYozh", lang: "ru" },
  ],
};
