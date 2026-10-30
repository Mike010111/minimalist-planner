'use strict';
/* Discipline — минималистичная очередь задач (PWA) */

/* ───────────────────────── helpers ───────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const MON_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MON_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MON_SH  = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const WD      = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const WD_SH   = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const EASE = 'cubic-bezier(.32,.72,0,1)';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = ms => (REDUCED ? 1 : ms);
const pad = n => String(n).padStart(2, '0');
const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const sod = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d; };
const dayDiff = (a, b) => Math.round((sod(a) - sod(b)) / 864e5);
const wait = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const now = () => Date.now();
const NB = '\u00a0';
/* Неразрывные пробелы: короткие слова и числа «приклеиваются» к следующему слову, тире — к предыдущему */
function typo(s) {
  if (!s) return s;
  let r = s;
  for (let i = 0; i < 2; i++) r = r.replace(/(^|[\s«„"(])([А-Яа-яЁёA-Za-z]{1,2}|\d{1,4}) +(?=\S)/g, `$1$2${NB}`);
  return r.replace(/ +([—–])/g, NB + '$1');
}

function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
function fmtDur(ms) {
  let m = Math.floor(ms / 60000);
  if (m < 1) return `<${NB}1${NB}мин`;
  const d = Math.floor(m / 1440); m -= d * 1440;
  const h = Math.floor(m / 60); m -= h * 60;
  if (d) return `${d}${NB}д` + (h ? `${NB}${h}${NB}ч` : '');
  if (h) return `${h}${NB}ч` + (m ? `${NB}${m}${NB}мин` : '');
  return `${m}${NB}мин`;
}
function fmtLeft(ms) { return ms <= 0 ? 'просрочено' : fmtDur(ms + 59999 - ((ms + 59999) % 60000)); }
function dateShort(ts) {
  const d = new Date(ts), y = new Date().getFullYear();
  return d.getDate() + NB + MON_SH[d.getMonth()] + (d.getFullYear() !== y ? NB + d.getFullYear() : '');
}
/* компактно, для карточки */
function fmtWhen(ts) {
  const dd = dayDiff(ts, now()), t = hm(ts);
  if (dd === 0) return t;
  if (dd === 1) return `завтра,${NB}${t}`;
  if (dd === -1) return `вчера,${NB}${t}`;
  return `${dateShort(ts)},${NB}${t}`;
}
/* подробно, для окна задачи */
function fmtWhenLong(ts) {
  const dd = dayDiff(ts, now()), t = hm(ts), d = new Date(ts);
  if (dd === 0) return `Сегодня,${NB}${t}`;
  if (dd === 1) return `Завтра,${NB}${t}`;
  if (dd === -1) return `Вчера,${NB}${t}`;
  return `${WD_SH[d.getDay()]},${NB}${dateShort(ts)},${NB}${t}`;
}
/* дата-время; если сегодня — только время */
function fmtDT(ts) { return dayDiff(ts, now()) === 0 ? hm(ts) : `${dateShort(ts)},${NB}${hm(ts)}`; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* «Пн, 2 ноября» */
function fmtDay(k) {
  const d = fromKey(k), y = new Date().getFullYear();
  return `${WD_SH[d.getDay()]},${NB}${d.getDate()}${NB}${MON_GEN[d.getMonth()]}` + (d.getFullYear() !== y ? `${NB}${d.getFullYear()}` : '');
}
/* «завтра» / «через 3 дня» */
function fmtIn(k) {
  const n = dayDiff(fromKey(k), now());
  return n === 1 ? 'завтра' : `через${NB}${n}${NB}${plural(n, 'день', 'дня', 'дней')}`;
}
function fmtStamp(ts) { const d = new Date(ts); return `${WD_SH[d.getDay()]},${NB}${dateShort(ts)},${NB}${hm(ts)}`; }
function toInputValue(ts) { const d = new Date(ts); return `${keyOf(d)}T${hm(ts)}`; }

/* тактильный отклик: vibrate (Android) / switch-хак (iOS 18+) */
const hapticEl = $('.haptic');
function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(8); else hapticEl.click(); } catch (_) {}
}

const ICON = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 4v12M6.5 10.5L12 16l5.5-5.5M5 20h14"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4M9.5 2.5h5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/></svg>',
};

/* ───────────────────────── store ───────────────────────── */
/*
 * Задача: { id, title, deadline, startedAt, startAuto, reminders, createdAt, doneAt, day, tag }
 *   day       — ключ дня 'YYYY-MM-DD' для задач, запланированных на будущий день (иначе null)
 *   startAuto — начало выставлено автоматически (первым сроком), а не вручную из меню
 */
const KEY = 'discipline.v1';
const store = { queue: [], done: [], tags: [] };
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) { store.queue = s.queue || []; store.done = s.done || []; store.tags = s.tags || []; }
  } catch (_) {}
  for (const t of [...store.queue, ...store.done]) {
    if (t.day === undefined) t.day = null;
    if (t.tag === undefined) t.tag = null;
    if (t.startAuto === undefined) t.startAuto = !!(t.startedAt && t.deadline);
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  Notify.schedule();
}
const findTask = id => store.queue.find(t => t.id === id) || store.done.find(t => t.id === id);
const tagOf = t => (t && t.tag && store.tags.find(g => g.id === t.tag)) || null;
const isPlanned = t => !!(t.day && t.day > todayKey);

/*
 * Начало задачи — единые правила:
 *  • срок выставлен впервые → задача начата сейчас (только сегодняшняя, невыполненная, ещё не начатая);
 *  • срок изменён → начало не меняется;
 *  • срок убран → автоматическое начало сбрасывается, ручное («Начать» в меню) остаётся;
 *  • «Начать» / «Отменить начало» в меню (удержание карточки) — вручную;
 *  • задачи на будущий день не бывают начатыми: «Начать» переносит задачу на сегодня;
 *  • у выполненных задач правка срока историю (начало) не трогает.
 */
const Start = {
  onDeadlineSet(t, had) { if (!had && !t.startedAt && !t.doneAt && !isPlanned(t)) { t.startedAt = now(); t.startAuto = true; } },
  onDeadlineCleared(t) { if (!t.doneAt && t.startedAt && t.startAuto) { t.startedAt = null; t.startAuto = false; } },
  begin(t) { t.startedAt = now(); t.startAuto = false; if (isPlanned(t)) t.day = null; },
  cancel(t) { t.startedAt = null; t.startAuto = false; },
};

/* задачи будущего дня, чей день наступил, встают в конец сегодняшней очереди */
function promote() {
  const due = store.queue.filter(t => t.day && t.day <= todayKey);
  if (!due.length) return false;
  store.queue = store.queue.filter(t => !due.includes(t)).concat(due.map(t => (t.day = null, t)));
  return true;
}

