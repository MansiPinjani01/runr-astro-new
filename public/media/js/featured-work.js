(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.innerWidth > 900;

  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const gridWrap = document.getElementById('gridWrap');
  const scrim = document.getElementById('scrim');
  const heroContent = document.getElementById('heroContent');
  const heroCategory = document.getElementById('heroCategory');
  const heroTitle = document.getElementById('heroTitle');
  const heroPlay = document.getElementById('heroPlay');
  const heroClose = document.getElementById('heroClose');
  const splitCounter = document.getElementById('splitCounter');
  const totalCount = thumbs.length;

  function openVideo(id) {
    if (!id) return;
    Fancybox.show([{ src: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`, type: 'iframe' }]);
  }

  if (isDesktop && !reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    const cols = Array.from(document.querySelectorAll('.grid-wrap .col'));
    const workPin = document.querySelector('.work-pin');

    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeInOutQuart = t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
    const colCurves = [easeOutQuint, easeOutCubic, easeOutQuart];

    // entrance
    gsap.set(thumbs, { opacity: 0, y: 36 });
    ScrollTrigger.create({
      trigger: '.work-section',
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.to(thumbs, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: { each: .05, from: 'random' } });
      }
    });

    /* ---------- phase 1: column reveal (every thumbnail passes through the viewport) ---------- */
    let travel = [];
    function measureTravel() {
      const viewportH = gridWrap.getBoundingClientRect().height;
      travel = cols.map(col => Math.max(0, col.scrollHeight - viewportH));
    }
    measureTravel();
    window.addEventListener('resize', measureTravel);

    function applyReveal(tLocal) {
      const t = clamp(tLocal, 0, 1);
      const mid = Math.round((cols.length - 1) / 2);
      cols.forEach((col, i) => {
        const curve = colCurves[i % colCurves.length](t);
        const dist = travel[i];
        const y = (i === mid) ? lerp(-dist, 0, curve) : lerp(0, -dist, curve);
        gsap.set(col, { y });
      });
    }

    /* ---------- phase 2/3: FLIP expand → fullscreen → shrink back ---------- */
    let heroData = null;
    let currentVideoId = null;

    function pickHero() {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      let best = null, bestDist = Infinity;
      thumbs.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        const d = Math.hypot(ex - cx, ey - cy);
        if (d < bestDist) { bestDist = d; best = t; }
      });
      return best || thumbs[Math.floor(thumbs.length / 2)];
    }

    function startExpand(thumbEl) {
      const rect = thumbEl.getBoundingClientRect();

      // the clone is ALWAYS full-viewport size (position:fixed, inset:0) and never
      // resizes again - so nothing it does ever triggers layout reflow. What we
      // animate is clip-path, masking it down to exactly `rect` at the start.
      const clone = document.createElement('div');
      clone.className = 'hero-clone';
      const img = document.createElement('img');
      img.src = thumbEl.querySelector('img').src;
      clone.appendChild(img);
      document.body.appendChild(clone);

      gsap.set(thumbEl, { opacity: 0 });

      heroCategory.textContent = thumbEl.dataset.category;
      heroTitle.textContent = thumbEl.dataset.title;
      currentVideoId = thumbEl.dataset.video || null;
      heroPlay.style.display = thumbEl.dataset.type === 'video' ? 'flex' : 'none';

      heroData = { rect, clone, original: thumbEl };
      splitCounter.textContent = String(thumbs.indexOf(thumbEl) + 1).padStart(2, '0') + ' / ' + totalCount;
    }

    function applyExpand(rawF) {
      const { rect, clone } = heroData;
      const vw = window.innerWidth, vh = window.innerHeight;

      // ease the 0→1 progress so the morph starts slow, accelerates, settles slow.
      const f = easeInOutQuart(clamp(rawF, 0, 1));

      const top = lerp(rect.top, 0, f);
      const left = lerp(rect.left, 0, f);
      const right = lerp(vw - rect.right, 0, f);
      const bottom = lerp(vh - rect.bottom, 0, f);
      const radius = lerp(2, 0, f);
      clone.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;

      gsap.set(scrim, { opacity: lerp(0, .9, f) });

      // grid fade is delayed/compressed relative to the clip-path growth so the
      // grid stays visible until the clone has actually grown to cover it -
      // avoids the "blank cream flash" mid-transition.
      const gridFadeF = clamp((f - .15) / .6, 0, 1);
      gsap.set(gridWrap, { opacity: lerp(1, .15, gridFadeF) });
      gridWrap.style.filter = `blur(${lerp(0, 14, gridFadeF)}px)`;

      const cf = clamp((f - .8) / .2, 0, 1);
      gsap.set(heroContent, { opacity: cf, pointerEvents: cf > .5 ? 'auto' : 'none' });
      // Play button: fade AND scale in, subtly, once fullscreen is reached.
      gsap.set(heroPlay, {
        opacity: cf,
        scale: lerp(.75, 1, cf),
        xPercent: -50, yPercent: -50,
        pointerEvents: cf > .5 ? 'auto' : 'none'
      });
    }

    function cleanupHero() {
      if (!heroData) return;
      heroData.clone.remove();
      gsap.set(heroData.original, { opacity: 1 });
      gsap.set(gridWrap, { opacity: 1 });
      gridWrap.style.filter = 'blur(0px)';
      gsap.set(scrim, { opacity: 0 });
      gsap.set(heroContent, { opacity: 0, pointerEvents: 'none' });
      gsap.set(heroPlay, { opacity: 0, pointerEvents: 'none' });
      heroData = null;
    }

    /* ---------- phase boundaries along the single pinned scroll ---------- */
    const REVEAL_END = 0.4;   // grid reveal - slow, smooth (0 → 0.4 of scroll)
    // 0.4 → 1.0: fullscreen expand, with a quick fade only in the very last sliver

    const scrollTrigger = ScrollTrigger.create({
      trigger: '.work-pin',
      start: 'top top',
      end: '+=350%',      // total scroll length - short, no long blank/dead zone
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 6,
      invalidateOnRefresh: true,
      onRefresh: measureTravel,
      onUpdate: (self) => {
        const p = self.progress;

        if (p >= REVEAL_END) {
          if (!heroData) startExpand(pickHero());
          const f = clamp((p - REVEAL_END) / (1 - REVEAL_END), 0, 1);
          applyExpand(f);

          // fade out only in the very last sliver, right before unpin,
          // so there's no long blank hold after the image is fullscreen
          const fadeStart = 0.92;
          if (p >= fadeStart) {
            const fade = clamp((p - fadeStart) / (1 - fadeStart), 0, 1);
            const op = 1 - fade;
            gsap.set(workPin, { opacity: op });
            gsap.set(scrim, { opacity: .9 * op });
            gsap.set(heroContent, { opacity: op, pointerEvents: fade < .5 ? 'auto' : 'none' });
            gsap.set(heroPlay, { opacity: op, pointerEvents: fade < .5 ? 'auto' : 'none' });
            gsap.set(heroData.clone, { opacity: op });
          } else {
            gsap.set(workPin, { opacity: 1 });
          }
        } else {
          if (heroData) cleanupHero();
          gsap.set(workPin, { opacity: 1 });
          applyReveal(p / REVEAL_END);
        }
      }
    });

    heroPlay.addEventListener('click', () => openVideo(currentVideoId));

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && heroData) cleanupHero();
    });
  }

  /* ================= MOBILE / TABLET fallback: simple reveal + tap modal ================= */
  else {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in-view'); });
      }, { threshold: .15 });
      thumbs.forEach(t => io.observe(t));
    } else {
      thumbs.forEach(t => t.classList.add('in-view'));
    }

    let activeVideoId = null;
    heroClose.style.display = 'flex';

    function openMobileHero(thumbEl) {
      heroCategory.textContent = thumbEl.dataset.category;
      heroTitle.textContent = thumbEl.dataset.title;
      activeVideoId = thumbEl.dataset.video || null;
      heroPlay.style.display = thumbEl.dataset.type === 'video' ? 'flex' : 'none';

      scrim.style.opacity = .9;
      heroContent.style.opacity = 1;
      heroContent.style.pointerEvents = 'auto';
      heroPlay.style.opacity = 1;
      heroPlay.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }
    function closeMobileHero() {
      scrim.style.opacity = 0;
      heroContent.style.opacity = 0;
      heroContent.style.pointerEvents = 'none';
      heroPlay.style.opacity = 0;
      heroPlay.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }

    thumbs.forEach(t => t.addEventListener('click', () => openMobileHero(t)));
    heroClose.addEventListener('click', closeMobileHero);
    scrim.addEventListener('click', closeMobileHero);
    heroPlay.addEventListener('click', () => openVideo(activeVideoId));
  }
})();