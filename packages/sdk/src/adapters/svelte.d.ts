import { SvelteComponentTyped } from 'svelte';

import type { ReservineButtonProps } from '../contract.js';

export interface ReservineButtonSvelteProps {
  config?: ReservineButtonProps;
  onOpenChange?: (open: boolean) => void;
}

export default class ReservineButton extends SvelteComponentTyped<ReservineButtonSvelteProps> {
  open(): void;
  close(): void;
}
