import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import type {
  ReservineButtonElement,
  ReservineButtonProps,
  ReservineMembershipPurchasedDetail,
  ReservineMembershipsElement,
  ReservineMembershipsProps,
  ReservineOpenChangeDetail
} from '../contract.js';
import { RESERVINE_MEMBERSHIP_PURCHASED_EVENT, RESERVINE_OPEN_CHANGE_EVENT } from '../contract.js';
import {
  applyReservineMembershipsPropsWhenReady,
  applyReservinePropsWhenReady,
  defineReservineElements,
  setReservineOpen
} from '../element.js';

@Component({
  selector: 'reservine-booking-button',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<reservine-button #element><ng-content></ng-content></reservine-button>'
})
export class ReservineButtonComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() config: ReservineButtonProps = {};
  @Output() readonly openChange = new EventEmitter<boolean>();
  @ViewChild('element', { static: true }) private elementRef!: ElementRef<ReservineButtonElement>;

  private element?: ReservineButtonElement;
  private readonly handleOpenChange = (event: Event): void => {
    this.openChange.emit((event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
  };

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
    void defineReservineElements();
    this.element = this.elementRef.nativeElement;
    this.element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, this.handleOpenChange);
    void applyReservinePropsWhenReady(this.element, this.config);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.element) void applyReservinePropsWhenReady(this.element, this.config);
  }

  ngOnDestroy(): void {
    this.element?.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, this.handleOpenChange);
  }

  open(): void {
    setReservineOpen(this.element ?? null, true);
  }

  close(): void {
    setReservineOpen(this.element ?? null, false);
  }
}

// ---------------------------------------------------------------------------
// <reservine-memberships>
// ---------------------------------------------------------------------------

@Component({
  selector: 'reservine-membership-plans',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<reservine-memberships #element></reservine-memberships>'
})
export class ReservineMembershipsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() config: ReservineMembershipsProps = {};
  @Output() readonly openChange = new EventEmitter<boolean>();
  @Output() readonly purchased = new EventEmitter<ReservineMembershipPurchasedDetail>();
  @ViewChild('element', { static: true })
  private elementRef!: ElementRef<ReservineMembershipsElement>;

  private element?: ReservineMembershipsElement;
  private readonly handleOpenChange = (event: Event): void => {
    this.openChange.emit((event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
  };
  private readonly handlePurchased = (event: Event): void => {
    this.purchased.emit((event as CustomEvent<ReservineMembershipPurchasedDetail>).detail);
  };

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
    void defineReservineElements();
    this.element = this.elementRef.nativeElement;
    this.element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, this.handleOpenChange);
    this.element.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, this.handlePurchased);
    void applyReservineMembershipsPropsWhenReady(this.element, this.config);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.element) void applyReservineMembershipsPropsWhenReady(this.element, this.config);
  }

  ngOnDestroy(): void {
    this.element?.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, this.handleOpenChange);
    this.element?.removeEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, this.handlePurchased);
  }

  open(planId?: number): void {
    const element = this.element ?? null;
    if (!element) return;
    if (planId === undefined) setReservineOpen(element, true);
    else if (typeof element.open === 'function') element.open(planId);
    else element.opened = true;
  }

  close(): void {
    setReservineOpen(this.element ?? null, false);
  }

  refresh(): void {
    this.element?.refresh();
  }
}
