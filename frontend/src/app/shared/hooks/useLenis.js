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
                window.lenis = null;
            }
            return;
        }

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            lerp: 0.09,
            smoothWheel: true,
            wheelMultiplier: 0.9,
            // Lenis v1 uses syncTouch (smoothTouch was removed): momentum scrolling on touch devices
            syncTouch: true,
            syncTouchLerp: 0.08,
            touchInertiaExponent: 1.6,
            touchMultiplier: 1.2,
            infinite: false,
            autoResize: true,
        });

        lenisRef.current = lenis;

        // Sync ScrollTrigger with Lenis
        lenis.on('scroll', ScrollTrigger.update);

        // Use GSAP ticker to drive Lenis for perfect sync
        const update = (time) => {
            lenis.raf(time * 1000);
        };

        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);

        // Expose globally for stop/start control (modals, sidebars, etc.)
        window.lenis = lenis;

        // Handle resize / orientation changes
        const handleResize = () => {
            lenis.resize();
            ScrollTrigger.refresh();
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            lenis.destroy();
            gsap.ticker.remove(update);
            lenisRef.current = null;
            window.lenis = null;
        };
    }, [disabled]);
};
