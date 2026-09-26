import type {
  ReservineMembershipAccent,
  ReservineMembershipFinish,
  ReservineMembershipGroup,
  ReservineMembershipPlan,
  ReservineMembershipPlanKind
} from '../contract.js';

/**
 * The wallet-pass card model (decision log 2026-09-26, mirrors the Reservine store): one card
 * per plan, its material from `finish` + `accent`, and the shelves `groups` sort it onto.
 * Every new DTO field is optional, so a payload from an older API renders classic, ungrouped,
 * single-billing cards.
 */

/** Query value the embed route `/embed/memberships/:planId?billing=` understands. */
export type MembershipBilling = 'subscription' | 'purchase';

export const membershipBilling = (kind: ReservineMembershipPlanKind): MembershipBilling =>
  kind === 'subscription' ? 'subscription' : 'purchase';

// --- material -----------------------------------------------------------------

const FINISHES: readonly ReservineMembershipFinish[] = ['classic', 'silver', 'black', 'gold'];

/** Curated swatches; amber is light enough to need dark ink on classic plastic. */
const ACCENT_SWATCHES: Record<ReservineMembershipAccent, { color: string; darkInk: boolean }> = {
  emerald: { color: 'oklch(0.6 0.14 160)', darkInk: false },
  teal: { color: 'oklch(0.58 0.1 195)', darkInk: false },
  sky: { color: 'oklch(0.6 0.13 235)', darkInk: false },
  indigo: { color: 'oklch(0.52 0.18 275)', darkInk: false },
  violet: { color: 'oklch(0.55 0.2 300)', darkInk: false },
  rose: { color: 'oklch(0.6 0.19 10)', darkInk: false },
  amber: { color: 'oklch(0.78 0.15 75)', darkInk: true },
  slate: { color: 'oklch(0.5 0.03 255)', darkInk: false }
};

/** Without a swatch, classic plastic is the tenant's own primary. */
const TENANT_ACCENT = 'var(--reservine-primary, var(--rm-primary))';

/**
 * The widget's one on-primary rule (YIQ brightness over 128 → dark ink), shared by
 * `--rm-primary-content` and tenant-primary card ink. Anything but `#rrggbb` inks light.
 */
export const prefersDarkInk = (hex: string): boolean => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

export interface MembershipCardMaterial {
  finish: ReservineMembershipFinish;
  /** Classic plastic under a light swatch (amber) or a light tenant primary inks dark. */
  darkInk: boolean;
  /** Only gold loops its glare. */
  glare: boolean;
  /** The metals lift and catch a sheen on hover; classic plastic stays still. */
  metal: boolean;
  /** Inline custom properties the material gradients read (`--rm-accent` / `--rm-tint`). */
  style: string;
}

/** `primary` is the resolved tenant primary (`#rrggbb`) an accent-less classic card is cut from. */
export function membershipCardMaterial(plan: ReservineMembershipPlan, primary = ''): MembershipCardMaterial {
  // Values a newer API may add fall back to the defaults instead of an unstyled card.
  const finish = FINISHES.find((value) => value === plan.finish) ?? 'classic';
  const swatch =
    plan.accent && Object.hasOwn(ACCENT_SWATCHES, plan.accent) ? ACCENT_SWATCHES[plan.accent] : null;

  switch (finish) {
    case 'classic':
      return {
        finish,
        darkInk: swatch ? swatch.darkInk : prefersDarkInk(primary),
        glare: false,
        metal: false,
        style: `--rm-accent: ${swatch?.color ?? TENANT_ACCENT}`
      };
    case 'silver':
      return { finish, darkInk: false, glare: false, metal: true, style: swatch ? `--rm-tint: ${swatch.color}` : '' };
    case 'black':
      return { finish, darkInk: false, glare: false, metal: true, style: '' };
    case 'gold':
      // Gold is gold: the accent never tints the top material.
      return { finish, darkInk: false, glare: true, metal: true, style: '' };
  }
}

// --- one card per plan --------------------------------------------------------

export interface MembershipCard {
  plan: ReservineMembershipPlan;
  /** Ways the plan is sold, subscription first — two kinds render the billing switch. */
  kinds: ReservineMembershipPlanKind[];
}

const KIND_ORDER: readonly ReservineMembershipPlanKind[] = ['subscription', 'one_time'];

/**
 * The API lists a plan sold both ways once, as `subscription` with `one_time_available`.
 * Entries repeating a plan id (one per kind) fold into the same card, so every shape
 * renders one card per plan.
 */
export function membershipCards(plans: readonly ReservineMembershipPlan[]): MembershipCard[] {
  const cards = new Map<number, MembershipCard>();
  for (const plan of plans) {
    const kinds: ReservineMembershipPlanKind[] =
      plan.kind === 'subscription' && plan.one_time_available ? ['subscription', 'one_time'] : [plan.kind];
    const known = cards.get(plan.id);
    if (!known) {
      cards.set(plan.id, { plan, kinds });
      continue;
    }
    const merged = new Set([...known.kinds, ...kinds]);
    known.kinds = KIND_ORDER.filter((kind) => merged.has(kind));
    if (plan.kind === 'subscription') known.plan = plan;
  }
  return [...cards.values()];
}

// --- shelves ------------------------------------------------------------------

export interface MembershipShelf {
  key: string;
  /** Null for the closing shelf of ungrouped plans. */
  group: ReservineMembershipGroup | null;
  cards: MembershipCard[];
}

/**
 * Shelves in the API's group order, cards keeping the catalog order inside each; ungrouped
 * cards (or ones pointing at a group the payload did not list) close the list. Empty shelves
 * never render.
 */
export function membershipShelves(
  cards: readonly MembershipCard[],
  groups: readonly ReservineMembershipGroup[] = []
): MembershipShelf[] {
  const known = new Set(groups.map((group) => group.id));
  const shelves: MembershipShelf[] = groups.map((group) => ({
    key: `group-${group.id}`,
    group,
    cards: cards.filter((card) => card.plan.group_id === group.id)
  }));
  shelves.push({
    key: 'ungrouped',
    group: null,
    cards: cards.filter((card) => card.plan.group_id == null || !known.has(card.plan.group_id))
  });
  return shelves.filter((shelf) => shelf.cards.length > 0);
}