/* ───────────────────────── input binding (touch + mouse) ───────────────────────── */
let lastTouch = 0;
function bindPress(el, h) {
  el.addEventListener('touchstart', e => {
    lastTouch = now();
    if (e.touches.length !== 1) { h.cancel(); return; }
    const t = e.touches[0]; h.down(t.clientX, t.clientY, e);
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (!t) return;
    if (h.move(t.clientX, t.clientY, e) && e.cancelable) e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend', e => { lastTouch = now(); const t = e.changedTouches[0]; h.up(t.clientX, t.clientY, e); });
  el.addEventListener('touchcancel', () => { lastTouch = now(); h.cancel(); });
  el.addEventListener('mousedown', e => {
    if (e.button !== 0 || now() - lastTouch < 800) return;
    h.down(e.clientX, e.clientY, e);
    const mm = ev => { if (h.move(ev.clientX, ev.clientY, ev)) ev.preventDefault(); };
    const mu = ev => { removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); h.up(ev.clientX, ev.clientY, ev); };
    addEventListener('mousemove', mm); addEventListener('mouseup', mu);
  });
}

/* ───────────────────────── calendar ───────────────────────── */
/* Непрерывная лента недель (−3…+5 лет), построенная сразу целиком — поэтому позиция
   выставляется мгновенно и ничего не «прокручивается» при запуске. Привязка к строкам —
   CSS scroll-snap; программная прокрутка — своей короткой анимацией (без нативного smooth). */
const monthIdx = d => d.getFullYear() * 12 + d.getMonth();
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
class Calendar {
  constructor(root, opts) {
    this.root = root; this.o = opts;
    const y = new Date().getFullYear();
    this.origin = mondayOf(new Date(y - 3, 0, 1));
    this.weeks = Math.round((mondayOf(new Date(y + 6, 0, 1)) - this.origin) / 6048e5);
    root.innerHTML =
      '<div class="cal-head"><span class="cal-label"></span></div>' +
      '<div class="cal-wd">' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w => `<span>${w}</span>`).join('') + '</div>' +
      '<div class="cal-vp"><div class="cal-grid"></div></div><style></style>';
    this.label = $('.cal-label', root); this.vp = $('.cal-vp', root); this.grid = $('.cal-grid', root);
    this.css = $('style', root);
    const d = new Date(this.origin);
    let h = '';
    for (let i = 0; i < this.weeks * 7; i++) {
      const yy = d.getFullYear(), mo = pad(d.getMonth() + 1);
      h += `<span class="d c${i % 7}" data-k="${yy}-${mo}-${pad(d.getDate())}" data-m="${yy}-${mo}"><b>${d.getDate()}</b></span>`;
      d.setDate(d.getDate() + 1);
    }
    this.grid.innerHTML = h;
    this.cells = this.grid.children;
    this.marks = new Map(); // ключ → классы, чтобы обновлять только изменившиеся ячейки
    this.refresh();
    this.month = null; this.touched = false; this.tw = 0;
    this.vp.addEventListener('scroll', () => this.onScroll(), { passive: true });
    for (const ev of ['touchstart', 'wheel', 'mousedown'])
      this.vp.addEventListener(ev, () => { this.touched = true; this.stopTween(); }, { passive: true });
    this.home(true);
    // если при запуске раскладка была не готова — тихо поправить позицию
    const fix = () => { if (!this.touched && !this.tw && Math.abs(this.vp.scrollTop - this.topOf(monthIdx(new Date()))) > 2) this.home(false); };
    addEventListener('load', fix); addEventListener('pageshow', fix); setTimeout(fix, 350);
  }
  get row() { return this._row || (this._row = this.cells[0].offsetHeight) || 24; }
  topOf(mi) { return Math.round((mondayOf(new Date(Math.floor(mi / 12), mi % 12, 1)) - this.origin) / 6048e5) * this.row; }
  /* текущий месяц: неделя с 1-м числом — первой строкой; при запуске — лёгкая «доводка» на одну строку */
  home(settle) { this.goto(monthIdx(new Date()), settle ? 'settle' : false); }
  goto(mi, mode) {
    const y = this.topOf(mi);
    this.setMonth(mi);
    this.stopTween();
    const vp = this.vp;
    if (!mode || REDUCED) { vp.scrollTop = y; return; }
    let from = mode === 'settle' ? y + this.row : vp.scrollTop;
    const lim = this.row * 8; // издалека не «прокручиваем» годы — подъезжаем с короткой дистанции
    if (Math.abs(y - from) > lim) from = y - Math.sign(y - from) * lim;
    vp.classList.add('nosnap');
    vp.scrollTop = from;
    const t0 = performance.now(), D = mode === 'settle' ? 560 : 460;
    const step = t => {
      const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3);
      vp.scrollTop = from + (y - from) * e;
      if (p < 1) this.tw = requestAnimationFrame(step);
      else { this.tw = 0; vp.classList.remove('nosnap'); }
    };
    this.tw = requestAnimationFrame(step);
  }
  stopTween() { if (this.tw) { cancelAnimationFrame(this.tw); this.tw = 0; this.vp.classList.remove('nosnap'); } }
  onScroll() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.tw) return; // во время своей анимации месяц уже выставлен
      const w = Math.floor((this.vp.scrollTop + this.vp.clientHeight / 2) / this.row);
      const d = new Date(this.origin); d.setDate(d.getDate() + w * 7 + 3); // четверг строки в центре
      const mi = monthIdx(d);
      if (mi !== this.month) this.setMonth(mi);
    });
  }
  setMonth(mi) {
    if (mi === this.month) return;
    const dir = this.month == null ? 0 : Math.sign(mi - this.month);
    this.month = mi;
    const y = Math.floor(mi / 12), m = mi % 12, key = `${y}-${pad(m + 1)}`, id = '#' + this.root.id;
    this.label.innerHTML = `${MON_NOM[m]}<span class="y">${y}</span>`;
    this.css.textContent =
      `${id} .d:not([data-m="${key}"]):not(.today):not(.sel):not(.rs):not(.re) b{color:var(--cal-out)}` +
      `${id} .d.today:not([data-m="${key}"]) b{opacity:.5}`;
    if (dir && !REDUCED) this.label.animate(
      [{ transform: `translateY(${dir * 8}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 220, easing: EASE });
  }
  refresh() {
    const next = new Map();
    for (const k of this.o.keys()) { const c = this.o.mark(k); if (c) next.set(k, c); }
    const touched = new Set([...this.marks.keys(), ...next.keys()]);
    for (const k of touched) {
      const c = next.get(k) || '';
      if (c === (this.marks.get(k) || '')) continue;
      const cell = this.cellOf(k);
      if (cell) cell.className = cell.className.replace(/\s(today|sel|dot|in|rs|re|pend)\b/g, '') + c;
    }
    this.marks = next;
  }
  cellOf(k) {
    const i = Math.round((fromKey(k) - this.origin) / 864e5);
    return i >= 0 && i < this.cells.length ? this.cells[i] : null;
  }
}

/* ───────────────────────── header / today / выбранный день ───────────────────────── */
let todayKey = keyOf(new Date());
const view = { day: null }; // null — сегодняшняя очередь; 'YYYY-MM-DD' — план на будущий день
function renderToday() {
  const d = new Date();
  $('#todayWd').textContent = WD[d.getDay()];
  $('#todayNum').textContent = d.getDate();
  $('#todayMon').textContent = MON_GEN[d.getMonth()];
}
const planBar = $('#planBar');
function renderPlanBar(animate) {
  const on = !!view.day, was = !planBar.hidden;
  if (on) $('#planText').innerHTML = `<b>${fmtDay(view.day)}</b><span>${NB}·${NB}${fmtIn(view.day)}</span>`;
  if (on === was) return;
  planBar.hidden = !on;
  if (!animate || REDUCED) return;
  if (on) planBar.animate([{ opacity: 0, transform: 'translateY(-6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
}
function selectDay(k) {
  if (k === todayKey) k = null;
  if (k === view.day) return;
  view.day = k;
  renderPlanBar(true);
  renderQueue();
  queueScroll.scrollTop = 0;
  if (!REDUCED) queueEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE });
  calMain.refresh();
}
$('#planToday').addEventListener('click', () => { selectDay(null); calMain.home(false); haptic(); });

/* ───────────────────────── queue rendering ───────────────────────── */
const queueEl = $('#queue'), queueScroll = $('#queueScroll');
const rowMap = new Map();
const ui = { busy: false, drag: null };
const inView = t => (view.day ? t.day === view.day : !isPlanned(t));
const visibleTasks = () => store.queue.filter(inView);
let plannedDays = new Set();

function tagHTML(t) {
  const g = tagOf(t);
  return g ? `<span class="tag" style="--tc:${g.color}">${esc(g.name)}</span>` : '';
}
function metaHTML(t) {
  let h = tagHTML(t);
  if (t.startedAt) h += `<span class="m start">${ICON.play}${fmtDT(t.startedAt)}</span>`;
  if (!t.deadline) return h;
  const left = t.deadline - now();
  const cls = left <= 0 ? 'over' : left < 36e5 ? 'soon' : '';
  h += `<span class="m ${cls}">${ICON.clock}${fmtWhen(t.deadline)}<em>${fmtLeft(left)}</em></span>`;
  if (t.reminders && t.reminders.length) h += `<span class="m">${ICON.bell}${t.reminders.join(`${NB}·${NB}`)}</span>`;
  return h;
}
function makeRow(t) {
  const row = document.createElement('li');
  row.className = 'row'; row.dataset.id = t.id;
  row.innerHTML = `<div class="act act-done">${ICON.check}</div><div class="act act-skip">${ICON.down}</div>` +
    '<div class="card"><div class="c-title"></div><div class="c-meta"></div></div>';
  rowGestures(row);
  return row;
}
function fillRow(row, t) {
  const title = $('.c-title', row), meta = $('.c-meta', row);
  const tt = typo(t.title);
  if (title.textContent !== tt) title.textContent = tt;
  const mh = metaHTML(t);
  if (meta.innerHTML !== mh) meta.innerHTML = mh;
}
function renderQueue() {
  const vis = visibleTasks(), ids = new Set(vis.map(t => t.id));
  for (const [id, row] of rowMap) if (!ids.has(id)) { row.remove(); rowMap.delete(id); }
  vis.forEach((t, i) => {
    let row = rowMap.get(t.id);
    if (!row) { row = makeRow(t); rowMap.set(t.id, row); }
    fillRow(row, t);
    if (queueEl.children[i] !== row) queueEl.insertBefore(row, queueEl.children[i] || null);
  });
  queueEl.classList.toggle('plan', !!view.day);
  const empty = $('#queueEmpty');
  empty.hidden = vis.length > 0;
  empty.textContent = view.day ? 'На этот день пока пусто' : 'Очередь пуста';
  const todayCount = store.queue.filter(t => !isPlanned(t)).length;
  $('#queueCount').textContent = todayCount || '';
  const pd = new Set(store.queue.filter(isPlanned).map(t => t.day));
  if ([...pd].sort().join() !== [...plannedDays].sort().join()) { plannedDays = pd; calMain.refresh(); }
}
/* новый порядок видимого списка записывается в те же позиции общей очереди */
function reorderVisible(f, to) {
  const vis = visibleTasks(), slots = vis.map(t => store.queue.indexOf(t));
  const [m] = vis.splice(f, 1); vis.splice(to, 0, m);
  slots.forEach((qi, k) => { store.queue[qi] = vis[k]; });
}

/* ───────────────────────── gestures: tap / swipe / hold / drag ───────────────────────── */
/* Удержание ~0,4 с → карточка приподнимается и открывается меню. Если, не отпуская,
   повести палец — меню закрывается и карточка перетаскивается (как на домашнем экране iOS). */
function rowGestures(row) {
  const card = $('.card', row);
  let g = null;
  bindPress(card, {
    down(x, y) {
      if (ui.busy || ui.drag || Editor.open || Menu.open) return;
      g = { x0: x, y0: y, x, y, t0: performance.now(), mode: null, trail: [[x, performance.now()]] };
      g.lp = setTimeout(() => { if (g && !g.mode) { g.mode = 'hold'; Menu.openFor(row); } }, 420);
    },
    move(x, y) {
      if (!g) return false;
      g.x = x; g.y = y;
      const dx = x - g.x0, dy = y - g.y0;
      if (g.mode === 'hold') {
        if (Math.hypot(dx, dy) > 10) { Menu.toDrag(); g.mode = 'drag'; dragStart(row, g); }
        return true;
      }
      if (g.mode === 'drag') { dragMove(y); return true; }
      if (!g.mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        clearTimeout(g.lp);
        g.mode = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'swipe' : 'scroll';
        if (g.mode === 'swipe') { row.classList.add('swiping'); g.sx = x - Math.sign(dx) * 8; }
      }
      if (g.mode === 'swipe') {
        const t = performance.now();
        g.trail.push([x, t]); while (g.trail.length > 2 && t - g.trail[0][1] > 90) g.trail.shift();
        swipeMove(row, x - g.sx);
        return true;
      }
      return false;
    },
    up(x, y, e) {
      if (!g) return;
      clearTimeout(g.lp);
      const m = g.mode;
      if (m === 'hold') { if (e && e.cancelable && e.type === 'touchend') e.preventDefault(); Menu.release(); }
      else if (m === 'drag') dragEnd();
      else if (m === 'swipe') {
        const [px, pt] = g.trail[0];
        swipeEnd(row, x - g.sx, (x - px) / Math.max(1, performance.now() - pt));
      } else if (!m && performance.now() - g.t0 < 500) {
        if (e && e.cancelable && e.type === 'touchend') e.preventDefault(); // без синтетического click
        const t = findTask(row.dataset.id);
        if (t) Editor.show(t, card);
      }
      g = null;
    },
    cancel() {
      if (!g) return;
      clearTimeout(g.lp);
      if (g.mode === 'hold') Menu.release();
      else if (g.mode === 'drag') dragEnd();
      else if (g.mode === 'swipe') swipeEnd(row, 0, 0);
      g = null;
    }
  });
}

const swipeThreshold = row => Math.min(120, row.offsetWidth * 0.3);
function swipeMove(row, dx) {
  const card = $('.card', row), th = swipeThreshold(row);
  // лёгкое сопротивление за порогом
  const ax = Math.abs(dx), eff = ax > th ? th + (ax - th) * 0.55 : ax;
  const x = Math.sign(dx) * eff;
  card.style.transform = `translate3d(${x}px,0,0)`;
  row._x = x;
  const done = $('.act-done', row), skip = $('.act-skip', row);
  const p = Math.min(1, ax / th);
  done.style.opacity = dx > 0 ? Math.min(1, p * 1.4) : 0;
  skip.style.opacity = dx < 0 ? Math.min(1, p * 1.4) : 0;
  const active = dx > 0 ? done : skip, armed = ax >= th;
  if (armed !== active.classList.contains('armed')) { active.classList.toggle('armed', armed); if (armed) haptic(); }
  (dx > 0 ? skip : done).classList.remove('armed');
  $('svg', active).style.transform = armed ? '' : `scale(${0.6 + 0.35 * p})`;
}
function resetActs(row) {
  row.querySelectorAll('.act').forEach(a => { a.style.opacity = 0; a.classList.remove('armed'); $('svg', a).style.transform = ''; });
}
function swipeEnd(row, dx, v) {
  const th = swipeThreshold(row);
  const dir = (dx > th || (v > 0.55 && dx > 36)) ? 1 : (dx < -th || (v < -0.55 && dx < -36)) ? -1 : 0;
  if (dir) { commitSwipe(row, dir); return; }
  const card = $('.card', row), from = row._x || 0;
  card.style.transform = '';
  row.classList.remove('swiping');
  card.animate([{ transform: `translate3d(${from}px,0,0)` }, { transform: 'none' }], { duration: dur(380), easing: 'cubic-bezier(.2,1.25,.4,1)' });
  row.querySelectorAll('.act').forEach(a => a.animate([{ opacity: a.style.opacity || 0 }, { opacity: 0 }], { duration: dur(260) }));
  resetActs(row);
  row._x = 0;
}
function collapse(row) {
  row.classList.add('collapsing');
  const h = row.offsetHeight;
  return row.animate(
    [{ height: h + 'px', marginBottom: 'var(--gap)' }, { height: '0px', marginBottom: '0px' }],
    { duration: dur(260), easing: EASE, fill: 'forwards' }).finished;
}
async function commitSwipe(row, dir) {
  ui.busy = true;
  haptic();
  const card = $('.card', row), from = row._x || 0, w = row.offsetWidth;
  row.querySelectorAll('.act').forEach(a => { if (+a.style.opacity > 0) a.style.opacity = 1; });
  await card.animate([{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${dir * (w + 40)}px,0,0)` }],
    { duration: dur(200), easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished;
  await collapse(row);
  const id = row.dataset.id, i = store.queue.findIndex(t => t.id === id);
  const [t] = store.queue.splice(i, 1);
  row.getAnimations({ subtree: true }).forEach(a => a.cancel());
  card.style.transform = ''; row.classList.remove('swiping', 'collapsing'); resetActs(row); row._x = 0;
  if (dir > 0) {
    t.doneAt = now();
    store.done.unshift(t);
    rowMap.delete(id); row.remove();
    renderQueue(); renderDone();
  } else {
    store.queue.push(t);
    renderQueue();
    enterRow(row);
  }
  save();
  ui.busy = false;
}
function enterRow(row) {
  const h = row.offsetHeight;
  row.classList.add('collapsing');
  const a = row.animate([{ height: '0px', marginBottom: '0px' }, { height: h + 'px', marginBottom: 'var(--gap)' }],
    { duration: dur(320), easing: EASE });
  $('.card', row).animate([{ opacity: 0, transform: 'translateY(12px) scale(.97)' }, { opacity: 1, transform: 'none' }],
    { duration: dur(380), easing: EASE });
  a.finished.then(() => row.classList.remove('collapsing'));
}

/* drag & drop reorder */
function dragStart(row, g) {
  const rows = [...queueEl.children];
  const from = rows.indexOf(row);
  if (from < 0) return;
  ui.drag = {
    row, rows, from, to: from, y0: g.y0, y: g.y, sc0: queueScroll.scrollTop,
    slots: rows.map(r => ({ top: r.offsetTop, h: r.offsetHeight })),
    gap: parseFloat(getComputedStyle(row).marginBottom) || 10,
  };
  haptic();
  row.classList.add('dragging');
  queueEl.classList.add('sorting');
  queueScroll.classList.add('lock');
  requestAnimationFrame(autoScroll);
  dragMove(g.y);
}
function dragMove(y) {
  const d = ui.drag; if (!d) return;
  d.y = y;
  const dy = y - d.y0 + (queueScroll.scrollTop - d.sc0);
  d.row.style.transform = `translate3d(0,${dy}px,0)`;
  const s = d.slots, f = d.from, center = s[f].top + s[f].h / 2 + dy;
  let to = 0;
  for (let i = 0; i < s.length; i++) if (i !== f && s[i].top + s[i].h / 2 < center) to++;
  if (to !== d.to) { d.to = to; haptic(); }
  const shift = s[f].h + d.gap;
  d.rows.forEach((r, i) => {
    if (i === f) return;
    const off = (f < to && i > f && i <= to) ? -shift : (to < f && i >= to && i < f) ? shift : 0;
    r.style.transform = off ? `translate3d(0,${off}px,0)` : '';
  });
}
function autoScroll() {
  const d = ui.drag; if (!d) return;
  const r = queueScroll.getBoundingClientRect();
  const top = r.top + 40, bottom = Math.min(r.bottom, innerHeight - 96) - 40;
  let v = 0;
  if (d.y < top) v = -Math.min(1, (top - d.y) / 60) * 12;
  else if (d.y > bottom) v = Math.min(1, (d.y - bottom) / 60) * 12;
  if (v) { const before = queueScroll.scrollTop; queueScroll.scrollTop += v; if (queueScroll.scrollTop !== before) dragMove(d.y); }
  requestAnimationFrame(autoScroll);
}
async function dragEnd() {
  const d = ui.drag; if (!d) return;
  ui.drag = null; ui.busy = true;
  const s = d.slots, f = d.from, to = d.to;
  const target = to > f ? s[to].top + s[to].h - s[f].h : s[to].top;
  d.row.classList.add('settling');
  d.row.classList.remove('dragging');
  d.row.style.transform = `translate3d(0,${target - s[f].top}px,0)`;
  await wait(dur(250));
  if (to !== f) reorderVisible(f, to);
  queueEl.classList.remove('sorting');
  d.rows.forEach(r => { r.style.transform = ''; r.classList.remove('settling'); });
  queueScroll.classList.remove('lock');
  renderQueue();
  if (to !== f) save();
  ui.busy = false;
}

/* ───────────────────────── done screen ───────────────────────── */
const doneEl = $('#done');
const range = { start: null, end: null, pending: null };
function currentWeek() {
  const t = sod(now()); const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: keyOf(mon), end: keyOf(sun) };
}
function resetRange() { Object.assign(range, currentWeek(), { pending: null }); }
function activeRange() { return range.pending ? { start: range.pending, end: range.pending } : range; }
resetRange();

const nw = s => `<span class="nw">${s}</span>`;
function rangeTitle() {
  const { start, end } = activeRange();
  const a = fromKey(start), b = fromKey(end), y = new Date().getFullYear();
  const dm = (d, full) => nw(`${d.getDate()} ${(full ? MON_GEN : MON_SH)[d.getMonth()]}` + (d.getFullYear() !== y ? ` ${d.getFullYear()}` : ''));
  if (range.pending) return `${dm(a)} <span class="pend nw">–${NB}…</span>`;
  if (start === end) return start === todayKey ? 'Сегодня' : dm(a, true);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return nw(`${a.getDate()}–`) + dm(b);
  return `${nw(dm(a) + NB + '–')} ${dm(b)}`;
}
function doneMeta(t) {
  if (t.startedAt) {
    return tagHTML(t) + `<span class="m">${ICON.play}${fmtStamp(t.startedAt)}</span>` +
      `<span class="m strong">${ICON.timer}${fmtDur(Math.max(0, t.doneAt - t.startedAt))}</span>`;
  }
  return tagHTML(t) + `<span class="m">${ICON.check}${fmtStamp(t.doneAt)}</span>`;
}
function renderDone(animate) {
  const { start, end } = activeRange();
  const from = fromKey(start).getTime(), to = fromKey(end); to.setDate(to.getDate() + 1);
  const items = store.done.filter(t => t.doneAt >= from && t.doneAt < to.getTime()).sort((a, b) => b.doneAt - a.doneAt);
  doneEl.innerHTML = '';
  for (const t of items) {
    const row = document.createElement('li');
    row.className = 'row'; row.dataset.id = t.id;
    row.innerHTML = '<div class="card"><div class="c-title"></div><div class="c-meta"></div></div>';
    $('.c-title', row).textContent = typo(t.title);
    $('.c-meta', row).innerHTML = doneMeta(t);
    const card = $('.card', row);
    bindPress(card, {
      down(x, y) { this.s = { x, y, t: performance.now() }; },
      move(x, y) { if (this.s && Math.hypot(x - this.s.x, y - this.s.y) > 8) this.s = null; return false; },
      up(x, y, e) {
        if (this.s && performance.now() - this.s.t < 500 && !Editor.open) {
          if (e && e.cancelable && e.type === 'touchend') e.preventDefault();
          Editor.show(t, card);
        }
        this.s = null;
      },
      cancel() { this.s = null; },
    });
    doneEl.appendChild(row);
  }
  $('#doneEmpty').hidden = items.length > 0;
  $('#rangeTitle').innerHTML = rangeTitle();
  const spent = items.reduce((s, t) => s + (t.startedAt ? Math.max(0, t.doneAt - t.startedAt) : 0), 0);
  $('#rangeSub').innerHTML = items.length
    ? nw(`${items.length}${NB}${plural(items.length, 'задача', 'задачи', 'задач')}`) + (spent >= 60000 ? ` · ${nw(fmtDur(spent))}` : '')
    : 'нет задач';
  if (animate && !REDUCED) doneEl.animate([{ opacity: 0.2, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
}

/* ───────────────────────── tabs (нажатие или проведение по переключателю) ───────────────────────── */
let tab = 'queue';
const appEl = $('#app'), seg = $('.seg'), segPill = $('.seg-pill'), fab = $('#fab');
const screens = { queue: $('#queueScreen'), done: $('#doneScreen') };
function setTab(t) {
  appEl.classList.remove('tabdrag');
  for (const el of [segPill, fab, screens.queue, screens.done]) { el.style.transform = ''; el.style.opacity = ''; }
  tab = t;
  for (const s of Object.values(screens)) {
    const on = s.dataset.screen === t;
    s.classList.toggle('is-active', on); s.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.tab === t));
  seg.classList.toggle('on-done', t === 'done');
  $('.dock').classList.toggle('on-done', t === 'done');
  if (t === 'done') renderDone();
}
/* p: 0 — «Очередь», 1 — «Выполнено»; экраны и «пилюля» следуют за пальцем */
function tabProgress(p) {
  segPill.style.transform = `translateX(${p * 100}%)`;
  screens.queue.style.transform = `translateX(${-18 * p}%)`; screens.queue.style.opacity = 1 - p;
  screens.done.style.transform = `translateX(${18 * (1 - p)}%)`; screens.done.style.opacity = p;
  fab.style.transform = `scale(${1 - 0.6 * p})`; fab.style.opacity = 1 - p;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('is-active', (b.dataset.tab === 'done') === (p >= 0.5)));
}
bindPress(seg, {
  down(x) { if (Editor.open || Menu.open) return; this.s = { x0: x, p0: tab === 'done' ? 1 : 0, p: tab === 'done' ? 1 : 0, moved: false, trail: [[x, performance.now()]] }; },
  move(x) {
    const s = this.s; if (!s) return false;
    const dx = x - s.x0;
    if (!s.moved && Math.abs(dx) < 6) return true;
    if (!s.moved) { s.moved = true; appEl.classList.add('tabdrag'); screens.done.style.visibility = ''; }
    s.p = clamp(s.p0 + dx / segPill.offsetWidth, 0, 1);
    const t = performance.now(); s.trail.push([x, t]); while (s.trail.length > 2 && t - s.trail[0][1] > 90) s.trail.shift();
    tabProgress(s.p);
    return true;
  },
  up(x, y, e) {
    const s = this.s; this.s = null;
    if (!s) return;
    if (e && e.cancelable && e.type === 'touchend') e.preventDefault();
    if (!s.moved) {
      const r = seg.getBoundingClientRect();
      const t = x < r.left + r.width / 2 ? 'queue' : 'done';
      if (t !== tab) { haptic(); setTab(t); }
      return;
    }
    const [px, pt] = s.trail[0], v = (x - px) / Math.max(1, performance.now() - pt);
    const t = v > 0.35 ? 'done' : v < -0.35 ? 'queue' : s.p >= 0.5 ? 'done' : 'queue';
    if (t !== tab) haptic();
    setTab(t);
  },
  cancel() { if (this.s) { this.s = null; setTab(tab); } },
});

/* ───────────────────────── editor sheet ───────────────────────── */
const sheet = $('#sheet'), inner = $('#sheetInner'), scrim = $('#scrim');
const sTitle = $('#sTitle'), sDl = $('#sDl'), sDlText = $('#sDlText'), sDlLeft = $('#sDlLeft'),
  sDlInput = $('#sDlInput'), sDlClear = $('#sDlClear'), sRem = $('#sRem'), sChips = $('#sChips'),
  sRemAdd = $('#sRemAdd'), sRemWrap = $('#sRemWrap'), sRemInput = $('#sRemInput'),
  sInfo = $('#sInfo'), sFoot = $('#sFoot'), sRestore = $('#sRestore'), sDelete = $('#sDelete'),
  sDay = $('#sDay'), sDayText = $('#sDayText'), sDayInput = $('#sDayInput');

const rectOf = el => {
  const r = el.getBoundingClientRect();
  const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return { left: r.left, top: r.top, width: r.width, height: r.height, radius: Math.min(rad, r.height / 2, r.width / 2) };
};
const kf = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: r.radius + 'px' });

