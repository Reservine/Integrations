import { tick } from 'svelte';
import { derived, get, type Writable } from 'svelte/store';
import { TRANSITIONS, VELOCITY_THRESHOLD } from './constants.js';
import { effect, set, isVertical, isBottomOrRight } from './helpers/index.js';
import type { DrawerDirection } from './types.js';

export function handleSnapPoints({
  activeSnapPoint,
  snapPoints,
  drawerRef,
  overlayRef,
  fadeFromIndex,
  openTime,
  direction,
}: {
  activeSnapPoint: Writable<number | string | null>;
  snapPoints: Writable<(number | string)[] | undefined>;
  fadeFromIndex: Writable<number | undefined>;
  drawerRef: Writable<HTMLDivElement | undefined>;
  overlayRef: Writable<HTMLDivElement | undefined>;
  openTime: Writable<Date | null>;
  direction: Writable<DrawerDirection>;
}) {
  const isLastSnapPoint = derived(
    [snapPoints, activeSnapPoint],
    ([$snapPoints, $activeSnapPoint]) => {
      return $activeSnapPoint === $snapPoints?.[$snapPoints.length - 1];
    },
  );

  const shouldFade = derived(
    [snapPoints, fadeFromIndex, activeSnapPoint],
    ([$snapPoints, $fadeFromIndex, $activeSnapPoint]) => {
      return (
        ($snapPoints &&
          $snapPoints.length > 0 &&
          ($fadeFromIndex || $fadeFromIndex === 0) &&
          !Number.isNaN($fadeFromIndex) &&
          $snapPoints[$fadeFromIndex] === $activeSnapPoint) ||
        !$snapPoints
      );
    },
  );

  const activeSnapPointIndex = derived(
    [snapPoints, activeSnapPoint],
    ([$snapPoints, $activeSnapPoint]) =>
      $snapPoints?.findIndex((snapPoint) => snapPoint === $activeSnapPoint) ?? null,
  );

  const snapPointsOffset = derived(snapPoints, ($snapPoints) => {
    if ($snapPoints) {
      return $snapPoints.map((snapPoint) => {
        const hasWindow = typeof window !== 'undefined';
        const isPx = typeof snapPoint === 'string';
        let snapPointAsNumber = 0;

        if (isPx) {
          snapPointAsNumber = parseInt(snapPoint, 10);
        }
        const $direction = get(direction);

        if (isVertical($direction)) {
          const height = isPx ? snapPointAsNumber : hasWindow ? snapPoint * window.innerHeight : 0;

          if (hasWindow) {
            return $direction === 'bottom'
              ? window.innerHeight - height
              : window.innerHeight + height;
          }

          return height;
        }

        const width = isPx ? snapPointAsNumber : hasWindow ? snapPoint * window.innerWidth : 0;

        if (hasWindow) {
          return $direction === 'right' ? window.innerWidth - width : window.innerWidth + width;
        }

        return width;
      });
    }
    return [];
  });

  const activeSnapPointOffset = derived(
    [snapPointsOffset, activeSnapPointIndex],
    ([$snapPointsOffset, $activeSnapPointIndex]) =>
      $activeSnapPointIndex !== null ? $snapPointsOffset?.[$activeSnapPointIndex] : null,
  );

  effect([activeSnapPoint, drawerRef], ([$activeSnapPoint, $drawerRef]) => {
    if ($activeSnapPoint && $drawerRef) {
      const $snapPoints = get(snapPoints);
      const $snapPointsOffset = get(snapPointsOffset);
      const newIndex = $snapPoints?.findIndex((snapPoint) => snapPoint === $activeSnapPoint) ?? -1;
      if ($snapPointsOffset && newIndex !== -1 && typeof $snapPointsOffset[newIndex] === 'number') {
        snapToPoint($snapPointsOffset[newIndex] as number);
      }
    }
  });

  function snapToPoint(dimension: number) {
    tick().then(() => {
      const $snapPointsOffset = get(snapPointsOffset);
      const newSnapPointIndex =
        $snapPointsOffset?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;

      const $drawerRef = get(drawerRef);
      const $direction = get(direction);

      onSnapPointChange(newSnapPointIndex);

      set($drawerRef, {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
          ',',
        )})`,
        transform: isVertical($direction)
          ? `translate3d(0, ${dimension}px, 0)`
          : `translate3d(${dimension}px, 0, 0)`,
      });

      const $fadeFromIndex = get(fadeFromIndex);
      const $overlayRef = get(overlayRef);

      if (
        snapPointsOffset &&
        newSnapPointIndex !== $snapPointsOffset.length - 1 &&
        newSnapPointIndex !== $fadeFromIndex
      ) {
        set($overlayRef, {
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
            ',',
          )})`,
          opacity: '0',
        });
      } else {
        set($overlayRef, {
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
            ',',
          )})`,
          opacity: '1',
        });
      }
      activeSnapPoint.update(() => {
        const $snapPoints = get(snapPoints);
        if (newSnapPointIndex === null || !$snapPoints) return null;
        return $snapPoints[newSnapPointIndex];
      });
    });
  }

  function onRelease({
    draggedDistance,
    closeDrawer,
    velocity,
    dismissible,
  }: {
    draggedDistance: number;
    closeDrawer: () => void;
    velocity: number;
    dismissible: boolean;
  }) {
    const $fadeFromIndex = get(fadeFromIndex);
    if ($fadeFromIndex === undefined) return;
    const $activeSnapPointOffset = get(activeSnapPointOffset);
    const $activeSnapPointIndex = get(activeSnapPointIndex);
    const $overlayRef = get(overlayRef);
    const $snapPointsOffset = get(snapPointsOffset);
    const $snapPoints = get(snapPoints);
    const $direction = get(direction);

    const currentPosition =
      $direction === 'bottom' || $direction === 'right'
        ? ($activeSnapPointOffset ?? 0) - draggedDistance
        : ($activeSnapPointOffset ?? 0) + draggedDistance;

    const isOverlaySnapPoint = $activeSnapPointIndex === $fadeFromIndex - 1;
    const isFirst = $activeSnapPointIndex === 0;
    const hasDraggedUp = draggedDistance > 0;

    if (isOverlaySnapPoint) {
      set($overlayRef, {
        transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      });
    }

    if (velocity > 2 && !hasDraggedUp) {
      if (dismissible) closeDrawer();
      else snapToPoint($snapPointsOffset[0]); // snap to initial point
      return;
    }

    if (velocity > 2 && hasDraggedUp && $snapPointsOffset && $snapPoints) {
      snapToPoint($snapPointsOffset[$snapPoints.length - 1] as number);
      return;
    }

    // Find the closest snap point to the current position
    const closestSnapPoint = $snapPointsOffset?.reduce((prev, curr) => {
      if (typeof prev !== 'number' || typeof curr !== 'number') return prev;

      return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
    });

    const dim = isVertical($direction) ? window.innerHeight : window.innerWidth;

    if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
      const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

      // Don't do anything if we swipe upwards while being on the last snap point
      if (dragDirection > 0 && get(isLastSnapPoint) && $snapPoints) {
        snapToPoint($snapPointsOffset[$snapPoints.length - 1]);
        return;
      }

      if (isFirst && dragDirection < 0 && dismissible) {
        closeDrawer();
      }

      if ($activeSnapPointIndex === null) return;

      snapToPoint($snapPointsOffset[$activeSnapPointIndex + dragDirection]);
      return;
    }

    snapToPoint(closestSnapPoint);
  }

  function onDrag({ draggedDistance }: { draggedDistance: number }) {
    const $drawerRef = get(drawerRef);
    const $activeSnapPointOffset = get(activeSnapPointOffset);
    if ($activeSnapPointOffset === null) return;
    const $snapPointsOffset = get(snapPointsOffset);
    const $direction = get(direction);

    const newValue =
      $direction === 'bottom' || $direction === 'right'
        ? $activeSnapPointOffset - draggedDistance
        : $activeSnapPointOffset + draggedDistance;

    const lastSnapPoint = $snapPointsOffset[$snapPointsOffset.length - 1];

    // Don't do anything if we exceed the last(biggest) snap point
    if (isBottomOrRight($direction) && newValue < lastSnapPoint) {
      return;
    }

    if (!isBottomOrRight($direction) && newValue > lastSnapPoint) {
      return;
    }

    set($drawerRef, {
      transform: isVertical($direction)
        ? `translate3d(0, ${newValue}px, 0)`
        : `translate3d(${newValue}px, 0, 0)`,
    });
  }

  function getPercentageDragged(absDraggedDistance: number, isDraggingDown: boolean) {
    const $activeSnapPointIndex = get(activeSnapPointIndex);
    const $snapPointsOffset = get(snapPointsOffset);
    const $snapPoints = get(snapPoints);
    const $fadeFromIndex = get(fadeFromIndex);
    if (
      !$snapPoints ||
      typeof $activeSnapPointIndex !== 'number' ||
      !$snapPointsOffset ||
      $fadeFromIndex === undefined
    )
      return null;

    // If this is true we are dragging to a snap point that is supposed to have an overlay
    const isOverlaySnapPoint = $activeSnapPointIndex === $fadeFromIndex - 1;
    const isOverlaySnapPointOrHigher = $activeSnapPointIndex >= $fadeFromIndex;

    if (isOverlaySnapPointOrHigher && isDraggingDown) {
      return 0;
    }

    // Don't animate, but still use this one if we are dragging away from the overlaySnapPoint
    if (isOverlaySnapPoint && !isDraggingDown) return 1;
    if (!get(shouldFade) && !isOverlaySnapPoint) return null;

    // Either fadeFrom index or the one before
    const targetSnapPointIndex = isOverlaySnapPoint
      ? $activeSnapPointIndex + 1
      : $activeSnapPointIndex - 1;

    // Get the distance from overlaySnapPoint to the one before or vice-versa to calculate the opacity percentage accordingly
    const snapPointDistance = isOverlaySnapPoint
      ? $snapPointsOffset[targetSnapPointIndex] - $snapPointsOffset[targetSnapPointIndex - 1]
      : $snapPointsOffset[targetSnapPointIndex + 1] - $snapPointsOffset[targetSnapPointIndex];

    const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

    if (isOverlaySnapPoint) {
      return 1 - percentageDragged;
    } else {
      return percentageDragged;
    }
  }

  function onSnapPointChange(activeSnapPointIndex: number) {
    // Change openTime ref when we reach the last snap point to prevent dragging for 500ms incase it's scrollable.
    const $snapPoints = get(snapPoints);
    const $snapPointsOffset = get(snapPointsOffset);
    if ($snapPoints && activeSnapPointIndex === $snapPointsOffset.length - 1) {
      openTime.set(new Date());
    }
  }

  return {
    isLastSnapPoint,
    shouldFade,
    getPercentageDragged,
    activeSnapPointIndex,
    onRelease,
    onDrag,
    snapPointsOffset,
  };
}
