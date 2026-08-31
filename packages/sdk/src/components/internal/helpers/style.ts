import type { DrawerDirection } from '../types.js';
import { isVertical } from './index.js';

interface Style {
  [key: string]: string;
}

const cache = new WeakMap<HTMLElement, Style>();

function cssPropertyName(property: string): string {
  return property.startsWith('--')
    ? property
    : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function set(el?: Element | HTMLElement | null, styles?: Style, ignoreCache = false) {
  if (!el || !(el instanceof HTMLElement) || !styles) return;

  const originalStyles: Style = {};

  Object.entries(styles).forEach(([key, value]: [string, string]) => {
    const property = cssPropertyName(key);
    originalStyles[property] = el.style.getPropertyValue(property);
    el.style.setProperty(property, value);
  });

  if (ignoreCache) return;

  cache.set(el, originalStyles);
}

export function reset(el: Element | HTMLElement | null, prop?: string) {
  if (!el || !(el instanceof HTMLElement)) return;
  const originalStyles = cache.get(el);

  if (!originalStyles) {
    return;
  }

  if (prop) {
    const property = cssPropertyName(prop);
    const value = originalStyles[property];
    if (value) el.style.setProperty(property, value);
    else el.style.removeProperty(property);
  } else {
    Object.entries(originalStyles).forEach(([key, value]) => {
      if (value) el.style.setProperty(key, value);
      else el.style.removeProperty(key);
    });
  }
}

export function getTranslate(element: HTMLElement, direction: DrawerDirection): number | null {
  const style = window.getComputedStyle(element);
  const transform =
    // @ts-expect-error - vendor prefix
    style.transform || style.webkitTransform || style.mozTransform;
  let mat = transform.match(/^matrix3d\((.+)\)$/);
  if (mat) {
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
    return parseFloat(mat[1].split(', ')[isVertical(direction) ? 13 : 12]);
  }
  // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
  mat = transform.match(/^matrix\((.+)\)$/);
  return mat ? parseFloat(mat[1].split(', ')[isVertical(direction) ? 5 : 4]) : null;
}

export function styleToString(style: Record<string, number | string | undefined>): string {
  return Object.keys(style).reduce((str, key) => {
    if (style[key] === undefined) return str;
    return str + `${key}:${style[key]};`;
  }, '');
}