const Editor = {
  open: false, closing: false, task: null, draft: null, isNew: false, origin: null,

  layout() {
    const vw = document.documentElement.clientWidth;
    const w = Math.min(vw - 24, 460);
    const safeTop = (parseFloat(getComputedStyle($('.head')).paddingTop) || 14) - 14;
    sheet.style.width = w + 'px';
    sheet.style.left = Math.round((vw - w) / 2) + 'px';
    sheet.style.top = Math.max(safeTop + 54, Math.round(innerHeight * 0.1)) + 'px';
    inner.style.width = w + 'px';
  },

  show(task, originEl) {
    if (this.open) return;
    this.open = true; this.closing = false; this.openedAt = now();
    this.isNew = !task;
    this.task = task;
    this.draft = task
      ? { ...task, reminders: [...(task.reminders || [])] }
      : { id: uid(), title: '', deadline: null, startedAt: null, startAuto: false, reminders: [], createdAt: now(), doneAt: null, day: view.day, tag: null };
    this.origin = originEl;
    this.fill();
    this.layout();
    scrim.hidden = false; sheet.hidden = false;
    if (this.isNew) sTitle.focus({ preventScroll: true }); // синхронно — чтобы iOS показал клавиатуру
    autosize();
    const to = rectOf(sheet); to.radius = 26;
    const from = rectOf(originEl);
    if (!this.isNew) originEl.style.visibility = 'hidden';
    sheet.animate([kf(from), kf(to)], { duration: dur(440), easing: EASE });
    inner.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
      { duration: dur(240), delay: dur(110), easing: 'ease-out', fill: 'backwards' });
    scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur(300), easing: 'ease-out' });
  },

  fill() {
    const d = this.draft;
    sTitle.value = d.title || '';
    const isDone = !!d.doneAt;
    this.renderDay();
    this.renderDeadline();
    sRem.hidden = isDone || !d.deadline;
    this.renderChips();
    sRemWrap.hidden = true; sRemAdd.hidden = false;
    // информация (только для выполненных)
    if (isDone) {
      let h = '';
      if (d.startedAt) h += `<div>Начато <b class="nw">${fmtStamp(d.startedAt)}</b></div>`;
      h += `<div>Выполнено <b class="nw">${fmtStamp(d.doneAt)}</b></div>`;
      if (d.startedAt) h += `<div>Потрачено <b class="nw">${fmtDur(Math.max(0, d.doneAt - d.startedAt))}</b></div>`;
      sInfo.innerHTML = h;
    } else sInfo.innerHTML = '';
    sFoot.hidden = this.isNew;
    sRestore.hidden = !isDone;
  },

  /* строка «День» — только у задач, запланированных на будущий день */
  renderDay() {
    const d = this.draft, on = !d.doneAt && isPlanned(d);
    if (on) { sDayText.innerHTML = `${fmtDay(d.day)}<span>${NB}·${NB}${fmtIn(d.day)}</span>`; sDayInput.value = d.day; sDayInput.min = todayKey; }
    sDay.hidden = !on;
  },

  setDay(k) {
    const d = this.draft;
    d.day = k && k > todayKey ? k : null;
    if (d.day) Start.cancel(d); // задача на будущий день не бывает начатой
    this.renderDay();
  },

  renderDeadline() {
    const d = this.draft;
    if (d.deadline) {
      sDlText.textContent = fmtWhenLong(d.deadline);
      sDlText.classList.remove('placeholder');
      const left = d.deadline - now();
      sDlLeft.textContent = d.doneAt ? '' : fmtLeft(left);
      sDlLeft.className = 's-dl-left' + (left <= 0 ? ' over' : left < 36e5 ? ' soon' : '');
      sDlInput.value = toInputValue(d.deadline);
      sDlClear.hidden = false;
    } else {
      sDlText.textContent = 'Срок';
      sDlText.classList.add('placeholder');
      sDlLeft.textContent = '';
      sDlInput.value = '';
      sDlClear.hidden = true;
    }
  },

  renderChips() {
    sChips.querySelectorAll('.chip-rem').forEach(c => c.remove());
    for (const m of this.draft.reminders) {
      const c = document.createElement('button');
      c.className = 'chip chip-rem'; c.dataset.m = m;
      c.innerHTML = `${m}${NB}мин${ICON.x}`;
      c.setAttribute('aria-label', `Убрать напоминание за ${m} мин`);
      sChips.insertBefore(c, sRemWrap);
    }
  },

  setDeadline(ts) {
    const d = this.draft, had = !!d.deadline;
    if (ts && !isNaN(ts)) {
      d.deadline = ts;
      Start.onDeadlineSet(d, had);
    } else {
      d.deadline = null; d.reminders = [];
      Start.onDeadlineCleared(d);
    }
    this.renderDeadline();
    const showRem = !d.doneAt && !!d.deadline;
    if (showRem !== !sRem.hidden) {
      sRem.hidden = !showRem;
      if (showRem && !REDUCED) sRem.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE });
    }
    this.renderChips();
  },

  commitReminder(keepOpen) {
    const v = sRemInput.value.trim(), d = this.draft;
    if (/^\d{1,6}$/.test(v)) {
      const n = parseInt(v, 10);
      const leftMin = d.deadline ? (d.deadline - now()) / 60000 : 0;
      if (n > 0 && n < leftMin && !d.reminders.includes(n)) {
        d.reminders.push(n); d.reminders.sort((a, b) => b - a);
        this.renderChips();
        const c = sChips.querySelector(`.chip-rem[data-m="${n}"]`);
        if (c && !REDUCED) c.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.3,.4,1)' });
      }
    }
    sRemInput.value = '';
    if (!keepOpen) { sRemWrap.hidden = true; sRemAdd.hidden = false; }
  },

  async close() {
    if (!this.open || this.closing) return;
    this.closing = true;
    if (!sRemWrap.hidden) this.commitReminder(false);
    this.applyInputDeadline();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const d = this.draft, title = sTitle.value.trim();
    let target = null, reveal = null;

    if (this.isNew) {
      if (title) {
        d.title = title;
        store.queue.push(d);
        renderQueue(); save();
        const row = rowMap.get(d.id), card = row && $('.card', row);
        if (card) {
          card.style.visibility = 'hidden';
          queueScroll.scrollTop = queueScroll.scrollHeight;
          target = card; reveal = card;
        }
      } else target = $('#fab');
    } else {
      d.title = title || this.task.title;
      Object.assign(this.task, d);
      if (this.task.doneAt) { renderDone(); const r = doneEl.querySelector(`[data-id="${d.id}"] .card`); target = r; if (r) { r.style.visibility = 'hidden'; reveal = r; } }
      else { renderQueue(); const row = rowMap.get(d.id); target = row && $('.card', row); reveal = target || null; }
      if (this.origin && this.origin !== target) this.origin.style.visibility = '';
      save();
    }
    await this.animateOut(target, !reveal);
    if (reveal) reveal.style.visibility = '';
    this.finish();
  },

  async animateOut(target, fade) {
    const from = rectOf(sheet); from.radius = 26;
    inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur(140), fill: 'forwards' });
    scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur(300), fill: 'forwards' });
    if (target && target.getBoundingClientRect().height) {
      const to = rectOf(target);
      const frames = [kf(from), kf(to)];
      if (fade) { frames[0].opacity = 1; frames[1].opacity = 0; }
      await sheet.animate(frames, { duration: dur(360), easing: EASE, fill: 'forwards' }).finished;
    } else {
      await sheet.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: dur(220), easing: 'ease-in', fill: 'forwards' }).finished;
    }
  },

  finish() {
    sheet.hidden = true; scrim.hidden = true;
    sheet.getAnimations().forEach(a => a.cancel());
    inner.getAnimations().forEach(a => a.cancel());
    scrim.getAnimations().forEach(a => a.cancel());
    this.open = false; this.closing = false; this.task = null; this.draft = null; this.origin = null;
  },

  async remove() {
    if (!this.open || this.closing || this.isNew) return;
    this.closing = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const t = this.task;
    const wasDone = !!t.doneAt;
    const origin = this.origin;
    await this.animateOut(null);
    this.finish();
    const row = origin && origin.closest('.row');
    if (row) { origin.style.visibility = 'hidden'; await collapse(row); }
    if (wasDone) { store.done = store.done.filter(x => x.id !== t.id); renderDone(); }
    else { store.queue = store.queue.filter(x => x.id !== t.id); renderQueue(); }
    save();
  },

  async restore() {
    if (!this.open || this.closing) return;
    this.closing = true;
    const t = this.task, title = sTitle.value.trim();
    Object.assign(t, this.draft, { title: title || t.title, doneAt: null });
    if (!isPlanned(t)) t.day = null;
    store.done = store.done.filter(x => x.id !== t.id);
    store.queue.push(t);
    const origin = this.origin;
    await this.animateOut(null);
    this.finish();
    const row = origin && origin.closest('.row');
    if (row) { origin.style.visibility = 'hidden'; await collapse(row); }
    renderDone(); renderQueue(); save();
  },

  applyInputDeadline() {
    if (!this.draft) return;
    const v = sDlInput.value;
    const ts = v ? new Date(v).getTime() : null;
    if (ts && ts !== this.draft.deadline) this.setDeadline(ts);
  },
};

