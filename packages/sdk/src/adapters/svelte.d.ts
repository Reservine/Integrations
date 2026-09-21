import { SvelteComponentTyped } from 'svelte';

import type {
  ReservineButtonProps,
  ReservineMembershipPurchasedDetail,
  ReservineMembershipsProps
} from '../contract.js';

export interface ReservineButtonSvelteProps {
  config?: ReservineButtonProps;
  onOpenChange?: (open: boolean) => void;
}

export default class ReservineButton extends SvelteComponentTyped<ReservineButtonSvelteProps> {
  open(): void;
  close(): void;
}

export { ReservineButton };

export interface ReservineMembershipsSvelteProps {
  config?: ReservineMembershipsProps;
  onOpenChange?: (open: boolean) => void;
  onPurchased?: (detail: ReservineMembershipPurchasedDetail) => void;
}

export class ReservineMemberships extends SvelteComponentTyped<ReservineMembershipsSvelteProps> {
  open(planId?: number): void;
  close(): void;
  refresh(): void;
}
