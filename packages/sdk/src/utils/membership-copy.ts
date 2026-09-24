import type { ReservineMembershipPlan } from '../contract.js';

/** Card copy lives beside the card that renders it (decision D9): cs + en + sk, facts come from the API. */
export type MembershipLocale = 'cs' | 'en' | 'sk';

const MEMBERSHIP_LOCALES: readonly MembershipLocale[] = ['cs', 'en', 'sk'];

/** Czech and Slovak share the one / few (2–4) / other plural split. */
const CS_PLURAL = (count: number, one: string, few: string, other: string): string =>
  count === 1 ? one : count >= 2 && count <= 4 ? few : other;

const CS_DAYS = (count: number): string => `${count} ${CS_PLURAL(count, 'den', 'dny', 'dní')}`;
const SK_DAYS = (count: number): string => `${count} ${CS_PLURAL(count, 'deň', 'dni', 'dní')}`;
const SK_USES = (count: number): string =>
  `${count} ${CS_PLURAL(count, 'použitie', 'použitia', 'použití')}`;
const EN_DAYS = (count: number): string => `${count} ${count === 1 ? 'day' : 'days'}`;

interface MembershipCopy {
  tag: string;
  kindSubscription: string;
  kindOneTime: string;
  perMonth: string;
  perDays: (days: number) => string;
  oneTime: string;
  validMonths: (count: number) => string;
  validDays: (days: number) => string;
  usesPerMonth: (count: number) => string;
  usesPerDays: (count: number, days: number) => string;
  usesOneTime: (count: number) => string;
  cancelAnytime: string;
  buy: string;
  planNotFound: string;
  noPlans: string;
  domainNotRegistered: (tenant: string) => string;
  loadFailed: string;
  retry: string;
}

const COPY: Record<MembershipLocale, MembershipCopy> = {
  cs: {
    tag: 'cs-CZ',
    kindSubscription: 'Předplatné',
    kindOneTime: 'Jednorázový nákup',
    perMonth: '/ měsíc',
    perDays: (days) => (days === 1 ? '/ den' : `/ ${CS_DAYS(days)}`),
    oneTime: 'jednorázově',
    validMonths: (count) =>
      `Platí ${count} ${CS_PLURAL(count, 'měsíc', 'měsíce', 'měsíců')}`,
    validDays: (days) => `Platí ${CS_DAYS(days)}`,
    usesPerMonth: (count) => `${count} použití měsíčně`,
    usesPerDays: (count, days) =>
      `${count} použití ${CS_PLURAL(days, 'denně', `každé ${CS_DAYS(days)}`, `každých ${CS_DAYS(days)}`)}`,
    usesOneTime: (count) => `${count} použití`,
    cancelAnytime: 'Zrušíte kdykoli',
    buy: 'Koupit',
    planNotFound: 'Tento plán není k dispozici.',
    noPlans: 'Žádné plány k zakoupení.',
    domainNotRegistered: (tenant) =>
      `Tato doména není registrována pro ${tenant} v Reservine › Nastavení › Veřejný profil › Domény.`,
    loadFailed: 'Plány se nepodařilo načíst.',
    retry: 'Zkusit znovu'
  },
  en: {
    tag: 'en',
    kindSubscription: 'Subscription',
    kindOneTime: 'One-time purchase',
    perMonth: '/ month',
    perDays: (days) => (days === 1 ? '/ day' : `/ ${EN_DAYS(days)}`),
    oneTime: 'one-time',
    validMonths: (count) => `Valid for ${count} ${count === 1 ? 'month' : 'months'}`,
    validDays: (days) => `Valid for ${EN_DAYS(days)}`,
    usesPerMonth: (count) => `${count} ${count === 1 ? 'use' : 'uses'} per month`,
    usesPerDays: (count, days) =>
      `${count} ${count === 1 ? 'use' : 'uses'} ${days === 1 ? 'per day' : `every ${EN_DAYS(days)}`}`,
    usesOneTime: (count) => `${count} ${count === 1 ? 'use' : 'uses'}`,
    cancelAnytime: 'Cancel anytime',
    buy: 'Buy',
    planNotFound: 'This plan is not available.',
    noPlans: 'No plans available for purchase.',
    domainNotRegistered: (tenant) =>
      `This domain is not registered for ${tenant} in Reservine › Settings › Public profile › Domains.`,
    loadFailed: 'Plans could not be loaded.',
    retry: 'Retry'
  },
  sk: {
    tag: 'sk-SK',
    kindSubscription: 'Predplatné',
    kindOneTime: 'Jednorazový nákup',
    perMonth: '/ mesiac',
    perDays: (days) => (days === 1 ? '/ deň' : `/ ${SK_DAYS(days)}`),
    oneTime: 'jednorazovo',
    validMonths: (count) =>
      `Platí ${count} ${CS_PLURAL(count, 'mesiac', 'mesiace', 'mesiacov')}`,
    validDays: (days) => `Platí ${SK_DAYS(days)}`,
    usesPerMonth: (count) => `${SK_USES(count)} mesačne`,
    usesPerDays: (count, days) =>
      `${SK_USES(count)} ${CS_PLURAL(days, 'denne', `každé ${SK_DAYS(days)}`, `každých ${SK_DAYS(days)}`)}`,
    usesOneTime: (count) => SK_USES(count),
    cancelAnytime: 'Zrušíte kedykoľvek',
    buy: 'Kúpiť',
    planNotFound: 'Tento plán nie je k dispozícii.',
    noPlans: 'Žiadne plány na kúpu.',
    domainNotRegistered: (tenant) =>
      `Táto doména nie je zaregistrovaná pre ${tenant} v Reservine › Nastavenia › Verejný profil › Domény.`,
    loadFailed: 'Plány sa nepodarilo načítať.',
    retry: 'Skúsiť znova'
  }
};

