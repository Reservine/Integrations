import { describe, expect, it } from 'vitest';

import type { ReservineButtonElement } from './contract';
import { applyReservineProps, setReservineOpen } from './element';

describe('framework-neutral element bridge', () => {
  it('assigns typed values as element properties without string coercion', () => {
    const element = document.createElement('reservine-button') as ReservineButtonElement;

    applyReservineProps(element, {
      branch: 42,
      open: true,
      partner: 'mytimegym',
      showGallery: false
    });

    expect(element.branch).toBe(42);
    expect(element.opened).toBe(true);
    expect(element.partner).toBe('mytimegym');
    expect(element.showGallery).toBe(false);
  });

  it('does not erase existing properties with omitted values', () => {
    const element = document.createElement('reservine-button') as ReservineButtonElement;
    element.text = 'Keep me';

    applyReservineProps(element, { text: undefined });

    expect(element.text).toBe('Keep me');
  });

  it('controls the shared open property', () => {
    const element = document.createElement('reservine-button') as ReservineButtonElement;

    setReservineOpen(element, true);
    expect(element.opened).toBe(true);

    setReservineOpen(element, false);
    expect(element.opened).toBe(false);
  });
});
