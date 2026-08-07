/**
 * Media Hub — Grid Reveal + Idle Float Animation
 * From runr-media-hub.html prototype.
 *
 * 1) Reveal-on-scroll: fades/slides each .mh-reel card in as it enters viewport
 * 2) Idle float: subtle, slow, randomized vertical bobbing on each card
 * 3) Ken Burns: adds "is-playing" class when card is near viewport for CSS animation
 * 4) Chapter label parallax
 */
(function() {
    'use strict';

    function initGridReveal() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            setTimeout(initGridReveal, 100);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        var cards = document.querySelectorAll('.mh-grid .mh-reel');
        if (!cards.length) return;

        /* -------- 1. REVEAL ON SCROLL -------- */
        var revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !entry.target.classList.contains('mh-revealed')) {
                    var card = entry.target;
                    var siblings = Array.prototype.slice.call(card.parentElement.children);
                    var index = siblings.indexOf(card);
                    var delay = (index % 5) * 0.05;

                    gsap.to(card, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.9,
                        delay: delay,
                        ease: 'power3.out',
                        onComplete: function() {
                            // Release inline transform so CSS hover rules can take over
                            card.style.transform = '';
                        }
                    });

                    card.classList.add('mh-revealed');
                    revealObserver.unobserve(card);
                }
            });
        }, {
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.08
        });

        cards.forEach(function(card) {
            revealObserver.observe(card);
        });

        /* -------- 2. IDLE FLOAT (subtle vertical bobbing) -------- */
        cards.forEach(function(card) {
            var dur = 5 + Math.random() * 4;
            var dist = 4 + Math.random() * 4;
            var dly = Math.random() * 3;

            // Float the poster inside (not the card itself) to avoid conflict with hover transforms
            var poster = card.querySelector('.video-poster');
            if (poster) {
                gsap.to(poster, {
                    y: dist,
                    duration: dur,
                    delay: dly,
                    ease: 'sine.inOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        /* -------- 3. KEN BURNS — play/pause by proximity -------- */
        var mediaObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-playing');
                } else {
                    entry.target.classList.remove('is-playing');
                }
            });
        }, {
            rootMargin: '420px 0px 420px 0px',
            threshold: 0.01
        });

        cards.forEach(function(card) {
            mediaObserver.observe(card);
        });

        /* -------- 4. CHAPTER LABEL PARALLAX -------- */
        var labels = document.querySelectorAll('.mh-chapter-label h2');
        labels.forEach(function(h) {
            gsap.fromTo(h, {
                yPercent: 18,
                opacity: 0.4
            }, {
                yPercent: 0,
                opacity: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: h,
                    start: 'top 95%',
                    end: 'top 55%',
                    scrub: 0.6
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGridReveal);
    } else {
        initGridReveal();
    }
})();