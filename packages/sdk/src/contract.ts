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
  /** Card language: `cs` | `en` | `sk`. Defaults to the page language, then the tenant locale. */
  locale?: 'cs' | 'en' | 'sk' | string;
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
  /** Store sections holding at least one listed plan, in store order; absent from older API servers. */
  groups?: ReservineMembershipGroup[];
}

/** The card material — it IS the tier, no tier word is printed. */
export type ReservineMembershipFinish = 'classic' | 'silver' | 'black' | 'gold';
/** Curated accent swatch: tints classic plastic and anodises silver; gold ignores it. */
export type ReservineMembershipAccent =
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'slate';

/** A store section plans are listed under (`plan.group_id`). */
export interface ReservineMembershipGroup {
  id: number;
  name: string;
  sort_order: number;
  /** Null for a tenant-wide group. */
  branch_id: number | null;
}

export interface ReservineMembershipPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency_code: string;
  /** `0` for a day-based plan, so SDKs that predate `duration_days` print no period rather than a wrong one. */
  duration_months: number;
  /** Day-based plan period (a subscription renews every N days); null or absent for a month-based plan. */
  duration_days?: number | null;
  /** A plan sold both ways arrives once, as `subscription`, with `one_time_available: true`. */
  kind: ReservineMembershipPlanKind;
  /** The plan can also be bought once; absent (older API servers) = sold only as `kind`. */
  one_time_available?: boolean;
  uses_per_voucher: number;
  usage_per: string | null;
  branch_id: number | null;
  /** Card material; absent = `classic`. */
  finish?: ReservineMembershipFinish;
  /** Card accent; null or absent = the tenant primary colour. */
  accent?: ReservineMembershipAccent | null;
  /** Short uppercase line above the plan name; empty = the billing kind label. */
  eyebrow?: string | null;
  /** The `groups[].id` the plan is listed under; null or absent = ungrouped. */
  group_id?: number | null;
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
