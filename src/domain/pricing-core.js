export const DEFAULT_COMMERCIAL_POLICY = 45;

export const CONSULTANT_PRICE_POLICIES = Object.freeze({
  huesller: Object.freeze({ discount: 45, multiplier: 0.55 }),
  ney: Object.freeze({ discount: 45, multiplier: 0.55 }),
  almir: Object.freeze({ discount: 45, multiplier: 0.55 }),
  gabriel: Object.freeze({ discount: 45, multiplier: 0.55 }),
  junior: Object.freeze({ discount: 45, multiplier: 0.55 }),
  francisco: Object.freeze({ discount: 50, multiplier: 0.5 }),
  representante: Object.freeze({ discount: 50, multiplier: 0.5 })
});

export function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function toPolicyNumber(value) {
  const policy = Number(value);
  return Number.isFinite(policy) && policy >= 0 && policy < 100 ? policy : null;
}

export function getPolicyMultiplier(policy) {
  const discount = toPolicyNumber(policy) ?? DEFAULT_COMMERCIAL_POLICY;
  const consultantPolicy = Object.values(CONSULTANT_PRICE_POLICIES)
    .find((item) => item.discount === discount);

  return consultantPolicy?.multiplier ?? roundCurrency((100 - discount) / 100);
}

export function calculateConsultantPriceValues({
  rawWithIpi,
  rawWithoutIpi = 0,
  discount
}) {
  const pricePolicy = toPolicyNumber(discount) ?? DEFAULT_COMMERCIAL_POLICY;
  const priceMultiplier = getPolicyMultiplier(pricePolicy);

  return {
    pricePolicy,
    priceMultiplier,
    price: roundCurrency(Number(rawWithIpi || 0) * priceMultiplier),
    priceWithoutIpi: rawWithoutIpi
      ? roundCurrency(Number(rawWithoutIpi) * priceMultiplier)
      : 0
  };
}

export function calculateSpecialOfferPriceValues({
  rawWithIpi,
  rawWithoutIpi = 0,
  baseDiscount,
  extraDiscount
}) {
  const safeBaseDiscount = toPolicyNumber(baseDiscount) ?? DEFAULT_COMMERCIAL_POLICY;
  const safeExtraDiscount = toPolicyNumber(extraDiscount) ?? 0;
  const finalDiscount = Math.max(0, Math.min(95, safeBaseDiscount + safeExtraDiscount));
  const finalMultiplier = roundCurrency((100 - finalDiscount) / 100);

  return {
    finalDiscount,
    finalMultiplier,
    specialPrice: roundCurrency(Number(rawWithIpi || 0) * finalMultiplier),
    specialPriceWithoutIpi: rawWithoutIpi
      ? roundCurrency(Number(rawWithoutIpi) * finalMultiplier)
      : 0
  };
}
