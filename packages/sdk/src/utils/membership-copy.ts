import type { ReservineMembershipPlan } from '../contract.js';

/** Card copy lives beside the card that renders it (decision D9): cs + en, facts come from the API. */
export type MembershipLocale = 'cs' | 'en';

const CS_PLURAL = (count: number, one: string, few: string, other: string): string =>
  count === 1 ? one : count >= 2 && count <= 4 ? few : other;

interface MembershipCopy {
  tag: string;
  kindSubscription: string;
  kindOneTime: string;
  perMonth: string;
  oneTime: string;
  validMonths: (count: number) => string;
  usesPerMonth: (count: number) => string;
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
    oneTime: 'jednorázově',
    validMonths: (count) =>
      `Platí ${count} ${CS_PLURAL(count, 'měsíc', 'měsíce', 'měsíců')}`,
    usesPerMonth: (count) => `${count} použití měsíčně`,
    usesOneTime: (count) => `${count} použití`,
    cancelAnytime: 'Zrušíte kdykoli',
    buy: 'Koupit',
    planNotFound: 'Tento plán není k dispozici.',
    noPlans: 'Žádné plány k zakoupení.',
    domainNotRegistered: (tenant) =>
      `Tato doména není registrována pro ${tenant} v Reservine › Nastavení › Firma › Domény.`,
    loadFailed: 'Plány se nepodařilo načíst.',
    retry: 'Zkusit znovu'
  },
  en: {
    tag: 'en',
    kindSubscription: 'Subscription',
    kindOneTime: 'One-time purchase',
    perMonth: '/ month',
    oneTime: 'one-time',
    validMonths: (count) => `Valid for ${count} ${count === 1 ? 'month' : 'months'}`,
    usesPerMonth: (count) => `${count} ${count === 1 ? 'use' : 'uses'} per month`,
    usesOneTime: (count) => `${count} ${count === 1 ? 'use' : 'uses'}`,
    cancelAnytime: 'Cancel anytime',
    buy: 'Buy',
    planNotFound: 'This plan is not available.',
    noPlans: 'No plans available for purchase.',
    domainNotRegistered: (tenant) =>
      `This domain is not registered for ${tenant} in Reservine › Settings › Tenant › Domains.`,
    loadFailed: 'Plans could not be loaded.',
    retry: 'Retry'
  }
};

export function resolveMembershipLocale(
  requested: string | null | undefined,
  pageLang: string | null | undefined,
  tenantLocale: string | null | undefined
): MembershipLocale {
  for (const candidate of [requested, pageLang, tenantLocale]) {
    const language = candidate?.trim().toLowerCase().split(/[-_]/)[0];
    if (language === 'cs' || language === 'en') return language;
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

/** The fine-print rows under the seam, mirroring the FE store checklist. */
export function membershipChecklist(locale: MembershipLocale, plan: ReservineMembershipPlan): string[] {
  const copy = COPY[locale];
  const subscription = plan.kind === 'subscription';
  const rows: string[] = [];

  if (plan.uses_per_voucher > 0) {
    rows.push(subscription ? copy.usesPerMonth(plan.uses_per_voucher) : copy.usesOneTime(plan.uses_per_voucher));
  }
  if (plan.duration_months > 0) {
    rows.push(copy.validMonths(plan.duration_months));
  }
  if (subscription) {
    rows.push(copy.cancelAnytime);
  }

  return rows;
}
