/**
 * Detects browser zoom level and calculates adjusted font size to maintain correct scaling.
 * Uses layout width vs visual width comparison to detect actual browser zoom,
 * ignoring device pixel ratio to avoid counting high DPI screens as zoomed.
 *
 * @param defaultFontSize - Base font size in pixels to adjust
 * @returns Adjusted font size in pixels
 */
export function getAdjustedFontSize(defaultFontSize: number = 16): number {
  // Get the current zoom level by comparing layout width to visual width
  const layoutWidth: number = document.documentElement.getBoundingClientRect().width;
  const visualWidth: number = window.visualViewport
    ? window.visualViewport.width
    : window.innerWidth;

  // Calculate zoom without device pixel ratio
  const zoomLevel: number = layoutWidth / visualWidth;

  // Guard against invalid values
  if (!isFinite(zoomLevel) || zoomLevel <= 0) {
    console.warn('Invalid zoom level detected, using default font size');
    return defaultFontSize;
  }

  // Adjust base font size inversely to zoom
  return defaultFontSize / zoomLevel;
}
