/* ══════════════════════════════════════════════════════════════════
   NAPOLI Cornetto · interactions et animations · v2 « maison »
   GSAP 3.13 (ScrollTrigger, SplitText) + Lenis 1.3, chargés via CDN.
   Le contenu reste lisible si une librairie ne charge pas, et chaque
   animation se coupe sous prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ⚠️ CONFIG À CONFIRMER AVEC LE CLIENT
     Horaires par jour (0 = dimanche … 6 = samedi), null = fermé.
     Reporter tout changement dans index.html (#venir, footer, JSON-LD). */
  const CONFIG = {
    tz: 'Europe/Paris',
    hours: {
      0: null,
      1: null,
      2: null,
      3: ['11:00', '18:00'],
      4: ['10:00', '18:00'],
      5: ['11:00', '18:00'],
      6: ['10:00', '18:00'],
    },
    imgBase: 'https://images.unsplash.com/photo-',
    quoteDelay: 6.5,
  };

  const FILLINGS = {
    pistache:  { label: 'Pistache',     bg: '#b7c97b', deep: '#a6ba69', ink: '#1c2610', desc: 'Crème de pistache onctueuse, pour les puristes.' },
    nutella:   { label: 'Nutella',      bg: '#5b3624', deep: '#6a4230', ink: '#f6e8d8', desc: 'Le grand classique, coulant à souhait.' },
    noisette:  { label: 'Noisette',     bg: '#c9a074', deep: '#bb8f61', ink: '#26170b', desc: 'Praliné noisette, tout en rondeur.' },
    speculoos: { label: 'Spéculoos',    bg: '#c07c45', deep: '#b06c36', ink: '#22130a', desc: 'Biscuit caramélisé et épices douces.' },
    kinder:    { label: 'Kinder Bueno', bg: '#ead9bd', deep: '#ddc8a5', ink: '#3a2316', desc: "Pour l'enfant qui sommeille en vous." },
    kitkat:    { label: 'Kit Kat',      bg: '#a8241d', deep: '#b8352d', ink: '#fff3ea', desc: "Du croquant jusqu'au cœur." },
    oreo:      { label: 'Oreo',         bg: '#22201d', deep: '#312e2a', ink: '#f1efea', desc: 'Cacao intense et crème, en noir et blanc.' },
  };

  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';
  const animate = hasGSAP && !reduce;
  const root = document.documentElement;

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger, ...(hasSplit ? [SplitText] : []));

  /* ─────────── Statut ouvert / fermé (heure de Paris) ─────────── */
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const fmt = (s) => { const [h, m] = s.split(':'); return `${Number(h)}h${m === '00' ? '' : m}`; };

  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: CONFIG.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[get('weekday')], minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function getStatus() {
    const { day, minutes } = parisNow();
    const today = CONFIG.hours[day];
    if (today && minutes >= toMin(today[0]) && minutes < toMin(today[1])) {
      const left = toMin(today[1]) - minutes;
      return {
        open: true, soon: left <= 45,
        short: left <= 45 ? 'Ferme bientôt' : 'Ouvert',
        more: `, jusqu'à ${fmt(today[1])}`,
        long: `Ouvert maintenant, jusqu'à ${fmt(today[1])}.`,
      };
    }
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const h = CONFIG.hours[d];
      if (!h || (i === 0 && minutes >= toMin(h[0]))) continue;
      const when = i === 0 ? `aujourd'hui à ${fmt(h[0])}` : i === 1 ? `demain à ${fmt(h[0])}` : `${DAYS[d]} à ${fmt(h[0])}`;
      return { open: false, soon: false, short: 'Fermé', more: `, ouvre ${when}`, long: `Fermé pour le moment. Réouverture ${when}.` };
    }
    return { open: false, soon: false, short: 'Fermé', more: '', long: 'Fermé pour le moment.' };
  }

  function renderStatus() {
    const s = getStatus();
    $$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-soon', s.soon);
      const t = $('[data-status-text]', el);
      const m = $('[data-status-more]', el);
      const l = $('[data-status-long]', el);
      if (t) t.textContent = s.short;
      if (m) m.textContent = s.more;
      if (l) l.textContent = s.long;
    });
    const { day } = parisNow();
    $$('[data-day]').forEach((li) => {
      const on = Number(li.dataset.day) === day;
      li.classList.toggle('is-today', on);
      if (on) li.setAttribute('aria-current', 'date'); else li.removeAttribute('aria-current');
    });
  }
  renderStatus();
  setInterval(renderStatus, 60_000);

  /* ─────────── Lenis (défilement fluide) ─────────── */
  let lenis = null;
  if (animate && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ─────────── Menu mobile ─────────── */
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    root.classList.toggle('menu-open', open);
    nav.classList.remove('is-hidden');
    if (lenis) open ? lenis.stop() : lenis.start();
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && animate) {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut', clearProps: 'clipPath' })
        .fromTo($$('.menu__live, .menu__acts', menu), { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.25')
        .fromTo($$('.menu__act-word', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, '<')
        .fromTo($$('.menu__nav a', menu), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.05 }, '-=0.7')
        .fromTo($$('.menu__foot', menu), { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.5');
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  /* ─────────── Ancres ─────────── */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      const navH = parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 72;
      const offset = id === '#top' ? 0 : -navH + 1;
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.5 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
      if (id === '#main' || id === '#top') $('#main').focus({ preventScroll: true });
      history.replaceState(null, '', id);
    });
  });

  /* ─────────── Hero : calage du mot NAPOLI ─────────── */
  const hero = $('[data-hero]');
  const heroImg = $('[data-hero-img]');
  const mask = $('[data-hero-mask]');
  const word = $('[data-hero-word]');
  const heroUI = $('[data-hero-ui]');
  const heroTop = $('.hero__top', hero);
  const heroBottom = $('.hero__bottom', hero);
  const veil = $('[data-hero-veil]');
  const caption = $('[data-hero-caption]');
  const CAP = 0.69;        // hauteur de capitale de Bodoni Moda, en em
  const SPACING = -0.015;  // interlettrage final du mot, en em
  let zoom = { x: 0, y: 0, scale: 60 };

  // Mesure au canvas : fiable et synchrone (la mesure SVG peut rester périmée après un changement de taille)
  const ctx = document.createElement('canvas').getContext('2d');
  const textW = (str, size) => { ctx.font = `600 ${size}px "Bodoni Moda", "Bodoni 72", Didot, serif`; return ctx.measureText(str).width; };
  const wordW = (size) => textW('NAPOLI', size) + SPACING * size * 6;

  function fitHero() {
    const hr = hero.getBoundingClientRect();
    if (!hr.width) return;
    const topEdge = heroTop.getBoundingClientRect().bottom - hr.top;
    const botEdge = heroBottom.getBoundingClientRect().top - hr.top;
    const band = Math.max(80, botEdge - topEdge);

    // 1) largeur : le mot occupe 94 % du hero ; 2) hauteur : la capitale tient dans la bande libre
    let size = (200 * hr.width * 0.94) / wordW(200);
    size = Math.min(size, (band * 0.82) / CAP);
    const baseline = topEdge + band / 2 + (size * CAP) / 2;
    word.style.fontSize = `${size}px`;
    word.setAttribute('dominant-baseline', 'alphabetic');
    word.setAttribute('y', String(baseline));

    // Point de zoom : le fût du « I », pour ouvrir la fenêtre sur la photo
    const start = hr.width / 2 - wordW(size) / 2;
    zoom.x = start + textW('NAPOL', size) + SPACING * size * 5 + textW('I', size) / 2;
    zoom.y = baseline - (size * CAP) / 2;
    const stem = Math.max(6, size * 0.055);
    const far = Math.max(
      Math.hypot(zoom.x, zoom.y), Math.hypot(hr.width - zoom.x, zoom.y),
      Math.hypot(zoom.x, hr.height - zoom.y), Math.hypot(hr.width - zoom.x, hr.height - zoom.y),
    );
    zoom.scale = Math.min(160, (far / stem) * 1.1);
    mask.style.transformOrigin = `${zoom.x}px ${zoom.y}px`;
  }

  /* ─────────── Configurateur de garniture ─────────── */
  const cornetto = $('[data-cornetto]');
  const fillWord = $('[data-word]');
  const stage = $('[data-stage]');
  const desc = $('[data-desc]');
  const plateImg = $('[data-plate]');
  const fillBtns = $$('[data-fill]', cornetto);
  let currentFill = 'pistache';

  function fitWord() {
    fillWord.style.fontSize = '';
    const max = stage.clientWidth * 0.98;
    const w = fillWord.scrollWidth;
    if (w > max) fillWord.style.fontSize = `${(parseFloat(getComputedStyle(fillWord).fontSize) * max) / w}px`;
  }
  function applyFillVars(f) {
    cornetto.style.setProperty('--fill-bg', f.bg);
    cornetto.style.setProperty('--fill-deep', f.deep);
    cornetto.style.setProperty('--fill-ink', f.ink);
  }
  function setFilling(key) {
    if (key === currentFill) return;
    currentFill = key;
    const f = FILLINGS[key];
    fillBtns.forEach((b) => {
      const on = b.dataset.fill === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (!animate) {
      applyFillVars(f);
      fillWord.textContent = f.label;
      desc.textContent = f.desc;
      fitWord();
      return;
    }
    gsap.to(cornetto, { '--fill-bg': f.bg, '--fill-deep': f.deep, '--fill-ink': f.ink, duration: 1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(fillWord, {
      yPercent: -100, opacity: 0, duration: 0.4, ease: 'power3.in', overwrite: true,
      onComplete() {
        fillWord.textContent = f.label;
        fitWord();
        gsap.fromTo(fillWord, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out' });
      },
    });
    gsap.to(desc, {
      opacity: 0, duration: 0.3, overwrite: true,
      onComplete() { desc.textContent = f.desc; gsap.to(desc, { opacity: 1, duration: 0.6, ease: 'power2.out' }); },
    });
    gsap.fromTo(plateImg, { rotate: -12, scale: 0.9 }, { rotate: 0, scale: 1, duration: 1.4, ease: 'elastic.out(1, 0.6)', overwrite: true });
  }
  applyFillVars(FILLINGS.pistache);
  fillBtns.forEach((b) => b.addEventListener('click', () => setFilling(b.dataset.fill)));
  $('.fillings', cornetto).addEventListener('keydown', (e) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(e.key)) return;
    const i = fillBtns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = fillBtns[(i + step + fillBtns.length) % fillBtns.length];
    next.focus();
    setFilling(next.dataset.fill);
  });

  /* ─────────── La carte : onglets + aperçu photo ─────────── */
  const tabs = $$('[role="tab"]', $('[data-tabs]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const preview = $('[data-preview]');
  const previewImgs = preview ? $$('img', preview) : [];
  const previewCap = $('[data-preview-caption]');
  let previewId = '1710242835722-49f4e8a05fb6';

  function setPreview(id, name) {
    if (!preview || getComputedStyle(preview).display === 'none') return;
    if (previewCap && name) previewCap.textContent = name;
    if (!id || id === previewId) return;
    previewId = id;
    const [on, off] = previewImgs[0].classList.contains('is-on') ? previewImgs : [previewImgs[1], previewImgs[0]];
    const img = new Image();
    img.src = `${CONFIG.imgBase}${id}?auto=format&fit=crop&w=900&h=1200&q=78`;
    const swap = () => {
      if (previewId !== id) return;
      off.src = img.src;
      on.classList.remove('is-on');
      off.classList.add('is-on');
    };
    (img.decode ? img.decode() : Promise.resolve()).then(swap, swap);
  }
  const dishName = (dish) => $('.dish__name', dish).firstChild.textContent.trim();

  function selectTab(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
    const first = $('.dish[data-img]', panels[i]);
    if (first) setPreview(first.dataset.img, dishName(first));
    if (animate) gsap.fromTo($$('.dish', panels[i]), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, overwrite: true });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) { e.preventDefault(); selectTab(next, true); }
    });
  });
  if (finePointer) {
    $$('.dish').forEach((dish) => dish.addEventListener('mouseenter', () => setPreview(dish.dataset.img, dishName(dish))));
  }

  /* ─────────── Avis : carrousel ─────────── */
  const quotesWrap = $('[data-quotes]');
  const quotes = $$('.quote', quotesWrap);
  const bar = $('[data-quote-bar]');
  let qi = 0;
  let qTween = null;
  let qVisible = false;
  let qPaused = false;

  function showQuote(n) {
    qi = (n + quotes.length) % quotes.length;
    quotes.forEach((q, j) => q.classList.toggle('is-on', j === qi));
    runQuoteTimer();
  }
  function runQuoteTimer() {
    if (!animate) return;
    if (qTween) qTween.kill();
    gsap.set(bar, { scaleX: 0 });
    if (!qVisible || qPaused) return;
    qTween = gsap.to(bar, { scaleX: 1, duration: CONFIG.quoteDelay, ease: 'none', onComplete: () => showQuote(qi + 1) });
  }
  $('[data-quote-prev]').addEventListener('click', () => showQuote(qi - 1));
  $('[data-quote-next]').addEventListener('click', () => showQuote(qi + 1));
  ['mouseenter', 'focusin'].forEach((ev) => quotesWrap.addEventListener(ev, () => { qPaused = true; if (qTween) qTween.pause(); }));
  ['mouseleave', 'focusout'].forEach((ev) => quotesWrap.addEventListener(ev, () => { qPaused = false; if (qTween) qTween.resume(); else runQuoteTimer(); }));

  /* ═════════════ Chorégraphie ═════════════ */
  const loader = $('.loader');
  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  // Si Bodoni arrive après le délai (connexion lente), on recale le mot avec la vraie police
  const refit = () => { fitHero(); fitWord(); if (hasGSAP) ScrollTrigger.refresh(); };
  if (document.fonts) document.fonts.ready.then(refit);
  window.addEventListener('load', refit);

  if (!animate) {
    if (loader) loader.remove();
    fontsReady.then(() => { fitHero(); fitWord(); if (hasGSAP) ScrollTrigger.refresh(); });
    window.addEventListener('resize', () => { fitHero(); fitWord(); }, { passive: true });
    return;
  }

  const skipLoader = root.classList.contains('no-loader') || !loader;
  try { sessionStorage.setItem('nc-seen', '1'); } catch (e) { /* stockage indisponible : on garde le préchargeur */ }

  // États initiaux, posés sous le rideau du préchargeur
  gsap.set(heroImg, { scale: 1.55 });
  gsap.set($$('.label, .hero__title, .hero__side', heroUI), { y: 30, opacity: 0 });
  gsap.set(word, { letterSpacing: '0.3em' }); // propriété CSS : elle prime sur la règle .hero__word
  gsap.set(caption, { autoAlpha: 0, y: 40 });

  function heroIntro() {
    return gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { fitHero(); ScrollTrigger.refresh(); } })
      .to(word, { letterSpacing: '-0.015em', duration: 1.8, ease: 'expo.inOut' }, 0)
      .to(heroImg, { scale: 1.25, duration: 2.2, ease: 'expo.out' }, 0.1)
      .to($$('.label, .hero__title, .hero__side', heroUI), { y: 0, opacity: 1, duration: 1.2, stagger: 0.08 }, 0.6)
      .from(nav, { autoAlpha: 0, duration: 1.2, ease: 'power2.out' }, 0.7);
  }

  function runLoader() {
    if (skipLoader) { if (loader) loader.remove(); heroIntro(); return; }
    if (lenis) lenis.stop();
    loader.style.animation = 'none';
    gsap.timeline({ onComplete() { loader.remove(); if (lenis) lenis.start(); } })
      .from('.loader__word span', { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.05 })
      .to('.loader__rule', { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, 0.15)
      .from('.loader__sub', { opacity: 0, y: 10, duration: 0.6, ease: 'power3.out' }, 0.45)
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '+=0.15')
      .add(heroIntro(), '-=0.75');
  }

  fontsReady.then(() => {
    fitHero();
    fitWord();
    initScroll();
    runLoader();
  });

  function initScroll() {
    /* 1. Hero épinglé : le mot s'ouvre jusqu'à la photo plein cadre */
    const heroTL = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', end: '+=150%',
        pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
        onRefreshInit: () => gsap.set(mask, { scale: 1 }),
        onRefresh: fitHero,
        onUpdate: (self) => nav.classList.toggle('is-light', self.progress > 0.42 && self.progress < 0.995 && !menuOpen),
        onLeave: () => nav.classList.remove('is-light'),
      },
    });
    heroTL
      .to(heroUI, { opacity: 0, y: -24, duration: 0.18 }, 0)
      .to(mask, { scale: () => zoom.scale, duration: 1, ease: 'power3.in' }, 0)
      .to(heroImg, { scale: 1, duration: 1.15 }, 0)
      .to(mask, { opacity: 0, duration: 0.08 }, 0.94)
      .to(veil, { opacity: 1, duration: 0.3 }, 0.8)
      .to(caption, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.95)
      .to({}, { duration: 0.25 });

    /* 2. La giornata : défilement horizontal épinglé (desktop) */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 960px)', () => {
      const section = $('[data-giornata]');
      const track = $('[data-track]');
      section.classList.add('is-pinned');
      const dist = () => track.scrollWidth - window.innerWidth;
      const pan = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${dist()}`, scrub: true } });
      $$('[data-pan-parallax]', section).forEach((img) => {
        gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('.panel'), containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
      });
      $$('.panel__word', section).forEach((w) => {
        gsap.from(w, { xPercent: 14, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: w, containerAnimation: pan, start: 'left 96%', end: 'left 60%', scrub: true } });
      });
      $$('.panel__img--b', section).forEach((b) => {
        gsap.from(b, { yPercent: 22, ease: 'none', scrollTrigger: { trigger: b.closest('.panel'), containerAnimation: pan, start: 'left right', end: 'center center', scrub: true } });
      });
      return () => section.classList.remove('is-pinned');
    });
    mm.add('(max-width: 959px)', () => {
      $$('.panel__img').forEach((fig) => {
        gsap.from(fig, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
      });
    });

    /* 3. Manifeste : chaque mot s'allume au fil du défilement */
    const manifesto = $('[data-manifesto]');
    if (hasSplit) {
      SplitText.create(manifesto, { type: 'words', wordsClass: 'word' });
    }
    const bits = $$('.word, .inline-img', manifesto);
    gsap.set(bits, { opacity: 0.12 });
    gsap.set($$('.inline-img img', manifesto), { scale: 1.4 });
    const mTL = gsap.timeline({ scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 55%', scrub: 0.8 } });
    bits.forEach((b, i) => {
      mTL.to(b, { opacity: 1, duration: 0.4, ease: 'none' }, i * 0.12);
      if (b.classList.contains('inline-img')) mTL.to($('img', b), { scale: 1, duration: 0.8, ease: 'none' }, i * 0.12);
    });

    /* 4. Titres de section : lignes révélées sous masque */
    if (hasSplit) {
      $$('[data-split]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, { yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
          },
        });
      });
    }

    /* 5. Révélations douces + images en volet */
    gsap.set('[data-reveal]', { y: 40, opacity: 0 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1 }),
    });
    $$('[data-clip]').forEach((el) => {
      gsap.from(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
    });
    $$('.label').forEach((l) => {
      if (l.closest('.hero')) return;
      gsap.from(l, { opacity: 0, x: -14, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 90%', once: true } });
    });

    /* 6. Configurateur : entrée de l'assiette */
    gsap.from('.plate', { scale: 0.75, rotate: -20, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 75%', once: true } });
    gsap.from('.cornetto__word', { yPercent: 25, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 75%', once: true } });
    // On anime le conteneur : chaque .filling a déjà une transition CSS sur l'opacité
    gsap.from(['.fillings', '.cornetto__note'], { x: -24, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.fillings', start: 'top 90%', once: true } });

    /* 7. Carte : aperçu en volet */
    gsap.from('.carta__preview img.is-on', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.carta', start: 'top 65%', once: true } });

    /* 8. Avis : compteur + lancement du carrousel à l'écran */
    const count = $('[data-count]');
    if (count) {
      const o = { v: 0 };
      count.textContent = '0,0';
      gsap.to(o, {
        v: parseFloat(count.dataset.count), duration: 2.2, ease: 'power3.out',
        scrollTrigger: { trigger: count, start: 'top 88%', once: true },
        onUpdate() { count.textContent = o.v.toFixed(1).replace('.', ','); },
      });
    }
    ScrollTrigger.create({
      trigger: quotesWrap, start: 'top 85%', end: 'bottom 15%',
      onToggle: (self) => { qVisible = self.isActive; if (qVisible) runQuoteTimer(); else if (qTween) qTween.pause(); },
    });

    /* 9. Footer : le wordmark se lève lettre par lettre */
    if (hasSplit) {
      const fw = $('[data-footer-word]');
      const s = SplitText.create(fw, { type: 'chars', charsClass: 'char' });
      gsap.from(s.chars, { yPercent: 100, duration: 1.5, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: fw, start: 'top 95%', once: true } });
    }

    /* 10. Nav : fond au défilement, masquée en descente (après le hero) */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        const pastHero = y > heroTL.scrollTrigger.end;
        nav.classList.toggle('is-scrolled', y > 30 && !nav.classList.contains('is-light'));
        if (!menuOpen) nav.classList.toggle('is-hidden', pastHero && self.direction === 1 && y > heroTL.scrollTrigger.end + 200);
      },
    });

    window.addEventListener('resize', fitWord, { passive: true });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
  }
})();
