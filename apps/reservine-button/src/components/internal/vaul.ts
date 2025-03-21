import { type Readable, derived, get, writable } from 'svelte/store';

import { TRANSITIONS, VELOCITY_THRESHOLD } from './constants.js';
import { handleEscapeKeydown } from './escape-keydown.js';
import {
  type ChangeFn,
  addEventListener,
  effect,
  getTranslate,
  isBrowser,
  isInput,
  isVertical,
  noop,
  omit,
  overridable,
  removeUndefined,
  reset,
  set,
  sleep,
  styleToString,
  toWritableStores,
} from './helpers/index.js';
import { handlePositionFixed } from './position-fixed.js';
import { isIOS, preventScroll } from './prevent-scroll.js';
import { handleSnapPoints } from './snap-points.js';
import type { DrawerDirection, SvelteEvent } from './types.js';

const CLOSE_THRESHOLD = 0.25;

const SCROLL_LOCK_TIMEOUT = 100;

const BORDER_RADIUS = 8;

const NESTED_DISPLACEMENT = 16;

const WINDOW_TOP_OFFSET = 26;

const DRAG_CLASS = 'vaul-dragging';

const openDrawerIds = writable<string[]>([]);

interface WithFadeFromProps {
  snapPoints: (number | string)[];
  fadeFromIndex: number;
}

interface WithoutFadeFromProps {
  snapPoints?: (number | string)[];
  fadeFromIndex?: never;
}

export type CreateVaulProps = {
  defaultActiveSnapPoint?: number | string | null;
  onActiveSnapPointChange?: ChangeFn<number | string | null>;
  defaultOpen?: boolean;
  onOpenChange?: ChangeFn<boolean>;
  closeThreshold?: number;
  shouldScaleBackground?: boolean;
  backgroundColor?: string;
  scrollLockTimeout?: number;
  fixed?: boolean;
  dismissible?: boolean;
  direction?: DrawerDirection;
  onDrag?: (
    event: SvelteEvent<PointerEvent | TouchEvent, HTMLElement>,
    percentageDragged: number,
  ) => void;
  onRelease?: (
    event: SvelteEvent<PointerEvent | MouseEvent | TouchEvent, HTMLElement>,
    open: boolean,
  ) => void;
  modal?: boolean;
  nested?: boolean;
  onClose?: () => void;
  isIframe?: boolean;
} & (WithFadeFromProps | WithoutFadeFromProps);

const defaultProps = {
  closeThreshold: CLOSE_THRESHOLD,
  shouldScaleBackground: true,
  scrollLockTimeout: SCROLL_LOCK_TIMEOUT,
  onDrag: undefined,
  onRelease: undefined,
  snapPoints: undefined,
  fadeFromIndex: undefined,
  defaultActiveSnapPoint: undefined,
  onActiveSnapPointChange: undefined,
  defaultOpen: false,
  onOpenChange: undefined,
  fixed: undefined,
  dismissible: true,
  modal: true,
  nested: false,
  onClose: undefined,
  direction: 'bottom' as const,
  isIframe: true,
};

const omittedOptions = [
  'defaultOpen',
  'onOpenChange',
  'defaultActiveSnapPoint',
  'onActiveSnapPointChange',
  'onDrag',
  'onRelease',
  'onClose',
] as const;

