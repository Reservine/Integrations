import { createRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReservineButtonElement, ReservineButtonHandle } from '../contract';
import { RESERVINE_OPEN_CHANGE_EVENT } from '../contract';

vi.mock('../element', async (importOriginal) => {
  const original = await importOriginal<typeof import('../element')>();
  return { ...original, defineReservineElements: vi.fn(() => Promise.resolve()) };
});

import { ReservineButton } from './react';

afterEach(cleanup);

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
});
