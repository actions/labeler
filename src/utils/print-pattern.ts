import {Minimatch} from 'minimatch';

export const printPattern = (matcher: Minimatch): string => {
  return (matcher.negate ? '!' : '') + matcher.pattern;
};
