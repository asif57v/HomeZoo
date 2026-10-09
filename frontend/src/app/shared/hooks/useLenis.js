import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useLenis = (disabled = false) => {
    const lenisRef = useRef(null);

    useEffect(() => {
        if (disabled) {
            // Clean up any existing instance when disabled
            if (lenisRef.current) {
                lenisRef.current.destroy();
                lenisRef.current = null;
                if (window.lenis === lenisRef.current) {
                    window.lenis = null;
                }
            }
            return;
        }

        // Clean up any stale global instance before creating a new one
        if (window.lenis && window.lenis !== lenisRef.current) {
            try {
                window.lenis.destroy();
            } catch (e) {
                // Ignore cleanup errors
            }
            window.lenis = null;
        }

        // Ultra-smooth cinematic glide with luxurious momentum
        const lenis = new Lenis({
            duration: 1.25, // Silky smooth deceleration time
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out glide
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1.15, // Responsive, effortless travel
            syncTouch: true, // Inertial momentum scrolling on touch / mobile devices
            syncTouchLerp: 0.075, // Natural glide on finger release
            touchMultiplier: 1.25,
            touchInertiaExponent: 1.65,
            infinite: false,
            autoResize: true,
            autoRaf: true, // Native 60/120Hz requestAnimationFrame loop
            overscroll: true,
        });

        lenisRef.current = lenis;

        // Sync GSAP ScrollTrigger with Lenis
        lenis.on('scroll', ScrollTrigger.update);

        // Expose globally for modals, sheets, and navbars
        window.lenis = lenis;

        // Debounced resize handler so window/viewport adjustments don't cancel active scroll glide
        let resizeTimer = null;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                lenis.resize();
                ScrollTrigger.refresh();
            }, 200);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            lenis.destroy();
            lenisRef.current = null;
            if (window.lenis === lenis) {
                window.lenis = null;
            }
        };
    }, [disabled]);
};
