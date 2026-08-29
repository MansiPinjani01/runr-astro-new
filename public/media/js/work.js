/* work.js - Cinematic Timeline GSAP Logic */

document.addEventListener("DOMContentLoaded", () => {
    // Wait a moment for fonts and images to load to get correct widths
    setTimeout(initWorkTimeline, 100);
});

function initWorkTimeline() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error("GSAP or ScrollTrigger not loaded.");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Fancybox Setup
    if (typeof Fancybox !== "undefined") {
        Fancybox.bind("[data-fancybox]", {
            // Configuration for premium feel and avoiding layout jumps
            closeButton: "outside",
            dragToClose: false,
            autoFocus: false,
            placeFocusBack: false,
            Thumbs: false,
            Toolbar: {
                display: {
                    left: [],
                    middle: [],
                    right: ["close"],
                },
            },
        });
    }

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile setup: vertical layout, no GSAP pinning required
        // Animations are handled via simple vertical scroll triggers if needed,
        // but CSS handles the base states.
        return;
    }

    // --- DESKTOP HORIZONTAL TIMELINE ---

    const track = document.getElementById("timeline-track");
    const section = document.getElementById("timeline-section");
    const indicator = document.querySelector(".timeline-indicator");

    if (!track || !section) return;
    // Calculate total width to scroll
    function getScrollAmount() {
        let trackWidth = track.scrollWidth;
        return -(trackWidth - window.innerWidth);
    }

    // 1. Create the main horizontal scroll tween
    const scrollTween = gsap.to(track, {
        x: getScrollAmount,
        ease: "none",
        scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${getScrollAmount() * -1}`,
            pin: true,
            scrub: 1, // Smooth scrubbing for cinematic feel
            invalidateOnRefresh: true
        }
    });

    // 2. Setup Category Reveals using containerAnimation

    // Clip-path Reveal - each panel individually
    document.querySelectorAll(".panel .clip-path-reveal").forEach(function (el, index) {
        var parentPanel = el.closest(".panel");
        if (index === 0) {
            // First panel - reveal immediately when section enters
            gsap.to(el, {
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
                ease: "power2.inOut",
                duration: 1.5,
                scrollTrigger: {
                    trigger: section,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        } else {
            gsap.to(el, {
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
                ease: "power2.inOut",
                duration: 1.5,
                scrollTrigger: {
                    trigger: parentPanel,
                    containerAnimation: scrollTween,
                    start: "left 70%",
                    toggleActions: "play none none reverse"
                }
            });
        }
    });

    // Mask Reveal - each panel individually
    document.querySelectorAll(".panel .mask-reveal img").forEach(function (el) {
        var parentPanel = el.closest(".panel");
        gsap.to(el, {
            maskPosition: "left",
            ease: "power2.inOut",
            duration: 1.5,
            scrollTrigger: {
                trigger: parentPanel,
                containerAnimation: scrollTween,
                start: "left 70%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // Depth Zoom - each panel individually
    document.querySelectorAll(".panel .depth-zoom").forEach(function (el) {
        var parentPanel = el.closest(".panel");
        gsap.to(el, {
            scale: 1,
            z: 0,
            opacity: 1,
            ease: "power3.out",
            duration: 1.5,
            scrollTrigger: {
                trigger: parentPanel,
                containerAnimation: scrollTween,
                start: "left 70%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // Soft Rotation - each panel individually
    document.querySelectorAll(".panel .soft-rotation").forEach(function (el) {
        var parentPanel = el.closest(".panel");
        gsap.to(el, {
            rotationY: 0,
            scale: 1,
            opacity: 1,
            ease: "expo.out",
            duration: 2,
            scrollTrigger: {
                trigger: parentPanel,
                containerAnimation: scrollTween,
                start: "left 70%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // Split Reveal - each panel individually
    document.querySelectorAll(".panel .split-inner").forEach(function (el) {
        var parentPanel = el.closest(".panel");
        gsap.to(el, {
            clipPath: "inset(0 0 0 0)",
            ease: "power4.inOut",
            duration: 1.5,
            scrollTrigger: {
                trigger: parentPanel,
                containerAnimation: scrollTween,
                start: "left 70%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // Editorial Slide - each panel individually
    document.querySelectorAll(".panel .editorial-slide").forEach(function (el) {
        var parentPanel = el.closest(".panel");
        gsap.to(el, {
            y: 0,
            opacity: 1,
            ease: "power3.out",
            duration: 1.5,
            scrollTrigger: {
                trigger: parentPanel,
                containerAnimation: scrollTween,
                start: "left 70%",
                toggleActions: "play none none reverse"
            }
        });
    });


    // 3. Active Clip Logic (Playhead effect)
    const allClips = document.querySelectorAll(".clip-item");
    const allPanels = document.querySelectorAll(".panel");

    // Update active state based on position relative to the indicator (viewport center-left)
    function updateActiveStates() {
        if (!indicator) return;
        const indicatorRect = indicator.getBoundingClientRect();
        const triggerPoint = indicatorRect.left + indicatorRect.width / 2; // X coordinate of the indicator line

        // Update Clips
        allClips.forEach(clip => {
            const rect = clip.getBoundingClientRect();
            // If the indicator is within the clip's horizontal bounds
            if (triggerPoint >= rect.left - 50 && triggerPoint <= rect.right + 50) {
                if (!clip.classList.contains("is-active")) {
                    clip.classList.add("is-active");
                }
            } else {
                if (clip.classList.contains("is-active")) {
                    clip.classList.remove("is-active");
                }
            }
        });

        // Update Panels (for Category Title highlighting)
        allPanels.forEach(panel => {
            const rect = panel.getBoundingClientRect();
            if (triggerPoint >= rect.left && triggerPoint <= rect.right) {
                if (!panel.classList.contains("is-active")) {
                    panel.classList.add("is-active");
                }
            } else {
                if (panel.classList.contains("is-active")) {
                    panel.classList.remove("is-active");
                }
            }
        });
    }

    // Attach to scroll and resize
    window.addEventListener("scroll", updateActiveStates);

    // Initial check
    updateActiveStates();

    // Pulse indicator on scroll
    ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${getScrollAmount() * -1}`,
        onUpdate: (self) => {
            // Slight stretch effect on indicator based on scroll velocity
            const v = Math.abs(self.getVelocity());
            const newHeight = Math.min(60 + (v / 50), 120);
            gsap.to(indicator, {
                height: newHeight,
                duration: 0.2,
                overwrite: "auto"
            });

            // Debounce back to normal
            gsap.delayedCall(0.2, () => {
                gsap.to(indicator, {
                    height: 60,
                    duration: 0.3,
                    overwrite: "auto"
                });
            });
        }
    });
}