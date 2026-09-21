import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ReservineButtonElement,
  ReservineMembershipsElement
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

import { ReservineButtonComponent, ReservineMembershipsComponent } from './angular';

afterEach(() => document.body.replaceChildren());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The adapters are exercised as plain classes: Angular's DI is not booted here, the
 * `@ViewChild` ref is replaced by a fake `ElementRef` pointing at a real element.
 */
function mountMemberships(config: ReservineMembershipsComponent['config']) {
  const element = document.body.appendChild(
    document.createElement('reservine-memberships')
  ) as ReservineMembershipsElement & TestReservineMemberships;
  const component = new ReservineMembershipsComponent();
  (component as unknown as { elementRef: { nativeElement: ReservineMembershipsElement } }).elementRef = {
    nativeElement: element
  };
  component.config = config;
  component.ngAfterViewInit();
  return { component, element };
}

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

describe('Angular button adapter', () => {
  it('forwards config, emits openChange and exposes open/close', async () => {
    const element = document.body.appendChild(
      document.createElement('reservine-button')
    ) as ReservineButtonElement;
    const component = new ReservineButtonComponent();
    (component as unknown as { elementRef: { nativeElement: ReservineButtonElement } }).elementRef = {
      nativeElement: element
    };
    component.config = { partner: 'mytimegym', text: 'Book now', branch: 42 };
    const emitted: boolean[] = [];
    component.openChange.subscribe((open) => emitted.push(open));
    component.ngAfterViewInit();
    await flush();

    expect(element.partner).toBe('mytimegym');
    expect(element.text).toBe('Book now');
    expect(element.branch).toBe(42);

    element.dispatchEvent(new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } }));
    expect(emitted).toEqual([true]);

    component.open();
    expect(element.opened).toBe(true);
    component.close();
    expect(element.opened).toBe(false);
  });
});

describe('Angular memberships adapter', () => {
  it('forwards every contract prop and emits both outputs with their detail', async () => {
    const { component, element } = mountMemberships(membershipsConfig);
    const opens: boolean[] = [];
    const purchases: unknown[] = [];
    component.openChange.subscribe((open) => opens.push(open));
    component.purchased.subscribe((detail) => purchases.push(detail));
    await flush();

    for (const name of reservineMembershipsPropNames) {
      expect(element[name]).toBe(membershipsConfig[name]);
    }

    element.dispatchEvent(new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } }));
    expect(opens).toEqual([true]);

    const detail = { orderId: 77, planId: 12 };
    element.dispatchEvent(new CustomEvent(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, { detail }));
    expect(purchases).toEqual([detail]);
  });

  it('supports open(planId)/close/refresh, the declarative open flag via ngOnChanges, and unsubscribes on destroy', async () => {
    const { component, element } = mountMemberships({ partner: 'fitflow', open: false });
    await flush();

    component.open(5);
    expect(element.opened).toBe(true);
    expect(element.openedPlan).toBe(5);

    component.close();
    expect(element.opened).toBe(false);

    component.open();
    expect(element.opened).toBe(true);

    component.refresh();
    expect(element.refreshed).toBe(1);

    component.config = { partner: 'fitflow', open: false };
    component.ngOnChanges({});
    await flush();
    expect(element.opened).toBe(false);

    component.config = { partner: 'fitflow', open: true };
    component.ngOnChanges({});
    await flush();
    expect(element.opened).toBe(true);

    const purchases: unknown[] = [];
    component.purchased.subscribe((detail) => purchases.push(detail));
    component.ngOnDestroy();
    element.dispatchEvent(
      new CustomEvent(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, { detail: { orderId: 1, planId: 2 } })
    );
    expect(purchases).toEqual([]);
  });
});
