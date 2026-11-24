import { useWindowDimensions } from 'react-native';

// Tablet support. The app is portrait-locked, so width alone decides the layout:
//   phone  < 600dp   -> original single-column layout (all helpers are no-ops)
//   tablet >= 600dp  -> centered content column + multi-column grids
//   large  >= 900dp  -> one more grid column
export const TABLET_MIN = 600;
export const LARGE_MIN = 900;
export const CONTENT_MAX = 760; // forms, settings, reading pages
export const WIDE_MAX = 1180; // grids and home

// Centered column style. Safe on phones: maxWidth is larger than the screen, so nothing changes.
export const centered = (max = CONTENT_MAX) => ({ width: '100%', maxWidth: max, alignSelf: 'center' });
export const CENTER = centered(CONTENT_MAX);
export const CENTER_WIDE = centered(WIDE_MAX);

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN;
  const isLarge = width >= LARGE_MIN;
  // Usable width of a wide (grid) page, before its own horizontal padding.
  const wideW = Math.min(width, WIDE_MAX);
  const contentW = Math.min(width, CONTENT_MAX);
  // Pick a column count: cols(phone, tablet, large)
  const cols = (phone = 1, tablet = 2, large = 3) => (isLarge ? large : isTablet ? tablet : phone);
  // Width of one grid item inside a container of `inner` px with `gap` px between `n` columns.
  const itemW = (n, inner, gap = 12) => Math.floor((inner - gap * (n - 1)) / n);
  return { width, height, isTablet, isLarge, wideW, contentW, cols, itemW };
}
