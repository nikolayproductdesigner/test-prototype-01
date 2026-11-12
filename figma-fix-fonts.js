/*
  Перевод макетов концепта на текстовые стили исходного макета «As is».

  Что делает в секции с макетами (экраны «Дела · …» и фрагменты состояний «S · …»):
  1. Тексты в Inter привязывает к стилю из «As is» с тем же начертанием, размером
     и интерлиньяжем. Если точного стиля нет, берёт ближайший (таблица NEAREST).
  2. Тексты, которые уже привязаны к стилям, перекладывает заново, чтобы ширины
     посчитались с настоящим SF Pro. Через API шрифт недоступен, и размеры текстов
     там считались с запасным шрифтом.

  Скрипт можно запускать повторно: уже переведённые тексты он не ломает.

  Как запустить (Figma Desktop, где установлен SF Pro):
  1. Откройте файл «Тестовое в Альфа-Бизнес».
  2. Меню: Plugins → Development → Show/Hide console.
  3. Вставьте весь этот файл в консоль и нажмите Enter.
*/
(async () => {
  const SECTION_ID = '26:313'; // секция с макетами концепта
  const SOURCE_ID = '1:4662';  // исходный макет «As is»
  const FRAME_PREFIXES = ['Дела · ', 'S · ']; // экраны и фрагменты состояний

  const section = await figma.getNodeByIdAsync(SECTION_ID);
  const source = await figma.getNodeByIdAsync(SOURCE_ID);
  if (!section || !source) { console.error('Не нашёл секцию или исходный макет'); return; }

  const key = (style, size, lh) => style.replace(/\s+/g, '') + '/' + size + '/' + (lh && lh.unit === 'PIXELS' ? lh.value : 'auto');

  // Карта «начертание/размер/интерлиньяж → стиль» по исходному макету, берём самый частый
  const votes = {};
  for (const t of source.findAllWithCriteria({ types: ['TEXT'] })) {
    for (const s of t.getStyledTextSegments(['textStyleId', 'fontName', 'fontSize', 'lineHeight'])) {
      if (!s.textStyleId) continue;
      const k = key(s.fontName.style, s.fontSize, s.lineHeight);
      votes[k] = votes[k] || {};
      votes[k][s.textStyleId] = (votes[k][s.textStyleId] || 0) + (s.end - s.start);
    }
  }
  const styleFor = {};
  for (const k in votes) styleFor[k] = Object.entries(votes[k]).sort((a, b) => b[1] - a[1])[0][0];

  // Точного стиля в макете нет — берём ближайший
  const NEAREST = {
    'Bold/11/16': 'Medium/11/16',  // подпись «Следующий шаг»
    'Bold/13/20': 'Bold/14/20',    // «+500» в метке бонуса
    'Bold/20/24': 'Bold/22/26',    // заголовок тёмной карточки у нового клиента
    'Medium/12/16': 'Regular/12/16' // время на карточке задания
  };

  const loadStyle = async id => { const st = await figma.getStyleByIdAsync(id); await figma.loadFontAsync(st.fontName); };
  const frames = section.children.filter(n => n.type === 'FRAME' && FRAME_PREFIXES.some(p => n.name.startsWith(p)));
  let exact = 0, nearest = 0, reflowed = 0, noStyle = 0, failed = 0;

  for (const frame of frames) {
    for (const t of frame.findAllWithCriteria({ types: ['TEXT'] })) {
      try {
        const segs = t.getStyledTextSegments(['fontName', 'fontSize', 'lineHeight', 'textStyleId']);
        if (segs.length !== 1) continue; // смешанные тексты исходного макета не трогаем
        const s = segs[0];
        if (s.fontName.family === 'Inter') {
          const k = key(s.fontName.style, s.fontSize, s.lineHeight);
          const id = styleFor[k] || styleFor[NEAREST[k]];
          if (!id) { noStyle++; console.warn('Нет стиля для', k, '—', t.characters.slice(0, 30)); continue; }
          await loadStyle(id);
          await t.setTextStyleIdAsync(id);
          styleFor[k] ? exact++ : nearest++;
        } else if (s.textStyleId) {
          // уже на стиле: перекладываем, чтобы размеры пересчитались с настоящим шрифтом
          await loadStyle(s.textStyleId);
          const mode = t.textAutoResize;
          if (mode === 'WIDTH_AND_HEIGHT' || mode === 'HEIGHT') { t.textAutoResize = 'NONE'; t.textAutoResize = mode; reflowed++; }
        }
      } catch (e) {
        failed++;
        console.warn('Не получилось:', t.characters.slice(0, 40), '—', e.message);
      }
    }
  }
  console.log('Готово. Кадров: ' + frames.length + '. Привязано точно: ' + exact + ', к ближайшему стилю: ' + nearest +
    ', переложено: ' + reflowed + ', без стиля: ' + noStyle + ', ошибок: ' + failed);
})();
