/**
 * Media Hub — Video Engine
 * Supports both direct MP4 files and YouTube URLs (Watch / Embed / Shorts / Youtu.be).
 * Features:
 *  - IntersectionObserver loads & plays videos as cards enter viewport.
 *  - Card stays playing as long as it is visible in viewport.
 *  - Only unloads cards that have actually left the viewport.
 *  - MAX_ACTIVE limits concurrent connections; eviction only picks cards NOT in viewport.
 *  - Automatically detects YouTube URLs in `data-video`.
 *  - Creates muted, looped, autoplay YouTube iframe backgrounds without controls.
 *  - Responsive tuning: fewer concurrent videos and different observer margins on mobile.
 */

(function () {
  'use strict';

  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var MAX_ACTIVE  = isMobile ? 2 : 3;
  var ROOT_MARGIN = isMobile ? '50px 0px 50px 0px' : '100px 0px 100px 0px';
  var DEBOUNCE_MS = isMobile ? 350 : 200;
  var THRESHOLD   = 0;

  var activeSlots   = [];           // cards currently loaded/playing
  var visibleCards  = new Set();    // cards actually inside viewport right now
  var debounceTimers = new Map();
  var fallbackTimers = new Map();

  function getYouTubeId(url) {
    if (!url) return null;
    var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  function createVideoElement() {
    var v = document.createElement('video');
    v.autoplay = true;
    v.muted    = true;
    v.loop     = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('preload', 'metadata');
    v.controls = false;
    v.disablePictureInPicture = true;
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('controlslist', 'nodownload nofullscreen noplaybackrate');
    v.setAttribute('webkit-playsinline', '');
    return v;
  }

  function playVideo(card) {
      var container = card.querySelector('.video-container');
      if (!container) return;
      var iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
      }
      var video = container.querySelector('video');
      if (video) {
          video.play().catch(function(){});
      }
  }

  function pauseVideo(card) {
      var container = card.querySelector('.video-container');
      if (!container) return;
      var iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "pauseVideo", args: []}), "*");
      }
      var video = container.querySelector('video');
      if (video) {
          video.pause();
      }
  }

  function loadAndPlay(card) {
    var src       = card.getAttribute('data-video');
    var container = card.querySelector('.video-container');
    if (!src || !container) return;

    // already loaded — just play
    if (container.hasChildNodes()) {
        playVideo(card);
        return;
    }

    var ytId = getYouTubeId(src);

    if (ytId) {
      /* ── YouTube iframe background ── */
      var iframe = document.createElement('iframe');
      iframe.src =
        'https://www.youtube-nocookie.com/embed/' + ytId +
        '?autoplay=1&mute=1&loop=1&playlist=' + ytId +
        '&controls=0&showinfo=0&autohide=1&modestbranding=1' +
        '&enablejsapi=1&rel=0&playsinline=1&iv_load_policy=3';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('playsinline', '');
      container.appendChild(iframe);

      // wait for iframe to buffer before revealing it, hiding the loading UI
      setTimeout(function () {
        iframe.classList.add('mh-vid-ready');
        card.classList.add('mh-video-active');
      }, 2500);

    } else {
      /* ── Direct MP4 ── */
      var video  = createVideoElement();
      var source = document.createElement('source');
      source.src  = src;
      source.type = 'video/mp4';
      video.appendChild(source);
      container.appendChild(video);

      function onReady() {
        video.classList.add('mh-vid-ready');
        card.classList.add('mh-video-active');
        video.removeEventListener('canplay',        onReady);
        video.removeEventListener('canplaythrough', onReady);
      }

      if (video.readyState >= 3) {
        onReady();
      } else {
        video.addEventListener('canplay',        onReady, { passive: true });
        video.addEventListener('canplaythrough', onReady, { passive: true });
      }

      video.load();
      var p = video.play();
      if (p instanceof Promise) { p.catch(function () {}); }
    }
  }

  function unload(card) {
    var container = card.querySelector('.video-container');
    if (!container) return;

    var video = container.querySelector('video');
    if (video) {
      video.pause();
      video.classList.remove('mh-vid-ready');
      video.querySelectorAll('source').forEach(function (s) {
        s.removeAttribute('src');
      });
      try { video.load(); } catch (e) {}
      container.removeChild(video);
    }

    var iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.src = 'about:blank';
      container.removeChild(iframe);
    }

    card.classList.remove('mh-video-active');
    card.removeAttribute('data-yt-playing');
    var errFallback = card.querySelector('.yt-error-fallback');
    if (errFallback) errFallback.remove();
  }

  /**
   * Evict one card from activeSlots.
   * Rule: NEVER evict a card that is currently visible in the viewport.
   * Pick the oldest card that is NOT visible; if all are visible, do nothing.
   */
  function evictOne() {
    for (var i = 0; i < activeSlots.length; i++) {
      var candidate = activeSlots[i];
      if (!visibleCards.has(candidate)) {
        activeSlots.splice(i, 1);
        unload(candidate);
        return;
      }
    }
    // All active cards are visible — expand the limit instead of killing one
  }

  function registerActive(card) {
    var idx = activeSlots.indexOf(card);
    if (idx !== -1) {
      // already registered — move to end (most-recently-used)
      activeSlots.splice(idx, 1);
    }
    activeSlots.push(card);

    while (activeSlots.length > MAX_ACTIVE) {
      evictOne();
      // if evictOne found nothing to remove, stop to avoid infinite loop
      if (activeSlots.length > MAX_ACTIVE) break;
    }
  }

  function unregisterActive(card) {
    var idx = activeSlots.indexOf(card);
    if (idx !== -1) { activeSlots.splice(idx, 1); }
  }

  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var card = entry.target;

      if (entry.isIntersecting) {
        visibleCards.add(card);       // mark as visible FIRST

        if (debounceTimers.has(card)) {
            clearTimeout(debounceTimers.get(card));
            debounceTimers.delete(card);
        }

        var timer = setTimeout(function() {
            if (visibleCards.has(card)) {
                registerActive(card);
                loadAndPlay(card);
            }
            debounceTimers.delete(card);
        }, DEBOUNCE_MS);
        debounceTimers.set(card, timer);

      } else {
        visibleCards.delete(card);    // no longer in viewport

        if (debounceTimers.has(card)) {
            clearTimeout(debounceTimers.get(card));
            debounceTimers.delete(card);
        }

        if (activeSlots.indexOf(card) !== -1) {
            pauseVideo(card);
        }

        // Only unload if we're over the limit — prefer to keep it cached
        if (activeSlots.length > MAX_ACTIVE) {
          unregisterActive(card);
          unload(card);
        }
        // If within limit: leave it loaded (instant replay on scroll-back)
      }
    });
  }

  function init() {
    var cards = document.querySelectorAll('.media-hub-section .card-video');
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: load first MAX_ACTIVE cards directly
      var limit = Math.min(cards.length, MAX_ACTIVE);
      for (var f = 0; f < limit; f++) {
        activeSlots.push(cards[f]);
        visibleCards.add(cards[f]);
        loadAndPlay(cards[f]);
      }
      return;
    }

    var observer = new IntersectionObserver(onIntersect, {
      root:       null,
      rootMargin: ROOT_MARGIN,
      threshold:  THRESHOLD
    });

    for (var i = 0; i < cards.length; i++) {
      observer.observe(cards[i]);
    }
  }

  window.addEventListener('message', function(e) {
      if (e.origin !== 'https://www.youtube.com' && e.origin !== 'https://www.youtube-nocookie.com') return;
      try {
          var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          
          // Force play on ready just in case
          if (data.event === 'onReady') {
              e.source.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
          }

          if (data.event === 'infoDelivery' && data.info) {
              if (data.info.playerState === 1 || data.info.playerState === 3) {
                  document.querySelectorAll('.media-hub-section .card-video').forEach(function(card) {
                      var iframe = card.querySelector('iframe');
                      if (iframe && iframe.contentWindow === e.source) {
                          card.setAttribute('data-yt-playing', 'true');
                      }
                  });
              }
          }

          if (data.event === 'onError' || (data.info && data.info.error)) {
              document.querySelectorAll('.media-hub-section .card-video').forEach(function(card) {
                  var iframe = card.querySelector('iframe');
                  if (iframe && iframe.contentWindow === e.source) {
                      iframe.style.display = 'none';
                      var ytId = getYouTubeId(card.getAttribute('data-video'));
                      if (!card.querySelector('.yt-error-fallback')) {
                          var fallback = document.createElement('a');
                          fallback.className = 'yt-error-fallback';
                          fallback.href = 'https://www.youtube.com/watch?v=' + ytId;
                          fallback.target = '_blank';
                          fallback.innerHTML = 'Watch on YouTube';
                          fallback.style.position = 'absolute';
                          fallback.style.top = '50%';
                          fallback.style.left = '50%';
                          fallback.style.transform = 'translate(-50%, -50%)';
                          fallback.style.zIndex = '10';
                          fallback.style.background = 'rgba(0,0,0,0.7)';
                          fallback.style.color = '#fff';
                          fallback.style.padding = '8px 16px';
                          fallback.style.borderRadius = '4px';
                          fallback.style.textDecoration = 'none';
                          fallback.style.fontWeight = 'bold';
                          card.appendChild(fallback);
                      }
                  }
              });
          }
      } catch(err) {}
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