function autosize() { sTitle.style.height = 'auto'; sTitle.style.height = sTitle.scrollHeight + 'px'; }
sTitle.addEventListener('input', autosize);
sTitle.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sTitle.blur(); } });

const onDl = () => {
  if (!Editor.draft || Editor.closing) return;
  const v = sDlInput.value;
  if (v) { const ts = new Date(v).getTime(); if (ts !== Editor.draft.deadline) Editor.setDeadline(ts); }
  else if (Editor.draft.deadline) Editor.setDeadline(null); // «Сбросить» в системном пикере
};
sDlInput.addEventListener('change', onDl);
sDlInput.addEventListener('input', onDl);
sDlInput.addEventListener('blur', onDl);
sDlClear.addEventListener('click', e => { e.stopPropagation(); Editor.setDeadline(null); });

sRemAdd.addEventListener('click', () => {
  Notify.ask();
  sRemAdd.hidden = true; sRemWrap.hidden = false; sRemInput.value = '';
  sRemInput.focus({ preventScroll: true });
});
sRemInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); Editor.commitReminder(true); } });
sRemInput.addEventListener('blur', () => { if (Editor.open && !Editor.closing) Editor.commitReminder(false); });
sChips.addEventListener('click', e => {
  const c = e.target.closest('.chip-rem'); if (!c) return;
  const n = +c.dataset.m;
  Editor.draft.reminders = Editor.draft.reminders.filter(x => x !== n);
  const done = () => Editor.renderChips();
  if (REDUCED) done(); else c.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }], { duration: 160, easing: 'ease-in' }).finished.then(done);
});
sDayInput.addEventListener('change', () => { if (Editor.draft && !Editor.closing && sDayInput.value) Editor.setDay(sDayInput.value); });
sDelete.addEventListener('click', () => Editor.remove());
sRestore.addEventListener('click', () => Editor.restore());
scrim.addEventListener('click', () => { if (now() - Editor.openedAt > 350) Editor.close(); });
fab.addEventListener('click', e => { if (!ui.busy && !Editor.open && !Menu.open) Editor.show(null, e.currentTarget); });
addEventListener('resize', () => { if (Editor.open && !Editor.closing) Editor.layout(); });

