import type { ReservineButtonElement, ReservineButtonProps } from './contract.js';
import { RESERVINE_BUTTON_TAG, reservineButtonPropNames } from './contract.js';

let registration: Promise<void> | undefined;

export function defineReservineElements(): Promise<void> {
  if (typeof window === 'undefined' || customElements.get(RESERVINE_BUTTON_TAG)) {
    return Promise.resolve();
  }

  registration ??= import('./register.js').then(() => undefined);
  return registration;
}

export function applyReservineProps(
  element: ReservineButtonElement,
  props: ReservineButtonProps
): void {
  for (const name of reservineButtonPropNames) {
    const value = props[name];
    if (value !== undefined) {
      Reflect.set(element, name, value);
    }
  }
  if (props.open !== undefined) {
    setReservineOpen(element, props.open);
  }
}

export function setReservineOpen(element: ReservineButtonElement | null, open: boolean): void {
  if (!element) return;
  const method = open ? element.open : element.close;
  if (typeof method === 'function') method.call(element);
  else element.opened = open;
}
