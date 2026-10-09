(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const PHONE = '+61401194604';

  /* ---------- page loaded ---------- */
  requestAnimationFrame(() => document.documentElement.classList.add('is-loaded'));
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Sydney time helpers ---------- */
  function sydneyNow() {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t)?.value;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[get('weekday')], h: +get('hour'), m: +get('minute') };
  }
  const HOURS = { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 16] };
  const fmt = h => (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am');
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function openState() {
    const { day, h, m } = sydneyNow();
    const t = h + m / 60;
    const today = HOURS[day];
    if (today && t >= today[0] && t < today[1]) {
      return { open: true, text: `Open now · until ${fmt(today[1])}`, day };
    }
    if (today && t < today[0]) return { open: false, text: `Closed · opens today at ${fmt(today[0])}`, day };
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d]) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : DAYS[d]} at ${fmt(HOURS[d][0])}`, day };
    }
  }
  function updateStatus() {
    const s = openState();
    const { h, m } = sydneyNow();
    $('#clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    [['#heroDot', '#heroStatus'], ['#visitDot', '#visitStatus']].forEach(([d, t], i) => {
      $(d).classList.toggle('is-closed', !s.open);
      $(t).innerHTML = i === 0 ? `<b>${s.text}</b>` : s.text;
    });
    $$('#hours li').forEach(li => li.classList.toggle('is-today', +li.dataset.day === s.day));
  }
  updateStatus();
  setInterval(updateStatus, 30000);

  /* ---------- split-flap board ---------- */
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function buildFlap(el) {
    const word = el.dataset.flap;
    el.innerHTML = '';
    el.setAttribute('aria-label', word);
    [...word].forEach(ch => {
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      if (ch === ' ') { s.className = 'sp'; s.textContent = ''; }
      else s.textContent = reduce ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
      s.dataset.ch = ch;
      el.appendChild(s);
    });
  }
  function flipIn(el, delay = 0) {
    if (reduce) return;
    $$('span', el).forEach((s, i) => {
      const target = s.dataset.ch;
      if (target === ' ') return;
      let n = 0; const max = 6 + i * 2 + Math.floor(Math.random() * 4);
      setTimeout(function tick() {
        n++;
        s.textContent = n >= max ? target : CHARS[Math.floor(Math.random() * CHARS.length)];
        if (n < max) setTimeout(tick, 45);
      }, delay);
    });
  }
  const flaps = $$('[data-flap]');
  flaps.forEach(buildFlap);
  flaps.forEach((f, i) => flipIn(f, 500 + i * 120));
  // periodically re-flip one random row so the board feels alive
  if (!reduce) setInterval(() => {
    const rows = $$('.board__row');
    const r = rows[Math.floor(Math.random() * rows.length)];
    $$('[data-flap]', r).forEach(f => { buildFlap(f); flipIn(f); });
  }, 4200);

  /* ---------- header behaviour, progress, to-top, dock ---------- */
  const header = $('.header'), progress = $('.progress'), toTop = $('#toTop'), dock = $('#dock');
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('is-scrolled', y > 20);
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    toTop.classList.toggle('is-shown', y > 900);
    dock.classList.toggle('is-shown', y > 500);
    lastY = y;
    // parallax
    if (!reduce) $$('[data-parallax]').forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const k = parseFloat(img.dataset.parallax);
      const off = (r.top + r.height / 2 - innerHeight / 2) * k;
      img.style.transform = `translate3d(0,${off.toFixed(1)}px,0) scale(1.15)`;
    });
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* active nav link */
  const navLinks = $$('.nav a');
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['slips', 'services', 'about', 'reviews', 'visit'].forEach(id => { const el = document.getElementById(id); el && secObs.observe(el); });

  /* ---------- mobile menu ---------- */
  const burger = $('.burger'), menu = $('#mobileMenu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (open) header.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 980) setMenu(false); });

  /* ---------- split headings into words ---------- */
  $$('[data-split]').forEach(h => {
    const html = h.innerHTML.replace(/&nbsp;/g, ' ');
    const words = html.split(/ (?![^<]*>)/);
    h.innerHTML = words.map((w, i) => `<span class="split-word"><span style="--i:${i}">${w}</span></span>`).join(' ');
    h.classList.add('reveal-split');
  });

  /* ---------- reveal on scroll ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, [data-split], .route, .score, .stats').forEach(el => revealObs.observe(el));

  /* ---------- counters ---------- */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
      const dur = 1600, t0 = performance.now();
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      })(reduce ? t0 + dur : t0);
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ---------- slip tabs ---------- */
  const tabs = $('.tabs');
  $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
  tabs.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tabs.dataset.active === 'pink' ? 'blue' : 'pink';
      selectTab(next); $(`[data-tab="${next}"]`).focus();
    }
  });
  function selectTab(name) {
    tabs.dataset.active = name;
    $$('[data-tab]').forEach(b => { const on = b.dataset.tab === name; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $$('.slip-panel').forEach(p => {
      const on = p.id === 'panel-' + name;
      p.hidden = !on; p.classList.remove('is-in');
      if (on) { void p.offsetWidth; p.classList.add('is-in'); }
    });
  }

  /* ---------- buttons: ripple + magnetic ---------- */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .chip, .round');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
  });
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18, y = (e.clientY - r.top - r.height / 2) * 0.28;
        b.style.transform = `translate(${x}px, ${y - 3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });

    /* tilt + spotlight cards */
    $$('[data-tilt]').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
        c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-4px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });

    /* cursor glow */
    const glow = $('.glow');
    document.documentElement.classList.add('has-pointer');
    let gx = innerWidth / 2, gy = innerHeight / 2, cx = gx, cy = gy;
    addEventListener('pointermove', e => { gx = e.clientX; gy = e.clientY; }, { passive: true });
    (function loop() { cx += (gx - cx) * .12; cy += (gy - cy) * .12; glow.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  }

  /* ---------- reviews ---------- */
  const COLORS = ['#E9A400', '#2F8CFF', '#2BB5A0', '#F08A3C', '#4F6BFF', '#6C7A96', '#D9822B', '#1F9D8B'];
  const initials = n => n.replace(/[^A-Za-zÀ-ž .]/g, '').split(/[ .]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '★';
  const color = n => COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const STARS = '<svg><use href="#i-star"/></svg>'.repeat(5);
  const TAGS = { pink: ['pink', 'Pink slip'], blue: ['blue', 'Blue slip'], svc: ['svc', 'Repairs & service'] };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const ALL = [...window.FEATURED, ...window.REVIEWS];
  const grid = $('#revGrid'), moreBtn = $('#revMore');
  let filter = 'all', shown = 0;
  const PAGE = () => innerWidth < 640 ? 4 : 9;

  $$('.chip').forEach(ch => {
    const f = ch.dataset.filter;
    $('span', ch).textContent = f === 'all' ? ALL.length : ALL.filter(r => r.t === f).length;
    ch.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.toggle('is-active', c === ch));
      filter = f; shown = 0; grid.innerHTML = ''; renderMore();
    });
  });
  function list() { return filter === 'all' ? window.REVIEWS.concat(window.FEATURED) : ALL.filter(r => r.t === filter); }
  function card(r, i) {
    const [cls, label] = TAGS[r.t];
    return `<article class="rev" style="animation-delay:${(i % 9) * 60}ms">
      <div class="rev__head"><span class="avatar" style="background:${color(r.n)}">${initials(r.n)}</span>
        <div style="min-width:0"><div class="rev__name">${esc(r.n)}</div><div class="rev__stars" aria-label="5 stars">${STARS}</div></div>
        <svg class="rev__g" aria-label="Google review"><use href="#i-google"/></svg></div>
      <p>${esc(r.x)}</p><span class="rev__tag ${cls}">${label}</span></article>`;
  }
  function renderMore() {
    const l = list(), next = l.slice(shown, shown + PAGE());
    grid.insertAdjacentHTML('beforeend', next.map(card).join(''));
    shown += next.length;
    moreBtn.style.display = shown >= l.length ? 'none' : '';
  }
  moreBtn.addEventListener('click', renderMore);
  renderMore();

  /* featured carousel */
  const slides = $('#featureSlides'), dots = $('#featDots'), feature = $('#feature');
  slides.innerHTML = window.FEATURED.map((r, i) => `
    <div class="feature__slide${i === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${window.FEATURED.length}">
      <p>${esc(r.x)}</p>
      <div class="feature__who"><span class="avatar" style="background:${color(r.n)}">${initials(r.n)}</span>
        <div><strong>${esc(r.n)}</strong><small>${TAGS[r.t][1]} · Google review ★★★★★</small></div></div>
    </div>`).join('');
  dots.innerHTML = window.FEATURED.map((_, i) => `<button aria-label="Show review ${i + 1}"><i></i></button>`).join('');
  const sEls = $$('.feature__slide', slides), dEls = $$('button', dots);
  let cur = 0, timer;
  const DUR = 7000;
  feature.style.setProperty('--dur', DUR + 'ms');
  function go(i) {
    cur = (i + sEls.length) % sEls.length;
    sEls.forEach((s, k) => s.classList.toggle('is-active', k === cur));
    dEls.forEach((d, k) => { d.classList.remove('is-active'); d.classList.toggle('is-done', k < cur); });
    void dots.offsetWidth;
    dEls[cur].classList.add('is-active');
    clearTimeout(timer);
    if (!reduce) timer = setTimeout(() => go(cur + 1), DUR);
  }
  dEls.forEach((d, i) => d.addEventListener('click', () => go(i)));
  $('#featPrev').addEventListener('click', () => go(cur - 1));
  $('#featNext').addEventListener('click', () => go(cur + 1));
  let remaining = DUR, started = Date.now();
  feature.addEventListener('pointerenter', () => { feature.classList.add('is-paused'); clearTimeout(timer); remaining = DUR - (Date.now() - started); });
  feature.addEventListener('pointerleave', () => { feature.classList.remove('is-paused'); timer = setTimeout(() => go(cur + 1), Math.max(800, remaining)); });
  const _go = go; go = function (i) { started = Date.now(); remaining = DUR; _go(i); };
  // swipe
  let sx = null;
  feature.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  feature.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); sx = null; });
  go(0);

  /* ---------- gallery lightbox ---------- */
  const items = $$('.gal__item'), lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let li = 0, lastFocus;
  function openLb(i) {
    li = (i + items.length) % items.length;
    const img = $('img', items[li]);
    lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = items[li].dataset.cap;
    if (!lb.classList.contains('is-open')) { lastFocus = document.activeElement; lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; $('#lbClose').focus(); }
  }
  function closeLb() { lb.classList.remove('is-open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
  items.forEach((it, i) => it.addEventListener('click', () => openLb(i)));
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => openLb(li - 1));
  $('#lbNext').addEventListener('click', () => openLb(li + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') openLb(li + 1);
    if (e.key === 'ArrowLeft') openLb(li - 1);
  });

})();
