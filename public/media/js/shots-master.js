/**
 * RUNR Shots - Cylinder Coverflow + Thumbs Sync + Counter + Progress
 */
(function () {
    'use strict';
    if (typeof Swiper === 'undefined') return;

    var section = document.getElementById('section-shots');
    if (!section) return;

    var totalSlides = section.querySelectorAll('#news-templates-slider .swiper-slide').length;
    var counterEl = document.getElementById('shotsCounterActive');
    var progressFill = document.getElementById('shotsProgressFill');
    var progressHandle = document.getElementById('shotsProgressHandle');

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /* Thumb Swiper (bottom strip) */
    var thumbsSwiper = new Swiper('#thumbs-slider', {
        slidesPerView: 'auto',
        spaceBetween: 12,
        centeredSlides: true,
        watchSlidesProgress: true,
        grabCursor: true,
    });

    /* Main Cylinder Coverflow Swiper */
    var mainSwiper = new Swiper('#news-templates-slider', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        loop: true,
        slidesPerView: 5,
        spaceBetween: 0,
        speed: 600,
        coverflowEffect: {
            rotate: 15,
            stretch: -80,
            depth: 200,
            modifier: 1,
            slideShadows: false
        },
        // ... baaki same
        breakpoints: {
            1200: {
                slidesPerView: 5,
                spaceBetween: 0,
                coverflowEffect: {
                    rotate: 15,
                    stretch: -80,
                    depth: 200,
                    modifier: 1,
                    slideShadows: false
                }
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 0,
                coverflowEffect: {
                    rotate: 12,
                    stretch: -50,
                    depth: 150,
                    modifier: 1,
                    slideShadows: false
                }
            },
            640: {
                slidesPerView: 2,
                spaceBetween: 0,
                coverflowEffect: {
                    rotate: 8,
                    stretch: -20,
                    depth: 100,
                    modifier: 1,
                    slideShadows: false
                }
            },
            320: {
                slidesPerView: 1.5,
                spaceBetween: 0,
                coverflowEffect: {
                    rotate: 5,
                    stretch: 0,
                    depth: 60,
                    modifier: 1,
                    slideShadows: false
                }
            }
        }
    });

    /* Update counter + progress + sync thumb centering */
    function updateUI(swiper) {
        var num = swiper.realIndex + 1;
        if (counterEl) counterEl.textContent = pad(num);
        var pct = (num / totalSlides) * 100;
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressHandle) progressHandle.style.left = pct + '%';

        /* keep active thumb centered */
        if (thumbsSwiper) {
            thumbsSwiper.slideTo(swiper.realIndex, 300);
        }
    }

    /* Thumb click → main slide */
    section.querySelector('#thumbs-slider .swiper-wrapper').addEventListener('click', function (e) {
        var slide = e.target.closest('.swiper-slide');
        if (!slide) return;
        var idx = parseInt(slide.dataset.index, 10);
        if (!isNaN(idx)) mainSwiper.slideToLoop(idx, 600);
    });

    /* Side nav prev button */
    var prevBtn = document.getElementById('mainPrev');
    if (prevBtn) prevBtn.addEventListener('click', function () {
        mainSwiper.slidePrev();
    });

})();