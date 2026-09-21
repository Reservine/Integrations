import type {
  ReservineButtonElement,
  ReservineButtonProps,
  ReservineMembershipsElement,
  ReservineMembershipsProps
} from './contract.js';
import {
  RESERVINE_BUTTON_TAG,
  RESERVINE_MEMBERSHIPS_TAG,
  reservineButtonPropNames,
  reservineMembershipsPropNames
} from './contract.js';

let registration: Promise<void> | undefined;

/** Any Reservine element that owns an openable surface (booking modal, membership checkout). */
export interface ReservineOpenableElement extends HTMLElement {
  opened: boolean;
  open(): void;
  close(): void;
}

function elementsAreDefined(): boolean {
  return (
    typeof customElements !== 'undefined' &&
    Boolean(customElements.get(RESERVINE_BUTTON_TAG)) &&
    Boolean(customElements.get(RESERVINE_MEMBERSHIPS_TAG))
  );
}

export function defineReservineElements(): Promise<void> {
  if (typeof window === 'undefined' || elementsAreDefined()) {
    return Promise.resolve();
  }

  registration ??= import('./register.js').then(() => undefined);
  return registration;
}

function applyElementProps<TProps extends { open?: boolean }>(
  element: ReservineOpenableElement,
  props: TProps,
  propNames: readonly Exclude<keyof TProps, 'open'>[]
): void {
  for (const name of propNames) {
    const value = props[name];
    if (value !== undefined) {
      Reflect.set(element, name, value);
    }
  }
  if (props.open !== undefined) {
    setReservineOpen(element, props.open);
  }
}

export function applyReservineProps(
  element: ReservineButtonElement,
  props: ReservineButtonProps
): void {
  applyElementProps(element, props, reservineButtonPropNames);
}

export function applyReservineMembershipsProps(
  element: ReservineMembershipsElement,
  props: ReservineMembershipsProps
): void {
  applyElementProps(element, props, reservineMembershipsPropNames);
}

export async function applyReservinePropsWhenReady(
  element: ReservineButtonElement,
  props: ReservineButtonProps
): Promise<void> {
  if (typeof customElements !== 'undefined' && customElements.get(RESERVINE_BUTTON_TAG)) {
    applyReservineProps(element, props);
    return;
  }
  await defineReservineElements();
  applyReservineProps(element, props);
}

export async function applyReservineMembershipsPropsWhenReady(
  element: ReservineMembershipsElement,
  props: ReservineMembershipsProps
): Promise<void> {
  if (typeof customElements !== 'undefined' && customElements.get(RESERVINE_MEMBERSHIPS_TAG)) {
    applyReservineMembershipsProps(element, props);
    return;
  }
  await defineReservineElements();
  applyReservineMembershipsProps(element, props);
}

export function setReservineOpen(element: ReservineOpenableElement | null, open: boolean): void {
  if (!element) return;
  if (
    element.isConnected &&
    typeof customElements !== 'undefined' &&
    !customElements.get(element.localName)
  ) {
    void defineReservineElements().then(() => setReservineOpen(element, open));
    return;
  }
  const method = open ? element.open : element.close;
  if (typeof method === 'function') method.call(element);
  else element.opened = open;
}
