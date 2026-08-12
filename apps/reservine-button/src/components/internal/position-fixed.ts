import { onMount } from 'svelte';
import { type Writable, get, writable } from 'svelte/store';

import { addEventListener, effect } from './helpers/index.js';

/**
 * Every inline style property we write onto the HOST page's <body> while the
 * drawer is open. We snapshot value *and* priority for each so the body can be
 * put back exactly as we found it - the widget must never leave a trace on a
 * page that embeds it.
 */
const MANAGED_BODY_PROPS = [
  'position',
  'overscroll-behavior',
  'top',
  'left',
  'right',
  'height',
] as const;

type BodyStyleSnapshot = Array<{ prop: string; value: string; priority: string }>;

let previousBodyPosition: BodyStyleSnapshot | null = null;

export function handlePositionFixed({
  isOpen,
  modal,
  nested,
  hasBeenOpened,
}: {
  isOpen: Writable<boolean>;
  modal: Writable<boolean>;
  nested: Writable<boolean>;
  hasBeenOpened: Writable<boolean>;
}) {
  const activeUrl = writable(typeof window !== 'undefined' ? window.location.href : '');
  let scrollPos = 0;

  function setPositionFixed(open: boolean) {
    // If previousBodyPosition is already set, don't set it again.
    if (!(previousBodyPosition === null && open)) return;

    // Snapshot every property we are about to touch (including `right`, which the
    // upstream fork wrote but never recorded) so the host <body> restores exactly.
    previousBodyPosition = MANAGED_BODY_PROPS.map((prop) => ({
      prop,
      value: document.body.style.getPropertyValue(prop),
      priority: document.body.style.getPropertyPriority(prop),
    }));

    // Update the dom inside an animation frame
    const { scrollX, innerHeight } = window;

    document.body.style.setProperty('position', 'fixed', 'important');
    document.body.style.setProperty('overscroll-behavior', 'none', 'important');

    document.body.style.top = `${-scrollPos}px`;
    document.body.style.left = `${-scrollX}px`;
    document.body.style.right = '0px';
    document.body.style.height = 'auto';

    setTimeout(
      () =>
        requestAnimationFrame(() => {
          // Attempt to check if the bottom bar appeared due to the position change
          const bottomBarHeight = innerHeight - window.innerHeight;
          if (bottomBarHeight && scrollPos >= innerHeight) {
            // Move the content further up so that the bottom bar doesn't hide it
            document.body.style.top = `${-(scrollPos + bottomBarHeight)}px`;
          }
        }),
      300,
    );
  }

  function restorePositionSetting() {
    if (previousBodyPosition === null) return;
    const $activeUrl = get(activeUrl);
    // Convert the position from "px" to Int
    const y = -parseInt(document.body.style.top, 10);
    const x = -parseInt(document.body.style.left, 10);

    // Restore styles exactly as they were, priority included. An empty recorded
    // value means the host had no inline declaration - remove ours entirely.
    previousBodyPosition.forEach(({ prop, value, priority }) => {
      if (value) {
        document.body.style.setProperty(prop, value, priority);
      } else {
        document.body.style.removeProperty(prop);
      }
    });

    requestAnimationFrame(() => {
      if ($activeUrl !== window.location.href) {
        activeUrl.set(window.location.href);
        return;
      }

      window.scrollTo(x, y);
    });

    previousBodyPosition = null;
  }

  onMount(() => {
    function onScroll() {
      scrollPos = window.scrollY;
    }

    onScroll();

    const removeListener = addEventListener(window, 'scroll', onScroll);

    return () => {
      removeListener;
    };
  });

  effect([isOpen, activeUrl], ([$isOpen, _]) => {
    if (typeof document === 'undefined') return;
    if (get(nested) || !get(hasBeenOpened)) return;
    // This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
    if ($isOpen) {
      setPositionFixed($isOpen);

      if (!get(modal)) {
        setTimeout(() => {
          restorePositionSetting();
        }, 500);
      }
    } else {
      restorePositionSetting();
    }
  });

  return { restorePositionSetting };
}
