import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ReservineButtonElement,
  ReservineMembershipsElement
} from '../contract';
import {
  RESERVINE_MEMBERSHIP_PURCHASED_EVENT,
  RESERVINE_OPEN_CHANGE_EVENT,
  reservineButtonPropNames,
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

import { ReservineButton, ReservineMemberships } from './svelte';

afterEach(() => document.body.replaceChildren());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const buttonConfig = {
  appearance: 'outline',
  branch: 42,
  partner: 'mytimegym',
  service: 7,
  text: 'Book now'
} as const;

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

describe('Svelte button adapter', () => {
  it('forwards config props, re-emits open changes and exposes open/close', async () => {
    const onOpenChange = vi.fn();
    const target = document.body.appendChild(document.createElement('div'));
    const component = new ReservineButton({ target, props: { config: buttonConfig, onOpenChange } });
    await flush();
    const element = target.querySelector('reservine-button') as ReservineButtonElement;

    for (const name of Object.keys(buttonConfig) as (typeof reservineButtonPropNames)[number][]) {
      expect(element[name]).toBe(buttonConfig[name as keyof typeof buttonConfig]);
    }

    element.dispatchEvent(new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    component.open();
    expect(element.opened).toBe(true);
    component.close();
    expect(element.opened).toBe(false);
  });
});

describe('Svelte memberships adapter', () => {
  it('forwards every contract prop and re-emits both events with their detail', async () => {
    const onOpenChange = vi.fn();
    const onPurchased = vi.fn();
    const target = document.body.appendChild(document.createElement('div'));
    new ReservineMemberships({
      target,
      props: { config: membershipsConfig, onOpenChange, onPurchased }
    });
    await flush();
    const element = target.querySelector('reservine-memberships') as ReservineMembershipsElement;

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
    const target = document.body.appendChild(document.createElement('div'));
    const component = new ReservineMemberships({
      target,
      props: { config: { partner: 'fitflow', open: false } }
    });
    await flush();
    const element = target.querySelector('reservine-memberships') as ReservineMembershipsElement &
      TestReservineMemberships;

    component.open(5);
    expect(element.opened).toBe(true);
    expect(element.openedPlan).toBe(5);

    component.close();
    expect(element.opened).toBe(false);

    component.open();
    expect(element.opened).toBe(true);

    component.refresh();
    expect(element.refreshed).toBe(1);

    component.$set({ config: { partner: 'fitflow', open: false } });
    await flush();
    expect(element.opened).toBe(false);

    component.$set({ config: { partner: 'fitflow', open: true } });
    await flush();
    expect(element.opened).toBe(true);
  });

  it('stops listening after destroy', async () => {
    const onPurchased = vi.fn();
    const target = document.body.appendChild(document.createElement('div'));
    const component = new ReservineMemberships({
      target,
      props: { config: { partner: 'fitflow' }, onPurchased }
    });
    await flush();
    const element = target.querySelector('reservine-memberships') as ReservineMembershipsElement;

    component.$destroy();
    element.dispatchEvent(
      new CustomEvent(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, { detail: { orderId: 1, planId: 2 } })
    );
    expect(onPurchased).not.toHaveBeenCalled();
  });
});
