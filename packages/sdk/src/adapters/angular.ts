import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import type { ReservineButtonElement, ReservineButtonProps, ReservineOpenChangeDetail } from '../contract.js';
import { RESERVINE_BUTTON_TAG, RESERVINE_OPEN_CHANGE_EVENT } from '../contract.js';
import { applyReservinePropsWhenReady, defineReservineElements, setReservineOpen } from '../element.js';

@Component({
  selector: 'reservine-booking-button',
  standalone: true,
  template: '<span #mount><ng-content></ng-content></span>'
})
export class ReservineButtonComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() config: ReservineButtonProps = {};
  @Output() readonly openChange = new EventEmitter<boolean>();
  @ViewChild('mount', { static: true }) private mount!: ElementRef<HTMLSpanElement>;

  private element?: ReservineButtonElement;
  private readonly handleOpenChange = (event: Event): void => {
    this.openChange.emit((event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
  };

  ngAfterViewInit(): void {
    void defineReservineElements();
    this.element = document.createElement(RESERVINE_BUTTON_TAG) as ReservineButtonElement;
    this.element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, this.handleOpenChange);
    while (this.mount.nativeElement.firstChild) {
      this.element.append(this.mount.nativeElement.firstChild);
    }
    this.mount.nativeElement.append(this.element);
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