export function resolveMembershipLocale(
  requested: string | null | undefined,
  pageLang: string | null | undefined,
  tenantLocale: string | null | undefined
): MembershipLocale {
  for (const candidate of [requested, pageLang, tenantLocale]) {
    const language = candidate?.trim().toLowerCase().split(/[-_]/)[0];
    const supported = MEMBERSHIP_LOCALES.find((locale) => locale === language);
    if (supported) return supported;
  }
  return 'en';
}

export function membershipCopy(locale: MembershipLocale): MembershipCopy {
  return COPY[locale];
}

export function formatMembershipPrice(
  locale: MembershipLocale,
  price: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(COPY[locale].tag, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** A day-based plan's period; null for a month-based one (older API servers omit `duration_days`). */
const planDays = (plan: ReservineMembershipPlan): number | null => {
  const days = plan.duration_days ?? 0;
  return days > 0 ? days : null;
};

/** The price suffix: a subscription's billing period (month or N days), `one-time` otherwise. */
export function membershipPriceSuffix(locale: MembershipLocale, plan: ReservineMembershipPlan): string {
  const copy = COPY[locale];
  if (plan.kind !== 'subscription') return copy.oneTime;
  const days = planDays(plan);
  return days ? copy.perDays(days) : copy.perMonth;
}

/** The fine-print rows under the seam, mirroring the FE store checklist. */
export function membershipChecklist(locale: MembershipLocale, plan: ReservineMembershipPlan): string[] {
  const copy = COPY[locale];
  const subscription = plan.kind === 'subscription';
  const days = planDays(plan);
  const rows: string[] = [];

  if (plan.uses_per_voucher > 0) {
    const uses = plan.uses_per_voucher;
    rows.push(
      !subscription
        ? copy.usesOneTime(uses)
        : days
          ? copy.usesPerDays(uses, days)
          : copy.usesPerMonth(uses)
    );
  }
  if (days) {
    rows.push(copy.validDays(days));
  } else if (plan.duration_months > 0) {
    rows.push(copy.validMonths(plan.duration_months));
  }
  if (subscription) {
    rows.push(copy.cancelAnytime);
  }

  return rows;
}
