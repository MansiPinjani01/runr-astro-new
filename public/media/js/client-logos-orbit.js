window.addEventListener('load', function() {
    try {
        (function() {
            'use strict';

            var section = document.querySelector('.clo-section');
            if (!section) return;

            var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var hasGSAP = typeof window.gsap !== 'undefined';
            if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

            var orbitLayer = section.querySelector('[data-clo="orbit"]');
            var slots = Array.prototype.slice.call(section.querySelectorAll('[data-clo="logo"]'));
            var rings = Array.prototype.slice.call(section.querySelectorAll('[data-clo="ring"]'));
            var label = section.querySelector('[data-clo="label"]');
            var centerLines = Array.prototype.slice.call(section.querySelectorAll('[data-clo="line"]'));
            var dataScript = document.getElementById('clo-logo-data');

            if (!orbitLayer || !slots.length || !dataScript) return;

            var allLogos = [];
            try {
                allLogos = JSON.parse(dataScript.textContent || dataScript.innerText || '[]');
            } catch (e) {
                allLogos = [];
            }
            var totalLogos = allLogos.length || slots.length;

            var RING_CONFIG = [{
                    ring: 0,
                    count: 6,
                    radiusVar: '--clo-radius-outer',
                    angleOffset: -90
                },
                {
                    ring: 1,
                    count: 5,
                    radiusVar: '--clo-radius-mid',
                    angleOffset: -90 + 28
                },
                {
                    ring: 2,
                    count: 4,
                    radiusVar: '--clo-radius-inner',
                    angleOffset: -90 + 45
                }
            ];

            var SLOT_TABLE = [];
            RING_CONFIG.forEach(function(cfg) {
                var step = 360 / cfg.count;
                for (var i = 0; i < cfg.count; i++) {
                    SLOT_TABLE.push({
                        ring: cfg.ring,
                        angle: cfg.angleOffset + i * step,
                        radiusVar: cfg.radiusVar
                    });
                }
            });

            var VISIBLE_COUNT = SLOT_TABLE.length; // 15

            // Slots spread across all 3 rings that quietly drop out on very
            // narrow screens (one from each ring, not all from one ring).
            var COMPACT_HIDE_SLOT_INDICES = [1, 4, 8, 11, 13];

            slots.forEach(function(slot, i) {
                if (COMPACT_HIDE_SLOT_INDICES.indexOf(i) !== -1) {
                    slot.setAttribute('data-compact-hide', 'true');
                }
            });

            function syncCompactMode() {
                section.classList.toggle('is-compact', window.innerWidth <= 420);
            }
            syncCompactMode();

            // ------------------------------------------------------------
            // Helpers
            // ------------------------------------------------------------
            function getRingRadius(ringIndex) {
                var rings = [
                    section.querySelector('.clo-ring--outer'),
                    section.querySelector('.clo-ring--mid'),
                    section.querySelector('.clo-ring--inner')
                ];
                return rings[ringIndex] ? rings[ringIndex].offsetWidth / 2 : 200;
            }

            var currentOrbitAngle = 0;

            function computePositions() {
                return SLOT_TABLE.map(function(def) {
                    var radius = getRingRadius(def.ring);
                    var rad = (def.angle * Math.PI) / 180;
                    return {
                        ring: def.ring,
                        x: Math.cos(rad) * radius,
                        y: Math.sin(rad) * radius
                    };
                });
            }

            function applySlotTransform(slot, pos) {
                slot.dataset.x = pos.x.toFixed(2);
                slot.dataset.y = pos.y.toFixed(2);
                slot.setAttribute('data-ring', pos.ring);
                slot.style.transform =
                    'translate(-50%, -50%) translate(' + pos.x.toFixed(2) + 'px, ' + pos.y.toFixed(2) + 'px) rotate(' +
                    -currentOrbitAngle + 'deg)';
            }

            function layoutSlots() {
                var positions = computePositions();
                slots.forEach(function(slot, i) {
                    applySlotTransform(slot, positions[i]);
                });
            }

            layoutSlots();

            var resizeTimer;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    syncCompactMode();
                    layoutSlots(); // same ring/angle assignments, just re-measured radii
                    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
                }, 150);
            });

            // ------------------------------------------------------------
            // Fallback with no GSAP: static, correctly positioned, visible.
            // ------------------------------------------------------------
            if (!hasGSAP) {
                label.style.opacity = 1;
                centerLines.forEach(function(l) {
                    l.style.opacity = 1;
                    l.style.transform = 'none';
                });
                slots.forEach(function(s) {
                    s.style.opacity = 1;
                });
                rings.forEach(function(r) {
                    r.style.transform = 'scale(1)';
                });
                return;
            }

            // ------------------------------------------------------------
            // ENTRANCE TIMELINE — label -> center lines -> rings -> logos
            // ------------------------------------------------------------
            if (reduceMotion) {
                gsap.set(label, {
                    opacity: 1
                });
                gsap.set(centerLines, {
                    opacity: 1,
                    y: 0
                });
                gsap.set(rings, {
                    scale: 1
                });
                gsap.set(slots, {
                    opacity: 1
                });
            } else {
                var introTl = gsap.timeline({
                    defaults: {
                        ease: 'power3.out'
                    },
                    scrollTrigger: {
                        trigger: section,
                        start: 'top 75%',
                        once: true
                    }
                });

                introTl
                    .to(label, {
                        opacity: 1,
                        duration: 0.6
                    })
                    .to(centerLines, {
                        opacity: 1,
                        y: 0,
                        duration: 0.9,
                        stagger: 0.14
                    }, '-=0.2')
                    .to(rings, {
                        scale: 1,
                        duration: 1.1,
                        ease: 'power2.out',
                        stagger: 0.12
                    }, '-=0.5')
                    .to(slots, {
                        opacity: 1,
                        duration: 0.6,
                        stagger: {
                            each: 0.05,
                            from: 'center'
                        },
                        ease: 'power2.out'
                    }, '-=0.6');
            }

            if (!reduceMotion) {
                var MAX_ROTATION = 150; // degrees across the full scroll pass — slow, cinematic

                try {
                    ScrollTrigger.create({
                        trigger: section,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1.1,
                        onUpdate: function(self) {
                            currentOrbitAngle = self.progress * MAX_ROTATION;
                            orbitLayer.style.transform = 'rotate(' + currentOrbitAngle + 'deg)';
                            slots.forEach(function(slot) {
                                var x = parseFloat(slot.dataset.x);
                                var y = parseFloat(slot.dataset.y);
                                if (isNaN(x) || isNaN(y)) return;
                                slot.style.transform =
                                    'translate(-50%, -50%) translate(' + x + 'px, ' + y + 'px) rotate(' + -currentOrbitAngle + 'deg)';
                            });
                        }
                    });
                } catch (e) {
                    console.warn('Orbit ScrollTrigger init failed:', e.message);
                }

                var BATCH_INTERVAL = reduceMotion ? 6000 : 4600;
                var TRANSITION_OUT = reduceMotion ? 0.3 : 0.45;
                var TRANSITION_IN = reduceMotion ? 0.3 : 0.6;

                var batchCursor = VISIBLE_COUNT % totalLogos; // slots already hold items 0..14
                var cycleTimer = null;

                function getBatch(startIndex) {
                    var batch = [];
                    for (var i = 0; i < VISIBLE_COUNT; i++) {
                        batch.push(allLogos[(startIndex + i) % totalLogos]);
                    }
                    return batch;
                }

                function runBatchTransition() {
                    if (totalLogos <= VISIBLE_COUNT) return; // nothing new to cycle to

                    var nextBatch = getBatch(batchCursor);
                    var innerEls = slots.map(function(s) {
                        return s.querySelector('.clo-logo__inner');
                    });
                    var imgEls = slots.map(function(s) {
                        return s.querySelector('.clo-logo__img');
                    });

                    var outTl = gsap.timeline({
                        onComplete: function() {
                            slots.forEach(function(slot, i) {
                                var logoData = nextBatch[i];
                                if (!logoData) return;
                                imgEls[i].src = logoData.src;
                                imgEls[i].alt = logoData.alt;
                                slot.setAttribute('aria-label', logoData.alt);
                                // NOTE: no position change here — slot stays on its ring/angle.
                            });

                            gsap.to(slots, {
                                opacity: 1,
                                duration: TRANSITION_IN,
                                stagger: {
                                    each: 0.04,
                                    from: 'random'
                                },
                                ease: 'power3.out'
                            });
                            gsap.to(innerEls, {
                                scale: 1,
                                duration: TRANSITION_IN,
                                stagger: {
                                    each: 0.04,
                                    from: 'random'
                                },
                                ease: 'back.out(1.6)'
                            });
                        }
                    });

                    outTl
                        .to(slots, {
                            opacity: 0,
                            duration: TRANSITION_OUT,
                            stagger: {
                                each: 0.03,
                                from: 'random'
                            },
                            ease: 'power2.in'
                        })
                        .to(innerEls, {
                            scale: 0.8,
                            duration: TRANSITION_OUT,
                            stagger: {
                                each: 0.03,
                                from: 'random'
                            },
                            ease: 'power2.in'
                        }, '<');

                    batchCursor = (batchCursor + VISIBLE_COUNT) % totalLogos;
                }

                function startCycling() {
                    if (cycleTimer || totalLogos <= VISIBLE_COUNT) return;
                    cycleTimer = setInterval(runBatchTransition, BATCH_INTERVAL);
                }

                function stopCycling() {
                    clearInterval(cycleTimer);
                    cycleTimer = null;
                }

                if (window.ScrollTrigger) {
                    try {
                        ScrollTrigger.create({
                            trigger: section,
                            start: 'top bottom',
                            end: 'bottom top',
                            onEnter: startCycling,
                            onEnterBack: startCycling,
                            onLeave: stopCycling,
                            onLeaveBack: stopCycling
                        });
                    } catch (e) {
                        startCycling();
                    }
                } else {
                    startCycling();
                }

                // ------------------------------------------------------------
                // HOVER MICRO-INTERACTION
                // ------------------------------------------------------------
                slots.forEach(function(slot) {
                    var inner = slot.querySelector('.clo-logo__inner');
                    slot.setAttribute('tabindex', '0');

                    var hoverIn = function() {
                        gsap.to(inner, {
                            scale: 1.14,
                            duration: 0.45,
                            ease: 'power3.out'
                        });
                    };
                    var hoverOut = function() {
                        gsap.to(inner, {
                            scale: 1,
                            duration: 0.45,
                            ease: 'power3.out'
                        });
                    };

                    slot.addEventListener('mouseenter', hoverIn);
                    slot.addEventListener('mouseleave', hoverOut);
                    slot.addEventListener('focus', hoverIn);
                    slot.addEventListener('blur', hoverOut);
                });

                // ------------------------------------------------------------
                // EDITORIAL CTA SECTION REVEAL
                // ------------------------------------------------------------
                var ctaSection = document.getElementById('section-editorial-cta');
                if (ctaSection && hasGSAP && window.ScrollTrigger && !reduceMotion) {
                    var ctaLabel = ctaSection.querySelector('[data-cta="label"]');
                    var ctaLines = ctaSection.querySelectorAll('[data-cta="line"]');
                    var ctaFooter = ctaSection.querySelector('[data-cta="footer"]');

                    var ctaTl = gsap.timeline({
                        scrollTrigger: {
                            trigger: ctaSection,
                            start: 'top 75%',
                            once: true
                        },
                        defaults: {
                            ease: 'power3.out'
                        }
                    });

                    ctaTl
                        .to(ctaLabel, {
                            opacity: 1,
                            y: 0,
                            duration: 0.8
                        })
                        .to(ctaLines, {
                            y: '0%',
                            duration: 1,
                            stagger: 0.15,
                            ease: 'power4.out'
                        }, '-=0.4')
                        .to(ctaFooter, {
                            opacity: 1,
                            y: 0,
                            duration: 0.8
                        }, '-=0.5');
                }
            } // closes if (!reduceMotion)
        })(); // closes the outer IIFE
    } catch (e) {
        console.warn('Client Logos Orbit error:', e.message);
    }
});