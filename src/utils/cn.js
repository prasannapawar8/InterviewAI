/**
 * Tiny className combiner — filters falsy values and joins with spaces.
 * Keeps JSX readable without pulling in a dependency.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
