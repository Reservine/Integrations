import type { Action } from 'svelte/action';

export type SvelteEvent<T extends Event = Event, U extends EventTarget = EventTarget> = T & {
  currentTarget: EventTarget & U;
};

export type OnChangeFn<T> = (value: T) => void;

export type Arrayable<T> = T | T[];

export type Expand<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: O[K] }
    : never
  : T;

export type Builder<
  Element extends HTMLElement = HTMLElement,
  Param = undefined,
  Attributes extends Record<string, unknown> = Record<string, unknown>,
> = Record<string, unknown> & {
  action: Action<Element, Param, Attributes>;
};

export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom';
