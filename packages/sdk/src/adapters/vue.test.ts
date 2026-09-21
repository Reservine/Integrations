import { render } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ReservineButtonElement,
  ReservineButtonHandle,
  ReservineMembershipsElement,
  ReservineMembershipsHandle
} from '../contract';
import {
  RESERVINE_MEMBERSHIP_PURCHASED_EVENT,
  RESERVINE_OPEN_CHANGE_EVENT,
  reservineMembershipsPropNames
} from '../contract';

class TestReservineButton extends HTMLElement {
  opened = false;
  open(): void { this.opened = true; }
  close(): void { this.opened = false; }
}

class TestReservineMemberships extends HTMLElement {
  opened = false;
  openedPlan: number | undefined;
  refreshed = 0;
  open(planId?: number): void { this.opened = true; this.openedPlan = planId; }
  close(): void { this.opened = false; }
  refresh(): void { this.refreshed += 1; }
}

if (!customElements.get('reservine-button')) {
  customElements.define('reservine-button', TestReservineButton);
}
if (!customElements.get('reservine-memberships')) {
  customElements.define('reservine-memberships', TestReservineMemberships);
}

vi.mock('../element', async (importOriginal) => {
  const original = await importOriginal<typeof import('../element')>();
  return { ...original, defineReservineElements: vi.fn(() => Promise.resolve()) };
});

import { ReservineButton, ReservineMemberships } from './vue';

afterEach(() => document.body.replaceChildren());

const membershipsConfig = {
  apiUrl: 'https://api.example.test',
  branch: 3,
  buyText: 'Join',
  font: 'inherit',
  locale: 'cs',
  partner: 'fitflow',
  plan: 12,
  primary: '#e11d48',
  radius: '16px',
  successUrl: 'https://tenant.test/thanks',
  theme: 'dark'
} as const;

describe('Vue memberships adapter', () => {
  it('forwards every contract prop and emits Vue-style events', async () => {
    const onOpenChange = vi.fn();
    const onPurchased = vi.fn();
    const { container } = render(ReservineMemberships, {
      props: { config: membershipsConfig, onOpenChange, onPurchased }
    });
    await nextTick();
    const element = container.querySelector('reservine-memberships') as ReservineMembershipsElement;

    for (const name of reservineMembershipsPropNames) {
      expect(element[name]).toBe(membershipsConfig[name]);
    }

    element.dispatchEvent(new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    const detail = { orderId: 77, planId: 12 };
    element.dispatchEvent(new CustomEvent(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, { detail }));
    expect(onPurchased).toHaveBeenCalledWith(detail);
  });

  it('supports open(planId)/close/refresh and the declarative open flag', async () => {
    const handle = ref<ReservineMembershipsHandle>();
    const config = ref<Record<string, unknown>>({ partner: 'fitflow', open: false });
    const Host = defineComponent(() => () =>
      h(ReservineMemberships, { ref: handle, config: config.value })
    );
    const { container } = render(Host);
    await nextTick();
    const element = container.querySelector('reservine-memberships') as ReservineMembershipsElement &
      TestReservineMemberships;

    handle.value?.open(5);
    expect(element.opened).toBe(true);
    expect(element.openedPlan).toBe(5);
    handle.value?.close();
    expect(element.opened).toBe(false);
    handle.value?.refresh();
    expect(element.refreshed).toBe(1);

    config.value = { partner: 'fitflow', open: true };
    await nextTick();
    expect(element.opened).toBe(true);
  });
});

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

  it('supports imperative and declarative open controls', async () => {
    const handle = ref<ReservineButtonHandle>();
    const config = ref({ partner: 'mytimegym', open: false });
    const Host = defineComponent(() => () =>
      h(ReservineButton, { ref: handle, config: config.value })
    );
    const { container } = render(Host);
    await nextTick();
    const element = container.querySelector('reservine-button') as ReservineButtonElement;
    handle.value?.open();
    expect(element.opened).toBe(true);
    handle.value?.close();
    expect(element.opened).toBe(false);

    config.value = { partner: 'mytimegym', open: true };
    await nextTick();
    expect(element.opened).toBe(true);
  });
});
