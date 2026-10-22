// Fictional emails for the phishing widget. All brands/domains are made up (.example TLD).

export type El = { text: string; flag: boolean; note: string; href?: string };
export type Email = {
  id: string;
  fromName: string;
  fromAddr: string;
  date: string;
  phishing: boolean;
  els: Record<string, El>;
  // body paragraphs: plain strings or "@id" references into els
  paras: (string | `@${string}`)[][];
  lessons: string[];
  verdictNote: string;
};

export const EMAILS: Email[] = [
  {
    id: "bank",
    fromName: "Tojik Bank: Безопасность",
    fromAddr: "security@t0jikbank.example",
    date: "пн, 08:14",
    phishing: true,
    els: {
      sender: { text: "security@t0jikbank.example", flag: true, note: "Домен-двойник: в слове «t0jikbank» вместо буквы «o» стоит ноль. Настоящий домен банка — tojikbank.example." },
      subject: { text: "СРОЧНО: карта будет заблокирована через 24 часа", flag: true, note: "Давление срочностью и угроза блокировки — классический приём: человек не успевает подумать." },
      greeting: { text: "Уважаемый клиент!", flag: true, note: "Безличное обращение: банк знает твоё имя и обычно использует его." },
      urgent: { text: "Подтвердите данные карты в течение 24 часов", flag: true, note: "Банк никогда не просит вводить номер карты, CVV или код из СМС по ссылке из письма." },
      link: { text: "https://www.tojikbank.example/verify", flag: true, href: "https://t0jikbank-verify.example/login?id=88121", note: "Видимый текст ссылки выглядит правильно, но реальный адрес ведёт на чужой домен. Всегда сверяй href, а не подпись." },
      ref: { text: "Номер обращения: 88121", flag: false, note: "Номер обращения сам по себе безвреден: мошенники добавляют такие детали для правдоподобия, но это не признак подделки." },
    },
    paras: [
      ["Мы зафиксировали подозрительную операцию по вашей карте. ", "@urgent", ", иначе карта будет заблокирована."],
      ["Пройдите проверку: ", "@link"],
      ["@ref"],
    ],
    lessons: ["Домен-двойник (0 вместо o, лишние слова, другой TLD)", "Срочность и угрозы блокировки", "Безличное «Уважаемый клиент»", "Текст ссылки отличается от реального адреса"],
    verdictNote: "Это фишинг: поддельный домен, срочность и ссылка на чужой сайт.",
  },
  {
    id: "delivery",
    fromName: "Курьер Экспресс",
    fromAddr: "noreply@kuryer-express.example",
    date: "вт, 11:40",
    phishing: true,
    els: {
      sender: { text: "noreply@kuryer-express.example", flag: false, note: "Домен совпадает с названием службы: одного этого недостаточно, чтобы судить. Проверяй дальше: ссылку и просьбу об оплате." },
      subject: { text: "Посылка не доставлена: доплатите 12 сомони", flag: true, note: "Просьба о маленькой «доплате» усыпляет бдительность, но цель — получить данные карты." },
      greeting: { text: "Здравствуйте, Фарход!", flag: false, note: "Имя в обращении не доказывает подлинность: имена и почту легко утекают из баз. Но само по себе это не красный флаг." },
      urgent: { text: "Оплатите в течение 3 часов, иначе посылка будет возвращена", flag: true, note: "Жёсткий срок и угроза потери — приём давления." },
      link: { text: "kuryer-express.example/track/TJ5521", flag: true, href: "http://kuryer-express.example.parcel-fee.example/pay", note: "Реальный адрес заканчивается на parcel-fee.example: настоящий домен здесь именно он, а «kuryer-express.example» — лишь поддомен для маскировки. Читай адрес справа налево до первой косой черты." },
    },
    paras: [
      ["@greeting"],
      ["Ваша посылка ожидает на складе. Мы не смогли доставить её по адресу. ", "@urgent", "."],
      ["Отследить и оплатить: ", "@link"],
    ],
    lessons: ["Реальный адрес ссылки не совпадает с видимым текстом", "Доплата «за доставку» и срок в часах", "Домен читается справа налево: важна часть перед первым «/»"],
    verdictNote: "Это фишинг: ссылка ведёт на другой домен, а письмо требует срочной оплаты.",
  },
  {
    id: "ceo",
    fromName: "Рустам Алиев (директор)",
    fromAddr: "director.aliev.office@freemail.example",
    date: "ср, 16:52",
    phishing: true,
    els: {
      sender: { text: "director.aliev.office@freemail.example", flag: true, note: "Подмена имени отправителя (display name spoofing): имя директора красивое, а адрес — бесплатная почта, не корпоративный домен." },
      subject: { text: "Срочно, нужна помощь", flag: true, note: "Короткая тема без деталей и со срочностью: цель — вызвать эмоциональную реакцию." },
      greeting: { text: "Привет, ты на месте?", flag: false, note: "Неформальное приветствие само по себе нормально. Подозрительна просьба дальше, а не тон." },
      urgent: { text: "Я на совещании, звонить нельзя, никому не говори", flag: true, note: "Изоляция жертвы: запрет позвонить и проверить. Это ключевой признак CEO-мошенничества (BEC)." },
      ask: { text: "Купи 5 подарочных карт по 100 сомони и пришли мне коды с обратной стороны", flag: true, note: "Подарочные карты нельзя отозвать, поэтому их просят мошенники. Реальный руководитель не просит такое в личной почте." },
      sig: { text: "Отправлено с iPhone", flag: false, note: "Автоматическая подпись мобильного клиента ничего не доказывает: её легко написать самому." },
    },
    paras: [
      ["@greeting"],
      ["@urgent", ". ", "@ask", "."],
      ["Верну сегодня вечером."],
      ["@sig"],
    ],
    lessons: ["Имя в «От кого» можно написать что угодно, смотри на адрес", "Запрет проверить просьбу по другому каналу", "Просьба о подарочных картах или срочном переводе"],
    verdictNote: "Это фишинг: подмена отправителя и просьба о подарочных картах.",
  },
  {
    id: "it",
    fromName: "IT Поддержка",
    fromAddr: "it-support@corp-helpdesk.example",
    date: "чт, 09:03",
    phishing: true,
    els: {
      sender: { text: "it-support@corp-helpdesk.example", flag: true, note: "Твоя компания пишет с корпоративного домена (например corp.example). Внешний «helpdesk» — чужой." },
      subject: { text: "Пароль истекает через 2 часа", flag: true, note: "Срок в часах и угроза потерять доступ — давление." },
      greeting: { text: "Уважаемый пользователь,", flag: true, note: "Безличное обращение: настоящая IT-служба знает, кому пишет." },
      urgent: { text: "Откройте вложенную форму и введите текущий пароль", flag: true, note: "IT-служба не просит пароль: у неё есть доступ без него." },
      attach: { text: "password_reset_form.html.zip", flag: true, note: "Архив с .html внутри: открытая страница может быть поддельной формой входа, а архив скрывает содержимое от антивируса. Двойное расширение — тоже плохой знак." },
    },
    paras: [
      ["@greeting"],
      ["Срок действия вашего пароля заканчивается. ", "@urgent", " для продления."],
    ],
    lessons: ["Внешний домен вместо корпоративного", "IT и банки не просят пароль", "Вложения .html, .zip, двойные расширения"],
    verdictNote: "Это фишинг: чужой домен, просьба о пароле и опасное вложение.",
  },
  {
    id: "legit",
    fromName: "Tojik Bank",
    fromAddr: "no-reply@tojikbank.example",
    date: "пт, 07:30",
    phishing: false,
    els: {
      sender: { text: "no-reply@tojikbank.example", flag: false, note: "Домен написан точно, без подмен: совпадает с адресом сайта банка." },
      subject: { text: "Выписка за сентябрь готова", flag: false, note: "Спокойная тема без срочности и угроз." },
      greeting: { text: "Здравствуйте, Фарход!", flag: false, note: "Обращение по имени: нормально для письма от банка." },
      urgent: { text: "Выписка доступна в приложении и личном кабинете", flag: false, note: "Здесь нет давления и просьбы ввести данные, только информация." },
      link: { text: "tojikbank.example/cabinet", flag: false, href: "https://tojikbank.example/cabinet", note: "Видимый текст совпадает с реальным адресом, домен верный, соединение https." },
    },
    paras: [
      ["@greeting"],
      ["@urgent", ". Мы никогда не просим пароль, PIN или код из СМС."],
      ["Открыть кабинет: ", "@link"],
    ],
    lessons: ["Не всё письмо от банка — фишинг: проверяй признаки, а не паникуй"],
    verdictNote: "Безопасно: домен верный, ссылка совпадает, нет давления и просьб о данных. Параноя без проверки — тоже ошибка.",
  },
];

export type Taps = Record<string, "hit" | "wrong">;

export function emailScore(e: Email, taps: Taps, verdict: "phish" | "safe" | undefined) {
  const flags = Object.values(e.els).filter((x) => x.flag).length;
  const found = Object.keys(e.els).filter((k) => e.els[k].flag && taps[k] === "hit").length;
  const wrong = Object.values(taps).filter((v) => v === "wrong").length;
  const base = flags ? found / flags : 1;
  const flagPart = Math.max(0, base - 0.1 * wrong);
  const verdictOk = verdict !== undefined && (verdict === "phish") === e.phishing;
  return { score: 0.5 * (verdictOk ? 1 : 0) + 0.5 * flagPart, verdictOk, found, flags };
}