/* ───────────────────────── меню задачи (удержание карточки) ───────────────────────── */
const TAG_COLORS = ['#E5484D', '#F76B15', '#E0A100', '#30A46C', '#12A594', '#0090FF', '#6E56CF', '#D6409F', '#8B8D98'];
const menuEl = $('#menu'), mScrim = $('#mScrim'), miStart = $('#miStart'), miDate = $('#miDate'),
  mTags = $('#mTags'), mEdit = $('#mTagEdit'), teName = $('#teName'), teColors = $('#teColors'),
  teOk = $('#teOk'), teDel = $('#teDel');
teColors.innerHTML = TAG_COLORS.map(c => `<button class="te-c" data-c="${c}" style="--c:${c}" aria-label="Цвет"></button>`).join('');

const Menu = {
  open: false, held: false, row: null, task: null, clone: null, card: null, edit: null, color: TAG_COLORS[0],

  openFor(row) {
    const t = store.queue.find(x => x.id === row.dataset.id);
    if (!t) return;
    this.open = true; this.held = true; this.row = row; this.task = t; this.edit = null;
    haptic();
    const card = this.card = $('.card', row), r = card.getBoundingClientRect();
    const clone = this.clone = card.cloneNode(true);
    clone.classList.add('lifted');
    Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(clone);
    card.style.visibility = 'hidden';
    this.render();
    mScrim.hidden = false; menuEl.hidden = false;
    this.place(r);
    clone.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }], { duration: dur(260), easing: EASE, fill: 'forwards' });
    mScrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur(240) });
    menuEl.animate([{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: dur(320), easing: 'cubic-bezier(.2,1.1,.35,1)' });
  },

  /* под карточкой, если хватает места, иначе над ней */
  place(r) {
    const mh = menuEl.offsetHeight, mw = menuEl.offsetWidth, vw = document.documentElement.clientWidth;
    const top0 = (parseFloat(getComputedStyle($('.head')).paddingTop) || 14) - 6;
    const bottomLim = innerHeight - 16;
    let top = r.bottom + 12, origin = 'top';
    if (top + mh > bottomLim) { top = r.top - 12 - mh; origin = 'bottom'; }
    top = clamp(top, top0, bottomLim - mh);
    menuEl.style.top = top + 'px';
    menuEl.style.left = clamp(r.left + 8, 16, vw - mw - 16) + 'px';
    menuEl.style.transformOrigin = `${origin} left`;
  },

  render() {
    const t = this.task;
    miStart.innerHTML = t.startedAt
      ? `${ICON.stop}<span class="mi-t">Отменить начало</span><span class="mi-s">${fmtDT(t.startedAt)}</span>`
      : `${ICON.play}<span class="mi-t">Начать</span>${isPlanned(t) ? `<span class="mi-s">сегодня</span>` : ''}`;
    $('#miDateS').textContent = isPlanned(t) ? fmtDay(t.day).replace(/^[^,]+, /, '') : 'сегодня';
    miDate.value = t.day || todayKey; miDate.min = todayKey;
    let h = '';
    for (const g of store.tags) h += `<button class="tchip${t.tag === g.id ? ' on' : ''}" data-id="${g.id}" style="--tc:${g.color}">${esc(g.name)}</button>`;
    h += `<button class="tchip add" id="tAdd" aria-label="Новый тег">${ICON.plus}</button>`;
    mTags.innerHTML = h;
    mTags.hidden = false; mEdit.hidden = true;
  },

  /* палец отпущен — меню остаётся для выбора */
  release() { this.held = false; },

  /* палец повёл карточку — меню убирается, начинается перетаскивание */
  toDrag() {
    const card = this.card;
    this.teardown();
    if (card) card.style.visibility = '';
  },

  teardown() {
    this.clone && this.clone.remove();
    mScrim.hidden = true; menuEl.hidden = true;
    for (const el of [menuEl, mScrim]) el.getAnimations().forEach(a => a.cancel());
    this.open = false; this.held = false; this.clone = null; this.edit = null;
  },

  async close() {
    if (!this.open || this.closing) return;
    this.closing = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const t = this.task, row = this.row, card = this.card, clone = this.clone;
    if (row && t && inView(t)) { fillRow(row, t); if (clone) $('.c-meta', clone).innerHTML = $('.c-meta', card).innerHTML; }
    const gone = !t || !inView(t);
    menuEl.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.92)' }], { duration: dur(160), easing: 'ease-in', fill: 'forwards' });
    mScrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur(220), fill: 'forwards' });
    if (clone) {
      const cr = card.getBoundingClientRect();
      await clone.animate([{ transform: 'scale(1.03)', top: clone.style.top, opacity: 1 },
        { transform: gone ? 'scale(.94)' : 'scale(1)', top: cr.top + 'px', opacity: gone ? 0 : 1 }],
        { duration: dur(240), easing: EASE, fill: 'forwards' }).finished;
    } else await wait(dur(200));
    this.teardown();
    this.closing = false;
    if (gone && row) { await collapse(row); renderQueue(); }
    else if (card) card.style.visibility = '';
  },

  apply(fn, closeAfter = 0) {
    fn(this.task);
    save();
    if (inView(this.task)) renderQueue(); // если задача уходит из списка — схлопнется при закрытии
    if (this.clone && inView(this.task)) $('.c-meta', this.clone).innerHTML = metaHTML(this.task);
    if (closeAfter >= 0) setTimeout(() => this.close(), closeAfter);
  },

  /* ── теги ── */
  openEditor(g) {
    this.edit = g || 'new';
    teName.value = g ? g.name : '';
    this.color = g ? g.color : (TAG_COLORS.find(c => !store.tags.some(x => x.color === c)) || TAG_COLORS[0]);
    this.paintColor();
    teDel.hidden = !g;
    mTags.hidden = true; mEdit.hidden = false;
    teName.focus({ preventScroll: true });
    // клавиатура закроет низ экрана — меню поднимается наверх
    const top0 = (parseFloat(getComputedStyle($('.head')).paddingTop) || 14);
    menuEl.animate([{ top: menuEl.style.top }, { top: top0 + 'px' }], { duration: dur(280), easing: EASE });
    menuEl.style.top = top0 + 'px';
  },
  paintColor() {
    teColors.querySelectorAll('.te-c').forEach(b => b.classList.toggle('on', b.dataset.c === this.color));
    teName.style.setProperty('--tc', this.color);
  },
  commitTag() {
    const name = teName.value.trim().replace(/\s+/g, ' ');
    if (!this.edit) return false;
    const g = this.edit === 'new' ? null : this.edit;
    this.edit = null;
    if (!name) { this.render(); return false; }
    if (g) { g.name = name; g.color = this.color; save(); renderQueue(); this.render(); return false; }
    const tg = { id: uid(), name, color: this.color };
    store.tags.push(tg);
    this.task.tag = tg.id;
    save(); renderQueue();
    if (this.clone) $('.c-meta', this.clone).innerHTML = metaHTML(this.task);
    this.render();
    return true;
  },
};

