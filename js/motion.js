/* ═══════════════════════════════════════════════════════════════════
   SIXTEEN LIGHTS — the conductor

   Lenis is the only smooth-scroll engine; GSAP + ScrollTrigger own all
   choreography; world.js is told what to do and never asks back.
   Under prefers-reduced-motion nothing scrubs, nothing pins, nothing
   renders in WebGL — every final state is simply painted at once.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const { CHAPTERS, LETTER } = window.SIXTEEN;
  const N = CHAPTERS.length;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ?motion=full overrides the OS setting — some people leave "reduce"
     switched on system-wide and still want the whole thing. */
  const forced  = /(^|[?&])motion=full($|&)/.test(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !forced;
  const coarse  = matchMedia('(pointer: coarse)').matches;

  const body    = document.body;
  const veil    = $('#veil');
  const veilBar = $('#veilBar');
  const veilPct = $('#veilPct');
  const stage   = $('#stage');
  const rail    = $('#rail');
  const hudAct  = $('#hudAct');
  const hudMood = $('#hudMood');
  const hudNum  = $('#hudNum');
  const hudYear = $('#hudYear');
  const dockBar = $('#dockBar');
  const bgm     = $('#bgm');

  let lenis = null;
  let caps = [];
  let dots = [];
  let live = -1;

  /* ── word splitting that keeps the accessible name intact ────── */
  function split(el) {
    if (!el || el.dataset.done === '1') return;
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach((word, i) => {
      const mask = document.createElement('span');
      mask.className = 'wm';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'w';
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      el.appendChild(document.createTextNode(' '));
      void i;
    });
    el.dataset.done = '1';
  }

  /* ── build the chapter captions + rail ───────────────────────── */
  function buildStage() {
    CHAPTERS.forEach((ch, i) => {
      const cap = document.createElement('article');
      cap.className = 'cap';
      cap.id = 'cap-' + i;
      cap.innerHTML =
        '<p class="cap__eyebrow">' + ch.act + ' &nbsp;·&nbsp; ' + ch.year + '</p>' +
        '<h2 class="cap__title" data-split>' + ch.title + '</h2>' +
        '<ul class="cap__lines">' +
          '<li class="cap__script" data-split>' + ch.script + '</li>' +
          '<li class="cap__serif" data-split>' + ch.serif + '</li>' +
          '<li class="cap__gold">' + ch.gold + '</li>' +
        '</ul>';
      stage.appendChild(cap);
      caps.push(cap);
      $$('[data-split]', cap).forEach(split);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rail__dot';
      dot.setAttribute('aria-label', 'Memory ' + ch.n + ' — ' + ch.title);
      dot.addEventListener('click', () => jumpTo(i));
      rail.appendChild(dot);
      dots.push(dot);
    });
  }

  function buildLetter() {
    const host = $('#letterBody');
    const keys = /forever|choose|you|birthday|pandu|us|we/i;
    LETTER.join(' ').split(/\s+/).forEach((word) => {
      const s = document.createElement('span');
      s.className = 'lw' + (keys.test(word.replace(/[^\w]/g, '')) && Math.random() < 0.5 ? ' is-key' : '');
      s.textContent = word;
      host.appendChild(s);
      host.appendChild(document.createTextNode(' '));
    });
  }

  /* ── caption swapping ────────────────────────────────────────── */
  function setLive(i) {
    if (i === live || i < 0 || i >= N) return;
    const prev = caps[live];
    const next = caps[i];
    live = i;

    /* autoAlpha owns visibility, so a fast scroll can never leave a stale
       caption behind — the class is only a state marker for the rail. */
    if (prev && prev !== next) {
      gsap.killTweensOf(prev);
      gsap.to(prev, { autoAlpha: 0, y: -22, duration: .45, ease: 'power2.in' });
    }
    caps.forEach((c) => c.classList.toggle('is-live', c === next));

    gsap.killTweensOf(next);
    gsap.fromTo(next, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out' });
    gsap.fromTo($$('.w', next),
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: .85, ease: 'power4.out', stagger: .022, overwrite: true });

    const ch = CHAPTERS[i];
    hudAct.textContent  = ch.act;
    hudMood.textContent = ch.mood;
    hudNum.textContent  = ch.n;
    hudYear.textContent = ch.year;
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
  }

  function jumpTo(i) {
    const sec = $('#voyage');
    const span = sec.offsetHeight - window.innerHeight;
    const y = sec.offsetTop + (i / (N - 1)) * span;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ── static path: reduced motion, or no WebGL ────────────────── */
  function goFlat() {
    body.dataset.world = 'flat';
    body.dataset.phase = 'live';
    $$('[data-split] .w').forEach((w) => { w.style.transform = 'none'; w.style.opacity = 1; });
    $$('.lw').forEach((w) => w.classList.add('is-lit'));
    $$('.finale__line, .finale__name, .finale__actions').forEach((el) => { el.style.opacity = 1; });
    veil.remove();   /* no fade — under reduced motion, states just land */
  }

  /* ── boot ────────────────────────────────────────────────────── */
  function boot() {
    buildStage();
    buildLetter();
    $$('[data-split]').forEach(split);

    if (reduced) { goFlat(); wireChrome(); return; }

    const ok = window.ForeverWorld.init($('#gl'), {
      onLoad(p) {
        const pct = Math.round(clamp(p, 0, 1) * 100);
        veilBar.style.width = pct + '%';
        veilPct.textContent = pct;
      },
      onReady() {
        veilBar.style.width = '100%';
        veilPct.textContent = '100';
        setTimeout(reveal, 260);
      }
    });

    if (!ok) { goFlat(); wireChrome(); return; }
    body.dataset.world = 'live';
    wireChrome();
    wireScroll();
  }

  function reveal() {
    body.dataset.phase = 'live';
    window.ForeverWorld.setFade(1);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(veil, { opacity: 0, duration: 1, ease: 'power2.inOut',
                  onComplete: () => { veil.style.display = 'none'; } })
      .from($$('.hero__eyebrow .w'), { yPercent: 110, opacity: 0, duration: .9, stagger: .03 }, .25)
      .from($$('.hero__row .w'),     { yPercent: 118, opacity: 0, duration: 1.25, stagger: .05 }, .35)
      .from($('.hero__row--script'), { opacity: 0, scale: .92, duration: 1.4, ease: 'power4.out' }, .5)
      .from($$('.hero__lede .w'),    { yPercent: 100, opacity: 0, duration: .8, stagger: .014 }, .95)
      .from($('#beginBtn'),          { opacity: 0, y: 18, duration: .8 }, 1.15)
      .from($('.hero__hint'),        { opacity: 0, duration: .8 }, 1.3)
      .from($('.hero__cue'),         { opacity: 0, duration: .8 }, 1.4);

    setLive(0);
    if (lenis) { lenis.resize(); lenis.start(); }
    ScrollTrigger.refresh();
  }

  /* ── scroll engine + choreography ────────────────────────────── */
  function wireScroll() {
    gsap.registerPlugin(ScrollTrigger);

    /* The runway first: every memory's dwell becomes scroll length. This
       has to happen before Lenis measures, or it caps scrolling at the
       pre-runway page height and the story stops half-told. */
    const voyage = $('#voyage');
    const total = CHAPTERS.reduce((s, c) => s + c.dwell, 0);
    voyage.style.height = Math.round(total * 108) + 'vh';

    /* Scroll feel. The three numbers below are the only ones worth touching:
       `duration` is how long the glide takes to settle, `wheelMultiplier` how
       far one notch of the wheel travels. Both feed the chromatic split, which
       is driven by scroll velocity — a softer wheel over a longer settle keeps
       peak velocity down, so the frames tear less on a fast flick. Raise
       wheelMultiplier past 1 and the story starts to skid past its memories. */
    lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      syncTouch: false,
      touchMultiplier: 1.6
    });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    /* Anything that changes page height must re-measure both engines. */
    const remeasure = () => { lenis.resize(); ScrollTrigger.refresh(); };
    window.addEventListener('resize', remeasure, { passive: true });

    /* 1 · the flight */
    ScrollTrigger.create({
      trigger: voyage,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate(self) {
        const p = self.progress;
        window.ForeverWorld.setProgress(p, self.getVelocity() / 3200);
        setLive(Math.round(p * (N - 1)));
      }
    });

    /* 2 · hero weight */
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      onUpdate(self) { window.ForeverWorld.setHero(1 - self.progress); }
    });
    gsap.to('.hero__inner', {
      yPercent: -26, opacity: 0, filter: 'blur(6px)', ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* 3 · the world steps back while the DOM sections speak */
    ScrollTrigger.create({
      trigger: '#plx',
      start: 'top bottom',
      end: 'top center',
      onUpdate(self) { window.ForeverWorld.setTail(self.progress); }
    });
    ScrollTrigger.create({
      trigger: '#finale',
      start: 'top bottom',
      end: 'top top',
      onUpdate(self) { window.ForeverWorld.setTail(1 - self.progress); }
    });

    /* 4 · parallax interlude */
    $$('.plx__layer, .plx__glow').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0.2;
      gsap.fromTo(el,
        { yPercent: d * 70, scale: 1 + d * 0.12 },
        {
          yPercent: -d * 70, scale: 1, ease: 'none',
          scrollTrigger: { trigger: '#plx', start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });
    revealOnScroll('#plx');

    /* 5 · the letter, word by word */
    const words = $$('.lw');
    let lit = 0;
    ScrollTrigger.create({
      trigger: '#letter',
      start: 'top 78%',
      end: 'bottom 62%',
      onUpdate(self) {
        const want = Math.round(self.progress * (words.length + 14));
        if (want === lit) return;
        if (want > lit) for (let i = lit; i < Math.min(want, words.length); i++) words[i].classList.add('is-lit');
        else for (let i = Math.min(lit, words.length) - 1; i >= want; i--) if (words[i]) words[i].classList.remove('is-lit');
        lit = want;
      }
    });
    revealOnScroll('#letter');

    /* 6 · the finale */
    ScrollTrigger.create({
      trigger: '#finale',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate(self) { window.ForeverWorld.setFinale(self.progress); }
    });

    let wished = false;
    const fin = gsap.timeline({
      scrollTrigger: { trigger: '#finale', start: 'top top', end: 'bottom bottom', scrub: .8 },
      defaults: { ease: 'power3.out' }
    });
    fin.fromTo('[data-line="1"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, 0)
       .fromTo('[data-line="2"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, .9)
       .fromTo('[data-line="3"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, 1.8)
       .fromTo('.finale__hb .w', { yPercent: 120, opacity: 0 },
               { yPercent: 0, opacity: 1, duration: 1.2, stagger: .08 }, 2.7)
       .fromTo('.finale__name', { opacity: 0, scale: .9, filter: 'blur(14px)' },
               { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6 }, 3.3)
       .fromTo('.finale__sub .w', { opacity: 0, y: 14 },
               { opacity: 1, y: 0, duration: .9, stagger: .05 }, 4.2)
       .fromTo('.finale__actions', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1 }, 4.6);

    ScrollTrigger.create({
      trigger: '#finale', start: 'center center',
      onEnter() { if (!wished) { wished = true; window.ForeverWorld.burst(); } }
    });

    /* 7 · overall progress bar */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self) { dockBar.style.width = (self.progress * 100).toFixed(1) + '%'; }
    });

    /* keep measurements honest once late media and webfonts have landed */
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  }

  function revealOnScroll(scope) {
    $$(scope + ' [data-split]').forEach((el) => {
      gsap.from($$('.w', el), {
        yPercent: 110, opacity: 0, duration: 1, ease: 'power4.out', stagger: .03,
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });
  }

  /* ── chrome: pointer, audio, keys, buttons ───────────────────── */
  function wireChrome() {
    /* cursor light + world pointer */
    if (!coarse && !reduced) {
      const cur = $('#cursor');
      const qx = gsap.quickTo(cur, 'x', { duration: .5, ease: 'power3' });
      const qy = gsap.quickTo(cur, 'y', { duration: .5, ease: 'power3' });
      const tiltables = $$('.plx__layer');

      window.addEventListener('pointermove', (e) => {
        qx(e.clientX); qy(e.clientY);
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -((e.clientY / window.innerHeight) * 2 - 1);
        if (body.dataset.world === 'live') window.ForeverWorld.pointer(nx, ny);
        tiltables.forEach((el, i) => {
          gsap.to(el, { x: nx * (10 + i * 9), y: ny * -(6 + i * 6), duration: 1.1, ease: 'power3.out', overwrite: 'auto' });
        });
      }, { passive: true });

      window.addEventListener('pointerdown', (e) => {
        if (body.dataset.world !== 'live') return;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -((e.clientY / window.innerHeight) * 2 - 1);
        window.ForeverWorld.pulse(nx, ny);
      }, { passive: true });
    }

    /* live accent colour, straight off the world's current tint */
    if (window.ForeverWorld.onFrame) {
      let n = 0;
      window.ForeverWorld.onFrame((f, col) => {
        if ((n++ % 6) !== 0) return;
        document.documentElement.style.setProperty('--accent',
          Math.round(col.r * 255 * 1.1) + ',' + Math.round(col.g * 255 * 1.15) + ',' + Math.round(col.b * 255 * 1.2));
        void f;
      });
    }

    /* music */
    let playing = false;
    const soundBtn = $('#soundBtn');
    const soundLbl = $('#soundLbl');
    function music(on) {
      playing = on;
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      soundLbl.textContent = on ? 'Playing' : 'Music';
      if (on) {
        bgm.volume = 0;
        bgm.play().then(() => gsap.to(bgm, { volume: .55, duration: 2.4 })).catch(() => {
          playing = false;
          soundBtn.setAttribute('aria-pressed', 'false');
          soundLbl.textContent = 'Music';
        });
      } else {
        gsap.to(bgm, { volume: 0, duration: .6, onComplete: () => bgm.pause() });
      }
    }
    soundBtn.addEventListener('click', () => music(!playing));

    /* begin / replay / wish */
    $('#beginBtn').addEventListener('click', () => {
      if (!playing) music(true);
      const y = $('#voyage').offsetTop + 4;
      if (lenis) lenis.scrollTo(y, { duration: 2.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    });

    $('#replayBtn').addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 2.6 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('#burstBtn').addEventListener('click', () => {
      if (body.dataset.world === 'live') window.ForeverWorld.burst();
      gsap.fromTo('.finale__name', { scale: 1 }, { scale: 1.06, duration: .3, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    });

    /* keyboard: step between memories */
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = clamp(live + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1);
      jumpTo(i);
      e.preventDefault();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
