export function chain<Args extends unknown[]>(
  ...callbacks: Array<((...args: Args) => unknown) | undefined>
): (...args: Args) => void {
  return (...args: Args) => {
    for (const callback of callbacks) {
      if (typeof callback === 'function') {
        callback(...args);
      }
    }
  };
}