miStart.addEventListener('click', () => Menu.apply(t => (t.startedAt ? Start.cancel(t) : Start.begin(t)), 160));
miDate.addEventListener('change', () => {
  const v = miDate.value; if (!v || !Menu.open) return;
  miDate.blur();
  Menu.apply(t => {
    const k = v > todayKey ? v : null;
    if (k === t.day || (!k && !isPlanned(t))) return;
    t.day = k;
    if (k) Start.cancel(t); // задача на будущий день не бывает начатой
  }, 120);
  haptic();
});
/* тег: нажатие — поставить/снять; удержание — изменить или удалить */
(() => {
  let lp = 0, longed = false;
  mTags.addEventListener('pointerdown', e => {
    const c = e.target.closest('.tchip:not(.add)'); longed = false; clearTimeout(lp);
    if (c) lp = setTimeout(() => { longed = true; haptic(); Menu.openEditor(store.tags.find(g => g.id === c.dataset.id)); }, 480);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) mTags.addEventListener(ev, () => clearTimeout(lp));
  mTags.addEventListener('contextmenu', e => e.preventDefault());
  mTags.addEventListener('click', e => {
    if (longed) { longed = false; return; }
    const c = e.target.closest('.tchip'); if (!c) return;
    if (c.classList.contains('add')) { Menu.openEditor(null); return; }
    const id = c.dataset.id;
    mTags.querySelectorAll('.tchip').forEach(x => x.classList.toggle('on', x === c && Menu.task.tag !== id));
    Menu.apply(t => { t.tag = t.tag === id ? null : id; }, 220);
  });
})();
teColors.addEventListener('click', e => {
  const b = e.target.closest('.te-c'); if (!b) return;
  e.preventDefault();
  Menu.color = b.dataset.c; Menu.paintColor();
});
teColors.addEventListener('pointerdown', e => e.preventDefault()); // не убирать клавиатуру
teName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (Menu.commitTag()) setTimeout(() => Menu.close(), 200); } });
teOk.addEventListener('pointerdown', e => e.preventDefault());
teOk.addEventListener('click', () => { if (Menu.commitTag()) setTimeout(() => Menu.close(), 200); });
teDel.addEventListener('pointerdown', e => e.preventDefault());
teDel.addEventListener('click', () => {
  const g = Menu.edit; if (!g || g === 'new') return;
  store.tags = store.tags.filter(x => x !== g);
  for (const t of [...store.queue, ...store.done]) if (t.tag === g.id) t.tag = null;
  Menu.edit = null; save(); renderQueue();
  if (Menu.clone) $('.c-meta', Menu.clone).innerHTML = metaHTML(Menu.task);
  Menu.render();
});
mScrim.addEventListener('click', () => {
  if (Menu.held) return;
  if (Menu.edit) Menu.commitTag();
  Menu.close();
});

