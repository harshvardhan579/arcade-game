export function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 899px)').matches;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
