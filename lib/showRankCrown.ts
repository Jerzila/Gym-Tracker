/** Liftly Pro (RevenueCat `pro` entitlement) — show golden crown next to name in social UIs. */
export function showCrownForLiftlyPro(liftlyPro: boolean | null | undefined): boolean {
  return Boolean(liftlyPro);
}
