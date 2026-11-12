import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SoftGlowTouchEffect
 * Gentle translucent cyan bloom triggered ONLY on click (desktop) or touch (mobile).
 * Normally invisible — appears at the click/tap position, gently expands, and fades out.
 * 100% non-blocking (pointer-events: none) across all pages.
 */
const SoftGlowTouchEffect = () => {
  const [glows, setGlows] = useState([]);
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
    // 1. Desktop mouse click
    const handlePointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return; // Only primary click
      addGlow(e.clientX, e.clientY);
    };

    // 2. Mobile touch
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        addGlow(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });

    return () => {
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
            transform: scale(0.4);
            opacity: 0;
          }
          25% {
            transform: scale(0.9);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.45;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
        .subtle-soft-glow {
          animation: subtleSoftGlowFade 450ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          transform-origin: center center;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Click / Tap Soft Ambient Glow Spots (Only appears on click/touch) */}
      {glows.map((glow) => (
        <div
          key={glow.id}
          onAnimationEnd={() => removeGlow(glow.id)}
          className="subtle-soft-glow absolute pointer-events-none"
          style={{
            left: `${glow.x}px`,
            top: `${glow.y}px`,
            width: '64px',
            height: '64px',
            marginLeft: '-32px',
            marginTop: '-32px',
          }}
        >
          {/* Soft, gentle translucent cyan ambient light spot */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, rgba(14, 165, 233, 0.28) 40%, rgba(6, 182, 212, 0.08) 70%, transparent 100%)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default SoftGlowTouchEffect;
