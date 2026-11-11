import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SoftGlowTouchEffect
 * Gentle, subtle cyan/sky-blue ambient glow effect:
 * - Soft ambient light spot that smoothly follows the cursor when moving on desktop.
 * - Gentle translucent cyan bloom at the exact click (desktop) / touch (mobile) point.
 * - Perfectly balanced: visible and clear without being harsh or distracting.
 * - 100% non-blocking (pointer-events: none) across all pages.
 * - Hardware-accelerated 60/120fps smooth cursor tracking with 0 re-renders.
 */
const SoftGlowTouchEffect = () => {
  const [glows, setGlows] = useState([]);
  const cursorRef = useRef(null);
  const glowIdRef = useRef(0);
  const lastTriggerRef = useRef({ time: 0, x: 0, y: 0 });

  const addGlow = useCallback((clientX, clientY) => {
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

    const now = performance.now();
    // Prevent duplicate triggers if pointerdown and touchstart fire in same 80ms window
    if (
      now - lastTriggerRef.current.time < 80 &&
      Math.abs(clientX - lastTriggerRef.current.x) < 20 &&
      Math.abs(clientY - lastTriggerRef.current.y) < 20
    ) {
      return;
    }
    lastTriggerRef.current = { time: now, x: clientX, y: clientY };

    const id = ++glowIdRef.current;
    setGlows((prev) => [...prev.slice(-5), { id, x: clientX, y: clientY }]);

    // Fallback cleanup
    setTimeout(() => {
      setGlows((prev) => prev.filter((g) => g.id !== id));
    }, 600);
  }, []);

  const removeGlow = useCallback((id) => {
    setGlows((prev) => prev.filter((g) => g.id !== id));
  }, []);

  useEffect(() => {
    // 1. Desktop cursor movement (Hardware-accelerated tracking without React re-renders)
    const handleMouseMove = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        cursorRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
      }
    };

    // 2. Desktop mouse click
    const handlePointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return; // Only primary click
      addGlow(e.clientX, e.clientY);
    };

    // 3. Mobile touch
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        addGlow(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
    };
  }, [addGlow]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-[999999]"
      aria-hidden="true"
    >
      <style>{`
        @keyframes subtleSoftGlowFade {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          20% {
            transform: scale(0.92);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.45;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }
        .subtle-soft-glow {
          animation: subtleSoftGlowFade 500ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          transform-origin: center center;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Smooth Ambient Cursor Follower (Visible on Desktop / Laptop when moving cursor) */}
      <div
        ref={cursorRef}
        className="hidden md:block fixed pointer-events-none rounded-full top-0 left-0 transition-opacity duration-200"
        style={{
          width: '42px',
          height: '42px',
          marginLeft: '-21px',
          marginTop: '-21px',
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.42) 0%, rgba(14, 165, 233, 0.22) 45%, rgba(6, 182, 212, 0.05) 75%, transparent 100%)',
          filter: 'blur(7px)',
          opacity: 0,
          willChange: 'transform',
        }}
      />

      {/* Click / Tap Soft Ambient Glow Spots */}
      {glows.map((glow) => (
        <div
          key={glow.id}
          onAnimationEnd={() => removeGlow(glow.id)}
          className="subtle-soft-glow absolute pointer-events-none"
          style={{
            left: `${glow.x}px`,
            top: `${glow.y}px`,
            width: '76px',
            height: '76px',
            marginLeft: '-38px',
            marginTop: '-38px',
          }}
        >
          {/* Soft, gentle translucent cyan ambient light spot */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(56, 189, 248, 0.48) 0%, rgba(14, 165, 233, 0.3) 38%, rgba(6, 182, 212, 0.1) 68%, transparent 100%)',
              filter: 'blur(10px)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default SoftGlowTouchEffect;
