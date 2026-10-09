import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use Lenis scrollTo if available for proper integration, otherwise fall back to native
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
      requestAnimationFrame(() => {
        window.lenis?.resize();
      });
      const timer = setTimeout(() => {
        window.lenis?.resize();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
