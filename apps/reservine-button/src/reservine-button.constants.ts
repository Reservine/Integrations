/**
 * Global stylesheet injected into the HOST page's <head>.
 *
 * It has to live in the host document because the drawer/modal are portalled out
 * of the widget's shadow root into <body> (fixed positioning inside a shadow root
 * nested in an arbitrary host layout is not reliable).
 *
 * Because of that, EVERY selector in here must be anchored on a marker that only
 * this widget ever writes:
 *
 *   [data-reservine-drawer]        - the drawer content element
 *   [data-reservine-overlay]       - the drawer overlay element
 *   [data-reservine-modal-portal]  - the modal portal container appended to <body>
 *
 * Never introduce a bare element/class/attribute selector here. In particular the
 * vendored vaul fork's original `data-vaul-*` attributes and `vaul-*` classes are
 * deliberately renamed to the `reservine-` namespace so that a host page running
 * its own (real) vaul / shadcn Drawer can never be matched by our rules, and vice
 * versa. If you rename anything here, rename it in:
 *   - components/vaul/components/content.svelte
 *   - components/vaul/components/overlay.svelte
 *   - components/internal/vaul.ts
 */
export const reservineButtonStyles = `
  [data-reservine-drawer].r-drawer-content {
    font-size: var(--reservine-font-size);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    z-index: 999999999;
    height: auto;
    flex-direction: column;
    border-radius: 0.625em 0.625em 0 0;
    border: 0.0625em solid #1e293b;
    background-color: #121417;
    max-width: 75em;
    width: 100vw;
    height: calc(100svh - 2em);
    margin: 0 auto;
    overscroll-behavior: contain;
    outline: none !important;
  }

  @media (max-width: 75em) {
    [data-reservine-drawer].r-drawer-content {
      border-left: none;
      border-right: none;
    }
  }

  [data-reservine-drawer] .r-drawer-header {
    height: 2.625em;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #121417;
    border-radius: 0.625em 0.625em 0 0;
  }

  [data-reservine-drawer] .r-drawer-handle {
    border-radius: 0.625em;
    background-color: #344255;
    height: 0.5em;
    width: 5em;
  }

  [data-reservine-drawer] .r-drawer-close {
    position: absolute !important;
    top: -1.8125em !important;
    left: 0.25em !important;
    cursor: pointer !important;
    width: 1.875em !important;
    height: 1.875em !important;
    background-color: transparent !important;
    border-radius: 50% !important;
    border: none !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #fff !important;
    outline: none !important;
  }

  [data-reservine-overlay].r-drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999999998;
    background-color: rgba(0, 0, 0, 0.5);
  }

  [data-reservine-drawer] {
    touch-action: none;
    transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-reservine-drawer][data-reservine-drawer-direction="bottom"] {
    transform: translate3d(0, 100%, 0);
  }

  [data-reservine-drawer][data-reservine-drawer-direction="top"] {
    transform: translate3d(0, -100%, 0);
  }

  [data-reservine-drawer][data-reservine-drawer-direction="left"] {
    transform: translate3d(-100%, 0, 0);
  }

  [data-reservine-drawer][data-reservine-drawer-direction="right"] {
    transform: translate3d(100%, 0, 0);
  }

  [data-reservine-drawer][data-reservine-drawer-direction="top"].reservine-drawer-dragging
    .reservine-drawer-scrollable {
    overflow-y: hidden !important;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="bottom"].reservine-drawer-dragging
    .reservine-drawer-scrollable {
    overflow-y: hidden !important;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="left"].reservine-drawer-dragging
    .reservine-drawer-scrollable {
    overflow-x: hidden !important;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="right"].reservine-drawer-dragging
    .reservine-drawer-scrollable {
    overflow-x: hidden !important;
  }

  [data-reservine-drawer][data-reservine-drawer-visible="true"][data-reservine-drawer-direction="top"] {
    transform: translate3d(0, var(--reservine-snap-point-height, 0), 0);
  }

  [data-reservine-drawer][data-reservine-drawer-visible="true"][data-reservine-drawer-direction="bottom"] {
    transform: translate3d(0, var(--reservine-snap-point-height, 0), 0);
  }

  [data-reservine-drawer][data-reservine-drawer-visible="true"][data-reservine-drawer-direction="left"] {
    transform: translate3d(var(--reservine-snap-point-height, 0), 0, 0);
  }

  [data-reservine-drawer][data-reservine-drawer-visible="true"][data-reservine-drawer-direction="right"] {
    transform: translate3d(var(--reservine-snap-point-height, 0), 0, 0);
  }

  [data-reservine-overlay] {
    opacity: 0;
    transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-reservine-overlay][data-reservine-drawer-visible="true"] {
    opacity: 1;
  }

  [data-reservine-drawer]::after {
    content: "";
    position: absolute;
    background: inherit;
    background-color: inherit;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="top"]::after {
    top: initial;
    bottom: 100%;
    left: 0;
    right: 0;
    height: 200%;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="bottom"]::after {
    top: 100%;
    bottom: initial;
    left: 0;
    right: 0;
    height: 200%;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="left"]::after {
    left: initial;
    right: 100%;
    top: 0;
    bottom: 0;
    width: 200%;
  }

  [data-reservine-drawer][data-reservine-drawer-direction="right"]::after {
    left: 100%;
    right: initial;
    top: 0;
    bottom: 0;
    width: 200%;
  }

  [data-reservine-overlay][data-reservine-snap-points="true"]:not(
    [data-reservine-snap-points-overlay="true"]:not([data-state="closed"])
  ) {
    opacity: 0;
  }

  [data-reservine-overlay][data-reservine-snap-points-overlay="true"]:not(
    [data-reservine-drawer-visible="false"]
  ) {
    opacity: 1;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-reservine-drawer] {
      user-select: none;
    }
  }

  [data-reservine-modal-portal] .r-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999999998;
    background-color: rgba(0, 0, 0, 0.5);
    animation: reservine-modal-fade-in 0.2s ease-out;
  }

  [data-reservine-modal-portal] .r-modal-content {
    font-size: var(--reservine-font-size);
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999999;
    max-width: 75em;
    width: calc(100vw - 2em);
    height: calc(100vh - 4em);
    max-height: 56.25em;
    animation: reservine-modal-slide-in 0.3s ease-out;
  }

  @media (min-width: 1024px) {
    [data-reservine-modal-portal] .r-modal-content {
      width: 90vw;
      height: 90vh;
    }
  }

  [data-reservine-modal-portal] .r-modal-close {
    position: absolute !important;
    top: -3em !important;
    left: 0 !important;
    cursor: pointer !important;
    width: 2em !important;
    height: 2em !important;
    background-color: rgba(0, 0, 0, 0.5) !important;
    border-radius: 50% !important;
    border: none !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #fff !important;
    outline: none !important;
    z-index: 10 !important;
    transition: background-color 0.2s ease-in-out !important;
  }

  [data-reservine-modal-portal] .r-modal-close:hover {
    background-color: rgba(0, 0, 0, 0.7) !important;
  }

  [data-reservine-modal-portal] .r-modal-slot-content {
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 0.625em !important;
    border: 0.0625em solid #1e293b !important;
    background-color: #121417 !important;
    overflow: hidden !important;
    overscroll-behavior: contain !important;
    outline: none !important;
  }

  @keyframes reservine-modal-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes reservine-modal-slide-in {
    from {
      opacity: 0;
      transform: translate(-50%, -48%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }
`;

/**
 * CSS selector the dynamic `--reservine-font-size` variable is defined on.
 *
 * Deliberately NOT `:root` - the widget must not write custom properties onto the
 * host page's root element. Both scopes below are widget-owned containers and the
 * variable inherits down to everything that needs it.
 */
export const reservineFontSizeScope = '[data-reservine-drawer], [data-reservine-modal-portal]';
