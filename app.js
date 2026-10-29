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
};

/* ───────────────────────── store ───────────────────────── */
const KEY = 'discipline.v1';
const store = { queue: [], done: [] };
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) { store.queue = s.queue || []; store.done = s.done || []; }
  } catch (_) {}
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  Notify.schedule();
}
const findTask = id => store.queue.find(t => t.id === id) || store.done.find(t => t.id === id);

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
/* Непрерывная лента недель (±10 лет). Активный месяц — тот, что в центре окна;
   дни остальных месяцев приглушены. Недели дорисовываются лениво, пачками. */
const monthIdx = d => d.getFullYear() * 12 + d.getMonth();
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
class Calendar {
  constructor(root, opts) {
    this.root = root; this.o = opts; this.CH = 8;
    const y = new Date().getFullYear();
    this.origin = mondayOf(new Date(y - 10, 0, 1));
    this.chunks = Math.ceil(this.weekIdx(new Date(y + 11, 0, 1)) / this.CH);
    root.innerHTML =
      '<div class="cal-head"><span class="cal-label"></span></div>' +
      '<div class="cal-wd">' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w => `<span>${w}</span>`).join('') + '</div>' +
      '<div class="cal-vp"><div class="cal-track"></div></div><style></style>';
    this.label = $('.cal-label', root); this.vp = $('.cal-vp', root); this.track = $('.cal-track', root);
    this.css = $('style', root);
    const frag = document.createDocumentFragment();
    for (let c = 0; c < this.chunks; c++) {
      const el = document.createElement('div'); el.className = 'cal-chunk'; el.dataset.c = c; frag.appendChild(el);
    }
    this.track.appendChild(frag);
    this.io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && this.fill(e.target)),
      { root: this.vp, rootMargin: '200% 0px' });
    for (const el of this.track.children) this.io.observe(el);
    this.vp.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.month = null;
    requestAnimationFrame(() => this.goto(monthIdx(new Date()), false));
  }
  get row() { return this._row || (this._row = this.vp.clientHeight / 6 || 24); }
  weekIdx(d) { return Math.round((mondayOf(d) - this.origin) / 864e5 / 7); }
  /* показать месяц: неделя с 1-м числом — первой строкой */
  goto(mi, smooth) {
    const w = this.weekIdx(new Date(Math.floor(mi / 12), mi % 12, 1));
    const c = Math.floor(w / this.CH);
    for (let i = c - 1; i <= c + 1; i++) this.fill(this.track.children[i]);
    this.vp.scrollTo({ top: w * this.row, behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
    this.setMonth(mi);
  }
  onScroll() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const w = Math.floor((this.vp.scrollTop + this.vp.clientHeight / 2) / this.row);
      const d = new Date(this.origin); d.setDate(d.getDate() + w * 7 + 3); // четверг строки в центре
      const mi = monthIdx(d);
      if (mi !== this.month) this.setMonth(mi);
    });
  }
  setMonth(mi) {
    const dir = this.month == null ? 0 : Math.sign(mi - this.month);
    if (mi === this.month) return;
    this.month = mi;
    const y = Math.floor(mi / 12), m = mi % 12, key = `${y}-${pad(m + 1)}`, id = '#' + this.root.id;
    this.label.innerHTML = `${MON_NOM[m]}<span class="y">${y}</span>`;
    this.css.textContent =
      `${id} .d:not([data-m="${key}"]):not(.rs):not(.re) b{color:var(--faint)}` +
      `${id} .d.today:not([data-m="${key}"]) b{opacity:.55}`;
    if (dir && !REDUCED) this.label.animate(
      [{ transform: `translateY(${dir * 8}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 220, easing: EASE });
  }
  fill(el) {
    if (!el || el.dataset.f) return;
    el.dataset.f = '1';
    const c = +el.dataset.c;
    const d = new Date(this.origin); d.setDate(d.getDate() + c * this.CH * 7);
    let h = '';
    for (let i = 0; i < this.CH * 7; i++) {
      const y = d.getFullYear(), mo = pad(d.getMonth() + 1);
      h += `<span class="d c${i % 7}" data-k="${y}-${mo}-${pad(d.getDate())}" data-m="${y}-${mo}"><b>${d.getDate()}</b></span>`;
      d.setDate(d.getDate() + 1);
    }
    el.innerHTML = h;
    this.deco(el);
  }
  deco(el) {
    for (const c of el.children) {
      const extra = this.o.mark(c.dataset.k);
      c.className = c.className.replace(/\s(today|in|rs|re|pend)\b/g, '') + extra;
    }
  }
  refresh() { this.track.querySelectorAll('.cal-chunk[data-f]').forEach(el => this.deco(el)); }
}

/* ───────────────────────── header / today ───────────────────────── */
let todayKey = keyOf(new Date());
function renderToday() {
  const d = new Date();
  $('#todayWd').textContent = WD[d.getDay()];
  $('#todayNum').textContent = d.getDate();
  $('#todayMon').textContent = MON_GEN[d.getMonth()];
}

/* ───────────────────────── queue rendering ───────────────────────── */
const queueEl = $('#queue'), queueScroll = $('#queueScroll');
const rowMap = new Map();
const ui = { busy: false, drag: null };

function metaHTML(t) {
  let h = t.startedAt ? `<span class="m start">${ICON.play}${fmtDT(t.startedAt)}</span>` : '';
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
  const ids = new Set(store.queue.map(t => t.id));
  for (const [id, row] of rowMap) if (!ids.has(id)) { row.remove(); rowMap.delete(id); }
  store.queue.forEach((t, i) => {
    let row = rowMap.get(t.id);
    if (!row) { row = makeRow(t); rowMap.set(t.id, row); }
    fillRow(row, t);
    if (queueEl.children[i] !== row) queueEl.insertBefore(row, queueEl.children[i] || null);
  });
  $('#queueEmpty').hidden = store.queue.length > 0;
  $('#queueCount').textContent = store.queue.length || '';
}

/* ───────────────────────── gestures: tap / swipe / drag ───────────────────────── */
function rowGestures(row) {
  const card = $('.card', row);
  let g = null;
  bindPress(card, {
    down(x, y) {
      if (ui.busy || ui.drag || Editor.open) return;
      g = { x0: x, y0: y, x, y, t0: performance.now(), mode: null, trail: [[x, performance.now()]] };
      g.lp = setTimeout(() => { if (g && !g.mode) { g.mode = 'drag'; dragStart(row, g); } }, 380);
    },
    move(x, y) {
      if (!g) return false;
      g.x = x; g.y = y;
      const dx = x - g.x0, dy = y - g.y0;
      if (g.mode === 'drag') { dragMove(y); return true; }
      if (!g.mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        clearTimeout(g.lp);
        g.mode = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'swipe' : 'scroll';
        if (g.mode === 'swipe') { row.classList.add('swiping'); g.sx = x - Math.sign(dx) * 8; }
      }
      if (g.mode === 'swipe') {
        if (g.shaken) return true;
        const t = performance.now();
        g.trail.push([x, t]); while (g.trail.length > 2 && t - g.trail[0][1] > 90) g.trail.shift();
        if (trackShake(g, x - g.x0, row)) {
          g.shaken = true;
          shakeToggle(row);
          return true;
        }
        swipeMove(row, x - g.sx);
        return true;
      }
      return false;
    },
    up(x, y, e) {
      if (!g) return;
      clearTimeout(g.lp);
      const m = g.mode;
      if (m === 'drag') dragEnd();
      else if (m === 'swipe') {
        if (g.shaken) { g = null; return; }
        const [px, pt] = g.trail[0];
        // после встряхивания «вполсилы» не засчитываем резкий рывок как смахивание
        const v = g.sh && g.sh.n >= 2 ? 0 : (x - px) / Math.max(1, performance.now() - pt);
        swipeEnd(row, x - g.sx, v);
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
      if (g.mode === 'drag') dragEnd();
      else if (g.mode === 'swipe') swipeEnd(row, 0, 0);
      g = null;
    }
  });
}

const swipeThreshold = row => Math.min(120, row.offsetWidth * 0.3);

/* Встряхивание: 4 движения подряд через исходную точку (→←→← или ←→←→):
   каждый раз палец уходит на другую сторону минимум на 14 px, но не дальше ~70% порога
   смахивания, и всё укладывается в 1,6 с. Простое «покачивание» с возвратом в центр не считается. */
function trackShake(g, dx, row) {
  const STROKE = 14, MAX = swipeThreshold(row) * 0.7, T = performance.now();
  const sh = g.sh || (g.sh = { side: 0, n: 0, t0: T, dead: false });
  if (sh.dead) return false;
  if (Math.abs(dx) > MAX || (sh.n && T - sh.t0 > 1600)) { sh.dead = true; return false; }
  if (Math.abs(dx) >= STROKE && Math.sign(dx) !== sh.side) {
    if (!sh.n) sh.t0 = T;
    sh.side = Math.sign(dx); sh.n++;
  }
  return sh.n >= 4;
}
/* начатая → не начатая; не начатая → начата сейчас */
function shakeToggle(row) {
  const t = store.queue.find(x => x.id === row.dataset.id);
  if (!t) return;
  t.startedAt = t.startedAt ? null : now();
  haptic();
  const card = $('.card', row), from = row._x || 0;
  card.style.transform = '';
  row.classList.remove('swiping');
  resetActs(row); row._x = 0;
  card.animate([{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(-5px,0,0)' }, { transform: 'translate3d(3px,0,0)' }, { transform: 'none' }],
    { duration: dur(420), easing: 'ease-out' });
  fillRow(row, t);
  const st = $('.m.start', row);
  if (st && !REDUCED) st.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,1.3,.4,1)' });
  else if (!st && !REDUCED) $('.c-meta', row).animate([{ opacity: .3 }, { opacity: 1 }], { duration: 260 });
  save();
}
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
  if (to !== f) { const [t] = store.queue.splice(f, 1); store.queue.splice(to, 0, t); }
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
    return `<span class="m">${ICON.play}${fmtStamp(t.startedAt)}</span>` +
      `<span class="m strong">${ICON.timer}${fmtDur(Math.max(0, t.doneAt - t.startedAt))}</span>`;
  }
  return `<span class="m">${ICON.check}${fmtStamp(t.doneAt)}</span>`;
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

/* ───────────────────────── tabs ───────────────────────── */
let tab = 'queue';
function setTab(t) {
  if (t === tab) return;
  tab = t;
  document.querySelectorAll('.screen').forEach(s => {
    const on = s.dataset.screen === t;
    s.classList.toggle('is-active', on); s.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.tab === t));
  $('.seg').classList.toggle('on-done', t === 'done');
  $('.dock').classList.toggle('on-done', t === 'done');
  if (t === 'done') renderDone();
}
document.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

/* ───────────────────────── editor sheet ───────────────────────── */
const sheet = $('#sheet'), inner = $('#sheetInner'), scrim = $('#scrim');
const sTitle = $('#sTitle'), sDl = $('#sDl'), sDlText = $('#sDlText'), sDlLeft = $('#sDlLeft'),
  sDlInput = $('#sDlInput'), sDlClear = $('#sDlClear'), sRem = $('#sRem'), sChips = $('#sChips'),
  sRemAdd = $('#sRemAdd'), sRemWrap = $('#sRemWrap'), sRemInput = $('#sRemInput'),
  sInfo = $('#sInfo'), sFoot = $('#sFoot'), sRestore = $('#sRestore'), sDelete = $('#sDelete');

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
      : { id: uid(), title: '', deadline: null, startedAt: null, reminders: [], createdAt: now(), doneAt: null };
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
    const d = this.draft;
    if (ts && !isNaN(ts)) {
      if (!d.deadline && !d.startedAt) d.startedAt = now(); // начало = момент первого выставления срока (если задачу не начали вручную)
      d.deadline = ts;
    } else {
      d.deadline = null; d.startedAt = null; d.reminders = [];
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
        const row = rowMap.get(d.id), card = $('.card', row);
        card.style.visibility = 'hidden';
        queueScroll.scrollTop = queueScroll.scrollHeight;
        target = card; reveal = card;
      } else target = $('#fab');
    } else {
      d.title = title || this.task.title;
      Object.assign(this.task, d);
      if (this.task.doneAt) { renderDone(); const r = doneEl.querySelector(`[data-id="${d.id}"] .card`); target = r; if (r) { r.style.visibility = 'hidden'; reveal = r; } }
      else { renderQueue(); const row = rowMap.get(d.id); target = row && $('.card', row); reveal = target; }
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
sDelete.addEventListener('click', () => Editor.remove());
sRestore.addEventListener('click', () => Editor.restore());
scrim.addEventListener('click', () => { if (now() - Editor.openedAt > 350) Editor.close(); });
$('#fab').addEventListener('click', e => { if (!ui.busy && !Editor.open) Editor.show(null, e.currentTarget); });
addEventListener('resize', () => { if (Editor.open && !Editor.closing) Editor.layout(); });

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
        const r = await fetchT(SERVER + '/api/key', { cache: 'no-store' });
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
          const r = await fetchT(SERVER + '/api/sync', {
            method: 'POST', headers: { 'content-type': 'application/json' },
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
const calMain = new Calendar($('#calMain'), { mark: k => (k === todayKey ? ' today' : '') });

// двойное нажатие — вернуться к текущему месяцу
(() => {
  let last = 0, lx = 0, ly = 0;
  $('#calMain').addEventListener('click', e => {
    const t = now();
    if (t - last < 320 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) {
      calMain.goto(monthIdx(new Date()), true); last = 0;
    } else { last = t; lx = e.clientX; ly = e.clientY; }
  });
})();

const calDone = new Calendar($('#calDone'), {
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
      calDone.refresh(); calDone.goto(monthIdx(new Date()), true);
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
    renderToday(); calMain.refresh(); calDone.refresh();
    if (tab === 'done') renderDone();
  }
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

/* ───────────────────────── boot ───────────────────────── */
load();
resetRange();
renderToday();
renderQueue();
renderDone();
Notify.init();
setTimeout(() => Notify.showMissed(), 700);
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}
