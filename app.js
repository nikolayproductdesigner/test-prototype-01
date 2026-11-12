/* Концепт «Дела»: данные сценариев, отрисовка и переключение версий */
(function () {
  var S = ' '; // неразрывный пробел

  /* ---------- Иконки статусов (линейные, 20×20, обводка 2px — как в Figma) ---------- */
  var ICONS = {
    rejected: '<circle cx="10" cy="10" r="7.5"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5"/>',
    rework: '<path d="M7.5 11.667 4.167 8.333 7.5 5"/><path d="M4.167 8.333h7.5a4.167 4.167 0 0 1 0 8.334h-2.5"/>',
    sign: '<path d="M3.333 16.667h3.334l9.166-9.167-3.333-3.333-9.167 9.166z"/><path d="M10 7l3 3"/>',
    pay: '<path d="M5.833 2.5h6.667l3.333 3.333V17.5h-10z"/><path d="M12.5 2.5v3.333h3.333"/><path d="M8.75 10.417h3.333M8.75 13.75h3.333"/>',
    send: '<path d="M3.333 10h12.5"/><path d="M10.833 5l5 5-5 5"/>',
    draft: '<path d="M5.833 2.5h6.667l3.333 3.333V17.5h-10z"/>',
    bank: '<circle cx="10" cy="10" r="7.5"/><path d="M10 5.833V10l2.5 1.667"/>',
    ok: '<path d="M4.167 10.417l3.75 3.75 7.916-7.917"/>',
    go: '<path d="M3.333 10h12.5"/><path d="M10.833 5l5 5-5 5"/>',
    close: '<path d="M5 5l10 10M15 5 5 15"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 20 20" aria-hidden="true">' + ICONS[name] + '</svg>'; }
  function ico(name, tone) { return '<span class="ico' + (tone ? ' ico--' + tone : '') + '">' + svg(name) + '</span>'; }

  /* ---------- Статусы ----------
     Порядок взят из блока «Дела в работе» на макете задания: чем выше статус, тем он важнее.
     Первые три — «Требуют внимания», остальные четыре — «Остальные дела».
     Цвет счётчика: красный только у «Доработать» и «Отклонённых» — это те же документы,
     что вынесены во вкладку «Срочно» у баланса, поэтому сумма красных равна её счётчику.
     Остальные счётчики серые. Ноль остаётся на месте приглушённым. */
  var URGENT_STATUS = { rework: true, rejected: true };
  var ATTENTION = [
    { key: 'pay', title: 'Оплатить' },
    { key: 'sign', title: 'Подписать' },
    { key: 'send', title: 'Отправить' }
  ];
  var OTHER = [
    { key: 'rework', title: 'Доработать' },
    { key: 'rejected', title: 'Отклонённые' },
    { key: 'draft', title: 'Черновики' },
    { key: 'bank', title: 'В работе у банка' }
  ];

  // Задания онбординга в порядке прохождения
  var TASKS = [
    { img: 'task-2.png', title: 'Пополнить счёт', pts: 500, time: '1 мин', desc: 'Переведите любую сумму с другого счёта' },
    { img: 'task-3.png', title: 'Изучить условия тарифа', pts: 500, time: '1 мин', desc: 'Что входит в обслуживание и сколько стоят платежи' },
    { img: 'task-1.png', title: 'Защитить бизнес от блокировок', pts: 500, time: '1 мин', desc: 'Как работать, чтобы банк не ограничил операции' },
    { img: 'task-4.png', title: 'Переводить без комиссии с подпиской', pts: 500, time: '1 мин', desc: 'Пакет переводов юрлицам и ИП без комиссии' },
    { img: 'task-5.png', title: 'Подключить налоговую копилку', pts: 500, time: '3 мин', desc: 'Откладывайте на налоги с каждого поступления' },
    { img: 'banner-product.png', title: 'Выбрать категории кешбэка', pts: 500, time: '2 мин', desc: 'Возвращайте баллами часть трат по карте' },
    { img: 'task-cap.png', title: 'Выпустить бизнес-карту', pts: 500, time: '3 мин', desc: 'Оплачивайте расходы компании прямо со счёта' }
  ];

  /* Два состояния клиента.
     Новый: только зарегистрировался, дел и списаний ещё нет — показываем один онбординг.
     Опытный: дела во всех статусах, часть заданий ещё не выполнена. */
  var SCENARIOS = {
    novice: { deals: {}, debits: null, done: 0, balance: { amount: '0,00 RUB', accounts: '1 счёт в рублях', cards: 'Выпустить карту' } },
    // «В работе»: дела есть, два документа вернули на доработку — они же в «Срочно» у баланса
    expert: {
      // sub — один пример; «и ещё N» дописывается, если документов больше одного
      deals: {
        pay: { n: 3, sub: 'Счёт от ООО «Юнион Плей»' },
        sign: { n: 12, sub: 'Зарплата за апрель' },
        send: { n: 5, sub: 'Платёж ПАО «Ростелеком»' },
        rework: { n: 2, sub: 'Валютный контроль · контракт №18' },
        rejected: { n: 0 },
        draft: { n: 4, sub: 'ООО «Курьер Сервис» · доставка' },
        bank: { n: 9, sub: 'Аренда офиса за май' }
      },
      urgent: [
        { kind: 'rework', title: 'Контракт №18', why: 'валютный контроль' },
        { kind: 'rework', title: 'Справка о валютных операциях', why: 'не хватает документа' }
      ],
      debits: { rows: [] },
      done: 2
    }
  };
  var D = [
    { date: '28 апр', name: 'Налоги', sum: '1 284 000 ₽' },
    { date: '30 апр', name: 'Зарплата', sum: '4 620 000 ₽' },
    { date: '30 апр', name: 'Кредит', sum: '950 000 ₽' },
    { date: '5 мая', name: 'Аренда', sum: '610 000 ₽' }
  ];
  SCENARIOS.expert.debits.rows = D;
  /* Блок у баланса с двумя вкладками. urgent — конкретные дела из «Отклонённых» и «Доработать»:
     их меньше всего, но каждое остановило платёж. Три случая: пусто («Нет дел и заданий»),
     обычный («Прошёл онбординг») и переполнение («Много дел»). */
  SCENARIOS.many = {
    deals: {
      pay: { n: 128, sub: 'Счёт от ООО «Северо-Западная логистическая компания»' },
      sign: { n: 18, sub: 'Зарплата за апрель' },
      send: { n: 56, sub: 'Платёж ПАО «Ростелеком»' },
      rework: { n: 8, sub: 'Валютный контроль · контракт №18' },
      rejected: { n: 4, sub: 'Платёж ООО «Абсолют»' },
      draft: { n: 43, sub: 'ООО «Курьер Сервис» · доставка' },
      bank: { n: 1204, sub: 'Аренда офиса за май' }
    },
    urgent: [
      // порядок по времени: свежие сверху, отклонённые и возвращённые вперемешку
      { kind: 'rejected', title: 'Платёж ООО «Абсолют»', why: 'неверный КПП' },
      { kind: 'rework', title: 'Контракт №18', why: 'валютный контроль' },
      { kind: 'rejected', title: 'Платёж ООО «Северо-Западная логистическая компания»', why: 'превышен лимит' },
      { kind: 'rework', title: 'Справка о валютных операциях', why: 'не хватает документа' },
      { kind: 'rejected', title: 'Платёж ИП Соколов А. В.', why: 'счёт получателя закрыт' },
      { kind: 'rejected', title: 'Реестр зарплаты №14', why: 'ошибка в трёх строках' },
      { kind: 'rework', title: 'Контракт №22', why: 'валютный контроль' },
      { kind: 'rework', title: 'Платёж ООО «Вектор»', why: 'уточните назначение' },
      { kind: 'rework', title: 'Контракт №25', why: 'валютный контроль' },
      { kind: 'rework', title: 'Письмо в банк', why: 'нужна подпись директора' },
      { kind: 'rework', title: 'Платёж ООО «Гранит»', why: 'уточните ИНН' },
      { kind: 'rework', title: 'Контракт №31', why: 'валютный контроль' }
    ],
    debits: { rows: D.concat([
      { date: '6 мая', name: 'Лизинг оборудования', sum: '320 000 ₽' },
      { date: '10 мая', name: 'Страховые взносы', sum: '1 410 000 ₽' },
      { date: '15 мая', name: 'Аванс сотрудникам', sum: '2 300 000 ₽' }
    ]) },
    done: 2
  };

  // view и task — открыта ли шторка с заданиями (list) и какое задание клиент выбрал в ней
  // Все задания выполнены; в блоке у баланса обычный случай: три срочных дела и четыре списания
  SCENARIOS.done = {
    deals: {
      pay: { n: 3, sub: 'Счёт от ООО «Юнион Плей»' },
      sign: { n: 12, sub: 'Зарплата за апрель' },
      send: { n: 5, sub: 'Платёж ПАО «Ростелеком»' },
      rework: { n: 2, sub: 'Валютный контроль · контракт №18' },
      rejected: { n: 1, sub: 'Платёж ООО «Абсолют»' },
      draft: { n: 4, sub: 'ООО «Курьер Сервис» · доставка' },
      bank: { n: 9, sub: 'Аренда офиса за май' }
    },
    urgent: [
      { kind: 'rejected', title: 'Платёж ООО «Абсолют»', why: 'неверный КПП' },
      { kind: 'rework', title: 'Контракт №18', why: 'валютный контроль' },
      { kind: 'rework', title: 'Справка о валютных операциях', why: 'не хватает документа' }
    ],
    debits: { rows: D },
    done: TASKS.length
  };

  // Затишье: задания пройдены, все документы разобраны. Раскладка та же, счётчики по нулям,
  // обе вкладки блока у баланса пустые. known — клиент не новый, карусель заданий ему не нужна.
  // spent — баллы уже потрачены, карточки с итогом нет: третья колонка свободна
  SCENARIOS.idle = { known: true, spent: true, deals: {}, urgent: [], debits: { rows: [] }, done: TASKS.length };

  // auto — какое по счёту из оставшихся заданий сейчас показывает карточка шага (меняется раз в 10 секунд)
  // tab — вкладка блока у баланса (urgent | debits); null — выбирается сама: срочное, если оно есть
  var state = { v: 'new', s: 'expert', hidden: false, view: 'card', task: null, auto: 0, tab: null };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function nb(s) { return esc(s).replace(/ /g, S); }
  function money(s) { return state.hidden ? '•••' + S + '₽' : nb(s); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, S); }
  function points(n) { return '<span class="points">' + fmt(n) + '<img src="assets/bonuses.svg" width="20" height="20" alt="баллов"></span>'; }
  function chev() { return '<img class="chev" src="assets/chevron-right-center.svg" width="20" height="20" alt="">'; }
  // счётчик не растёт бесконечно: больше 999 показываем как «999+»
  function count(n, accent) { return '<span class="indicator' + (accent ? ' indicator--accent' : '') + '">' + (n > 999 ? '999+' : n) + '</span>'; }
  function get(d, key) { return d.deals[key] || { n: 0 }; }
  function total(d, list) { return list.reduce(function (a, st) { return a + get(d, st.key).n; }, 0); }

  /* ---------- Блок «Дела»: списки статусов ----------
     Подзаголовков у колонок нет: что важнее, показывают порядок и вес — слева широкий
     список с описанием, справа узкий без него.
     Сумм нет: по статусу непонятно, что именно они складывают. Показываем счётчик и
     один пример документа, остальные — «и ещё N». */
  // длинный пример обрезается многоточием, хвост «и ещё N» всегда виден целиком
  function sub(x) { return '<span class="st__ex">' + esc(x.sub) + '</span>' + (x.n > 1 ? '<span class="st__more">' + S + 'и' + S + 'ещё' + S + fmt(x.n - 1) + '</span>' : ''); }
  // Иконка у всех статусов одна: серая подложка, тёмная линия. Цветом говорит только счётчик
  function stRow(st, d, withSub) {
    var x = get(d, st.key), cls = 'st-row' + (withSub ? ' st-row--wide' : '');
    // пустой статус остаётся на месте приглушённым: ноль тоже ответ
    if (!x.n) return '<div class="' + cls + ' st-row--zero">' + ico(st.key) + '<span class="st__title">' + st.title + count(0) + '</span></div>';
    return '<a href="#" class="' + cls + '">' + ico(st.key) +
      '<span class="st-row__text"><span class="st__title">' + st.title + count(x.n, URGENT_STATUS[st.key]) + '</span>' +
      (withSub ? '<span class="st__sub">' + sub(x) + '</span>' : '') + '</span>' + (withSub ? chev() : '') + '</a>';
  }
  function stList(list, d, withSub, label) {
    return '<div class="d-card st-list' + (withSub ? ' st-list--wide' : '') + '" role="group" aria-label="' + label + '">' +
      list.map(function (st) { return stRow(st, d, withSub); }).join('') + '</div>';
  }

  function bar(cls, done) { return '<span class="' + cls + '"><span style="width:' + Math.max(done / TASKS.length * 100, 4) + '%"></span></span>'; }
  function earned(done) { var s = 0; for (var i = 0; i < done; i++) s += TASKS[i].pts; return s; }

  /* ---------- Онбординг опытного клиента: карточка шага в третьей колонке ---------- */
  function taskMeta(t) { return '<span class="t-row__meta">' + points(t.pts) + '<span>' + esc(t.time) + '</span></span>'; }

  // Какое задание показывает карточка шага: выбранное клиентом или просто следующее
  function curTask(done) {
    if (state.task != null && state.task >= done) return state.task;
    return done + state.auto % (TASKS.length - done);
  }
  function tasksWord(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'задание' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'задания' : 'заданий'; }
  // Выполненные задания не показываем: клиенту важно, сколько осталось
  function restTitle(done) { var n = TASKS.length - done; return 'Осталось ' + n + S + tasksWord(n); }

  /* Карточка задания: сверху задание с картинкой, снизу прогресс и кнопка.
     body — { label, title, img, meta, button, all } */
  function stepHead(b) {
    return '<span class="step__row"><span class="step__text"><span class="step__label">' + b.label + '</span>' +
      '<span class="step__title">' + esc(b.title) + '</span></span>' +
      '<img class="step__pic" src="assets/' + b.img + '" alt=""></span>' + b.meta;
  }
  function stepShell(done, b) {
    return '<div class="d-card step"><span class="step__head">' + stepHead(b) + '</span>' +
      '<span class="step__bottom"><span class="step__track"><span class="step__count">' + done + '/' + TASKS.length + ' выполнено</span>' + bar('step__bar', done) + '</span>' +
      '<span class="step__foot"><span class="btn btn--dark">' + b.button + '</span>' +
      (b.all ? '<button type="button" class="step__all" data-onb="list">Все задания</button>' : '') + '</span></span></div>';
  }
  function taskBody(t) { return { label: 'Задание', title: t.title, img: t.img, meta: taskMeta(t), button: 'Начать', all: true }; }
  function stepCard(done) { return stepShell(done, taskBody(TASKS[curTask(done)])); }
  /* Все задания выполнены: праздничная карточка по центру, ведёт тратить баллы. Баллы банк
     начисляет сам, «забирать» их не нужно, поэтому кнопка про следующий шаг — потратить.
     Анимация при появлении: большая монета вскакивает, от неё расходятся кольца, мелкие
     монеты вылетают дугой и с отскоком падают в углы карточки, число баллов набегает от нуля.
     Как только монеты легли, они медленно исчезают.
     Клик по большой монете повторяет анимацию. */
  function finCoins() {
    // x, y — где монета ляжет (от центра большой монеты), размер, поворот, задержка, высота дуги
    // разбросаны неровно: разный размер и поворот, часть наезжает друг на друга и на край карточки
    var coins = [
      [-140, 170, 22, -32, 0, -46], [-118, 176, 18, 48, .07, -62], [-99, 168, 24, -10, .16, -34],
      [-128, 150, 16, 70, .22, -70], [-84, 177, 16, -58, .12, -52],
      [136, 174, 20, 26, .04, -54], [112, 169, 24, -40, .11, -40], [93, 177, 16, 64, .2, -66],
      [124, 148, 18, -74, .26, -48], [143, 152, 14, 12, .15, -60],
      [-62, 236, 18, 40, .09, -74], [70, 240, 18, -44, .14, -58]
    ];
    return '<span class="fin__ring" style="--d:0s"></span><span class="fin__ring" style="--d:.22s"></span>' + coins.map(function (k) {
      return '<img class="fin__coin" src="assets/bonuses.svg" alt="" style="--x:' + k[0] + 'px;--y:' + k[1] + 'px;--s:' + k[2] + 'px;--r:' + k[3] + 'deg;--d:' + (0.12 + k[4]).toFixed(2) + 's;--up:' + k[5] + 'px">';
    }).join('');
  }
  function stepDone() {
    var n = TASKS.length;
    return '<div class="d-card fin"><span class="fin__fx" aria-hidden="true">' + finCoins() + '</span>' +
      '<img class="fin__pic" src="assets/points-done.png" width="72" height="72" alt="" data-replay title="Повторить анимацию">' +
      '<span class="fin__text"><span class="step__label">Все задания выполнены</span>' +
      '<span class="fin__title"><span>Получено <span class="fin__num" data-to="' + earned(n) + '">' + earned(n) + '</span></span>' +
      '<img src="assets/bonuses.svg" width="20" height="20" alt="баллов"></span>' +
      '<span class="fin__meta">Можно обменять на рубли</span></span>' +
      '<span class="btn btn--dark fin__btn">Потратить баллы</span></div>';
  }
  // Число баллов набегает от нуля и в конце «щёлкает». В этой карточке оно пишется слитно: 3500
  var finTimer;
  function finCountUp() {
    clearTimeout(finTimer);
    var el = document.querySelector('.fin__num');
    if (!el || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var to = +el.dataset.to, steps = 36, i = 0;
    el.style.minWidth = el.getBoundingClientRect().width + 'px'; // место под итоговое число
    el.textContent = '0';
    (function tick() {
      if (!el.isConnected) return;
      i++;
      var e = 1 - Math.pow(1 - i / steps, 3);
      el.textContent = String(i < steps ? Math.round(to * e / 50) * 50 : to);
      if (i < steps) finTimer = setTimeout(tick, 30);
      else el.classList.add('is-landed');
    })();
  }

  /* «Все задания» открывают шторку справа. Она одна для обоих экранов: у нового клиента её
     открывает первая карточка карусели, у клиента с делами — ссылка в карточке задания.
     Сверху прогресс и баллы, ниже только оставшиеся задания с описанием: выполненные не показываем.
     Клик по заданию закрывает шторку и ставит это задание в карточку. */
  function sheetHtml(done) {
    var n = TASKS.length, coin = '<img src="assets/bonuses.svg" width="16" height="16" alt="баллов">';
    var rest = TASKS.slice(done).map(function (t, k) {
      return '<a href="#" class="r-row" data-task="' + (done + k) + '">' +
        '<span class="t-row__pic"><img src="assets/' + t.img + '" alt=""></span>' +
        '<span class="r-row__text"><span class="r-row__title">' + esc(t.title) + '</span>' +
        '<span class="r-row__desc">' + esc(t.desc) + '</span>' + taskMeta(t) + '</span>' + chev() + '</a>';
    }).join('');
    return '<div class="sheet__head"><h2 class="sheet__title">Задания</h2>' +
      '<button type="button" class="sheet__close" data-onb="card" aria-label="Закрыть">' + svg('close') + '</button></div>' +
      '<div class="sheet__summary"><div class="sheet__stat"><span>' + done + '/' + n + ' выполнено</span>' +
      '<span class="sheet__points"><b>' + fmt(earned(done)) + '</b> из ' + fmt(earned(n)) + coin + '</span></div>' + bar('step__bar', done) + '</div>' +
      '<div class="sheet__scroll">' + (rest ? '<p class="sheet__label">' + restTitle(done) + '</p>' + rest : '') + '</div>';
  }
  function stepZone(done) { return done >= TASKS.length ? stepDone() : stepCard(done); }

  /* Карточка «Все задания» в карусели нового клиента: размер и картинка исходные, изменён
     только текст. Заголовок обещает награду за все задания, ниже — сколько заданий и прогресс. */
  function renderAllCard(done) {
    var n = TASKS.length;
    var t = {
      title: 'Получите ' + fmt(earned(n)) + '<img src="assets/bonuses.svg" width="16" height="16" alt="баллов">',
      reward: 'за ' + n + S + tasksWord(n),
      progress: done + '/' + n + ' выполнено'
    };
    ['title', 'reward', 'progress'].forEach(function (slot) {
      var el = document.querySelector('.task--all [data-slot="' + slot + '"]');
      if (el) el.innerHTML = t[slot];
    });
  }

  function blockEmpty(title, text) {
    return '<div class="blk-empty"><span class="blk-empty__title">' + title + '</span><span class="blk-empty__text">' + text + '</span></div>';
  }
  function debitRows(rows) {
    return '<ul class="debits__list">' + rows.map(function (r) {
      return '<li class="debits__row"><span class="debits__date">' + nb(r.date) + '</span>' +
        '<span class="debits__name">' + esc(r.name) + '</span><span class="debits__sum">' + money(r.sum) + '</span></li>';
    }).join('') + '</ul>';
  }
  // в блок помещается четыре строки; если их больше, показываем четыре и ссылку «Ещё N»
  var BLOCK_ROWS = 4;
  // «Ещё N» открывает шторку с полным списком (view — какую именно)
  function moreRow(rest, view) { return rest > 0 ? '<a href="#" class="blk-more" data-onb="' + view + '">Ещё ' + fmt(rest) + '</a>' : ''; }
  function urgentRows(list) {
    if (!list.length) return blockEmpty('Срочного пока нет', 'Здесь появится то, что нельзя откладывать');
    var KIND = { rejected: ['red', 'Отклонён'], rework: ['yellow', 'Доработать'] };
    return '<div class="u-list">' + list.slice(0, BLOCK_ROWS).map(function (u) {
      return '<a href="#" class="u-row"><i class="u-dot u-dot--' + KIND[u.kind][0] + '"></i>' +
        '<span class="u-row__text"><span class="u-row__title">' + esc(u.title) + '</span>' +
        '<span class="u-row__sub">' + KIND[u.kind][1] + ' · ' + esc(u.why) + '</span></span></a>';
    }).join('') + '</div>' + moreRow(list.length - BLOCK_ROWS, 'urgent');
  }
  /* Та же шторка, что у заданий, но со списком: все срочные дела или все списания.
     Срочные сгруппированы по причине, внутри группы — по времени. */
  function sheetShell(title, body) {
    return '<div class="sheet__head"><h2 class="sheet__title">' + title + '</h2>' +
      '<button type="button" class="sheet__close" data-onb="card" aria-label="Закрыть">' + svg('close') + '</button></div>' +
      '<div class="sheet__scroll">' + body + '</div>';
  }
  function urgentSheet(d) {
    var GROUPS = [['rejected', 'red', 'Отклонённые'], ['rework', 'yellow', 'Доработать']];
    return sheetShell('Срочные дела', GROUPS.map(function (g) {
      var items = d.urgent.filter(function (u) { return u.kind === g[0]; });
      if (!items.length) return '';
      return '<p class="sheet__label">' + g[2] + ' · ' + items.length + '</p>' + items.map(function (u) {
        return '<a href="#" class="r-row r-row--dot"><i class="u-dot u-dot--' + g[1] + '"></i>' +
          '<span class="r-row__text"><span class="r-row__title">' + esc(u.title) + '</span>' +
          '<span class="r-row__desc">' + esc(u.why.charAt(0).toUpperCase() + u.why.slice(1)) + '</span></span>' + chev() + '</a>';
      }).join('');
    }).join(''));
  }
  function debitsSheet(d) {
    return sheetShell('Ближайшие списания', '<div class="sheet__debits">' + debitRows(d.debits.rows) + '</div>');
  }
  function sheetFor(d) {
    if (state.view === 'urgent' && d.urgent) return urgentSheet(d);
    if (state.view === 'debits' && d.debits) return debitsSheet(d);
    if (state.view === 'list' && d.done < TASKS.length) return sheetHtml(d.done);
    return '';
  }

  function debitsHtml(d) {
    if (!d.debits) return ''; // у нового клиента блока нет
    // вид с вкладками: «Срочное» открыто само, если срочное есть
    // первой открыта «Срочное»; если срочного нет, а списания есть — сразу «Списания»
    var tab = state.tab || (d.urgent.length || !d.debits.rows.length ? 'urgent' : 'debits');
    function seg(key, label, n) {
      return '<button type="button" class="seg__btn' + (tab === key ? ' is-on' : '') + '" data-tab="' + key + '">' + label + (n ? count(n) : '') + '</button>';
    }
    return '<div class="seg">' + seg('urgent', 'Срочно', d.urgent.length) + seg('debits', 'Списания') + '</div>' +
      (tab === 'urgent' ? urgentRows(d.urgent)
        : !d.debits.rows.length ? blockEmpty('Списаний пока нет', 'Появятся, когда запланируете платежи')
        : debitRows(d.debits.rows.slice(0, BLOCK_ROWS)) + moreRow(d.debits.rows.length - BLOCK_ROWS, 'debits'));
  }

  function hasDeals(d) { return !!d.known || total(d, ATTENTION) + total(d, OTHER) > 0; }
  function col(kind, html) { return '<div class="col' + (kind ? ' col--' + kind : '') + '">' + html + '</div>'; }

  /* Раскладка зависит только от данных клиента. Сетка та же, что у первой строки
     страницы (612 / 294 / 294): важные дела под балансом, остальные под списаниями,
     задания под баннерами.
     1. Дел ещё не было -> блока дел нет, на его месте исходная карусель заданий (вёрстка в index.html).
     2. Дела есть -> три колонки: важные дела, остальные дела, карточка шага онбординга. */
  function dealsHtml(d) {
    if (!hasDeals(d)) return '';
    var att = col('', stList(ATTENTION, d, true, 'Требуют внимания'));
    // карточки заданий нет — остальные дела занимают и её колонку
    return att + col(d.spent ? 'main' : '', stList(OTHER, d, false, 'Остальные дела')) + (d.spent ? '' : col('', stepZone(d.done)));
  }

  // Баланс и лента — статичная вёрстка. У нового клиента подставляем его значения,
  // суммы прячем той же кнопкой с глазом
  function text(el, value) {
    if (el.dataset.orig === undefined) el.dataset.orig = el.textContent;
    el.textContent = value === undefined ? el.dataset.orig : value;
  }
  function staticTexts(d) {
    var b = state.v === 'new' && d.balance || {};
    var subs = document.querySelectorAll('.balance__product-sub');
    text(subs[0], b.accounts);
    text(subs[1], b.cards);
    Array.prototype.forEach.call(document.querySelectorAll('.balance__amount, .balance__offer-sum, .ops-amount'), function (el) {
      text(el, el.classList.contains('balance__amount') ? b.amount : undefined);
      if (state.hidden) el.textContent = '•••' + S + (/RUB/.test(el.dataset.orig) ? 'RUB' : '₽');
    });
  }

  try {
    var saved = JSON.parse(localStorage.getItem('proto-state') || 'null');
    if (saved && SCENARIOS[saved.s]) { state.s = saved.s; state.hidden = !!saved.hidden; }
  } catch (e) {}
  // Ссылка на конкретное состояние: ?s=novice|expert|done|idle|many&view=list&rot=секунды&sums=hidden
  try {
    var q = new URLSearchParams(location.search);
    if (SCENARIOS[q.get('s')]) state.s = q.get('s');
    if (/^(list|urgent|debits)$/.test(q.get('view') || '')) state.view = q.get('view');
    if (q.get('tab') === 'urgent' || q.get('tab') === 'debits') state.tab = q.get('tab');
    if (q.get('sums')) state.hidden = q.get('sums') === 'hidden';
  } catch (e) {}

  function render() {
    var d = SCENARIOS[state.s];
    document.body.classList.toggle('v-new', state.v === 'new');
    document.body.classList.toggle('v-old', state.v === 'old');
    document.body.classList.toggle('sums-hidden', state.hidden);
    // Новому клиенту не показываем ни дела, ни списания: баланс занимает место списаний
    document.body.classList.toggle('is-newcomer', !hasDeals(d));

    document.getElementById('deals').innerHTML = '<div class="deals__grid">' + dealsHtml(d) + '</div>';
    document.getElementById('debits').innerHTML = debitsHtml(d);
    staticTexts(d);
    finCountUp();
    renderAllCard(d.done);
    var sheet = sheetFor(d);
    // пока шторка закрывается, её содержимое не стираем — иначе она уедет пустой
    if (sheet) document.getElementById('sheet-panel').innerHTML = sheet;
    document.body.classList.toggle('sheet-open', !!sheet);


    Array.prototype.forEach.call(document.querySelectorAll('.proto-switch button'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.s === state.s ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tablo__eye'), function (b, i) {
      b.setAttribute('aria-pressed', (i === 1) === state.hidden ? 'true' : 'false');
    });
    try { localStorage.setItem('proto-state', JSON.stringify(state)); } catch (e) {}
  }

  // Мягкое появление только при смене версии или сценария, не при ресайзе
  var switching;
  function set(patch, cls) {
    for (var k in patch) state[k] = patch[k];
    cls = cls || 'is-switching';
    document.body.classList.add(cls);
    clearTimeout(switching);
    switching = setTimeout(function () { document.body.classList.remove('is-switching', 'is-flipping', 'is-sheet', 'is-tab'); }, 260);
    render();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.proto-switch button');
    if (b) { set({ s: b.dataset.s, view: 'card', task: null, auto: 0, tab: null }); return; }
    // вкладки блока у баланса
    var tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { set({ tab: tabBtn.dataset.tab }, 'is-tab'); return; }
    // клик по большой монете повторяет праздничную анимацию
    if (e.target.closest('[data-replay]')) { render(); return; }
    // шторка с заданиями: открыть, закрыть (крестик или затемнение), выбрать задание
    var flip = e.target.closest('[data-onb]');
    if (flip) { e.preventDefault(); set({ view: flip.dataset.onb }, 'is-sheet'); return; }
    var task = e.target.closest('[data-task]');
    if (task) { e.preventDefault(); set({ task: +task.dataset.task, view: 'card' }, 'is-flipping'); return; }
    var eye = e.target.closest('.tablo__eye');
    if (eye) { set({ hidden: /Скрыть/.test(eye.getAttribute('aria-label')) }); return; }
    var a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  // Горячие клавиши: по физической клавише, работают в любой раскладке
  var KEYS = {
    KeyQ: { s: 'novice', view: 'card', task: null }, KeyW: { s: 'expert', view: 'card', task: null, auto: 0 },
    KeyE: { s: 'done', view: 'card', task: null, tab: null },
    KeyR: { s: 'idle', view: 'card', task: null, tab: null },
    // блок у баланса с вкладками при большом числе дел
    KeyT: { s: 'many', view: 'card', task: null, tab: null }
  };
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'Escape' && state.view !== 'card') { set({ view: 'card' }, 'is-sheet'); return; }
    if (e.code === 'KeyH') { set({ hidden: !state.hidden }); return; }
    if (KEYS[e.code]) set(KEYS[e.code]);
  });

  /* Карточка шага сама меняет задание раз в 10 секунд, чтобы опытный клиент видел не одно
     задание, а все оставшиеся по очереди. Не листаем, когда это мешает: курсор или фокус
     на карточке, открыта шторка, клиент сам выбрал задание, вкладка скрыта, или в системе
     включено «уменьшить движение». */
  var ROTATE_MS = 10000, hovering = false;
  try { var rot = +new URLSearchParams(location.search).get('rot'); if (rot > 0) ROTATE_MS = rot * 1000; } catch (e) {}
  function overStep(e) { return !!(e.target.closest && e.target.closest('.step')); }
  document.addEventListener('mouseover', function (e) { hovering = overStep(e); });
  document.addEventListener('focusin', function (e) { hovering = overStep(e); });
  setInterval(function () {
    var d = SCENARIOS[state.s], rest = TASKS.length - d.done;
    if (!hasDeals(d) || rest < 2 || hovering || document.hidden || state.view !== 'card' || state.task != null) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    state.auto = (state.auto + 1) % rest;
    // Меняем только верх карточки: старое задание уходит вверх, новое поднимается снизу
    var head = document.querySelector('.step__head');
    if (!head) { render(); return; }
    head.classList.remove('is-entering');
    head.classList.add('is-leaving');
    setTimeout(function () {
      if (!head.isConnected) return; // карточку за это время перерисовали
      head.innerHTML = stepHead(taskBody(TASKS[curTask(d.done)]));
      head.classList.remove('is-leaving');
      head.classList.add('is-entering');
    }, 200);
  }, ROTATE_MS);

  var timer;
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(render, 120); });
  window.addEventListener('load', render);
  render();
})();

/* Типографика: короткие слова (предлоги, союзы, частицы — до трёх букв) не висят в конце строки,
   а число не отрывается от единицы и от следующей группы разрядов. Склеиваем неразрывным
   пробелом все тексты страницы — и статичные, и те, что рендерятся потом. */
(function () {
  var NB = ' ';
  var SHORT = /(^|[\s«„"( —–-])([а-яёa-z]{1,3})[ \t\n]+(?=\S)/gi;
  var NUM = /(\d)[ \t\n]+(?=[\dа-яё₽%])/gi;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  function fix(s) {
    var prev;
    do { prev = s; s = s.replace(SHORT, '$1$2' + NB); } while (s !== prev); // «и в» — два коротких подряд
    return s.replace(NUM, '$1' + NB);
  }
  function walk(root) {
    if (root.nodeType === 3) { var v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentNode && SKIP[n.parentNode.nodeName] ? 2 : 1; }
    });
    for (var n; (n = w.nextNode());) { var t = fix(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  }
  walk(document.body);
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.type === 'characterData') walk(m.target);
      else m.addedNodes.forEach(walk);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
