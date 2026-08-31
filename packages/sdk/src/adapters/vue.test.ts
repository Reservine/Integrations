import { render } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReservineButtonElement } from '../contract';
import { RESERVINE_OPEN_CHANGE_EVENT } from '../contract';

class TestReservineButton extends HTMLElement {
  opened = false;
  open(): void { this.opened = true; }
  close(): void { this.opened = false; }
}

if (!customElements.get('reservine-button')) {
  customElements.define('reservine-button', TestReservineButton);
}

vi.mock('../element', async (importOriginal) => {
  const original = await importOriginal<typeof import('../element')>();
  return { ...original, defineReservineElements: vi.fn(() => Promise.resolve()) };
});

import { ReservineButton } from './vue';

afterEach(() => document.body.replaceChildren());

describe('Vue adapter', () => {
  it('maps config properties and emits Vue-style open changes', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(ReservineButton, {
      props: {
        config: { branch: 9, partner: 'mytimegym', showGallery: false },
        onOpenChange
      }
    });
    const element = container.querySelector('reservine-button') as ReservineButtonElement;

    expect(element.branch).toBe(9);
    expect(element.partner).toBe('mytimegym');
    expect(element.showGallery).toBe(false);

    element.dispatchEvent(
      new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } })
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
