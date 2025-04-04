import type { DrawerDirection } from '../types.js';

// HTML input types that do not cause the software keyboard to appear.
const nonTextInputTypes = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
]);

export const isBrowser = typeof document !== 'undefined';

// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(v: unknown): v is Function {
  return typeof v === 'function';
}

export function isInput(target: Element) {
  return (
    (target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function isVertical(direction: DrawerDirection) {
  if (direction === 'top' || direction === 'bottom') return true;
  return false;
}

export function isBottomOrRight(direction: DrawerDirection) {
  if (direction === 'bottom' || direction === 'right') return true;
  return false;
}
