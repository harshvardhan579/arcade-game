export function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 899px)').matches;
}

export function hasCoarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