/* ───────────────────────── notifications ───────────────────────── */
/*
 * Адрес push-сервера задаётся в config.js (pushServer). Логика:
 *  • сервер доступен и уведомления разрешены → расписание отправляется на сервер,
 *    системные уведомления приходят даже при закрытом приложении;
 *  • сервера нет / он недоступен (нет интернета, Cloudflare заблокирован) / уведомления
 *    не разрешены → напоминания показываются баннером внутри приложения в назначенное время,
 *    а пропущенные — при следующем открытии. Всё остальное работает как обычно.
 */
const CFG = Object.assign({ pushServer: '' }, window.DISCIPLINE_CONFIG || {});
const SERVER = String(CFG.pushServer || '').trim().replace(/\/+$/, '');

const b64u = {
  dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(r, c => c.charCodeAt(0)); },
};
const SEEN_KEY = 'discipline.seen', PUSH_KEY = 'discipline.push';
const seen = {
  get() { try { return +localStorage.getItem(SEEN_KEY) || 0; } catch (_) { return 0; } },
  mark() { try { localStorage.setItem(SEEN_KEY, String(now())); } catch (_) {} },
};
const pushOk = {
  get() { try { return localStorage.getItem(PUSH_KEY) === '1'; } catch (_) { return false; } },
  set(v) { try { localStorage.setItem(PUSH_KEY, v ? '1' : '0'); } catch (_) {} },
};
/* fetch с таймаутом — чтобы недоступный сервер не подвешивал приложение */
function fetchT(url, opts = {}, ms = 6000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}
const canPush = () => !!SERVER && 'PushManager' in window && !!window.Notification;
const api = op => SERVER + (SERVER.includes('?') ? '&' : '?') + 'op=' + op;

