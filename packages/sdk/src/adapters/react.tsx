import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode
} from 'react';

import type {
  ReservineButtonElement,
  ReservineButtonHandle,
  ReservineButtonProps,
  ReservineMembershipPurchasedDetail,
  ReservineMembershipsElement,
  ReservineMembershipsHandle,
  ReservineMembershipsProps,
  ReservineOpenChangeDetail
} from '../contract.js';
import {
  RESERVINE_BUTTON_TAG,
  RESERVINE_MEMBERSHIP_PURCHASED_EVENT,
  RESERVINE_MEMBERSHIPS_TAG,
  RESERVINE_OPEN_CHANGE_EVENT
} from '../contract.js';
import {
  applyReservineMembershipsProps,
  applyReservineProps,
  defineReservineElements,
  setReservineOpen
} from '../element.js';

export interface ReservineButtonReactProps extends ReservineButtonProps {
  children?: ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export const ReservineButton = forwardRef<ReservineButtonHandle, ReservineButtonReactProps>(
  function ReservineButton({ children, className, onOpenChange, ...props }, forwardedRef) {
    const elementRef = useRef<ReservineButtonElement | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => ({
        close: () => setReservineOpen(elementRef.current, false),
        open: () => setReservineOpen(elementRef.current, true)
      }),
      []
    );

    useEffect(() => {
      void defineReservineElements();
    }, []);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;
      if (customElements.get(RESERVINE_BUTTON_TAG)) {
        applyReservineProps(element, props);
        return;
      }
      let active = true;
      void defineReservineElements().then(() => {
        if (active) applyReservineProps(element, props);
      });
      return () => {
        active = false;
      };
    }, [props]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !onOpenChange) return;

      const listener = (event: Event) => {
        onOpenChange((event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
      };
      element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
      return () => element.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
    }, [onOpenChange]);

    return createElement(
      RESERVINE_BUTTON_TAG,
      {
        class: className,
        ref: (element: ReservineButtonElement | null) => {
          elementRef.current = element;
        }
      },
      children
    );
  }
);

// ---------------------------------------------------------------------------
// <reservine-memberships>
// ---------------------------------------------------------------------------

export interface ReservineMembershipsReactProps extends ReservineMembershipsProps {
  className?: string;
  onOpenChange?: (open: boolean) => void;
  onPurchased?: (detail: ReservineMembershipPurchasedDetail) => void;
}

export const ReservineMemberships = forwardRef<
  ReservineMembershipsHandle,
  ReservineMembershipsReactProps
>(function ReservineMemberships({ className, onOpenChange, onPurchased, ...props }, forwardedRef) {
  const elementRef = useRef<ReservineMembershipsElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      close: () => setReservineOpen(elementRef.current, false),
      open: (planId?: number) => openReservineMemberships(elementRef.current, planId),
      refresh: () => elementRef.current?.refresh()
    }),
    []
  );

  useEffect(() => {
    void defineReservineElements();
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (customElements.get(RESERVINE_MEMBERSHIPS_TAG)) {
      applyReservineMembershipsProps(element, props);
      return;
    }
    let active = true;
    void defineReservineElements().then(() => {
      if (active) applyReservineMembershipsProps(element, props);
    });
    return () => {
      active = false;
    };
  }, [props]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onOpenChange) return;

    const listener = (event: Event) => {
      onOpenChange((event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
    };
    element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
    return () => element.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
  }, [onOpenChange]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onPurchased) return;

    const listener = (event: Event) => {
      onPurchased((event as CustomEvent<ReservineMembershipPurchasedDetail>).detail);
    };
    element.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, listener);
    return () => element.removeEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, listener);
  }, [onPurchased]);

  return createElement(RESERVINE_MEMBERSHIPS_TAG, {
    class: className,
    ref: (element: ReservineMembershipsElement | null) => {
      elementRef.current = element;
    }
  });
});

function openReservineMemberships(
  element: ReservineMembershipsElement | null,
  planId?: number
): void {
  if (!element) return;
  if (planId === undefined) {
    setReservineOpen(element, true);
    return;
  }
  if (typeof element.open === 'function') element.open(planId);
  else element.opened = true;
}
