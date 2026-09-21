import { createRef } from 'react';
import { cleanup, render } from '@testing-library/react';
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

import { ReservineButton, ReservineMemberships } from './react';

afterEach(cleanup);

const membershipsProps = {
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

describe('React memberships adapter', () => {
  it('forwards every contract prop and re-emits both events', () => {
    const onOpenChange = vi.fn();
    const onPurchased = vi.fn();
    const { container } = render(
      <ReservineMemberships {...membershipsProps} onOpenChange={onOpenChange} onPurchased={onPurchased} />
    );
    const element = container.querySelector('reservine-memberships') as ReservineMembershipsElement;

    for (const name of reservineMembershipsPropNames) {
      expect(element[name]).toBe(membershipsProps[name]);
    }

    element.dispatchEvent(new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    const detail = { orderId: 77, planId: 12 };
    element.dispatchEvent(new CustomEvent(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, { detail }));
    expect(onPurchased).toHaveBeenCalledWith(detail);
  });

  it('exposes open(planId)/close/refresh and reacts to the declarative open prop', () => {
    const ref = createRef<ReservineMembershipsHandle>();
    const { container, rerender } = render(
      <ReservineMemberships ref={ref} partner="fitflow" open={false} />
    );
    const element = container.querySelector('reservine-memberships') as ReservineMembershipsElement &
      TestReservineMemberships;
    expect(element.opened).toBe(false);

    ref.current?.open(5);
    expect(element.opened).toBe(true);
    expect(element.openedPlan).toBe(5);
    ref.current?.close();
    expect(element.opened).toBe(false);
    ref.current?.refresh();
    expect(element.refreshed).toBe(1);

    rerender(<ReservineMemberships ref={ref} partner="fitflow" open />);
    expect(element.opened).toBe(true);
  });
});

describe('React adapter', () => {
  it('maps typed props and custom events', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <ReservineButton branch={7} partner="mytimegym" showGallery={false} onOpenChange={onOpenChange} />
    );
    const element = container.querySelector('reservine-button') as ReservineButtonElement;

    expect(element.branch).toBe(7);
    expect(element.partner).toBe('mytimegym');
    expect(element.showGallery).toBe(false);

    element.dispatchEvent(
      new CustomEvent(RESERVINE_OPEN_CHANGE_EVENT, { detail: { open: true } })
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('exposes a framework-native imperative handle', () => {
    const ref = createRef<ReservineButtonHandle>();
    const { container } = render(<ReservineButton ref={ref} partner="mytimegym" />);
    const element = container.querySelector('reservine-button') as ReservineButtonElement;

    ref.current?.open();
    expect(element.opened).toBe(true);

    ref.current?.close();
    expect(element.opened).toBe(false);
  });

  it('reacts to declarative open state changes', () => {
    const { container, rerender } = render(<ReservineButton partner="mytimegym" open={false} />);
    const element = container.querySelector('reservine-button') as ReservineButtonElement;
    expect(element.opened).toBe(false);

    rerender(<ReservineButton partner="mytimegym" open />);
    expect(element.opened).toBe(true);
  });
});
