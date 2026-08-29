/**
 * RUNR Stories - Cinematic Engine v2 (Media Hub Adapted)
 * GSAP Premium Grid Intro - works alongside existing site Lenis instance
 *
 * Scoped to .media-hub-section to avoid conflicts with the main site.
 *
 * Timeline:
 *  0.00s  overlay visible (white bg)
 *  0.05s  cards stream in, row by row - stagger 0.05s each   (~1.1s)
 *  1.15s  grid sits fully formed for 0.6s
 *  1.75s  cards scale + blur out simultaneously              (0.45s)
 *  2.20s  overlay fades → page fades in underneath           (0.5s)
 *  2.70s  hero text animates in
 */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger, Flip);
  gsap.config({ force3D: true });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Do NOT init Lenis here - site already has its own Lenis instance
  initCharacterTypographySplit();
  initVideoManager();         // lazy video loader - runs immediately, safe before intro

  if (!prefersReducedMotion) {
    // double rAF - let browser paint real layout so getBoundingClientRect is accurate
    requestAnimationFrame(() => requestAnimationFrame(initGridIntro));
  } else {
    const overlay = document.getElementById('mhIntroOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('mh-intro-playing');
    initNaturalSectionScrollReveals();
    initActiveCenterFocusEngine();
  }
});

/* ====================================================
   GRID INTRO
==================================================== */
function initGridIntro() {
  const overlay = document.getElementById('mhIntroOverlay');
  const allCards = Array.from(document.querySelectorAll('.media-hub-section .editorial-row .card'));
  if (!overlay || !allCards.length) return;

  /* --- only image cards in intro grid --- */
  const imgCards = allCards.filter(c => c.style.backgroundImage);

  /* --- snapshot final rects BEFORE any hiding --- */
  const imgFinalRects = imgCards.map(c => {
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height };
  });

  /* --- hide real page --- */
  document.body.classList.add('mh-intro-playing');

  /* ── build 3-row grid ── */
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const N = imgCards.length;
  const PAD = 18, GAP = 10;

  const r0 = Math.ceil(N / 3);
  const r1 = Math.ceil((N - r0) / 2);
  const r2 = N - r0 - r1;
  const rowCounts = [r0, r1, r2];

  const CARD_H = 190;
  const blockH = CARD_H * 3 + GAP * 2;
  const startY = Math.round((VH - blockH) / 2);

  const introRects = [];
  for (let row = 0; row < 3; row++) {
    const cnt = rowCounts[row];
    const cardW = Math.floor((VW - PAD * 2 - GAP * (cnt - 1)) / cnt);
    const rowY = startY + row * (CARD_H + GAP);
    for (let col = 0; col < cnt; col++) {
      introRects.push({ left: PAD + col * (cardW + GAP), top: rowY, w: cardW, h: CARD_H });
    }
  }

  /* ── create clones ── */
  const clones = imgCards.map((card, i) => {
    const clone = document.createElement('div');
    clone.className = 'mh-intro-clone';
    clone.style.backgroundImage = card.style.backgroundImage;

    const ir = introRects[i];
    gsap.set(clone, {
      position: 'fixed',
      left: ir.left, top: ir.top, width: ir.w, height: ir.h,
      scale: 0, opacity: 0, transformOrigin: '50% 50%',
      borderRadius: '14px',
    });
    overlay.appendChild(clone);
    return clone;
  });

  /* ── show overlay (white, instant) ── */
  overlay.style.display = 'block';

  /* ────────────────────────────────────────────────
     PHASE 1 - cards pop in row-by-row
  ──────────────────────────────────────────────── */
  const phase1 = gsap.timeline({ defaults: { ease: 'expo.out' } });

  let cardIndex = 0;
  for (let row = 0; row < 3; row++) {
    const cnt = rowCounts[row];
    for (let col = 0; col < cnt; col++) {
      phase1.fromTo(clones[cardIndex],
        { scale: 0, opacity: 0, y: 22 },
        { scale: 1, opacity: 1, y: 0, duration: 0.55 },
        row * 0.15 + col * 0.048
      );
      cardIndex++;
    }
  }

  /* ────────────────────────────────────────────────
     After phase1 done: hold 0.55s then exit
  ──────────────────────────────────────────────── */
  phase1.call(() => gsap.delayedCall(0.55, beginExit));

  /* ────────────────────────────────────────────────
     PHASE 2 - smooth exit
  ──────────────────────────────────────────────── */
  function beginExit() {
    /* reveal real page invisibly */
    document.body.classList.remove('mh-intro-playing');
    gsap.set(allCards, { opacity: 0 });

    /* clones scale-up + fade out */
    gsap.to(clones, {
      scale: 1.08,
      opacity: 0,
      filter: 'blur(8px)',
      duration: 0.55,
      ease: 'power2.inOut',
      stagger: 0.012,
    });

    /* overlay fades to transparent */
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      delay: 0.15,
      onComplete: () => {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
      }
    });

    /* real page fades in */
    gsap.to(allCards, {
      opacity: 1,
      duration: 0.55,
      ease: 'power2.out',
      delay: 0.2,
      stagger: 0.012,
    });

    /* hero text after page is visible */
    gsap.delayedCall(0.5, runPostIntroAnimations);
  }
}

/* ====================================================
   POST-INTRO: hero text
==================================================== */
function runPostIntroAnimations() {
  gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.05 })
    .from('.media-hub-section .hero-tag', { opacity: 0, y: 14, duration: 0.4 })
    .from('.media-hub-section .hero-heading .char-inner', {
      y: '100%', opacity: 0, rotateX: -90,
      stagger: 0.013, duration: 0.72,
    }, '-=0.18')
    .from('.media-hub-section .hero-desc, .media-hub-section .hero-cta', {
      opacity: 0, y: 12, stagger: 0.08, duration: 0.48,
    }, '-=0.42');

  initNaturalSectionScrollReveals();
  initActiveCenterFocusEngine();
}

