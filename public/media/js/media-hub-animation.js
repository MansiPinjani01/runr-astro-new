/**
 * Media Hub - Smooth Scroll Animation Engine v2.1
 * Focus: Buttery-smooth transitions, subtle elegance
 * - Soft fade-ups with longer easing
 * - Gentle parallax (no harsh snapping)
 * - Smooth clip-path reveals
 * - Character slide (no 3D flip)
 * - Magnetic hover with eased return
 * - Scroll progress
 * - Viewport spotlight
 */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* -----------------------------------------------------------
       1. KINETIC TYPOGRAPHY - CHAR SPLIT (no 3D, just slide)
    ----------------------------------------------------------- */
    function splitHeadingIntoChars(el) {
        if (el.dataset.mhSplitDone) return;
        el.dataset.mhSplitDone = 'true';

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                var text = node.nodeValue;
                if (!text.trim()) return document.createTextNode(text);
                var frag = document.createDocumentFragment();
                var words = text.split(/(\s+)/);
                words.forEach(function (w) {
                    if (!w.trim()) {
                        frag.appendChild(document.createTextNode(w));
                    } else {
                        var wordSpan = document.createElement('span');
                        wordSpan.className = 'word';
                        for (var i = 0; i < w.length; i++) {
                            var charSpan = document.createElement('span');
                            charSpan.className = 'char';
                            var charInner = document.createElement('span');
                            charInner.className = 'char-inner';
                            if (node.parentNode && node.parentNode.classList &&
                                node.parentNode.classList.contains('highlight-orange')) {
                                charInner.classList.add('highlight-orange');
                            }
                            charInner.textContent = w[i];
                            charSpan.appendChild(charInner);
                            wordSpan.appendChild(charSpan);
                        }
                        frag.appendChild(wordSpan);
                    }
                });
                return frag;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                var clone = node.cloneNode(false);
                Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                    var processed = processNode(child);
                    if (processed) clone.appendChild(processed);
                });
                return clone;
            }
            return node.cloneNode(true);
        }

        var newFrag = document.createDocumentFragment();
        Array.prototype.slice.call(el.childNodes).forEach(function (child) {
            newFrag.appendChild(processNode(child));
        });
        el.innerHTML = '';
        el.appendChild(newFrag);
    }

    function initTypographySplit() {
        document.querySelectorAll(
            '.media-hub-section .hero-heading, .media-hub-section .typo-title'
        ).forEach(splitHeadingIntoChars);
    }

    /* -----------------------------------------------------------
       2. SCROLL PROGRESS BAR
    ----------------------------------------------------------- */
    function initScrollProgress() {
        if (reduced) return;
        var bar = document.createElement('div');
        bar.className = 'mh-scroll-progress';
        document.body.appendChild(bar);

        var section = document.querySelector('.media-hub-section');
        if (!section) return;

        gsap.to(bar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.8
            }
        });
    }

    /* -----------------------------------------------------------
       3. ALL GSAP ANIMATIONS - smooth & elegant
    ----------------------------------------------------------- */
    function initGSAPScrollAnimations() {
        if (reduced) {
            initIntersectionObserverFallback();
            return;
        }
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            initIntersectionObserverFallback();
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        initScrollProgress();

        /* ── 3a. HERO ROW - gentle fade-up stagger ── */
        var heroRow = document.querySelector('.media-hub-section .row-hero');
        var heroCards = heroRow ? heroRow.querySelectorAll('.card') : [];
        if (heroCards.length) {
            gsap.set(heroCards, {
                opacity: 0,
                y: 50,
                scale: 0.95,
                filter: 'brightness(80%)'
            });

            gsap.to(heroCards, {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'brightness(100%)',
                duration: 1.4,
                ease: 'power2.out',
                stagger: 0.2,
                scrollTrigger: {
                    trigger: heroRow,
                    start: 'top 82%',
                    toggleActions: 'play none none reverse'
                }
            });
        }

        /* ── 3b. ROWS 2–7 - smooth alternating slide ── */
        var rows = document.querySelectorAll(
            '.media-hub-section .editorial-row:not(.row-hero):not(.row-8)'
        );
        rows.forEach(function (row, idx) {
            var cards = Array.prototype.slice.call(row.querySelectorAll('.card'));
            if (!cards.length) return;

            var fromLeft = (idx % 2 === 0);
            var xShift = fromLeft ? -35 : 35;

            /* Row slides smoothly */
            gsap.fromTo(row, {
                opacity: 0,
                x: xShift
            }, {
                opacity: 1,
                x: 0,
                duration: 1.3,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: row,
                    start: 'top 88%',
                    toggleActions: 'play none none reverse'
                }
            });

            /* Cards fade-up with stagger */
            var orderedCards = fromLeft ? cards : cards.slice().reverse();
            gsap.fromTo(orderedCards, {
                opacity: 0,
                y: 35,
                scale: 0.96,
                filter: 'brightness(85%)'
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'brightness(100%)',
                duration: 1.2,
                ease: 'power2.out',
                stagger: 0.15,
                scrollTrigger: {
                    trigger: row,
                    start: 'top 86%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        /* ── 3c. TYPOGRAPHY - smooth char slide-up ── */
        document.querySelectorAll('.media-hub-section .hero-heading, .media-hub-section .typo-title')
            .forEach(function (heading) {
                var chars = heading.querySelectorAll('.char-inner');
                if (!chars.length) return;

                gsap.fromTo(chars, {
                    y: '100%',
                    opacity: 0
                }, {
                    y: '0%',
                    opacity: 1,
                    duration: 1.0,
                    ease: 'power3.out',
                    stagger: 0.025,
                    scrollTrigger: {
                        trigger: heading,
                        start: 'top 88%',
                        toggleActions: 'play none none reverse'
                    }
                });
            });

        /* ── 3d. HERO TEXT CARD - clip-path wipe reveal ── */
        var heroText = document.querySelector('.media-hub-section .hero-text-card');
        if (heroText) {
            gsap.fromTo(heroText, {
                clipPath: 'inset(0 100% 0 0)',
                opacity: 0
            }, {
                clipPath: 'inset(0 0% 0 0)',
                opacity: 1,
                duration: 1.4,
                ease: 'power2.inOut',
                scrollTrigger: {
                    trigger: heroText,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });

            var heroTag = heroText.querySelector('.hero-tag');
            if (heroTag) {
                gsap.fromTo(heroTag, {
                    opacity: 0,
                    x: -12
                }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.9,
                    ease: 'power2.out',
                    delay: 0.6,
                    scrollTrigger: {
                        trigger: heroText,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse'
                    }
                });
            }

            var heroCta = heroText.querySelector('.theme-arrow-btn');
            if (heroCta) {
                gsap.fromTo(heroCta, {
                    opacity: 0,
                    y: 12
                }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    ease: 'power2.out',
                    delay: 0.8,
                    scrollTrigger: {
                        trigger: heroText,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse'
                    }
                });
            }
        }

        /* ── 3e. LOGO / ICON CARDS - smooth scale with gentle float ── */
        document.querySelectorAll('.media-hub-section .card-logo-dark, .media-hub-section .card-icon-light')
            .forEach(function (card) {
                gsap.fromTo(card, {
                    opacity: 0,
                    scale: 0.75,
                    y: 15
                }, {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 1.2,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 88%',
                        toggleActions: 'play none none reverse'
                    }
                });

                // Gentle breathing float
                gsap.to(card, {
                    y: -3,
                    duration: 3.5,
                    ease: 'sine.inOut',
                    yoyo: true,
                    repeat: -1
                });
            });

        /* ── 3f. NUMBER COUNTER - smooth count ── */
        document.querySelectorAll('.media-hub-section .typo-top-num').forEach(function (numEl) {
            var target = parseInt(numEl.textContent, 10);
            if (isNaN(target)) return;
            numEl.dataset.target = target;
            numEl.textContent = '00';

            ScrollTrigger.create({
                trigger: numEl,
                start: 'top 88%',
                once: true,
                onEnter: function () {
                    gsap.fromTo(numEl, {
                        opacity: 0,
                        y: 8
                    }, {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        ease: 'power2.out'
                    });
                    var obj = {
                        val: 0
                    };
                    gsap.to(obj, {
                        val: target,
                        duration: 1.8,
                        ease: 'power1.out',
                        onUpdate: function () {
                            var v = Math.round(obj.val);
                            numEl.textContent = (v < 10 ? '0' : '') + v;
                        }
                    });
                }
            });
        });

        /* ── 3g. PARALLAX - subtle smooth poster shift ── */
        document.querySelectorAll('.media-hub-section .card-video').forEach(function (card) {
            var img = card.querySelector('.video-poster img');
            if (!img) return;

            gsap.to(img, {
                yPercent: 8,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.5
                }
            });
        });

        /* ── 3h. ROW 8 RIBBON - smooth horizontal cascade ── */
        var row8 = document.querySelector('.media-hub-section .row-8');
        if (row8) {
            var ribbonCards = Array.prototype.slice.call(row8.querySelectorAll('.card'));
            gsap.fromTo(ribbonCards, {
                opacity: 0,
                x: 60,
                scale: 0.94
            }, {
                opacity: 1,
                x: 0,
                scale: 1,
                duration: 1.2,
                ease: 'power2.out',
                stagger: 0.12,
                scrollTrigger: {
                    trigger: row8,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse'
                }
            });
        }

        /* ── 3i. VIEWPORT SPOTLIGHT - focused/unfocused ── */
        document.querySelectorAll('.media-hub-section .card-video').forEach(function (card) {
            ScrollTrigger.create({
                trigger: card,
                start: 'top 62%',
                end: 'bottom 38%',
                onEnter: function () {
                    card.classList.add('mh-focused', 'mh-glow-enter');
                    card.classList.remove('mh-unfocused');
                },
                onLeave: function () {
                    card.classList.remove('mh-focused', 'mh-glow-enter');
                    card.classList.add('mh-unfocused');
                },
                onEnterBack: function () {
                    card.classList.add('mh-focused', 'mh-glow-enter');
                    card.classList.remove('mh-unfocused');
                },
                onLeaveBack: function () {
                    card.classList.remove('mh-focused', 'mh-glow-enter');
                    card.classList.add('mh-unfocused');
                }
            });
        });

        /* ── 3j. SECTION-ABOUT-US - smooth entrance ── */
        var aboutSection = document.querySelector('#section-about-us');
        if (aboutSection) {
            var fadeEls = aboutSection.querySelectorAll('.js-scroll');
            fadeEls.forEach(function (el, i) {
                el.classList.remove('scrolled');
                gsap.fromTo(el, {
                    opacity: 0,
                    y: 35
                }, {
                    opacity: 1,
                    y: 0,
                    duration: 1.2,
                    ease: 'power2.out',
                    delay: i * 0.15,
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse'
                    }
                });
            });
        }

        /* ── 3k. CTA BUTTONS - gentle fade-in ── */
        document.querySelectorAll('.media-hub-section .card-typo .theme-arrow-btn').forEach(function (btn) {
            gsap.fromTo(btn, {
                opacity: 0,
                y: 8
            }, {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
                delay: 0.5,
                scrollTrigger: {
                    trigger: btn.closest('.card-typo'),
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });
        });

        ScrollTrigger.refresh();
    }

    /* -----------------------------------------------------------
       FALLBACK - IntersectionObserver
    ----------------------------------------------------------- */
    function initIntersectionObserverFallback() {
        document.querySelectorAll('.media-hub-section .editorial-row').forEach(function (row) {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    row.querySelectorAll('.card').forEach(function (c, i) {
                        setTimeout(function () {
                            c.style.opacity = '1';
                            c.style.transform = 'none';
                            c.style.filter = 'none';
                        }, i * 120);
                    });
                    obs.unobserve(row);
                });
            }, {
                threshold: 0.1
            });
            obs.observe(row);
        });
    }

    /* -----------------------------------------------------------
       4. SVG STROKE DRAW ON SCROLL
    ----------------------------------------------------------- */
    function initSvgDrawOn() {
        if (reduced) return;
        var svgCards = document.querySelectorAll(
            '.media-hub-section .card-logo-dark, .media-hub-section .card-icon-light'
        );
        if (!svgCards.length) return;

        svgCards.forEach(function (card) {
            card.querySelectorAll('path, circle, rect, polyline, line, polygon').forEach(function (path) {
                var len = 0;
                try {
                    len = path.getTotalLength();
                } catch (e) {
                    len = 200;
                }
                path.style.strokeDasharray = len;
                path.style.strokeDashoffset = len;
                path.classList.add('mh-svg-path');
            });
        });

        var svgObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.querySelectorAll('.mh-svg-path').forEach(function (path, i) {
                    setTimeout(function () {
                        path.classList.add('mh-svg-drawn');
                    }, 150 + i * 120);
                });
                svgObs.unobserve(entry.target);
            });
        }, {
            threshold: 0.15
        });

        svgCards.forEach(function (card) {
            svgObs.observe(card);
        });
    }

    /* -----------------------------------------------------------
       5. 3D MOUSE TILT + SHEEN (gentle, smooth return)
    ----------------------------------------------------------- */
    function init3DTiltAndSheen() {
        if (reduced) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        var section = document.querySelector('.media-hub-section');
        if (!section) return;

        var rafId = null,
            pending = null;

        section.addEventListener('mousemove', function (e) {
            var target = e.target.closest('.card-video');
            if (!target) {
                if (section._tiltCard) {
                    resetTilt(section._tiltCard);
                    section._tiltCard = null;
                }
                return;
            }
            pending = {
                card: target,
                e: e
            };
            if (!rafId) {
                rafId = requestAnimationFrame(function () {
                    if (pending) applyTilt(pending.card, pending.e);
                    pending = null;
                    rafId = null;
                });
            }
        }, {
            passive: true
        });

        section.addEventListener('mouseleave', function () {
            if (section._tiltCard) {
                resetTilt(section._tiltCard);
                section._tiltCard = null;
            }
        }, {
            passive: true
        });

        function applyTilt(card, e) {
            var rect = card.getBoundingClientRect();
            var xPct = (e.clientX - rect.left) / rect.width;
            var yPct = (e.clientY - rect.top) / rect.height;
            var sheenX = Math.round(xPct * 100);
            var sheenY = Math.round(yPct * 100);

            // Very subtle tilt - smooth feel
            var rotY = (xPct - 0.5) * 4;
            var rotX = (0.5 - yPct) * 3;

            card.style.setProperty('--sheen-x', sheenX + '%');
            card.style.setProperty('--sheen-y', sheenY + '%');
            card.style.transform = 'perspective(1000px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale(1.01)';
            card.classList.add('mh-tilting');
            section._tiltCard = card;
        }

        function resetTilt(card) {
            card.style.setProperty('--sheen-x', '50%');
            card.style.setProperty('--sheen-y', '50%');
            card.style.transform = '';
            card.classList.remove('mh-tilting');
        }
    }

    /* -----------------------------------------------------------
       6. MAGNETIC HOVER - gentle pull toward cursor
    ----------------------------------------------------------- */
    function initMagneticHover() {
        if (reduced) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        var typoCards = document.querySelectorAll('.media-hub-section .card-typo');
        var logoCards = document.querySelectorAll('.media-hub-section .card-logo-dark, .media-hub-section .card-icon-light');
        var allMagnetic = Array.prototype.slice.call(typoCards).concat(Array.prototype.slice.call(logoCards));

        allMagnetic.forEach(function (card) {
            card.classList.add('mh-magnetic');

            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var cx = rect.left + rect.width / 2;
                var cy = rect.top + rect.height / 2;
                var dx = (e.clientX - cx) * 0.05;
                var dy = (e.clientY - cy) * 0.05;
                card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
            }, {
                passive: true
            });

            card.addEventListener('mouseleave', function () {
                card.style.transform = '';
            }, {
                passive: true
            });
        });
    }

    /* -----------------------------------------------------------
       BOOT
    ----------------------------------------------------------- */
    function boot() {
        document.body.classList.remove('mh-intro-playing');
        initTypographySplit();
        initSvgDrawOn();
        init3DTiltAndSheen();
        initMagneticHover();
        window.addEventListener('load', initGSAPScrollAnimations);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

}());