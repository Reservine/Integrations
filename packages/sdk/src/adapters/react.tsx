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
  ReservineOpenChangeDetail
} from '../contract.js';
import { RESERVINE_OPEN_CHANGE_EVENT, RESERVINE_BUTTON_TAG } from '../contract.js';
import { applyReservineProps, defineReservineElements, setReservineOpen } from '../element.js';

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
      applyReservineProps(element, props);
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
