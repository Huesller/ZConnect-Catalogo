import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSULTANT_PRICE_POLICIES,
  calculateConsultantPriceValues,
  calculateSpecialOfferPriceValues,
  getPolicyMultiplier
} from '../src/domain/pricing-core.js';

const ZETTA_WITH_IPI = 189.17;
const ZETTA_WITHOUT_IPI = 183.22;

test('preserva a política de 45% de Huesller, Ney e Junior', () => {
  for (const slug of ['huesller', 'ney', 'junior']) {
    const policy = CONSULTANT_PRICE_POLICIES[slug];
    const result = calculateConsultantPriceValues({
      rawWithIpi: ZETTA_WITH_IPI,
      rawWithoutIpi: ZETTA_WITHOUT_IPI,
      discount: policy.discount
    });

    assert.equal(result.pricePolicy, 45);
    assert.equal(result.priceMultiplier, 0.55);
    assert.equal(result.price, 104.04);
    assert.equal(result.priceWithoutIpi, 100.77);
  }
});

test('preserva a política de 50% de Francisco e Representante', () => {
  for (const slug of ['francisco', 'representante']) {
    const policy = CONSULTANT_PRICE_POLICIES[slug];
    const result = calculateConsultantPriceValues({
      rawWithIpi: ZETTA_WITH_IPI,
      rawWithoutIpi: ZETTA_WITHOUT_IPI,
      discount: policy.discount
    });

    assert.equal(result.pricePolicy, 50);
    assert.equal(result.priceMultiplier, 0.5);
    assert.equal(result.price, 94.59);
    assert.equal(result.priceWithoutIpi, 91.61);
  }
});

test('oferta soma pontos percentuais ao desconto-base sem cálculo cascata', () => {
  const result = calculateSpecialOfferPriceValues({
    rawWithIpi: ZETTA_WITH_IPI,
    rawWithoutIpi: ZETTA_WITHOUT_IPI,
    baseDiscount: 45,
    extraDiscount: 5
  });

  assert.deepEqual(result, {
    finalDiscount: 50,
    finalMultiplier: 0.5,
    specialPrice: 94.59,
    specialPriceWithoutIpi: 91.61
  });
});

test('condição especial continua limitada a 95% final', () => {
  const result = calculateSpecialOfferPriceValues({
    rawWithIpi: 100,
    rawWithoutIpi: 90,
    baseDiscount: 50,
    extraDiscount: 95
  });

  assert.equal(result.finalDiscount, 95);
  assert.equal(result.finalMultiplier, 0.05);
  assert.equal(result.specialPrice, 5);
  assert.equal(result.specialPriceWithoutIpi, 4.5);
});

test('multiplicadores oficiais permanecem congelados', () => {
  assert.equal(getPolicyMultiplier(45), 0.55);
  assert.equal(getPolicyMultiplier(50), 0.5);
});
