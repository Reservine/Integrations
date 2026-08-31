export const RESERVINE_BUTTON_TAG = 'reservine-button' as const;
export const RESERVINE_OPEN_CHANGE_EVENT = 'reservine-open-change' as const;

export type ReservineButtonSize = 'small' | 'medium' | 'large';
export type ReservineButtonAppearance = 'primary' | 'text' | 'outline';
export type ReservineButtonWidth = 'auto' | 'full';

export interface ReservineButtonProps {
  /** Visible button label. */
  text?: string;
  /** @deprecated Use `text`. */
  buttonText?: string;
  /** Absolute booking URL. Prefer `partner` for standard Reservine tenants. */
  reservationUrl?: string;
  /** Reservine tenant slug, such as `mytimegym`. */
  partner?: string;
  reservineTheme?: string;
  size?: ReservineButtonSize;
  width?: ReservineButtonWidth;
  color?: `#${string}`;
  borderRadius?: string;
  asWrapper?: boolean;
  appearance?: ReservineButtonAppearance;
  branch?: number | null;
  /** @deprecated Use `branch`. */
  branchId?: number | null;
  service?: number | null;
  employee?: number | null;
  showGallery?: boolean | null;
  disableUseOfAdjustedFontSize?: boolean;
  /** Controls the booking surface when supplied. */
  open?: boolean;
}

export interface ReservineOpenChangeDetail {
  open: boolean;
}

export interface ReservineButtonHandle {
  open(): void;
  close(): void;
}

export interface ReservineButtonElement extends HTMLElement {
  text: string;
  buttonText: string;
  reservationUrl: string;
  partner: string;
  reservineTheme: string;
  size: ReservineButtonSize;
  width: ReservineButtonWidth;
  color: string;
  borderRadius: string;
  asWrapper: boolean;
  appearance: ReservineButtonAppearance;
  branch: number | null;
  branchId: number | null;
  service: number | null;
  employee: number | null;
  showGallery: boolean | null;
  disableUseOfAdjustedFontSize: boolean;
  opened: boolean;
  open(): void;
  close(): void;
}

export const reservineButtonDefaults = {
  appearance: 'primary',
  asWrapper: false,
  borderRadius: '6px',
  color: '#ffffff',
  disableUseOfAdjustedFontSize: false,
  open: false,
  size: 'medium',
  width: 'auto'
} as const satisfies Partial<ReservineButtonProps>;

export const reservineButtonPropNames = [
  'text',
  'buttonText',
  'reservationUrl',
  'partner',
  'reservineTheme',
  'size',
  'width',
  'color',
  'borderRadius',
  'asWrapper',
  'appearance',
  'branch',
  'branchId',
  'service',
  'employee',
  'showGallery',
  'disableUseOfAdjustedFontSize'
] as const satisfies readonly Exclude<keyof ReservineButtonProps, 'open'>[];
