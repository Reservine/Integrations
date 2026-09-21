/**
 * Calculates adjusted font size based on browser zoom level using visualViewport.scale.
 * Falls back to default 16px if visualViewport is not supported.
 * This helps maintain consistent text size when the page is zoomed.
 *
 * @param defaultFontSize - Base font size in pixels (defaults to 16)
 * @returns Adjusted font size in pixels
 */
export function getAdjustedFontSize(defaultFontSize = 16) {
  // Check if visualViewport is supported and has valid scale
  if (!window.visualViewport?.scale) {
    return defaultFontSize;
  }

  // Get zoom scale directly from visualViewport
  const zoomScale = window.visualViewport.scale;

  // Adjust base font size inversely to zoom
  return defaultFontSize / zoomScale;
}

/**
 * Navigates the top-level window (the host page, even when the SDK itself runs
 * inside a frame). A cross-origin `top` throws on access, so fall back to the
 * current window.
 */
export function navigateTopWindow(url: string): void {
  try {
    (window.top ?? window).location.href = url;
  } catch {
    window.location.href = url;
  }
}