const Notify = {
  reg: null, key: null, sub: null, timers: [], t: 0, active: false,

  async init() {
    if ('serviceWorker' in navigator) {
      try { this.reg = await navigator.serviceWorker.register('sw.js'); } catch (_) { this.reg = null; } // file:// — без SW, это нормально
    }
    this.schedule(); // сразу — локальные напоминания не ждут сети
    if (canPush() && this.reg && Notification.permission === 'granted') { await this.connect(); this.schedule(); }
  },

  /* ключ сервера + подписка этого устройства */
  async connect() {
    if (!this.key) {
      try {
        const r = await fetchT(api('key'), { cache: 'no-store' });
        if (r.ok) { const j = await r.json(); if (j && j.key) this.key = j.key; }
      } catch (_) {}
    }
    if (this.key && !this.sub) await this.subscribe();
  },

  /* вызывается по нажатию «+» у напоминаний — запрос разрешения требует жеста пользователя */
  async ask() {
    if (!canPush()) return;
    if (Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (_) {} }
    if (Notification.permission === 'granted') { await this.connect(); this.schedule(); }
  },

  async subscribe() {
    try {
      const reg = this.reg || await navigator.serviceWorker.ready;
      const want = b64u.dec(this.key);
      let s = await reg.pushManager.getSubscription();
      const have = s && s.options && s.options.applicationServerKey && new Uint8Array(s.options.applicationServerKey);
      if (s && have && (have.length !== want.length || have.some((v, i) => v !== want[i]))) { await s.unsubscribe(); s = null; }
      this.sub = s || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
    } catch (_) { this.sub = null; }
  },

  /* напоминания, срабатывающие в интервале (from, to] */
  items(from = now(), to = Infinity) {
    const out = [];
    for (const t of store.queue) {
      if (!t.deadline || !t.reminders || !t.reminders.length) continue;
      const rs = [...t.reminders].sort((a, b) => b - a);
      rs.forEach((m, i) => {
        const at = t.deadline - m * 60000;
        if (at <= from || at > to) return;
        const sameDay = dayDiff(t.deadline, at) === 0;
        const end = sameDay ? `в${NB}${hm(t.deadline)}` : `${dateShort(t.deadline)},${NB}${hm(t.deadline)}`;
        const next = rs[i + 1];
        out.push({
          at, id: t.id, tag: `${t.id}:${m}`, title: t.title,
          body: `Завершение${NB}${end}` + (next ? ` · следующее за${NB}${next}${NB}мин` : ''),
        });
      });
    }
    return out.sort((a, b) => a.at - b.at);
  },

  schedule() {
    clearTimeout(this.t);
    this.t = setTimeout(() => this.flush(), 400);
  },

  async flush() {
    this.timers.forEach(clearTimeout); this.timers = [];
    const items = this.items(), gen = this.gen = (this.gen || 0) + 1;
    // запасной путь ставим сразу: баннеры внутри приложения, пока оно открыто
    for (const it of items) {
      const d = it.at - now();
      if (d > 2147483647) continue;
      this.timers.push(setTimeout(() => this.fire(it), d));
    }
    let ok = false;
    if (canPush() && Notification.permission === 'granted') {
      if (!this.sub) await this.connect();
      if (this.sub) {
        try {
          const r = await fetchT(api('sync'), {
            method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ subscription: this.sub.toJSON(), items }),
          });
          ok = r.ok;
        } catch (_) {}
      }
    }
    if (gen !== this.gen) return; // пока ждали сеть, расписание уже обновилось
    this.active = ok; pushOk.set(ok);
    if (ok) { this.timers.forEach(clearTimeout); this.timers = []; } // напоминания пришлёт сервер
  },

  fire(it) {
    if (document.hidden) {
      // фоновая вкладка (компьютер): системное уведомление, если разрешено; иначе покажем при возвращении
      if (window.Notification && Notification.permission === 'granted' && this.reg) {
        this.reg.showNotification(it.title, { body: it.body, tag: it.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
        seen.mark();
      }
      return;
    }
    Banner.push(it);
    seen.mark();
  },

  /* напоминания, сработавшие, пока приложение было закрыто, — если их не доставил сервер */
  showMissed() {
    const last = seen.get(), n = now();
    if (last && !pushOk.get()) this.items(Math.max(last, n - 864e5), n).slice(-3).forEach(it => Banner.push(it));
    seen.mark();
  },
};

/* ───────────────────────── in-app banner (имитация уведомления) ───────────────────────── */
const toast = $('#toast'), toastTitle = $('#toastTitle'), toastBody = $('#toastBody');
const Banner = {
  q: [], cur: null, t: 0, hiding: false,
  push(it) { this.q.push(it); if (!this.cur) this.next(); },
  next() {
    const it = this.q.shift();
    if (!it) { this.cur = null; return; }
    this.cur = it;
    toastTitle.textContent = typo(it.title);
    toastBody.textContent = it.body;
    toast.style.transform = '';
    toast.hidden = false;
    toast.animate([{ transform: 'translateY(calc(-100% - 24px))', opacity: .4 }, { transform: 'none', opacity: 1 }],
      { duration: dur(560), easing: 'cubic-bezier(.2,1.15,.35,1)' });
    this.arm();
  },
  arm() { clearTimeout(this.t); this.t = setTimeout(() => this.hide(), 5200); },
  async hide(fromY = 0) {
    if (!this.cur || this.hiding) return;
    this.hiding = true; clearTimeout(this.t);
    await toast.animate([{ transform: `translateY(${fromY}px)`, opacity: 1 }, { transform: 'translateY(calc(-100% - 24px))', opacity: .3 }],
      { duration: dur(280), easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished;
    toast.hidden = true;
    toast.getAnimations().forEach(a => a.cancel());
    toast.style.transform = '';
    this.cur = null; this.hiding = false;
    if (this.q.length) setTimeout(() => this.next(), 220);
  },
};
bindPress(toast, {
  down(x, y) { if (!Banner.cur || Banner.hiding) return; this.s = { x, y, dy: 0, moved: false }; clearTimeout(Banner.t); },
  move(x, y) {
    if (!this.s) return true;
    const dy = y - this.s.y;
    if (Math.abs(dy) > 6 || Math.abs(x - this.s.x) > 6) this.s.moved = true;
    this.s.dy = dy < 0 ? dy : dy * 0.25; // вверх — свободно, вниз — с сопротивлением
    toast.style.transform = `translateY(${this.s.dy}px)`;
    return true;
  },
  up(x, y, e) {
    const s = this.s; this.s = null;
    if (!s) return;
    if (s.dy < -28) { Banner.hide(s.dy); return; }
    if (!s.moved) {
      if (e && e.cancelable && e.type === 'touchend') e.preventDefault();
      const it = Banner.cur;
      Banner.hide();
      const task = it && store.queue.find(t => t.id === it.id);
      if (task && !Editor.open && !ui.busy) {
        setTab('queue');
        const row = rowMap.get(task.id);
        if (row) setTimeout(() => { row.scrollIntoView({ block: 'nearest' }); if (!Editor.open) Editor.show(task, $('.card', row)); }, 60);
      }
      return;
    }
    toast.style.transform = '';
    toast.animate([{ transform: `translateY(${s.dy}px)` }, { transform: 'none' }], { duration: dur(320), easing: 'cubic-bezier(.2,1.2,.4,1)' });
    Banner.arm();
  },
  cancel() { if (this.s) { toast.style.transform = ''; this.s = null; Banner.arm(); } },
});

/* ───────────────────────── calendars ───────────────────────── */
/* Главный: сегодня — в кольце; выбранный будущий день — залит; точка — на дне уже есть задачи.
   Нажатие на будущий день — план на этот день; на сегодня — обратно к очереди;
   двойное нажатие — к текущему месяцу и сегодняшнему дню. */
const calMain = new Calendar($('#calMain'), {
  keys: () => [todayKey, view.day, ...plannedDays].filter(Boolean),
  mark(k) {
    let c = k === todayKey ? ' today' : '';
    if (k === view.day) c += ' sel';
    if (plannedDays.has(k)) c += ' dot';
    return c;
  },
});
(() => {
  let last = 0, lx = 0, ly = 0;
  $('#calMain').addEventListener('click', e => {
    const t = now();
    if (t - last < 320 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) {
      last = 0; selectDay(null); calMain.home(false); haptic(); return;
    }
    last = t; lx = e.clientX; ly = e.clientY;
    const d = e.target.closest('.d'); if (!d) return;
    const k = d.dataset.k;
    if (k < todayKey) {
      if (!REDUCED) d.animate([{ transform: 'none' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 200 });
      return;
    }
    if ((k === todayKey ? null : k) !== view.day) { haptic(); selectDay(k); }
  });
})();

function* rangeKeys() {
  if (range.pending) { yield range.pending; return; }
  const d = fromKey(range.start), e = fromKey(range.end);
  for (let i = 0; d <= e && i < 3700; i++) { yield keyOf(d); d.setDate(d.getDate() + 1); }
}
const calDone = new Calendar($('#calDone'), {
  keys: () => [todayKey, ...rangeKeys()],
  mark(k) {
    let c = k === todayKey ? ' today' : '';
    if (range.pending) { if (k === range.pending) c += ' pend'; return c; }
    if (k >= range.start && k <= range.end) {
      c += ' in';
      if (k === range.start) c += ' rs';
      if (k === range.end) c += ' re';
    }
    return c;
  },
});

// выбор периода: 1-е нажатие — начало, 2-е — конец; удержание 2 с — сброс к текущей неделе
(() => {
  const el = $('#calDone');
  let suppress = false, holdT = 0, dimT = 0, sx = 0, sy = 0;
  const stopHold = () => { clearTimeout(holdT); clearTimeout(dimT); el.classList.remove('holding'); };
  const startHold = (x, y) => {
    stopHold(); sx = x; sy = y;
    dimT = setTimeout(() => el.classList.add('holding'), 350);
    holdT = setTimeout(() => {
      el.classList.remove('holding');
      suppress = true; setTimeout(() => (suppress = false), 600);
      resetRange();
      calDone.refresh(); calDone.home(false);
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
      haptic();
      renderDone(true);
    }, 2000);
  };
  el.addEventListener('touchstart', e => { if (e.touches.length === 1) startHold(e.touches[0].clientX, e.touches[0].clientY); else stopHold(); }, { passive: true });
  el.addEventListener('touchmove', e => { const t = e.touches[0]; if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) stopHold(); }, { passive: true });
  el.addEventListener('touchend', stopHold);
  el.addEventListener('touchcancel', stopHold);
  el.addEventListener('mousedown', e => { if (now() - lastTouch > 800) startHold(e.clientX, e.clientY); });
  el.addEventListener('mousemove', e => { if (e.buttons && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stopHold(); });
  el.addEventListener('mouseup', stopHold);
  el.addEventListener('mouseleave', stopHold);
  el.addEventListener('contextmenu', e => e.preventDefault());

  el.addEventListener('click', e => {
    if (suppress) { suppress = false; return; }
    const d = e.target.closest('.d'); if (!d) return;
    const k = d.dataset.k;
    if (!range.pending) range.pending = k;
    else {
      const a = range.pending;
      range.start = a < k ? a : k; range.end = a < k ? k : a; range.pending = null;
    }
    haptic();
    calDone.refresh();
    renderDone(true);
  });
})();

/* ───────────────────────── ticking / day change ───────────────────────── */
function tick() {
  const k = keyOf(new Date());
  if (k !== todayKey) {
    todayKey = k;
    if (promote()) save();
    if (view.day && view.day <= todayKey) { view.day = null; renderPlanBar(false); }
    renderToday(); renderQueue(); calMain.refresh(); calDone.refresh();
    if (tab === 'done') renderDone();
  }
  if (view.day) renderPlanBar(false);
  for (const t of store.queue) { const row = rowMap.get(t.id); if (row) fillRow(row, t); }
  if (Editor.open && Editor.draft && Editor.draft.deadline && !Editor.closing) {
    const left = Editor.draft.deadline - now();
    if (!Editor.draft.doneAt) { sDlLeft.textContent = fmtLeft(left); sDlLeft.className = 's-dl-left' + (left <= 0 ? ' over' : left < 36e5 ? ' soon' : ''); }
  }
}
setInterval(() => { tick(); if (!document.hidden) seen.mark(); }, 20000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); Notify.showMissed(); Notify.schedule(); }
  else seen.mark();
});
addEventListener('pagehide', () => seen.mark());
addEventListener('online', () => Notify.schedule());

/* ───────────────────────── iOS: «съеденный» низ экрана ───────────────────────── */
/* Баг WebKit в приложениях с экрана «Домой»: после первой клавиатуры высота окна
   уменьшается (~60 px) и не восстанавливается — нижняя панель «всплывает».
   Лечится принудительным пересчётом раскладки после закрытия клавиатуры. */
let maxH = innerHeight;
const isField = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|date|datetime-local)$/.test(el.type)));
addEventListener('resize', () => { if (!isField(document.activeElement)) maxH = Math.max(maxH, innerHeight); });
function healViewport() {
  if (innerHeight >= maxH - 4 || isField(document.activeElement)) return;
  const keep = [queueScroll, $('#doneScroll'), calMain.vp, calDone.vp].map(el => [el, el.scrollTop]);
  appEl.style.display = 'none';
  void appEl.offsetHeight;
  appEl.style.display = '';
  keep.forEach(([el, v]) => { el.scrollTop = v; });
  maxH = Math.max(maxH, innerHeight);
}
document.addEventListener('focusout', () => setTimeout(healViewport, 160));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(healViewport, 60); });

/* ───────────────────────── boot ───────────────────────── */
load();
if (promote()) { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {} }
resetRange();
renderToday();
renderQueue();
renderDone();
Notify.init();
setTimeout(() => Notify.showMissed(), 700);
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}
