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

// ---------------------------------------------------------------------------
// <reservine-memberships> — native plan cards + iframe purchase (epic 880)
// ---------------------------------------------------------------------------

export const RESERVINE_MEMBERSHIPS_TAG = 'reservine-memberships' as const;
export const RESERVINE_MEMBERSHIP_PURCHASED_EVENT = 'reservine-membership-purchased' as const;

export type ReservineMembershipsTheme = 'light' | 'dark' | 'auto';
export type ReservineMembershipPlanKind = 'subscription' | 'one_time';

export interface ReservineMembershipsProps {
  /** Reservine tenant slug, such as `fitflow`. Required. */
  partner?: string;
  /** API origin the widget DTO is fetched from. Defaults to the production API. */
  apiUrl?: string;
  /** Branch id to scope plans to; omitted = the tenant's default branch + tenant-wide plans. */
  branch?: number | null;
  /** Render only this plan's card. */
  plan?: number | null;
  /** Card language: `cs` | `en`. Defaults to the page language, then the tenant locale. */
  locale?: 'cs' | 'en' | string;
  /** Card colour scheme; `auto` follows `prefers-color-scheme`. */
  theme?: ReservineMembershipsTheme;
  /** Host override of the tenant primary colour (hex). Forwarded into the checkout. */
  primary?: `#${string}`;
  /** Card corner radius, any CSS length. */
  radius?: string;
  /** Card font family; `inherit` adopts the host page font. */
  font?: string;
  /** When set, a successful purchase closes the checkout and navigates the top window here. */
  successUrl?: string;
  /** Buy button label override. */
  buyText?: string;
  /** Controls the checkout surface when supplied (opens the `plan` or first plan). */
  open?: boolean;
}

export interface ReservineMembershipPurchasedDetail {
  orderId: number;
  planId: number;
}

export interface ReservineMembershipsHandle {
  open(planId?: number): void;
  close(): void;
  refresh(): void;
}

export interface ReservineMembershipsElement extends HTMLElement {
  partner: string;
  apiUrl: string;
  branch: number | null;
  plan: number | null;
  locale: string;
  theme: ReservineMembershipsTheme;
  primary: string;
  radius: string;
  font: string;
  successUrl: string;
  buyText: string;
  opened: boolean;
  open(planId?: number): void;
  close(): void;
  refresh(): void;
}

/** The widget DTO served by `GET {apiUrl}/api/widget/{partner}/memberships`. */
export interface ReservineMembershipsData {
  tenant: {
    slug: string;
    name: string;
    locale: string;
    currency: string;
    /** Public https origin of the tenant app the checkout iframe loads; slug-derived when absent. */
    url?: string | null;
  };
  theme: { light: Record<string, string>; dark: Record<string, string> } | null;
  branches: { id: number; name: string }[];
  plans: ReservineMembershipPlan[];
}

export interface ReservineMembershipPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency_code: string;
  duration_months: number;
  kind: ReservineMembershipPlanKind;
  uses_per_voucher: number;
  usage_per: string | null;
  branch_id: number | null;
}

export const reservineMembershipsDefaults = {
  apiUrl: 'https://api.reservine.io',
  branch: null,
  buyText: '',
  font: '',
  locale: '',
  open: false,
  plan: null,
  radius: '',
  successUrl: '',
  theme: 'auto'
} as const satisfies Partial<ReservineMembershipsProps>;

export const reservineMembershipsPropNames = [
  'partner',
  'apiUrl',
  'branch',
  'plan',
  'locale',
  'theme',
  'primary',
  'radius',
  'font',
  'successUrl',
  'buyText'
] as const satisfies readonly Exclude<keyof ReservineMembershipsProps, 'open'>[];
