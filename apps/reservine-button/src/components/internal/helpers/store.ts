import type { Readable, Stores, StoresValues, Updater, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import { onDestroy, onMount } from 'svelte';

/**
 * A utility function that creates an effect from a set of stores and a function.
 * The effect is automatically cleaned up when the component is destroyed.
 *
 * @template S - The type of the stores object
 * @param stores - The stores object to derive from
 * @param fn - The function to run when the stores change
 * @returns A function that can be used to unsubscribe the effect
 */
export function effect<S extends Stores>(
  stores: S,
  fn: (values: StoresValues<S>) => (() => void) | void,
): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }
  // Create a derived store that contains the stores object and an onUnsubscribe function
  const unsub = derivedWithUnsubscribe(stores, (stores, onUnsubscribe) => {
    return {
      stores,
      onUnsubscribe,
    };
  }).subscribe(({ stores, onUnsubscribe }) => {
    const returned = fn(stores);
    // If the function returns a cleanup function, call it when the effect is unsubscribed
    if (returned) {
      onUnsubscribe(returned);
    }
  });

  // Automatically unsubscribe the effect when the component is destroyed
  safeOnDestroy(unsub);
  return unsub;
}

/**
 * A utility function that creates a derived store that automatically
 * unsubscribes from its dependencies.
 *
 * @template S - The type of the stores object
 * @template T - The type of the derived store
 * @param stores - The stores object to derive from
 * @param fn - The function to derive the store from
 * @returns A derived store that automatically unsubscribes from its dependencies
 */
export function derivedWithUnsubscribe<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>, onUnsubscribe: (cb: () => void) => void) => T,
): Readable<T> {
  let unsubscribers: (() => void)[] = [];
  const onUnsubscribe = (cb: () => void) => {
    unsubscribers.push(cb);
  };

  const unsubscribe = () => {
    // Call all of the unsubscribe functions from the previous run of the function
    unsubscribers.forEach((fn) => fn());
    // Clear the list of unsubscribe functions
    unsubscribers = [];
  };

  const derivedStore = derived(stores, ($storeValues) => {
    unsubscribe();
    return fn($storeValues, onUnsubscribe);
  });

  safeOnDestroy(unsubscribe);

  const subscribe: typeof derivedStore.subscribe = (...args) => {
    const unsub = derivedStore.subscribe(...args);
    return () => {
      unsub();
      unsubscribe();
    };
  };

  return {
    ...derivedStore,
    subscribe,
  };
}

export const safeOnMount = (fn: (...args: unknown[]) => unknown) => {
  try {
    onMount(fn);
  } catch {
    return fn();
  }
};

export const safeOnDestroy = (fn: (...args: unknown[]) => unknown) => {
  try {
    onDestroy(fn);
  } catch {
    return fn();
  }
};

export type ChangeFn<T> = (args: { curr: T; next: T }) => T;

export const overridable = <T>(store: Writable<T>, onChange?: ChangeFn<T>) => {
  const update = (updater: Updater<T>, sideEffect?: (newValue: T) => void) => {
    store.update((curr) => {
      const next = updater(curr);
      let res: T = next;
      if (onChange) {
        res = onChange({ curr, next });
      }

      sideEffect?.(res);
      return res;
    });
  };

  const set: typeof store.set = (curr) => {
    update(() => curr);
  };

  return {
    ...store,
    update,
    set,
  };
};

export type ToWritableStores<T extends Record<string, unknown>> = {
  [K in keyof T]: Writable<T[K]>;
};

/**
 * Given an object of properties, returns an object of writable stores
 * with the same properties and values.
 */
export function toWritableStores<T extends Record<string, unknown>>(
  properties: T,
): ToWritableStores<T> {
  const result = {} as { [K in keyof T]: Writable<T[K]> };

  Object.keys(properties).forEach((key) => {
    const propertyKey = key as keyof T;
    const value = properties[propertyKey];
    result[propertyKey] = writable(value);
  });

  return result;
}