export function createVaul(props: CreateVaulProps) {
  const {
    snapPoints: snapPointsProp,
    fadeFromIndex: fadeFromIndexProp = snapPointsProp && snapPointsProp.length - 1,
    ...withDefaults
  } = { ...defaultProps, ...removeUndefined(props) } satisfies CreateVaulProps;

  const options = toWritableStores(
    omit(
      {
        ...withDefaults,
        snapPoints: snapPointsProp,
        fadeFromIndex: fadeFromIndexProp,
      },
      ...omittedOptions,
    ),
  );

  // keep a reference to the trigger element so we can refocus when it closes via the keyboard
  const triggerRef = writable<HTMLButtonElement | undefined>(undefined);

  const { onDrag: onDragProp, onRelease: onReleaseProp, onClose, onOpenChange } = withDefaults;

  const {
    snapPoints,
    fadeFromIndex,
    fixed,
    dismissible,
    modal,
    nested,
    shouldScaleBackground,
    scrollLockTimeout,
    closeThreshold,
    direction,
  } = options;

  const openStore = writable(withDefaults.defaultOpen);
  const isOpen = overridable(openStore, withDefaults.onOpenChange);
  const hasBeenOpened = writable(false);
  const visible = writable(false);
  const justReleased = writable(false);
  const overlayRef = writable<HTMLDivElement | undefined>(undefined);
  const openTime = writable<Date | null>(null);
  const keyboardIsOpen = writable(false);
  const drawerRef = writable<HTMLDivElement | undefined>(undefined);
  const drawerId = writable<string | undefined>(undefined);

  let isDragging = false;
  let dragStartTime: Date | null = null;
  let isClosing = false;
  let pointerStart = 0;
  let dragEndTime: Date | null = null;
  let lastTimeDragPrevented: Date | null = null;
  let isAllowedToDrag = false;
  let drawerHeightRef = get(drawerRef)?.getBoundingClientRect().height || 0;
  let previousDiffFromInitial = 0;
  let initialDrawerHeight = 0;
  let nestedOpenChangeTimer: NodeJS.Timeout | null = null;

  const activeSnapPoint = overridable(
    writable(withDefaults.defaultActiveSnapPoint),
    withDefaults.onActiveSnapPointChange,
  );

  const {
    activeSnapPointIndex,
    getPercentageDragged: getSnapPointsPercentageDragged,
    onDrag: onDragSnapPoints,
    onRelease: onReleaseSnapPoints,
    shouldFade,
    snapPointsOffset,
  } = handleSnapPoints({
    snapPoints,
    activeSnapPoint,
    drawerRef,
    fadeFromIndex,
    overlayRef,
    openTime,
    direction,
  });

  const getContentStyle: Readable<(style?: string | null) => string> = derived(
    [snapPointsOffset],
    ([$snapPointsOffset]) => {
      return (style: string | null = '') => {
        if ($snapPointsOffset && $snapPointsOffset.length > 0) {
          const styleProp = styleToString({
            '--snap-point-height': `${$snapPointsOffset[0]}px`,
          });
          return style + styleProp;
        }

        return style;
      };
    },
  );

  effect([drawerRef], ([$drawerRef]) => {
    if ($drawerRef) {
      drawerId.set($drawerRef.id);
    }
  });

  effect([isOpen], ([$open]) => {
    // Prevent double clicks from closing multiple dialogs
    sleep(100).then(() => {
      const id = get(drawerId);
      if ($open && id) {
        openDrawerIds.update((prev) => {
          if (prev.includes(id)) {
            return prev;
          }
          prev.push(id);
          return prev;
        });
      } else {
        openDrawerIds.update((prev) => prev.filter((id) => id !== id));
      }
    });
  });

  effect([isOpen], ([$isOpen]) => {
    if (!$isOpen && get(shouldScaleBackground)) {
      const id = setTimeout(() => {
        reset(document.body, 'background');
      }, 200);

      return () => clearTimeout(id);
    }
  });

  // TODO: fix someday
  /*  if (!props.isIframe) {
    // prevent scroll when the drawer is open
    effect([isOpen], ([$isOpen]) => {
      let unsub = () => {};

      if ($isOpen) {
        unsub = preventScroll();
      }

      return unsub;
    });
  }*/

  const { restorePositionSetting } = handlePositionFixed({ isOpen, modal, nested, hasBeenOpened });

  // Close the drawer on escape keydown
  effect([drawerRef], ([$drawerRef]) => {
    let unsub = noop;

    if ($drawerRef) {
      unsub = handleEscapeKeydown($drawerRef, () => {
        closeDrawer(true);
      });
    }

    return () => {
      unsub();
    };
  });

  function openDrawer() {
    if (isClosing) return;
    hasBeenOpened.set(true);
    isOpen.set(true);
  }

  function onPress(event: SvelteEvent<PointerEvent, HTMLElement>) {
    const $drawerRef = get(drawerRef);

    if (!get(dismissible) && !get(snapPoints)) return;
    if ($drawerRef && !$drawerRef.contains(event.target as Node)) return;
    drawerHeightRef = $drawerRef?.getBoundingClientRect().height || 0;

    isDragging = true;

    dragStartTime = new Date();

    // iOS doesn't trigger mouseUp after scrolling so we need to listen to touched in order to disallow dragging
    if (isIOS()) {
      window.addEventListener('touchend', () => (isAllowedToDrag = false), { once: true });
    }
    // Ensure we maintain correct pointer capture even when going outside of the drawer
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    pointerStart = isVertical(get(direction)) ? event.screenY : event.screenX;
  }

  function shouldDrag(el: EventTarget, isDraggingInDirection: boolean) {
    const $drawerRef = get(drawerRef);
    let element = el as HTMLElement;
    const highlightedText = window.getSelection()?.toString();
    const $direction = get(direction);
    const swipeAmount = $drawerRef ? getTranslate($drawerRef, $direction) : null;
    const date = new Date();

    // Allow scrolling when animating
    const $openTime = get(openTime);

    if ($openTime && date.getTime() - $openTime.getTime() < 500) {
      return false;
    }

    if (swipeAmount !== null) {
      if ($direction === 'bottom' || $direction === 'right' ? swipeAmount > 0 : swipeAmount < 0) {
        return true;
      }
    }

    if (swipeAmount !== null && swipeAmount > 0) {
      return true;
    }

    // Don't drag if there's highlighted text
    if (highlightedText && highlightedText.length > 0) {
      return false;
    }

    const $scrollLockTimeout = get(scrollLockTimeout);
    // Disallow dragging if drawer was scrolled within `scrollLockTimeout`
    if (
      lastTimeDragPrevented &&
      date.getTime() - lastTimeDragPrevented.getTime() < $scrollLockTimeout &&
      swipeAmount === 0
    ) {
      lastTimeDragPrevented = date;
      return false;
    }

    if (isDraggingInDirection) {
      lastTimeDragPrevented = date;

      // We are dragging down so we should allow scrolling
      return false;
    }

    // Keep climbing up the DOM tree as long as there's a parent
    while (element) {
      // Check if the element is scrollable
      if (element.scrollHeight > element.clientHeight) {
        if (element.scrollTop !== 0) {
          lastTimeDragPrevented = new Date();

          // The element is scrollable and not scrolled to the top, so don't drag
          return false;
        }

        if (element.getAttribute('role') === 'dialog') {
          return true;
        }
      }

      // Move up to the parent element
      element = element.parentNode as HTMLElement;
    }

    // No scrollable parents not scrolled to the top found, so drag
    return true;
  }

  function onDrag(event: SvelteEvent<PointerEvent | TouchEvent, HTMLElement>) {
    const $drawerRef = get(drawerRef);
    if (!$drawerRef || !isDragging) return;
    // We need to know how much of the drawer has been dragged in percentages so that we can transform background accordingly
    const $direction = get(direction);

    const directionMultiplier = getDirectionMultiplier($direction);

    const draggedDistance = getDistanceMoved(pointerStart, $direction, event) * directionMultiplier;
    const isDraggingInDirection = draggedDistance > 0;

    const $activeSnapPointIndex = get(activeSnapPointIndex);
    const $snapPoints = get(snapPoints);

    // Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
    if ($snapPoints && $activeSnapPointIndex === 0 && !get(dismissible)) return;
    if (!isAllowedToDrag && !shouldDrag(event.target as HTMLElement, isDraggingInDirection)) {
      return;
    }

    $drawerRef.classList.add(DRAG_CLASS);
    // If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
    isAllowedToDrag = true;

    set($drawerRef, {
      transition: 'none',
    });

    const $overlayRef = get(overlayRef);

    set($overlayRef, {
      transition: 'none',
    });

    if ($snapPoints) {
      onDragSnapPoints({ draggedDistance });
    }

    // Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
    if (isDraggingInDirection && !$snapPoints) {
      const dampenedDraggedDistance = dampenValue(draggedDistance);

      const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;

      set($drawerRef, {
        transform: isVertical($direction)
          ? `translate3d(0, ${translateValue}px, 0)`
          : `translate3d(${translateValue}px, 0, 0)`,
      });
      return;
    }

    // We need to capture last time when drag with scroll was triggered and have a timeout between
    const absDraggedDistance = Math.abs(draggedDistance);

    let percentageDragged = absDraggedDistance / drawerHeightRef;
    const snapPointPercentageDragged = getSnapPointsPercentageDragged(
      absDraggedDistance,
      isDraggingInDirection,
    );

    if (snapPointPercentageDragged !== null) {
      percentageDragged = snapPointPercentageDragged;
    }

    const opacityValue = 1 - percentageDragged;

    const $fadeFromIndex = get(fadeFromIndex);
    const $shouldFade = get(shouldFade);

    if ($shouldFade || ($fadeFromIndex && $activeSnapPointIndex === $fadeFromIndex - 1)) {
      onDragProp?.(event, percentageDragged);

      set(
        $overlayRef,
        {
          opacity: `${opacityValue}`,
          transition: 'none',
        },
        true,
      );
    }
    const wrapper = document.querySelector('[data-vaul-drawer-wrapper]');

    if (wrapper && $overlayRef && get(shouldScaleBackground)) {
      // Calculate percentageDragged as a fraction (0 to 1)
      const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
      const borderRadiusValue = 8 - percentageDragged * 8;

      const translateValue = Math.max(0, 14 - percentageDragged * 14);

      set(
        wrapper,
        {
          borderRadius: `${borderRadiusValue}px`,
          transform: isVertical($direction)
            ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
            : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
          transition: 'none',
        },
        true,
      );
    }

    if (!$snapPoints) {
      const translateValue = absDraggedDistance * directionMultiplier;
      set($drawerRef, {
        transform: isVertical($direction)
          ? `translate3d(0, ${translateValue}px, 0)`
          : `translate3d(${translateValue}px, 0, 0)`,
      });
    }
  }

  function scaleBackground(open: boolean, backgroundColor: string | undefined = 'black') {
    const wrapper = document.querySelector('[data-vaul-drawer-wrapper]');

    if (!wrapper || !get(shouldScaleBackground)) return;
    const $direction = get(direction);

    if (open) {
      set(
        document.body,
        {
          background: backgroundColor,
        },
        true,
      );

      set(wrapper, {
        borderRadius: `${BORDER_RADIUS}px`,
        overflow: 'hidden',
        ...(isVertical($direction)
          ? {
              transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
              transformOrigin: 'top',
            }
          : {
              transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
              transformOrigin: 'left',
            }),
        transitionProperty: 'transform, border-radius',
        transitionDuration: `${TRANSITIONS.DURATION}s`,
        transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      });
    } else {
      // Exit
      reset(wrapper, 'overflow');
      reset(wrapper, 'transform');
      reset(wrapper, 'borderRadius');
      set(wrapper, {
        transitionProperty: 'transform, border-radius',
        transitionDuration: `${TRANSITIONS.DURATION}s`,
        transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      });
    }
  }

  effect(
    [activeSnapPointIndex, snapPoints, snapPointsOffset],
    ([$activeSnapPointIndex, $snapPoints, $snapPointsOffset]) => {
      function onVisualViewportChange() {
        const $drawerRef = get(drawerRef);
        if (!$drawerRef) return;
        const $keyboardIsOpen = get(keyboardIsOpen);

        const focusedElement = document.activeElement as HTMLElement;
        if (isInput(focusedElement) || $keyboardIsOpen) {
          const visualViewportHeight = window.visualViewport?.height || 0;
          // This is the height of the keyboard
          let diffFromInitial = window.innerHeight - visualViewportHeight;
          const drawerHeight = $drawerRef.getBoundingClientRect().height || 0;
          if (!initialDrawerHeight) {
            initialDrawerHeight = drawerHeight;
          }
          const offsetFromTop = $drawerRef.getBoundingClientRect().top;

          // visualViewport height may change due to some subtle changes to the keyboard. Checking if the height changed by 60 or more will make sure that they keyboard really changed its open state.
          if (Math.abs(previousDiffFromInitial - diffFromInitial) > 60) {
            keyboardIsOpen.set(!$keyboardIsOpen);
          }

          if ($snapPoints && $snapPoints.length > 0 && $snapPointsOffset && $activeSnapPointIndex) {
            const activeSnapPointHeight = $snapPointsOffset[$activeSnapPointIndex] || 0;
            diffFromInitial += activeSnapPointHeight;
          }

          previousDiffFromInitial = diffFromInitial;

          // We don't have to change the height if the input is in view, when we are here we are in the opened keyboard state so we can correctly check if the input is in view
          if (drawerHeight > visualViewportHeight || $keyboardIsOpen) {
            const height = $drawerRef.getBoundingClientRect().height;
            let newDrawerHeight = height;

            if (height > visualViewportHeight) {
              newDrawerHeight = visualViewportHeight - WINDOW_TOP_OFFSET;
            }
            // When fixed, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
            if (get(fixed)) {
              $drawerRef.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
            } else {
              $drawerRef.style.height = `${Math.max(
                newDrawerHeight,
                visualViewportHeight - offsetFromTop,
              )}px`;
            }
          } else {
            $drawerRef.style.height = `${initialDrawerHeight}px`;
          }

          if ($snapPoints && $snapPoints.length > 0 && !$keyboardIsOpen) {
            $drawerRef.style.bottom = `0px`;
          } else {
            // Negative bottom value would never make sense
            $drawerRef.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
          }
        }
      }

      let removeListener = noop;

      if (window.visualViewport) {
        removeListener = addEventListener(window.visualViewport, 'resize', onVisualViewportChange);
      }

      return () => {
        removeListener();
      };
    },
  );

  function closeDrawer(withKeyboard: boolean = false) {
    if (isClosing) return;

    const $drawerRef = get(drawerRef);
    if (!$drawerRef) return;
    const $direction = get(direction);

    onClose?.();
    set($drawerRef, {
      transform: isVertical($direction)
        ? `translate3d(0, ${$direction === 'bottom' ? '100%' : '-100%'}, 0)`
        : `translate3d(${$direction === 'right' ? '100%' : '-100%'}, 0, 0)`,
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    set(get(overlayRef), {
      opacity: '0',
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    scaleBackground(false);

    isClosing = true;
    setTimeout(() => {
      visible.set(false);
      isOpen.set(false);
      isClosing = false;
      if (withKeyboard) {
        get(triggerRef)?.focus();
      }
    }, 300);

    const $snapPoints = get(snapPoints);

    setTimeout(() => {
      reset(document.documentElement, 'scrollBehavior');
      reset(document.documentElement, 'overscrollBehavior');
      if ($snapPoints) {
        activeSnapPoint.set($snapPoints[0]);
      }
    }, TRANSITIONS.DURATION * 1000); // seconds to ms
  }

  // This can be done much better

  effect([isOpen], ([$isOpen]) => {
    if ($isOpen) {
      hasBeenOpened.set(true);
    } else {
      closeDrawer();
    }
  });

  function resetDrawer() {
    const $drawerRef = get(drawerRef);
    if (!$drawerRef) return;
    const $overlayRef = get(overlayRef);
    const wrapper = document.querySelector('[data-vaul-drawer-wrapper]');
    const $direction = get(direction);
    const currentSwipeAmount = getTranslate($drawerRef, $direction);

    set($drawerRef, {
      transform: 'translate3d(0, 0, 0)',
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    set($overlayRef, {
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      opacity: '1',
    });

    const $shouldScaleBackground = get(shouldScaleBackground);
    const $isOpen = get(isOpen);

    // Don't reset background if swiped upwards
    if ($shouldScaleBackground && currentSwipeAmount && currentSwipeAmount > 0 && $isOpen) {
      set(
        wrapper,
        {
          borderRadius: `${BORDER_RADIUS}px`,
          overflow: 'hidden',
          ...(isVertical($direction)
            ? {
                transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
                transformOrigin: 'top',
              }
            : {
                transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
                transformOrigin: 'left',
              }),
          transitionProperty: 'transform, border-radius',
          transitionDuration: `${TRANSITIONS.DURATION}s`,
          transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        },
        true,
      );
    }
  }

  function onRelease(event: SvelteEvent<PointerEvent | MouseEvent | TouchEvent, HTMLElement>) {
    const $drawerRef = get(drawerRef);
    if (!isDragging || !$drawerRef) return;

    if (isAllowedToDrag && isInput(event.target as HTMLElement)) {
      // If we were just dragging, prevent focusing on inputs etc. on release
      (event.target as HTMLInputElement).blur();
    }
    $drawerRef.classList.remove(DRAG_CLASS);
    isAllowedToDrag = false;
    isDragging = false;

    dragEndTime = new Date();
    const $direction = get(direction);
    const swipeAmount = getTranslate($drawerRef, $direction);

    if (
      (event.target && !shouldDrag(event.target, false)) ||
      !swipeAmount ||
      Number.isNaN(swipeAmount)
    )
      return;

    if (dragStartTime === null) return;

    const timeTaken = dragEndTime.getTime() - dragStartTime.getTime();
    const distMoved = getDistanceMoved(pointerStart, $direction, event);
    const velocity = Math.abs(distMoved) / timeTaken;

    if (velocity > 0.05) {
      // `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
      justReleased.set(true);

      setTimeout(() => {
        justReleased.set(false);
      }, 200);
    }

    if (get(snapPoints)) {
      onReleaseSnapPoints({
        draggedDistance: distMoved * getDirectionMultiplier($direction),
        closeDrawer,
        velocity,
        dismissible: get(dismissible),
      });
      onReleaseProp?.(event, true);
      return;
    }

    // Moved upwards, don't do anything
    if ($direction === 'bottom' || $direction === 'right' ? distMoved > 0 : distMoved < 0) {
      resetDrawer();
      onReleaseProp?.(event, true);
      return;
    }

    if (velocity > VELOCITY_THRESHOLD) {
      closeDrawer();
      onReleaseProp?.(event, false);
      return;
    }

    const visibleDrawerHeight = Math.min(
      get(drawerRef)?.getBoundingClientRect().height ?? 0,
      window.innerHeight,
    );

    if (swipeAmount >= visibleDrawerHeight * get(closeThreshold)) {
      closeDrawer();
      onReleaseProp?.(event, false);
      return;
    }

    onReleaseProp?.(event, true);
    resetDrawer();
  }

  effect([isOpen], ([$isOpen]) => {
    // Trigger enter animation without using CSS animation
    if (!$isOpen) return;
    if (isBrowser) {
      set(document.documentElement, {
        scrollBehavior: 'auto',
        overscrollBehavior: 'none',
      });
    }
    openTime.set(new Date());
    scaleBackground(true, props.backgroundColor);
  });

  effect([visible], ([$visible]) => {
    if (!$visible) return;

    // Find all scrollable elements inside our drawer and assign a class to it so that we can disable overflow when dragging to prevent pointermove not being captured
    const $drawerRef = get(drawerRef);
    if (!$drawerRef) return;

    const children = $drawerRef.querySelectorAll('*');
    children.forEach((child: Element) => {
      const htmlChild = child as HTMLElement;
      if (
        htmlChild.scrollHeight > htmlChild.clientHeight ||
        htmlChild.scrollWidth > htmlChild.clientWidth
      ) {
        htmlChild.classList.add('vaul-scrollable');
      }
    });
  });

  function onNestedOpenChange(o: boolean) {
    const $drawerRef = get(drawerRef);
    const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
    const y = o ? -NESTED_DISPLACEMENT : 0;

    if (nestedOpenChangeTimer) {
      window.clearTimeout(nestedOpenChangeTimer);
    }

    set($drawerRef, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
    });

    if (!o && $drawerRef) {
      nestedOpenChangeTimer = setTimeout(() => {
        const $direction = get(direction);
        const translateValue = getTranslate($drawerRef, $direction);
        set($drawerRef, {
          transition: 'none',
          transform: isVertical($direction)
            ? `translate3d(0, ${translateValue}px, 0)`
            : `translate3d(${translateValue}px, 0, 0)`,
        });
      }, 500);
    }
  }

  function onNestedDrag(
    _: SvelteEvent<PointerEvent | MouseEvent | TouchEvent, HTMLElement>,
    percentageDragged: number,
  ) {
    if (percentageDragged < 0) return;
    const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
    const newScale = initialScale + percentageDragged * (1 - initialScale);
    const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;
    const $direction = get(direction);

    set(get(drawerRef), {
      transform: isVertical($direction)
        ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
        : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
      transition: 'none',
    });
  }

  function onNestedRelease(
    _: SvelteEvent<PointerEvent | MouseEvent | TouchEvent, HTMLElement>,
    o: boolean,
  ) {
    const $direction = get(direction);
    const dim = isVertical($direction) ? window.innerHeight : window.innerWidth;
    const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
    const translate = o ? -NESTED_DISPLACEMENT : 0;

    if (o) {
      set(get(drawerRef), {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
          ',',
        )})`,
        transform: isVertical($direction)
          ? `scale(${scale}) translate3d(0, ${translate}px, 0)`
          : `scale(${scale}) translate3d(${translate}px, 0, 0)`,
      });
    }
  }

  return {
    states: {
      isOpen,
      hasBeenOpened,
      snapPoints,
      activeSnapPoint,
      snapPointsOffset,
      keyboardIsOpen,
      shouldFade,
      visible,
      drawerId,
      openDrawerIds,
    },
    helpers: {
      getContentStyle,
    },
    methods: {
      closeDrawer,
      onOpenChange,
      onPress,
      onRelease,
      onDrag,
      scaleBackground,
      onNestedDrag,
      onNestedOpenChange,
      onNestedRelease,
      restorePositionSetting,
      openDrawer,
    },
    refs: {
      drawerRef,
      overlayRef,
      triggerRef,
    },
    options,
  };
}

export function dampenValue(v: number) {
  return 8 * (Math.log(v + 1) - 2);
}

function getScale() {
  return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
}

function getDistanceMoved(
  pointerStart: number,
  direction: DrawerDirection,
  event: SvelteEvent<PointerEvent | MouseEvent | TouchEvent, HTMLElement>,
) {
  const screenY = event instanceof TouchEvent ? event.changedTouches[0].screenY : event.screenY;
  const screenX = event instanceof TouchEvent ? event.changedTouches[0].screenX : event.screenX;

  return pointerStart - (isVertical(direction) ? screenY : screenX);
}

function getDirectionMultiplier(direction: DrawerDirection) {
  return direction === 'bottom' || direction === 'right' ? 1 : -1;
}
