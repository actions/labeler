import {Minimatch} from 'minimatch';

export const printPattern = (matcher: Minimatch): string => {
  return (matcher.negate ? '!' : '') + matcher.pattern;
};

export const kebabToCamel = (str: string): string => {
  return str.replace(/-./g, m => m.toUpperCase()[1]);
};

export function isObject(obj: unknown): obj is object {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
