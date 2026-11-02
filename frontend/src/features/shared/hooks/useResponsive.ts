import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
}

/**
 * Universal responsive breakpoint hook for Monk's Dream Jazz Bar POS.
 * Breakpoints aligned with project design guidelines:
 * - Mobile: < 768px (Phone size: ~360px - 430px)
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 */
export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLandscape = width > height;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
  };
};