/* ====================================================
   CHARACTER SPLIT
==================================================== */
function initCharacterTypographySplit() {
  document.querySelectorAll('.media-hub-section .hero-heading, .media-hub-section .typo-title').forEach(heading => {
    const tmp = document.createElement('div');
    tmp.innerHTML = heading.innerHTML;
    let html = '';
    tmp.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(w => {
          if (w.trim()) {
            html += `<span class="word">`;
            for (const ch of w) html += `<span class="char"><span class="char-inner">${ch}</span></span>`;
            html += `</span>`;
          } else { html += w; }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('highlight-orange')) {
        html += `<span class="highlight-orange">`;
        node.textContent.split(/(\s+)/).forEach(w => {
          if (w.trim()) {
            html += `<span class="word orange-word">`;
            for (const ch of w) html += `<span class="char"><span class="char-inner highlight-orange">${ch}</span></span>`;
            html += `</span>`;
          } else { html += w; }
        });
        html += `</span>`;
      } else if (node.nodeName === 'BR') {
        html += '<br>';
      }
    });
    heading.innerHTML = html;
  });
}

/* ====================================================
   SCROLL REVEALS
==================================================== */
function initNaturalSectionScrollReveals() {
  document.querySelectorAll('.media-hub-section .editorial-row:not(.row-hero)').forEach(row => {
    gsap.fromTo(row.querySelectorAll('.card'),
      { opacity: 0, y: 40, scale: 0.97 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.9, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: {
          trigger: row, start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    const typo = row.querySelector('.typo-title');
    if (typo) {
      gsap.fromTo(typo.querySelectorAll('.char-inner'),
        { y: '100%', opacity: 0, rotateX: -90 },
        {
          y: '0%', opacity: 1, rotateX: 0,
          duration: 0.75, ease: 'power4.out', stagger: 0.018,
          scrollTrigger: { trigger: typo, start: 'top 86%' },
        }
      );
    }

    const svg = row.querySelector('.card-logo-dark svg, .card-icon-light svg');
    if (svg) {
      gsap.fromTo(svg,
        { scale: 0.75, rotate: -15, opacity: 0 },
        {
          scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 86%' },
        }
      );
    }
  });
}

/* ====================================================
   ACTIVE FOCUS ENGINE
==================================================== */
function initActiveCenterFocusEngine() {
  document.querySelectorAll('.media-hub-section .card').forEach(card => {
    ScrollTrigger.create({
      trigger: card, start: 'top 65%', end: 'bottom 35%',
      invalidateOnRefresh: true,
      onEnter: () => activate(card),
      onEnterBack: () => activate(card),
      onLeave: () => deactivate(card),
      onLeaveBack: () => deactivate(card),
    });
  });
  function activate(c) {
    c.classList.add('is-active');
    c.classList.remove('is-inactive');
    gsap.fromTo(c, { scale: 1.03 }, { scale: 1, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
  }
  function deactivate(c) {
    c.classList.remove('is-active');
    c.classList.add('is-inactive');
  }
}

/* ====================================================
   VIDEO MANAGER
   ─ Max 3 simultaneous playing videos
   ─ IntersectionObserver with 400px rootMargin
   ─ Evict oldest when 4th video enters viewport
   ─ Poster → video crossfade via CSS (no black flash)
   ─ Full src removal on exit to free memory/network
==================================================== */

const VM = (() => {
  const MAX_SLOTS = 3;
  const activeSlots = [];

  const observer = new IntersectionObserver(onIntersect, {
    root: null,
    rootMargin: '400px 0px 400px 0px',
    threshold: 0,
  });

  function onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        enter(entry.target);
      } else {
        leave(entry.target);
      }
    });
  }

  function enter(card) {
    if (activeSlots.includes(card)) return;

    if (activeSlots.length >= MAX_SLOTS) {
      evict(activeSlots[0]);
    }

    activeSlots.push(card);
    loadAndPlay(card);
  }

  function leave(card) {
    const idx = activeSlots.indexOf(card);
    if (idx > -1) activeSlots.splice(idx, 1);
    unload(card);
  }

  function evict(card) {
    const idx = activeSlots.indexOf(card);
    if (idx > -1) activeSlots.splice(idx, 1);
    unload(card);
  }

  function loadAndPlay(card) {
    const video = card.querySelector('video');
    if (!video) return;

    let sourced = false;
    video.querySelectorAll('source[data-src]').forEach(s => {
      if (!s.src) {
        s.src = s.dataset.src;
        sourced = true;
      }
    });

    if (sourced) video.load();

    const reveal = () => {
      video.classList.add('v-ready');
      video.removeEventListener('canplay', reveal);
      video.removeEventListener('canplaythrough', reveal);
    };

    if (video.readyState >= 3) {
      reveal();
    } else {
      video.addEventListener('canplay', reveal, { passive: true });
      video.addEventListener('canplaythrough', reveal, { passive: true });
    }

    const p = video.play();
    if (p instanceof Promise) p.catch(() => { });
  }

  function unload(card) {
    const video = card.querySelector('video');
    if (!video) return;

    video.pause();
    video.classList.remove('v-ready');

    video.querySelectorAll('source').forEach(s => {
      s.removeAttribute('src');
    });

    try { video.load(); } catch (_) { }
  }

  return {
    observe(card) { observer.observe(card); },
    disconnect() { observer.disconnect(); },
  };
})();

function initVideoManager() {
  document.querySelectorAll('.media-hub-section .card-video').forEach(card => VM.observe(card));
}
