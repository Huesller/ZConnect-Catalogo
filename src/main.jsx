
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const STORAGE_KEYS = {
  cart: 'zconnect:cart:v11',
  favorites: 'zconnect:favorites:v11',
  recent: 'zconnect:recent:v11',
  added: 'zconnect:added:v11',
  companyName: 'zconnect_company_name'
};

const BRANDS = ['Todos', 'RETOV', 'RIDA', 'TYC', 'Z AUTO'];
const FALLBACK_CONSULTANTS = {
  huesller: { slug: 'huesller', name: 'Huesller', phone: '554733054401', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 45 },
  ney: { slug: 'ney', name: 'Ney', phone: '554733054400', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 45 },
  francisco: { slug: 'francisco', name: 'Francisco', phone: '5527992747307', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 50 },
  representante: { slug: 'representante', name: 'Francisco', phone: '5527992747307', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 50 }
};
const DEFAULT_COMMERCIAL_POLICY = 45;
const CONSULTANT_PRICE_POLICIES = {
  huesller: { discount: 45, multiplier: 0.55 },
  ney: { discount: 45, multiplier: 0.55 },
  francisco: { discount: 50, multiplier: 0.5 },
  representante: { discount: 50, multiplier: 0.5 }
};
const PAGE_SIZE = 25;
const CATALOG_TITLE = 'CATÁLOGO Z AUTOMOTIVA';
const ANONYMOUS_COMPANY_NAME = 'Não identificado';
const ANONYMOUS_TOAST = 'Que pena, queríamos saber quem é você 😊';
const COMPANY_BANNER_HIDDEN_UNTIL_KEY = 'zconnect:company-banner-hidden-until:v1';
const COMPANY_BANNER_HIDE_MS = 7 * 24 * 60 * 60 * 1000;

const SPECIAL_OFFER_QUERY_KEYS = {
  token: 'o',
  shortToken: 'z',
  client: 'cliente',
  discount: 'desconto',
  factor: 'fator',
  mode: 'tipo',
  validity: 'validade',
  expires: 'expira'
};

const ANALYTICS_ENDPOINT = import.meta.env.VITE_ZCONNECT_ANALYTICS_URL || '/api/analytics';
const ANALYTICS_DIRECT_FALLBACK_URL = 'https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec';


function parseCompactOfferDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{8}$/.test(text)) return null;

  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6)) - 1;
  const day = Number(text.slice(6, 8));
  const date = new Date(year, month, day, 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOfferPercent(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace('p', '.')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const percent = Number(normalized);

  return Number.isFinite(percent) ? Math.max(0, Math.min(95, percent)) : null;
}

function parseOfferFactor(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const factor = Number(normalized);

  if (!Number.isFinite(factor)) return null;
  return Math.max(0.05, Math.min(0.9999, factor));
}

function getOfferFactorFromDiscount(discount) {
  const percent = parseOfferPercent(discount);
  if (percent === null || percent <= 0) return null;
  return Math.max(0.05, Math.min(0.9999, roundCurrency((100 - percent) / 100)));
}

function parseShortSpecialOfferToken(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  const parts = text.split('~').map((part) => decodeURIComponent(part || '').trim());
  if (parts.length < 5) return null;

  const [seller, discountRaw, factorRaw, expiresRaw, ...clientParts] = parts;
  const discount = parseOfferPercent(discountRaw);
  let factor = null;

  const numericFactor = Number(String(factorRaw || '').replace('p', '.').replace(',', '.'));
  if (Number.isFinite(numericFactor)) {
    factor = numericFactor > 1 ? parseOfferFactor(String(numericFactor / 100)) : parseOfferFactor(String(numericFactor));
  }

  return {
    seller,
    discount,
    factor: factor ?? getOfferFactorFromDiscount(discount),
    mode: 'discount',
    expiresAt: parseCompactOfferDate(expiresRaw),
    clientName: clientParts.join('~').trim()
  };
}

function getSpecialOfferFromUrl() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get(SPECIAL_OFFER_QUERY_KEYS.token);
  const shortToken = params.get(SPECIAL_OFFER_QUERY_KEYS.shortToken);
  const compactOffer = parseShortSpecialOfferToken(shortToken);
  let seller = compactOffer?.seller || params.get('consultor') || '';
  let discount = compactOffer?.discount ?? parseOfferPercent(params.get(SPECIAL_OFFER_QUERY_KEYS.discount));
  let factor = compactOffer?.factor ?? parseOfferFactor(params.get(SPECIAL_OFFER_QUERY_KEYS.factor) || params.get('factor') || params.get('multiplicador'));
  let mode = compactOffer?.mode || params.get(SPECIAL_OFFER_QUERY_KEYS.mode) || 'discount';
  let expiresAt = compactOffer?.expiresAt || null;

  if (!compactOffer && token) {
    const parts = String(token).split('-');
    if (parts.length >= 4) {
      seller = seller || parts[0];
      discount = parseOfferPercent(parts[1]);
      mode = parts[2] === 'i' || parts[2] === 'increase' ? 'increase' : 'discount';
      expiresAt = parseCompactOfferDate(parts[3]);
    }
  }

  if (mode !== 'increase' && factor === null) {
    factor = getOfferFactorFromDiscount(discount);
  }

  const expiresParam = params.get(SPECIAL_OFFER_QUERY_KEYS.expires);
  if (expiresParam) {
    const parsed = new Date(expiresParam);
    if (!Number.isNaN(parsed.getTime())) expiresAt = parsed;
  }

  const validityDays = Number(params.get(SPECIAL_OFFER_QUERY_KEYS.validity) || 0);
  if (!expiresAt && Number.isFinite(validityDays) && validityDays > 0) {
    expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
  }

  const clientName = String(compactOffer?.clientName || params.get(SPECIAL_OFFER_QUERY_KEYS.client) || '').trim();
  const hasOffer = Boolean(shortToken || token || params.has(SPECIAL_OFFER_QUERY_KEYS.discount) || params.has(SPECIAL_OFFER_QUERY_KEYS.factor) || params.has('factor') || params.has('multiplicador') || clientName);
  if (!hasOffer || !clientName || discount === null || discount <= 0) return null;

  const expired = expiresAt ? Date.now() > expiresAt.getTime() : false;
  const canonicalSeller = normalizeText(seller || 'huesller') || 'huesller';
  const normalizedMode = mode === 'increase' ? 'increase' : 'discount';
  const priceFactor = normalizedMode === 'increase'
    ? Math.min(1.95, 1 + Number(discount || 0) / 100)
    : (factor ?? getOfferFactorFromDiscount(discount));

  if (normalizedMode !== 'increase' && (!priceFactor || priceFactor >= 1)) return null;

  return {
    active: !expired,
    expired,
    seller: canonicalSeller,
    clientName,
    discount,
    factor: priceFactor,
    mode: normalizedMode,
    expiresAt: expiresAt ? expiresAt.toISOString() : '',
    expiresLabel: expiresAt ? expiresAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    source: shortToken ? 'painel_comercial_short_token' : token ? 'painel_comercial_token' : 'url_param'
  };
}

function getSpecialOfferAnalytics(offer) {
  if (!offer) return {};

  return {
    specialOffer: true,
    specialOfferActive: Boolean(offer.active),
    specialOfferExpired: Boolean(offer.expired),
    specialOfferClient: offer.clientName || '',
    specialOfferSeller: offer.seller || '',
    specialOfferMode: offer.mode || '',
    specialOfferDiscount: offer.discount ?? '',
    specialOfferFactor: offer.factor ?? '',
    specialOfferExpiresAt: offer.expiresAt || '',
    specialOfferSource: offer.source || ''
  };
}

function applySpecialOfferPrice(product = {}, offer) {
  if (!offer?.active) return product;

  const currentCatalogPrice = getPriceWithIpi(product);
  if (!Number.isFinite(currentCatalogPrice) || currentCatalogPrice <= 0) return product;

  const currentCatalogPriceWithoutIpi = getPriceWithoutIpi(product);
  const originalPrice = roundCurrency(currentCatalogPrice);
  const originalPriceWithoutIpi = currentCatalogPriceWithoutIpi ? roundCurrency(currentCatalogPriceWithoutIpi) : null;
  const originalPriceLabel = product.priceLabel || product.priceWithIpiLabel || product.precoComIpiLabel || money(originalPrice);
  const originalPriceWithoutIpiLabel = product.priceWithoutIpiLabel || product.precoSemIpiLabel || (originalPriceWithoutIpi ? money(originalPriceWithoutIpi) : '');
  const factor = offer.mode === 'increase'
    ? Math.min(1.95, 1 + Number(offer.discount || 0) / 100)
    : Number(offer.factor || getOfferFactorFromDiscount(offer.discount) || 1);
  const safeFactor = offer.mode === 'increase'
    ? Math.max(1.0001, factor)
    : Math.max(0.05, Math.min(0.9999, factor));
  const specialPrice = roundCurrency(originalPrice * safeFactor);
  const specialPriceWithoutIpi = originalPriceWithoutIpi ? roundCurrency(originalPriceWithoutIpi * safeFactor) : null;

  if (offer.mode !== 'increase' && specialPrice >= originalPrice) return product;

  return {
    ...product,
    price: specialPrice,
    priceWithIpi: specialPrice,
    precoComIpi: specialPrice,
    priceLabel: money(specialPrice),
    priceWithIpiLabel: money(specialPrice),
    precoComIpiLabel: money(specialPrice),
    ...(specialPriceWithoutIpi ? {
      priceWithoutIpi: specialPriceWithoutIpi,
      precoSemIpi: specialPriceWithoutIpi,
      priceWithoutIpiLabel: money(specialPriceWithoutIpi),
      precoSemIpiLabel: money(specialPriceWithoutIpi),
      specialOfferOriginalPriceWithoutIpi: originalPriceWithoutIpi,
      specialOfferOriginalPriceWithoutIpiLabel: originalPriceWithoutIpiLabel
    } : {}),
    specialOffer: true,
    specialOfferClient: offer.clientName,
    specialOfferOriginalPrice: originalPrice,
    specialOfferOriginalPriceLabel: originalPriceLabel,
    pricePolicy: 'condicaoEspecial',
    pricePolicyLabel: 'Condição especial',
    priceMultiplier: safeFactor
  };
}

function getStoredCompanyName() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.companyName)?.trim() || '';
  } catch {
    return '';
  }
}

function getAnalyticsCompanyName() {
  return getStoredCompanyName() || ANONYMOUS_COMPANY_NAME;
}

function saveCompanyName(value) {
  const companyName = String(value || '').trim();
  try {
    if (companyName) {
      window.localStorage.setItem(STORAGE_KEYS.companyName, companyName);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.companyName);
    }
  } catch {
    return companyName;
  }

  return companyName;
}

function getCompanyBannerHiddenUntil() {
  try {
    const value = Number(window.localStorage.getItem(COMPANY_BANNER_HIDDEN_UNTIL_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function setCompanyBannerHiddenUntil(timestamp) {
  try {
    if (timestamp > Date.now()) {
      window.localStorage.setItem(COMPANY_BANNER_HIDDEN_UNTIL_KEY, String(timestamp));
    } else {
      window.localStorage.removeItem(COMPANY_BANNER_HIDDEN_UNTIL_KEY);
    }
  } catch {
    // localStorage indisponivel: apenas segue sem persistir a preferencia.
  }
}

function clearCompanyBannerHiddenUntil() {
  try {
    window.localStorage.removeItem(COMPANY_BANNER_HIDDEN_UNTIL_KEY);
  } catch {
    // Ignora falhas de storage.
  }
}

function getSessionId() {
  try {
    const key = 'zconnect:analytics:session';
    let sessionId = window.sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(key, sessionId);
    }
    return sessionId;
  } catch {
    return '';
  }
}

function getCanonicalConsultantSlug(consultant) {
  const slug = normalizeText(consultant?.slug || consultant?.name || 'huesller');
  return slug === 'ivoney' ? 'ney' : slug;
}

function toPolicyNumber(value) {
  const policy = Number(value);
  return Number.isFinite(policy) && policy >= 0 && policy < 100 ? policy : null;
}

function getConsultantTargetPolicy(consultant = {}) {
  const slug = getCanonicalConsultantSlug(consultant);
  if (CONSULTANT_PRICE_POLICIES[slug]) {
    return CONSULTANT_PRICE_POLICIES[slug].discount;
  }

  const targetDiscount = toPolicyNumber(consultant.targetDiscount);
  return targetDiscount ?? DEFAULT_COMMERCIAL_POLICY;
}

function getPricePolicyLabel(policy) {
  return `Desconto ${policy}%`;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getPolicyMultiplier(policy) {
  const discount = toPolicyNumber(policy) ?? DEFAULT_COMMERCIAL_POLICY;
  const consultantPolicy = Object.values(CONSULTANT_PRICE_POLICIES).find((item) => item.discount === discount);
  return consultantPolicy?.multiplier ?? roundCurrency((100 - discount) / 100);
}

function getZettaBasePrice(product = {}) {
  return Number(
    product.precoZetta
    ?? product.precoCheio
    ?? product.precoBase
    ?? product.priceBase
    ?? product.basePrice
    ?? product.price
    ?? 0
  );
}

function parseCatalogNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined || value === '') return 0;

  const text = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/^R\$/i, '');

  if (!text) return 0;

  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text;

  const number = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function getPriceWithIpi(product = {}) {
  return parseCatalogNumber(
    product.priceWithIpi
    ?? product.precoComIpi
    ?? product.valorComIpi
    ?? product.price
    ?? product.preco
    ?? product.precoZetta
    ?? product.precoCheio
    ?? product.basePrice
  );
}

function getPriceWithoutIpi(product = {}) {
  return parseCatalogNumber(
    product.priceWithoutIpi
    ?? product.precoSemIpi
    ?? product.valorSemIpi
    ?? product.priceNoIpi
    ?? product.precoSemIPI
    ?? product.semIpi
  );
}

function applyConsultantPrice(product = {}, consultant = {}) {
  const basePrice = getZettaBasePrice(product);
  const pricePolicy = getConsultantTargetPolicy(consultant);
  const priceMultiplier = getPolicyMultiplier(pricePolicy);
  const price = roundCurrency(basePrice * priceMultiplier);
  const basePriceLabel = product.basePriceLabel || product.precoZettaLabel || product.precoCheioLabel || product.priceLabel || money(basePrice);

  return {
    ...product,
    basePrice,
    priceBase: basePrice,
    precoBase: basePrice,
    precoZetta: basePrice,
    precoCheio: basePrice,
    basePriceLabel,
    precoBaseLabel: product.precoBaseLabel || basePriceLabel,
    precoZettaLabel: product.precoZettaLabel || basePriceLabel,
    precoCheioLabel: product.precoCheioLabel || basePriceLabel,
    price,
    priceLabel: money(price),
    pricePolicy,
    pricePolicyLabel: getPricePolicyLabel(pricePolicy),
    priceMultiplier
  };
}

function getConsultantAnalytics(consultant, product) {
  const pricePolicy = getConsultantTargetPolicy(consultant);
  const slug = getCanonicalConsultantSlug(consultant);
  const analytics = {
    consultant: slug,
    consultor: slug,
    pricePolicy,
    pricePolicyLabel: getPricePolicyLabel(pricePolicy),
    priceMultiplier: getPolicyMultiplier(pricePolicy)
  };
  const zettaBasePrice = getZettaBasePrice(product);
  if (zettaBasePrice) {
    analytics.zettaBasePrice = zettaBasePrice;
  }
  return analytics;
}

function getProductAnalytics(product = {}) {
  const price = Number(product.price || 0);
  const basePrice = getZettaBasePrice(product);
  return {
    productCode: product.code || '',
    productName: product.name || '',
    brand: product.displayBrand || product.brand || '',
    vehicle: product.vehicle || product.application || '',
    price,
    basePrice,
    priceBase: basePrice,
    precoZetta: basePrice,
    precoCheio: basePrice,
    displayedPrice: price,
    displayedPriceLabel: product.priceLabel || money(price),
    pricePolicy: product.pricePolicy ?? product.commercialPolicy ?? '',
    pricePolicyLabel: product.pricePolicyLabel || (product.pricePolicy ? getPricePolicyLabel(product.pricePolicy) : '')
  };
}

function getAnalyticsTrackUrl(baseUrl) {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('action', 'track');
  return url.toString();
}

function sendDirectAnalyticsFallback(body) {
  const fallbackUrl = getAnalyticsTrackUrl(ANALYTICS_DIRECT_FALLBACK_URL);

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(fallbackUrl, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      if (sent) return;
    }
  } catch {
    // Fetch fallback below.
  }

  try {
    fetch(fallbackUrl, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    }).catch(() => null);
  } catch {
    // Analytics must never interrupt the catalog.
  }
}

function sendAnalyticsBeacon(url, body) {
  try {
    if (!navigator.sendBeacon) return false;
    return navigator.sendBeacon(url, new Blob([body], { type: 'application/json;charset=utf-8' }));
  } catch {
    return false;
  }
}

function sendAnalyticsInBackground(body) {
  const primaryUrl = getAnalyticsTrackUrl(ANALYTICS_ENDPOINT);
  const fallbackUrl = getAnalyticsTrackUrl(ANALYTICS_DIRECT_FALLBACK_URL);

  if (sendAnalyticsBeacon(primaryUrl, body)) return;

  try {
    fetch(primaryUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Analytics proxy returned ${response.status}`);
      })
      .catch(() => {
        if (primaryUrl !== fallbackUrl) sendDirectAnalyticsFallback(body);
      });
  } catch {
    if (primaryUrl !== fallbackUrl) sendDirectAnalyticsFallback(body);
  }
}

function trackEvent(event, payload = {}) {
  if (!ANALYTICS_ENDPOINT || typeof window === 'undefined') return;

  let body = '';
  try {
    const timestamp = new Date().toISOString();
    body = JSON.stringify({
      action: 'track',
      eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      event,
      page: window.location.pathname + window.location.search,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      sessionId: getSessionId(),
      ...payload,
      companyName: getAnalyticsCompanyName(),
      timestamp,
      createdAt: timestamp
    });
  } catch {
    return;
  }

  sendAnalyticsInBackground(body);
}


const COMPLEMENT_RULES = [
  ['retrovisor', ['capa', 'pisca', 'lanterna']],
  ['farol', ['lanterna', 'pisca', 'moldura', 'suporte']],
  ['lanterna', ['soquete', 'farol', 'pisca', 'moldura']],
  ['parachoque', ['alma', 'guia', 'suporte', 'grade', 'absorvedor', 'moldura', 'defletor']],
  ['grade', ['moldura', 'suporte', 'aro', 'parachoque']],
  ['guia', ['parachoque', 'alma', 'suporte', 'grade']],
  ['moldura', ['parachoque', 'grade', 'guia', 'suporte']],
  ['defletor', ['parachoque', 'grade', 'guia', 'suporte']],
  ['alma', ['parachoque', 'guia', 'suporte', 'grade']]
];


const SEARCH_SYNONYMS = new Map([
  ['parachoques', 'parachoque'],
  ['para choque', 'parachoque'],
  ['para-choque', 'parachoque'],
  ['parachoq', 'parachoque'],
  ['parachoqu', 'parachoque'],
  ['paralamas', 'paralama'],
  ['retrovisores', 'retrovisor'],
  ['lanternas', 'lanterna'],
  ['grades', 'grade'],
  ['frisos', 'friso'],
  ['molduras', 'moldura'],
  ['suportes', 'suporte'],
  ['capas', 'capa'],
  ['piscas', 'pisca'],
  ['milhas', 'milha']
]);

const FAMILY_TERMS = [
  'acabamento',
  'alma',
  'aplique',
  'aro',
  'absorvedor',
  'braco',
  'capa',
  'defletor',
  'farol',
  'friso',
  'grade',
  'guia',
  'lanterna',
  'moldura',
  'parabarro',
  'parachoque',
  'paralama',
  'pisca',
  'ponteira',
  'retrovisor',
  'spoiler',
  'suporte'
];

const FAMILY_ALIASES = new Map([
  ['parachoq', 'parachoque'],
  ['parachoqu', 'parachoque'],
  ['parachoques', 'parachoque'],
  ['para choque', 'parachoque'],
  ['para-choque', 'parachoque'],
  ['paralamas', 'paralama'],
  ['retrovisores', 'retrovisor'],
  ['lanternas', 'lanterna'],
  ['grades', 'grade'],
  ['molduras', 'moldura'],
  ['suportes', 'suporte'],
  ['capas', 'capa'],
  ['piscas', 'pisca'],
  ['milhas', 'milha']
]);

const VEHICLE_STOPWORDS = new Set([
  ...FAMILY_TERMS,
  'a',
  'ano',
  'black',
  'central',
  'cinza',
  'com',
  'cromado',
  'cromada',
  'da',
  'das',
  'de',
  'diant',
  'dianteira',
  'dianteiro',
  'direita',
  'direito',
  'do',
  'dos',
  'esquerda',
  'esquerdo',
  'furo',
  'inferior',
  'lado',
  'marca',
  'milha',
  'modelo',
  'piano',
  'preta',
  'preto',
  'sem',
  'superior',
  'texturizada',
  'traseira',
  'traseiro'
]);

const POSITION_TERMS = [
  'dianteiro',
  'dianteira',
  'traseiro',
  'traseira',
  'direito',
  'direita',
  'esquerdo',
  'esquerda',
  'central',
  'inferior',
  'superior'
];

const FAMILY_RELATION_MAP = new Map(COMPLEMENT_RULES);
const YEAR_MIN = 1980;
const YEAR_MAX = 2030;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[ªº°]/g, '')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bpara\s+choque\b/g, 'parachoque')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyToken(token) {
  let clean = SEARCH_SYNONYMS.get(token) || token;

  if (clean.length > 4 && clean.endsWith('oes')) clean = `${clean.slice(0, -3)}ao`;
  else if (clean.length > 4 && clean.endsWith('ais')) clean = `${clean.slice(0, -3)}al`;
  else if (clean.length > 4 && clean.endsWith('eis')) clean = `${clean.slice(0, -3)}el`;
  else if (clean.length > 3 && clean.endsWith('s') && !clean.endsWith('ss')) clean = clean.slice(0, -1);

  return SEARCH_SYNONYMS.get(clean) || clean;
}

function tokenizeSearch(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const rawTokens = normalized.split(' ');
  const mergedTokens = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index];
    const next = rawTokens[index + 1];

    if (/^[a-z]{1,3}$/.test(token) && /^\d{1,3}$/.test(next || '')) {
      mergedTokens.push(`${token}${next}`);
      index += 1;
    } else {
      mergedTokens.push(token);
    }
  }

  const tokens = mergedTokens
    .map(simplifyToken)
    .filter((token) => token.length > 1);

  return [...new Set(tokens)];
}

function compactCode(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function canonicalFamily(token) {
  const clean = FAMILY_ALIASES.get(token) || simplifyToken(token);
  const aliased = FAMILY_ALIASES.get(clean) || clean;
  if (FAMILY_TERMS.includes(aliased)) return aliased;

  if (aliased.length >= 5) {
    const close = FAMILY_TERMS.find((family) => (
      family.startsWith(aliased)
      || aliased.startsWith(family)
      || levenshteinDistance(aliased, family) <= 2
    ));

    if (close) return close;
  }

  return '';
}

function getPrimaryFamilyFromText(value) {
  for (const token of tokenizeSearch(value)) {
    const family = canonicalFamily(token);
    if (family) return family;
  }

  return '';
}

function extractFamilies(value) {
  return [...new Set(tokenizeSearch(value).map(canonicalFamily).filter(Boolean))];
}

function extractVehicleTokens(value) {
  return tokenizeSearch(value).filter((token) => {
    if (token.length < 2) return false;
    if (isFullYearToken(token)) return false;
    if (VEHICLE_STOPWORDS.has(token)) return false;
    if (canonicalFamily(token)) return false;
    return true;
  });
}

function isFullYearToken(token) {
  return /^20\d{2}$|^19\d{2}$/.test(String(token || ''));
}

function normalizeYearText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[ÂªÂºÂ°]/g, '')
    .replace(/[^a-z0-9\/-]+/g, ' ')
    .replace(/\s*([\/-])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandYear(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (raw.length === 4) {
    const year = Number(raw);
    return year >= YEAR_MIN && year <= YEAR_MAX ? year : null;
  }

  if (raw.length === 2) {
    const shortYear = Number(raw);
    if (shortYear >= 0 && shortYear <= 30) return 2000 + shortYear;
    if (shortYear >= 80 && shortYear <= 99) return 1900 + shortYear;
  }

  return null;
}

function getYearContextTokens(value) {
  return tokenizeSearch(value)
    .filter((token) => !isFullYearToken(token) && token !== 'a' && token !== 'ate');
}

function isInsideSpan(index, spans) {
  return spans.some(([start, end]) => index >= start && index < end);
}

function expandYearRange(start, end) {
  const years = [];
  if (!start || !end || end < start || end - start > 60) return years;

  for (let year = start; year <= end; year += 1) {
    years.push(String(year));
  }

  return years;
}

function extractYearApplications(value) {
  const text = normalizeYearText(value);
  if (!text) return [];

  const applications = [];
  const rangeSpans = [];
  const rangePattern = /\b(\d{2}|\d{4})\s*(?:ate|a|-|\/)\s*(\d{2}|\d{4})\b/g;
  let previousRangeEnd = 0;
  let rangeMatch = rangePattern.exec(text);

  while (rangeMatch) {
    const startYear = expandYear(rangeMatch[1]);
    const endYear = expandYear(rangeMatch[2]);
    const start = Math.min(startYear || 0, endYear || 0);
    const end = Math.max(startYear || 0, endYear || 0);
    const contextTokens = getYearContextTokens(text.slice(previousRangeEnd, rangeMatch.index));

    if (startYear && endYear && start >= YEAR_MIN && end <= YEAR_MAX && end >= start) {
      applications.push({
        start,
        end,
        contextTokens,
        yearTokens: expandYearRange(start, end)
      });
      rangeSpans.push([rangeMatch.index, rangePattern.lastIndex]);
    }

    previousRangeEnd = rangePattern.lastIndex;
    rangeMatch = rangePattern.exec(text);
  }

  const yearPattern = /\b(\d{2}|(?:19|20)\d{2})\b/g;
  let previousYearEnd = 0;
  let activeContextTokens = [];
  let yearMatch = yearPattern.exec(text);

  while (yearMatch) {
    if (isInsideSpan(yearMatch.index, rangeSpans)) {
      previousYearEnd = Math.max(previousYearEnd, yearPattern.lastIndex);
      yearMatch = yearPattern.exec(text);
      continue;
    }

    const year = expandYear(yearMatch[1]);
    const contextTokens = getYearContextTokens(text.slice(previousYearEnd, yearMatch.index));
    if (contextTokens.length) activeContextTokens = contextTokens;

    if (year) {
      applications.push({
        start: year,
        end: year,
        contextTokens: activeContextTokens,
        yearTokens: [String(year)]
      });
    }

    previousYearEnd = yearPattern.lastIndex;
    yearMatch = yearPattern.exec(text);
  }

  return applications;
}

function extractYearTokens(value) {
  const years = extractYearApplications(value)
    .flatMap((application) => application.yearTokens);

  return [...new Set(years)];
}

function extractApplicationTokens(value) {
  return tokenizeSearch(value).filter((token) => POSITION_TERMS.includes(token));
}

function getQueryIntent(query) {
  const yearTokens = extractYearTokens(query);
  const yearTokenSet = new Set(yearTokens);
  const tokens = tokenizeSearch(query).map((token) => {
    if (isFullYearToken(token)) return token;
    const expandedYear = /^\d{2}$/.test(token) ? expandYear(token) : null;
    return expandedYear && yearTokenSet.has(String(expandedYear)) ? String(expandedYear) : token;
  });
  const family = tokens.map(canonicalFamily).find(Boolean) || '';
  const applicationTokens = tokens.filter((token) => POSITION_TERMS.includes(token));
  const vehicleTokens = tokens.filter((token) => (
    !canonicalFamily(token)
    && !VEHICLE_STOPWORDS.has(token)
    && !isFullYearToken(token)
  ));

  return {
    normalized: normalizeText(query),
    tokens: [...new Set(tokens)],
    family,
    vehicleTokens,
    applicationTokens,
    yearTokens,
    yearNumbers: yearTokens.map(Number).filter(Boolean)
  };
}

function tokenMatchesProduct(product, token) {
  if (!token) return false;

  const n = product._n || {};
  const tokenSet = product._tokenSet || new Set(product._tokens || []);
  const fields = [n.name, n.vehicle, n.application, n.manufacturer, n.code, n.fabCode, product.search, product._search].filter(Boolean);

  if (isFullYearToken(token) && product._yearTokenSet?.has(token)) return true;
  if (tokenSet.has(token) || fields.some((field) => field.includes(token))) return true;

  if (token.length >= 5) {
    return (product._tokens || []).some((productToken) => (
      productToken.startsWith(token)
      || token.startsWith(productToken)
      || levenshteinDistance(token, productToken) <= 2
    ));
  }

  return false;
}

function vehicleTokenMatchesProduct(product, token) {
  if (!token) return false;

  const productVehicleTokens = product._vehicleTokenSet || new Set(product._vehicleTokens || []);
  if (productVehicleTokens.has(token)) return true;

  if (token.length <= 3) return false;

  return (product._vehicleTokens || []).some((productToken) => (
    productToken === token
    || (
      !/\d/.test(token + productToken)
      && (
        productToken.startsWith(token)
        || (productToken.length >= 4 && token.startsWith(productToken))
        || (token.length >= 5 && productToken.length >= 5 && levenshteinDistance(token, productToken) <= 1)
      )
    )
  ));
}

function vehicleMatchesProduct(product, vehicleTokens) {
  if (!vehicleTokens.length) return true;

  return vehicleTokens.every((token) => vehicleTokenMatchesProduct(product, token));
}

function vehicleTokenMatchesContext(contextTokens, token) {
  if (!token || !contextTokens?.length) return false;

  if (contextTokens.includes(token)) return true;
  if (token.length <= 3) return false;

  return contextTokens.some((contextToken) => (
    contextToken === token
    || (
      !/\d/.test(token + contextToken)
      && (
        contextToken.startsWith(token)
        || (contextToken.length >= 4 && token.startsWith(contextToken))
        || (token.length >= 5 && contextToken.length >= 5 && levenshteinDistance(token, contextToken) <= 1)
      )
    )
  ));
}

function yearApplicationMatchesVehicle(application, vehicleTokens) {
  if (!vehicleTokens.length) return true;
  return vehicleTokens.every((token) => vehicleTokenMatchesContext(application.contextTokens || [], token));
}

function yearApplicationContains(application, yearNumbers) {
  return yearNumbers.some((year) => year >= application.start && year <= application.end);
}

function getProductYearCompatibility(product, intent) {
  if (!intent.yearNumbers?.length) return 'none';

  const applications = getProductYearApplications(product);
  if (!applications.length) return 'unknown';

  const vehicleApplications = (intent.vehicleTokens || []).length
    ? applications.filter((application) => yearApplicationMatchesVehicle(application, intent.vehicleTokens))
    : applications;
  const candidates = vehicleApplications.length
    ? vehicleApplications
    : applications.length === 1
      ? applications
      : [];

  if (!candidates.length) return 'unknown';

  return candidates.some((application) => yearApplicationContains(application, intent.yearNumbers))
    ? 'compatible'
    : 'outside';
}

function applicationScore(product, intent) {
  if (!intent.tokens.length) return 0;

  const n = product._n || {};
  const applicationBonus = (intent.applicationTokens || []).reduce((total, token) => (
    total + ((product._applicationTokenSet?.has(token) || n.application?.includes(token) || n.name?.includes(token)) ? 22 : 0)
  ), 0);
  const yearCompatibility = getProductYearCompatibility(product, intent);
  const yearBonus = yearCompatibility === 'compatible'
    ? (intent.yearTokens || []).length * 64
    : 0;

  return applicationBonus + yearBonus;
}

function getSearchMatch(product, query) {
  const intent = getQueryIntent(query);
  if (!intent.normalized) {
    return { score: 1, direct: true, suggestionScore: 0, tier: 0 };
  }

  const n = product._n || {};
  const compactQuery = compactCode(intent.normalized);
  const codeExact = n.code === intent.normalized || n.codeCompact === compactQuery;
  const fabCodeExact = n.fabCode === intent.normalized || n.fabCodeCompact === compactQuery;
  const codeStarts = n.codeCompact?.startsWith(compactQuery) || n.fabCodeCompact?.startsWith(compactQuery);

  if (codeExact || fabCodeExact || codeStarts) {
    return {
      score: codeExact ? 9000 : fabCodeExact ? 8600 : 7600,
      direct: true,
      suggestionScore: 0,
      tier: codeExact || fabCodeExact ? 1 : 2
    };
  }

  const hasVehicleYearIntent = intent.vehicleTokens.length > 0 && intent.yearTokens.length > 0;
  const yearCompatibility = getProductYearCompatibility(product, intent);
  const nonYearTokens = intent.tokens.filter((token) => !isFullYearToken(token));
  const matchedNonYearTokens = nonYearTokens.filter((token) => tokenMatchesProduct(product, token)).length;
  const matchedYearTokens = intent.yearTokens.filter((token) => (
    hasVehicleYearIntent
      ? yearCompatibility === 'compatible'
      : tokenMatchesProduct(product, token)
  )).length;
  const matchedTokens = matchedNonYearTokens + matchedYearTokens;

  if (!matchedTokens) {
    return { score: 0, direct: false, suggestionScore: 0, tier: 0 };
  }

  const vehicleMatch = vehicleMatchesProduct(product, intent.vehicleTokens);
  const familyScore = !intent.family
    ? 0
    : product._primaryFamily === intent.family
      ? 720
      : product._familyTokenSet?.has(intent.family)
        ? 430
        : 0;
  const familyMatch = !intent.family || familyScore > 0;
  const allNonYearTermsMatch = matchedNonYearTokens === nonYearTokens.length;
  const allTermsMatch = hasVehicleYearIntent
    ? allNonYearTermsMatch && yearCompatibility !== 'outside'
    : matchedTokens === intent.tokens.length;
  const productPhrase = [n.name, n.vehicle, n.application].filter(Boolean).join(' ');
  const exactPhrase = n.name === intent.normalized || productPhrase === intent.normalized;
  const startsWithPhrase = n.name?.startsWith(intent.normalized) || productPhrase.startsWith(intent.normalized);
  const containsPhrase = n.name?.includes(intent.normalized) || productPhrase.includes(intent.normalized);
  const coverage = matchedTokens / Math.max(1, intent.tokens.length);
  const direct = hasVehicleYearIntent
    ? vehicleMatch && familyMatch && allNonYearTermsMatch && yearCompatibility !== 'outside'
    : vehicleMatch && familyMatch && (allTermsMatch || exactPhrase || startsWithPhrase || containsPhrase);

  let tier = 5;
  let score = 0;

  if (direct) {
    if (hasVehicleYearIntent && yearCompatibility === 'compatible') {
      tier = intent.family ? 1 : 2;
      score = intent.family ? 8200 : 7600;
    } else if (hasVehicleYearIntent && yearCompatibility === 'unknown') {
      tier = intent.family ? 3 : 4;
      score = intent.family ? 4200 : 3600;
    } else {
      if (exactPhrase) {
        tier = 1;
        score = 7000;
      } else if (startsWithPhrase) {
        tier = 2;
        score = 6200;
      } else if (allTermsMatch || containsPhrase) {
        tier = 3;
        score = 5200;
      } else {
        tier = 4;
        score = 3200;
      }
    }

    score += Math.round(coverage * 400);
    score += familyScore;
    score += applicationScore(product, intent);
    score += Math.max(0, 80 - (product.name || '').length * 0.2);
  }

  let suggestionScore = 0;
  if (!direct && hasVehicleYearIntent && vehicleMatch && yearCompatibility === 'outside' && allNonYearTermsMatch && familyMatch) {
    suggestionScore = 180 + Math.round(coverage * 80) + Math.round(familyScore * 0.08);
  } else if (!direct && vehicleMatch && intent.family) {
    const relatedFamilies = FAMILY_RELATION_MAP.get(intent.family) || [];
    const relationIndex = relatedFamilies.indexOf(product._primaryFamily);
    const hasRelatedFamily = relationIndex >= 0 || product._families?.includes(intent.family);

    if (hasRelatedFamily && allTermsMatch) {
      suggestionScore = 1800 - Math.max(0, relationIndex) * 80 + applicationScore(product, intent);
    } else if (hasRelatedFamily && coverage >= 0.5) {
      suggestionScore = 900 + Math.round(coverage * 200);
    }
  }

  if (!direct && !suggestionScore && vehicleMatch && coverage >= 0.67 && !intent.family) {
    suggestionScore = 600 + Math.round(coverage * 200);
  }

  return { score, direct, suggestionScore, tier };
}

function buildSearchField(product) {
  return [
    product.code,
    product.fabCode,
    product.name,
    product.application,
    product.vehicle,
    product.manufacturer,
    product.brand,
    product.displayBrand
  ].filter(Boolean).join(' ');
}

function prepareProduct(product) {
  const normalized = {
    code: normalizeText(product.code),
    codeCompact: compactCode(product.code),
    fabCode: normalizeText(product.fabCode),
    fabCodeCompact: compactCode(product.fabCode),
    name: normalizeText(product.name),
    application: normalizeText(product.application),
    vehicle: normalizeText(product.vehicle),
    manufacturer: normalizeText(product.manufacturer),
    brand: normalizeText(product.brand),
    displayBrand: normalizeText(product.displayBrand)
  };

  const field = buildSearchField(product);
  const tokens = tokenizeSearch(field);
  const tokenSet = new Set(tokens);
  const search = tokens.join(' ');
  const familySource = [product.name, product.description].filter(Boolean).join(' ');
  const vehicleSource = [
    product.vehicleSignature,
    product.vehicle,
    product.name,
    product.manufacturer
  ].filter(Boolean).join(' ');
  const families = extractFamilies(familySource);
  const vehicleTokens = extractVehicleTokens(vehicleSource);
  const applicationTokens = extractApplicationTokens([product.application, product.name].filter(Boolean).join(' '));
  const yearSource = [product.name, product.vehicle, product.vehicleSignature].filter(Boolean).join(' ');
  const yearApplications = extractYearApplications(yearSource);
  const yearTokens = [...new Set(yearApplications.flatMap((application) => application.yearTokens))];
  const commercialText = normalizeText([
    product.name,
    product.description,
    product.vehicle,
    product.application,
    product.manufacturer,
    product.code,
    product.fabCode
  ].filter(Boolean).join(' '));

  return {
    ...product,
    _n: normalized,
    _tokens: tokens,
    _tokenSet: tokenSet,
    _primaryFamily: getPrimaryFamilyFromText(familySource),
    _families: families,
    _familyTokenSet: new Set(families),
    _vehicleTokens: vehicleTokens,
    _vehicleTokenSet: new Set(vehicleTokens),
    _applicationTokens: applicationTokens,
    _applicationTokenSet: new Set(applicationTokens),
    _yearApplications: yearApplications,
    _yearTokens: yearTokens,
    _yearTokenSet: new Set(yearTokens),
    _commercialText: commercialText,
    _search: search,
    search: product.search || `${normalizeText(field)} ${search}`.trim()
  };
}

function tokenScore(field, token, exactWeight, partialWeight) {
  if (!field || !token) return 0;

  if (field === token) return exactWeight;
  if (field.startsWith(`${token} `) || field.includes(` ${token} `) || field.endsWith(` ${token}`)) return Math.round(exactWeight * 0.7);
  if (field.startsWith(token)) return partialWeight;
  if (field.includes(token)) return Math.round(partialWeight * 0.7);

  return 0;
}

function scoreProduct(product, query) {
  return getSearchMatch(product, query).score;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStockQuantity(product = {}) {
  const rawStock = product.stock ?? product.stockQty ?? product.estoque ?? product.saldo ?? product.quantidade;
  if (rawStock === null || rawStock === undefined || rawStock === '') return null;

  if (typeof rawStock === 'number') {
    return Number.isFinite(rawStock) && rawStock > 0 ? Math.trunc(rawStock) : null;
  }

  const compact = String(rawStock).trim().replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!compact) return null;

  let integerPart = compact;
  if (compact.includes(',')) {
    integerPart = compact.split(',')[0];
  } else if (/^-?\d+\.\d{1,4}$/.test(compact)) {
    integerPart = compact.split('.')[0];
  }

  const normalized = integerPart.replace(/\./g, '').replace(/,/g, '');
  const stock = Number(normalized);
  return Number.isFinite(stock) && stock > 0 ? Math.trunc(stock) : null;
}

function getStockLabel(product = {}) {
  const stock = getStockQuantity(product);
  return stock ? `Estoque: ${stock} un.` : 'Consultar estoque';
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, value]);

  return [value, setValue];
}

function getBusinessStatus() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const day = weekdayMap[parts.weekday] ?? 0;
  const totalMinutes = Number(parts.hour || 0) * 60 + Number(parts.minute || 0);

  return day >= 1 && day <= 5 && totalMinutes >= 8 * 60 && totalMinutes < 18 * 60;
}

function getConsultant(consultants, specialOffer = null) {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = normalizeText(params.get('consultor') || specialOffer?.seller || 'huesller');
  const aliases = {
    ney: 'ney',
    ivoney: 'ney',
    francisco: 'francisco',
    representante: 'representante',
    huesller: 'huesller'
  };

  const slug = aliases[requestedSlug] || requestedSlug;
  return consultants?.[slug]
    || FALLBACK_CONSULTANTS[slug]
    || consultants?.huesller
    || FALLBACK_CONSULTANTS.huesller;
}

function buildWhatsAppMessage(cart, consultant, subtotal, companyName) {
  const totalItems = cart.reduce((total, item) => total + Number(item.qty || 0), 0);

  return [
    '🔴 Z Connect | Cotação Z Automotiva',
    '',
    `Empresa: ${companyName || ANONYMOUS_COMPANY_NAME}`,
    `Consultor: ${consultant.name}`,
    '',
    'Itens solicitados:',
    ...cart.flatMap((item, index) => [
      `${index + 1}. ${item.code}${item.fabCode ? ` / ${item.fabCode}` : ''}`,
      `${item.name}`,
      `Quantidade: ${item.qty}`,
      `Valor unitário com IPI: ${item.priceLabel || money(item.price)}`,
      `Subtotal: ${money(item.price * item.qty)}`,
      ''
    ]),
    'Resumo do orçamento:',
    `Total de itens: ${totalItems}`,
    `Subtotal: ${money(subtotal)}`,
    '',
    'Observação:',
    'Preço com IPI incluso. Cotação sujeita à confirmação de disponibilidade e negociação.'
  ].join('\n');
}

function buildNoResultLeadMessage(query, consultant, companyName) {
  const term = String(query || '').trim();

  return [
    '🔴 Z Connect | Solicitação ao consultor',
    '',
    `Empresa: ${companyName || ANONYMOUS_COMPANY_NAME}`,
    `Consultor: ${consultant.name}`,
    '',
    'Procurei no catálogo e não encontrei:',
    `"${term}"`,
    '',
    'Pode verificar disponibilidade ou uma alternativa para este item?'
  ].join('\n');
}

function getProductPrimaryFamily(product) {
  return product?._primaryFamily || getPrimaryFamilyFromText([product?.name, product?.description].filter(Boolean).join(' '));
}

function getProductFamilies(product) {
  return product?._families?.length
    ? product._families
    : extractFamilies([product?.name, product?.description].filter(Boolean).join(' '));
}

function getProductVehicleTokens(product) {
  if (product?._vehicleTokens?.length) return product._vehicleTokens;
  return extractVehicleTokens([
    product?.vehicleSignature,
    product?.vehicle,
    product?.name,
    product?.manufacturer
  ].filter(Boolean).join(' '));
}

function getProductYearApplications(product) {
  if (product?._yearApplications?.length) return product._yearApplications;
  return extractYearApplications([
    product?.name,
    product?.vehicle,
    product?.vehicleSignature
  ].filter(Boolean).join(' '));
}

function getProductYearTokens(product) {
  if (product?._yearTokens?.length) return product._yearTokens;
  return getProductYearApplications(product).flatMap((application) => application.yearTokens);
}

function overlapCount(left = [], right = []) {
  const rightSet = new Set(right);
  return left.reduce((total, token) => total + (rightSet.has(token) ? 1 : 0), 0);
}

function sameVehicleScore(product, selectedTokens) {
  if (!selectedTokens.length) return 0;
  const productTokens = getProductVehicleTokens(product);
  const matched = overlapCount(selectedTokens, productTokens);
  return matched / selectedTokens.length;
}

function sameApplicationScore(product, selected) {
  const selectedApp = tokenizeSearch(selected?.application || '').filter((token) => !VEHICLE_STOPWORDS.has(token));
  if (!selectedApp.length) return 0;
  const productApp = tokenizeSearch([product?.application, product?.name].filter(Boolean).join(' '));
  return overlapCount(selectedApp, productApp);
}

function findRelated(products, selected, addedMap) {
  if (!selected) return { complementary: [], similar: [] };

  const selectedFamily = getProductPrimaryFamily(selected);
  const relatedFamilies = FAMILY_RELATION_MAP.get(selectedFamily) || [];
  const selectedVehicleTokens = getProductVehicleTokens(selected);
  const selectedYears = getProductYearTokens(selected);

  if (!selectedVehicleTokens.length) return { complementary: [], similar: [] };

  const scored = products
    .filter((product) => product.id !== selected.id)
    .map((product) => {
      const vehicleScore = sameVehicleScore(product, selectedVehicleTokens);
      if (vehicleScore < 1) return null;

      const productFamily = getProductPrimaryFamily(product);
      const familyIndex = relatedFamilies.indexOf(productFamily);
      const familyRelated = familyIndex >= 0 || getProductFamilies(product).some((family) => relatedFamilies.includes(family));
      const appScore = sameApplicationScore(product, selected);
      const yearScore = overlapCount(selectedYears, getProductYearTokens(product));
      const addedScore = addedMap[product.id] || 0;

      return {
        product,
        productFamily,
        familyRelated,
        complementaryScore: (familyRelated ? 1000 - Math.max(0, familyIndex) * 70 : 0) + appScore * 20 + yearScore * 12 + addedScore,
        similarScore: (productFamily === selectedFamily ? 420 : 0) + appScore * 32 + yearScore * 15 + addedScore
      };
    })
    .filter(Boolean);

  const complementary = scored
    .filter((item) => item.familyRelated && item.productFamily !== selectedFamily)
    .sort((a, b) => b.complementaryScore - a.complementaryScore || a.product.name.localeCompare(b.product.name, 'pt-BR'))
    .slice(0, 8)
    .map((item) => item.product);

  const similar = scored
    .filter((item) => item.productFamily === selectedFamily || item.similarScore > 0)
    .sort((a, b) => b.similarScore - a.similarScore || a.product.name.localeCompare(b.product.name, 'pt-BR'))
    .slice(0, 8)
    .map((item) => item.product);

  return { complementary, similar };
}

function openWhatsapp(phone, text) {
  if (!phone) return;
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  window.open(`https://wa.me/${phone}${encodedText}`, '_blank', 'noopener,noreferrer');
}

function QuantityStepper({ value, onChange, compact = false }) {
  return (
    <div className={compact ? 'qty-stepper compact' : 'qty-stepper'}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function CompactRail({ title, items, favorites, onOpen, onAdd, onToggleFavorite }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={open ? 'compact-rail open' : 'compact-rail'}>
      <button type="button" className="compact-rail-toggle" onClick={() => setOpen((current) => !current)}>
        <div>
          <strong>{title}</strong>
          <small>{items.length ? `${items.length} itens` : 'sem itens'}</small>
        </div>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="compact-list">
          {!items.length ? (
            <div className="compact-empty">Nenhum item salvo ainda.</div>
          ) : (
            items.map((product) => (
              <article key={product.id} className="compact-item">
                <button type="button" className="compact-main" onClick={() => onOpen(product)}>
                  <span className="chip">{product.displayBrand}</span>
                  <strong>{product.code}{product.fabCode ? ` / ${product.fabCode}` : ''}</strong>
                  <span>{product.name}</span>
                </button>
                <div className="compact-item-footer">
                  <small>{product.priceLabel || money(product.price)}</small>
                  <div className="compact-actions">
                    <button
                      type="button"
                      className={favorites.has(product.id) ? 'icon-button favorite-icon active' : 'icon-button favorite-icon'}
                      aria-label={favorites.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      onClick={() => onToggleFavorite(product)}
                    >
                      {favorites.has(product.id) ? '★' : '☆'}
                    </button>
                    <button type="button" className="primary-button small-button" onClick={() => onAdd(product, 1)}>
                      Adicionar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

function PriceDisplay({ product, variant = 'card' }) {
  const priceWithIpi = getPriceWithIpi(product);
  const priceWithoutIpi = getPriceWithoutIpi(product);
  const hasPriceWithIpi = Number.isFinite(priceWithIpi) && priceWithIpi > 0;
  const hasPriceWithoutIpi = Number.isFinite(priceWithoutIpi) && priceWithoutIpi > 0;
  const isSpecial = Boolean(product?.specialOffer);

  const originalWithIpiLabel = product.specialOfferOriginalPriceLabel
    || (product.specialOfferOriginalPrice ? money(product.specialOfferOriginalPrice) : '');

  const originalWithoutIpiLabel = product.specialOfferOriginalPriceWithoutIpiLabel
    || (product.specialOfferOriginalPriceWithoutIpi ? money(product.specialOfferOriginalPriceWithoutIpi) : '');

  const priceWithIpiLabel = product.priceWithIpiLabel
    || product.precoComIpiLabel
    || product.priceLabel
    || (hasPriceWithIpi ? money(priceWithIpi) : '');

  const priceWithoutIpiLabel = product.priceWithoutIpiLabel
    || product.precoSemIpiLabel
    || (hasPriceWithoutIpi ? money(priceWithoutIpi) : '');

  if (!hasPriceWithIpi && !hasPriceWithoutIpi) {
    return (
      <div className={variant === 'modal' ? 'modal-price price-box' : 'price-box'}>
        <div className="price-line">
          <span>Preço</span>
          <strong className="price-consult">Consultar</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={variant === 'modal' ? 'modal-price price-box' : 'price-box'}>
      {hasPriceWithoutIpi ? (
        <div className="price-line">
          <span>Valor sem IPI</span>
          <div className="price-values">
            {isSpecial && originalWithoutIpiLabel ? <del>{originalWithoutIpiLabel}</del> : null}
            <strong>{priceWithoutIpiLabel}</strong>
          </div>
        </div>
      ) : null}

      {hasPriceWithIpi ? (
        <div className={hasPriceWithoutIpi ? 'price-line price-line-featured' : 'price-line price-line-featured'}>
          <span>Valor com IPI</span>
          <div className="price-values">
            {isSpecial && originalWithIpiLabel ? <del>{originalWithIpiLabel}</del> : null}
            <strong>{priceWithIpiLabel}</strong>
            {isSpecial ? <small>Condição exclusiva</small> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}


function ProductCard({ product, favoriteIds, qty, onQtyChange, onOpen, onAdd, onToggleFavorite }) {
  return (
    <article className="product-card">
      <button
        type="button"
        className={favoriteIds.has(product.id) ? 'favorite-toggle active' : 'favorite-toggle'}
        aria-label={favoriteIds.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onClick={() => onToggleFavorite(product)}
      >
        {favoriteIds.has(product.id) ? '★' : '☆'}
      </button>

      <button type="button" className="product-main" onClick={() => onOpen(product)}>
        <div className="product-thumb">
          <span className="chip thumb-chip">{product.displayBrand}</span>
          {product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <span className="no-image">Sem imagem</span>}
        </div>

        <div className="product-copy">
          <h3 title={product.name}>{product.name}</h3>
          <p>{product.code}{product.fabCode ? ` / ${product.fabCode}` : ''}</p>
        </div>
      </button>

      <PriceDisplay product={product} />

      <div className="stock-line">{getStockLabel(product)}</div>

      <div className="product-controls">
        <QuantityStepper compact value={qty} onChange={onQtyChange} />
        <button type="button" className="primary-button small-button flex-grow" onClick={() => onAdd(product, qty)}>
          Adicionar
        </button>
      </div>

      <button type="button" className="ghost-button tiny-link" onClick={() => onOpen(product)}>
        Detalhes
      </button>
    </article>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }

  return (
    <div className="pagination">
      <button type="button" className="ghost-button small-button" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>

      {start > 1 ? (
        <>
          <button type="button" className={page === 1 ? 'page-button active' : 'page-button'} onClick={() => onChange(1)}>1</button>
          {start > 2 ? <span className="pagination-gap">…</span> : null}
        </>
      ) : null}

      {pages.map((value) => (
        <button key={value} type="button" className={page === value ? 'page-button active' : 'page-button'} onClick={() => onChange(value)}>
          {value}
        </button>
      ))}

      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="pagination-gap">…</span> : null}
          <button type="button" className={page === totalPages ? 'page-button active' : 'page-button'} onClick={() => onChange(totalPages)}>
            {totalPages}
          </button>
        </>
      ) : null}

      <button type="button" className="ghost-button small-button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Próxima
      </button>
    </div>
  );
}



function SpecialOfferBanner({ offer, consultant }) {
  if (!offer) return null;

  if (offer.expired) {
    return (
      <section className="special-offer-banner expired" aria-label="Condição especial expirada">
        <div className="special-offer-icon">⌛</div>
        <div>
          <span>Condição especial expirada</span>
          <strong>Esta condição exclusiva não está mais válida.</strong>
          <p>Fale com {consultant.name} para gerar uma nova condição comercial.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="special-offer-banner" aria-label="Condição especial do cliente">
      <div className="special-offer-icon">★</div>
      <div>
        <span>Condição especial gerada</span>
        <strong>Oferta exclusiva para {offer.clientName}</strong>
        <p>{offer.expiresLabel ? `Válida até ${offer.expiresLabel}. ` : ''}Os valores já foram personalizados para este atendimento.</p>
      </div>
      <button type="button" className="ghost-button small-button" onClick={() => openWhatsapp(consultant.phone)}>
        Falar com {consultant.name}
      </button>
    </section>
  );
}

function CompanyIdentificationBanner({ onIdentify, onClose }) {
  return (
    <section className="company-identification-banner" aria-label="Personalizar experiência">
      <div className="company-identification-copy">
        <span className="eyebrow">Experiência personalizada</span>
        <h2>Você está navegando sem identificação</h2>
        <p>Informe sua empresa para deixar o catálogo mais útil nas próximas visitas.</p>

        <div className="company-identification-benefits">
          <span>✓ Histórico salvo automaticamente</span>
          <span>✓ Produtos recentes sempre à mão</span>
          <span>✓ Cotações futuras mais rápidas</span>
          <span>✓ Atendimento mais eficiente pelo consultor</span>
        </div>
      </div>

      <div className="company-identification-actions">
        <button type="button" className="primary-button" onClick={onIdentify}>
          Informar minha empresa
        </button>
        <button type="button" className="ghost-button" onClick={onClose}>
          Continuar sem identificar
        </button>
      </div>
    </section>
  );
}

function CompanyGate({ value, error, minimized, onChange, onClose, onRestore, onSubmit }) {
  if (minimized) {
    return (
      <div className="company-gate" role="presentation">
        <button type="button" className="company-restore-card" onClick={onRestore}>
          Informe o nome da empresa para acessar o catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="company-gate" role="presentation">
      <form className="company-card" role="dialog" aria-modal="true" aria-labelledby="company-gate-title" onSubmit={onSubmit}>
        <button type="button" className="company-close" aria-label="Fechar identificação" onClick={onClose}>×</button>
        <img src="/logo-z-automotiva.png" alt="Z Automotiva" className="company-logo" />
        <div>
          <span className="eyebrow">Z Connect</span>
          <h1 id="company-gate-title">Bem-vindo ao Catálogo Z Automotiva</h1>
          <p className="company-intro">Identifique sua empresa para salvar seu histórico, facilitar futuras cotações e receber um atendimento mais rápido.</p>
        </div>
        <label className="company-field">
          <span>Nome da autopeça, oficina ou distribuidora</span>
          <input
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ex.: Auto Peças Silva"
          />
        </label>
        {error ? <small className="company-error">{error}</small> : null}
        <button type="submit" className="primary-button">Personalizar meu acesso</button>
        <small className="company-note">Leva menos de 5 segundos. Você também pode fechar esta janela e acessar sem identificação.</small>
      </form>
    </div>
  );
}

function App() {
  const specialOffer = useMemo(() => getSpecialOfferFromUrl(), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [products, setProducts] = useState([]);
  const [consultants, setConsultants] = useState(FALLBACK_CONSULTANTS);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const pageViewSentRef = useRef(false);
  const lastSearchEventRef = useRef('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);
  const [cart, setCart] = usePersistentState(STORAGE_KEYS.cart, []);
  const [favorites, setFavorites] = usePersistentState(STORAGE_KEYS.favorites, []);
  const [recent, setRecent] = usePersistentState(STORAGE_KEYS.recent, []);
  const [addedMap, setAddedMap] = usePersistentState(STORAGE_KEYS.added, {});
  const [cardQty, setCardQty] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [companyName, setCompanyName] = useState(() => specialOffer?.active ? specialOffer.clientName : getStoredCompanyName());
  const [companyDraft, setCompanyDraft] = useState(() => specialOffer?.active ? specialOffer.clientName : getStoredCompanyName());
  const [companyError, setCompanyError] = useState('');
  const [companyGateMinimized, setCompanyGateMinimized] = useState(false);
  const [companyBannerHiddenUntil, setCompanyBannerHiddenUntilState] = useState(() => getCompanyBannerHiddenUntil());
  const companyBannerViewSentRef = useRef(false);
  const [catalogAccessGranted, setCatalogAccessGranted] = useState(() => Boolean(specialOffer?.active || getStoredCompanyName()));
  const [toast, setToast] = useState(() => {
    const storedCompany = specialOffer?.active ? specialOffer.clientName : getStoredCompanyName();
    return storedCompany ? `Bem-vindo, ${storedCompany}` : '';
  });
  const catalogLocked = !catalogAccessGranted;
  const showCompanyIdentificationBanner = !catalogLocked && !companyName && Date.now() >= companyBannerHiddenUntil;

  useEffect(() => {
    document.title = CATALOG_TITLE;
  }, []);

  useEffect(() => {
    if (!specialOffer?.active) return;

    saveCompanyName(specialOffer.clientName);
    setCompanyName(specialOffer.clientName);
    setCompanyDraft(specialOffer.clientName);
    setCatalogAccessGranted(true);
    setCompanyGateMinimized(false);
    setCompanyError('');
  }, [specialOffer]);


  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [catalogResponse, consultantsResponse] = await Promise.all([
          fetch('/data/catalog.v5.json'),
          fetch('/data/consultants.json')
        ]);

        if (!catalogResponse.ok) {
          throw new Error('Não foi possível carregar o catálogo atualizado.');
        }

        const [catalogData, consultantsData] = await Promise.all([
          catalogResponse.json(),
          consultantsResponse.ok ? consultantsResponse.json() : FALLBACK_CONSULTANTS
        ]);

        if (!active) return;

        setProducts(Array.isArray(catalogData) ? catalogData.map(prepareProduct) : []);
        setConsultants(consultantsData && typeof consultantsData === 'object' ? consultantsData : FALLBACK_CONSULTANTS);
        setLoadError('');
      } catch (error) {
        if (!active) return;
        setLoadError(error.message || 'Falha ao carregar o catálogo.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setImageViewer(null);
        setSelected(null);
        setCartOpen(false);
        setSuggestionsOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected || imageViewer || catalogLocked ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selected, imageViewer, catalogLocked]);

  useEffect(() => {
    if (companyName) return;
    setCompanyGateMinimized(false);
  }, [companyName]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!showCompanyIdentificationBanner || companyBannerViewSentRef.current) return;
    companyBannerViewSentRef.current = true;
    trackEvent('identify_banner_view', {
      source: 'company_identification_banner'
    });
  }, [showCompanyIdentificationBanner]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!searchBoxRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const consultant = useMemo(() => getConsultant(consultants, specialOffer), [consultants, specialOffer]);
  const online = useMemo(() => getBusinessStatus(), []);
  const pricedProducts = useMemo(() => products.map((product) => applySpecialOfferPrice(applyConsultantPrice(product, consultant), specialOffer)), [consultant, products, specialOffer]);
  const productById = useMemo(() => new Map(pricedProducts.map((product) => [product.id, product])), [pricedProducts]);
  const selectedProduct = useMemo(() => {
    if (!selected) return null;
    return productById.get(selected.id) || applySpecialOfferPrice(applyConsultantPrice(selected, consultant), specialOffer);
  }, [consultant, productById, selected]);
  const cartItems = useMemo(() => (
    cart.map((item) => ({
      ...(productById.get(item.id) || applySpecialOfferPrice(applyConsultantPrice(item, consultant), specialOffer)),
      qty: Math.max(1, Number(item.qty || 1))
    }))
  ), [cart, consultant, productById]);
  const favoriteProducts = useMemo(() => (
    favorites.map((item) => productById.get(item.id) || applySpecialOfferPrice(applyConsultantPrice(item, consultant), specialOffer))
  ), [consultant, favorites, productById]);
  const recentProducts = useMemo(() => (
    recent.map((item) => productById.get(item.id) || applySpecialOfferPrice(applyConsultantPrice(item, consultant), specialOffer))
  ), [consultant, productById, recent]);
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);

  const queryText = deferredQuery.trim();
  const hasQuery = queryText.length > 0;

  const matchedProducts = useMemo(() => {
    return pricedProducts
      .filter((product) => filter === 'Todos' || product.brand === filter)
      .map((product) => ({ product, ...getSearchMatch(product, deferredQuery) }))
      .filter((match) => (!hasQuery && match.score > 0) || (hasQuery && match.direct && match.score > 0))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (b.score !== a.score) return b.score - a.score;
        return a.product.name.localeCompare(b.product.name, 'pt-BR');
      });
  }, [deferredQuery, filter, hasQuery, pricedProducts]);

  const allFilteredProducts = useMemo(() => matchedProducts.map(({ product }) => product), [matchedProducts]);
  const fallbackSuggestions = useMemo(() => {
    if (!hasQuery || allFilteredProducts.length) return [];

    return pricedProducts
      .filter((product) => filter === 'Todos' || product.brand === filter)
      .map((product) => ({ product, ...getSearchMatch(product, deferredQuery) }))
      .filter(({ suggestionScore }) => suggestionScore > 0)
      .sort((a, b) => b.suggestionScore - a.suggestionScore || a.product.name.localeCompare(b.product.name, 'pt-BR'))
      .slice(0, 12)
      .map(({ product }) => product);
  }, [allFilteredProducts.length, deferredQuery, filter, hasQuery, pricedProducts]);
  const suggestions = useMemo(() => (
    suggestionsOpen && queryText && allFilteredProducts.length ? allFilteredProducts.slice(0, 6) : []
  ), [allFilteredProducts, queryText, suggestionsOpen]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(allFilteredProducts.length / PAGE_SIZE)), [allFilteredProducts.length]);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allFilteredProducts.slice(start, start + PAGE_SIZE);
  }, [allFilteredProducts, page]);

  const mostAdded = useMemo(() => {
    return [...pricedProducts]
      .sort((a, b) => (addedMap[b.id] || 0) - (addedMap[a.id] || 0))
      .filter((product) => (addedMap[product.id] || 0) > 0)
      .slice(0, 6);
  }, [addedMap, pricedProducts]);

  const brandCounts = useMemo(() => {
    const counts = { Todos: pricedProducts.length, RETOV: 0, RIDA: 0, TYC: 0, 'Z AUTO': 0 };
    for (const product of pricedProducts) {
      counts[product.brand] = (counts[product.brand] || 0) + 1;
    }
    return counts;
  }, [pricedProducts]);

  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.qty, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((total, item) => total + item.price * item.qty, 0), [cartItems]);
  const related = useMemo(() => (selectedProduct ? findRelated(pricedProducts, selectedProduct, addedMap) : { complementary: [], similar: [] }), [addedMap, pricedProducts, selectedProduct]);

  useEffect(() => {
    if (loading || catalogLocked || pageViewSentRef.current) return;

    pageViewSentRef.current = true;
    trackEvent('page_view', {
      ...getConsultantAnalytics(consultant),
      ...getSpecialOfferAnalytics(specialOffer),
      totalProducts: pricedProducts.length
    });
  }, [catalogLocked, consultant, loading, pricedProducts.length, specialOffer]);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();
    if (loading || normalizedQuery.length < 2 || catalogLocked) return;

    const timeout = window.setTimeout(() => {
      const signature = `${normalizedQuery}::${filter}::${allFilteredProducts.length}::${fallbackSuggestions.length}`;
      if (lastSearchEventRef.current === signature) return;
      lastSearchEventRef.current = signature;

      trackEvent('search', {
        ...getConsultantAnalytics(consultant),
        ...getSpecialOfferAnalytics(specialOffer),
        query: normalizedQuery,
        total: allFilteredProducts.length,
        resultsCount: allFilteredProducts.length,
        suggestions: fallbackSuggestions.length,
        resultType: allFilteredProducts.length ? 'direct' : fallbackSuggestions.length ? 'suggestions' : 'empty',
        page: window.location.pathname + window.location.search
      });

      if (!allFilteredProducts.length && !fallbackSuggestions.length) {
        trackEvent('search_no_results', {
          ...getConsultantAnalytics(consultant),
          query: normalizedQuery,
          total: 0,
          resultsCount: 0,
          suggestions: 0,
          resultType: 'empty',
          page: window.location.pathname + window.location.search
        });
      }
    }, 850);

    return () => window.clearTimeout(timeout);
  }, [deferredQuery, filter, allFilteredProducts.length, fallbackSuggestions.length, consultant, loading, catalogLocked, specialOffer]);

  function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToContact() {
    document.getElementById('rodape')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function grantAnonymousAccess() {
    saveCompanyName('');
    setCompanyName('');
    setCompanyDraft('');
    setCompanyError('');
    setCompanyGateMinimized(false);
    setCatalogAccessGranted(true);
    pageViewSentRef.current = false;
    setToast(ANONYMOUS_TOAST);
  }

  function handleCompanySubmit(event) {
    event.preventDefault();
    const nextCompanyName = saveCompanyName(companyDraft);

    if (!nextCompanyName) {
      grantAnonymousAccess();
      return;
    }

    setCompanyError('');
    setCompanyName(nextCompanyName);
    clearCompanyBannerHiddenUntil();
    setCompanyBannerHiddenUntilState(0);
    setCompanyGateMinimized(false);
    setCatalogAccessGranted(true);
    pageViewSentRef.current = false;
    trackEvent('identify_completed', {
      source: catalogLocked ? 'company_gate' : 'company_identification_banner',
      identifiedCompanyName: nextCompanyName
    });
    setToast(`Bem-vindo, ${nextCompanyName}`);
  }

  function changeCompany() {
    saveCompanyName('');
    setCompanyName('');
    setCompanyDraft('');
    setCompanyError('');
    setCompanyGateMinimized(false);
    setCatalogAccessGranted(false);
    setCartOpen(false);
    pageViewSentRef.current = false;
  }

  function openCompanyIdentificationFromBanner() {
    trackEvent('identify_banner_click', {
      source: 'company_identification_banner'
    });
    setCompanyDraft('');
    setCompanyError('');
    setCompanyGateMinimized(false);
    setCatalogAccessGranted(false);
    setCartOpen(false);
  }

  function hideCompanyIdentificationBanner() {
    const hiddenUntil = Date.now() + COMPANY_BANNER_HIDE_MS;
    setCompanyBannerHiddenUntil(hiddenUntil);
    setCompanyBannerHiddenUntilState(hiddenUntil);
    trackEvent('identify_banner_close', {
      source: 'company_identification_banner',
      hiddenForDays: 7
    });
    setToast('Tudo bem. Você pode informar sua empresa depois, quando quiser.');
  }

  function rememberProduct(product) {
    setRecent((current) => [product, ...current.filter((item) => item.id !== product.id)].slice(0, 8));
  }

  function openDetails(product) {
    rememberProduct(product);
    trackEvent('product_open', {
      ...getConsultantAnalytics(consultant, product),
      ...getSpecialOfferAnalytics(specialOffer),
      ...getProductAnalytics(product)
    });
    setSelected(product);
  }

  function toggleFavorite(product) {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) {
        trackEvent('favorite', {
          ...getConsultantAnalytics(consultant, product),
          action: 'remove',
          ...getProductAnalytics(product)
        });
        return current.filter((item) => item.id !== product.id);
      }

      trackEvent('favorite', {
        ...getConsultantAnalytics(consultant, product),
        action: 'add',
        ...getProductAnalytics(product)
      });

      return [product, ...current].slice(0, 12);
    });
  }

  function addToCart(product, quantity = 1) {
    const qty = Math.max(1, Number(quantity || 1));
    trackEvent('add_to_cart', {
      ...getConsultantAnalytics(consultant, product),
      quantity: qty,
      total: Number(product.price || 0) * qty,
      ...getProductAnalytics(product)
    });
    rememberProduct(product);
    setAddedMap((current) => ({ ...current, [product.id]: (current[product.id] || 0) + qty }));
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + qty } : item));
      }
      return [...current, { ...product, qty }];
    });
    setCartOpen(true);
    setCardQty((current) => ({ ...current, [product.id]: 1 }));
  }

  function changeQty(id, nextQty) {
    const qty = Math.max(1, Number(nextQty || 1));
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty } : item)));
  }

  function removeItem(id) {
    const item = cartItems.find((cartItem) => cartItem.id === id);
    if (item) {
      trackEvent('remove_from_cart', {
        ...getConsultantAnalytics(consultant, item),
        ...getSpecialOfferAnalytics(specialOffer),
        quantity: item.qty || 1,
        total: Number(item.price || 0) * Number(item.qty || 1),
        ...getProductAnalytics(item)
      });
    }
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function clearCart() {
    if (cartItems.length) {
      trackEvent('clear_cart', {
        ...getConsultantAnalytics(consultant),
        ...getSpecialOfferAnalytics(specialOffer),
        itemsCount: cartCount,
        cartTotal: subtotal,
        quantity: cartCount,
        total: subtotal
      });
    }
    setCart([]);
  }

  function requestNoResultLead() {
    const term = query.trim();
    if (!term || !consultant.phone) return;

    trackEvent('busca_sem_resultado_lead', {
      ...getConsultantAnalytics(consultant),
      ...getSpecialOfferAnalytics(specialOffer),
      query: term,
      resultType: fallbackSuggestions.length ? 'suggestions' : 'empty',
      suggestions: fallbackSuggestions.length,
      page: window.location.pathname + window.location.search
    });

    openWhatsapp(consultant.phone, buildNoResultLeadMessage(term, consultant, companyName));
  }

  function finishWhatsApp() {
    if (!cartItems.length) return;
    const products = cartItems.map((item) => ({
      productCode: item.code || '',
      productName: item.name || '',
      brand: item.displayBrand || item.brand || '',
      quantity: Number(item.qty || 1),
      price: Number(item.price || 0),
      total: Number(item.price || 0) * Number(item.qty || 1)
    }));

    trackEvent('whatsapp_quote', {
      ...getConsultantAnalytics(consultant),
      ...getSpecialOfferAnalytics(specialOffer),
      itemsCount: cartCount,
      cartTotal: subtotal,
      products,
      quantity: cartCount,
      total: subtotal,
      displayedPrice: subtotal,
      displayedPriceLabel: money(subtotal),
      productCode: cartItems.map((item) => item.code).filter(Boolean).join(', '),
      productName: cartItems.map((item) => `${item.qty || 1}x ${item.code || ''} ${item.name || ''} - ${item.priceLabel || money(item.price)}`.trim()).join(' | ')
    });
    openWhatsapp(consultant.phone, buildWhatsAppMessage(cartItems, consultant, subtotal, companyName));
  }

  return (
    <>
    <div className={catalogLocked ? 'app-shell catalog-locked' : 'app-shell'} aria-hidden={catalogLocked ? 'true' : undefined}>
      <header className="topbar topbar-v5">
        <button type="button" className="logo-block" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo-z-automotiva.png" alt="Z Automotiva" className="brand-logo" />
          <span className="logo-copy">
            <strong>Z Connect</strong>
            <small>Catálogo B2B</small>
          </span>
        </button>

        <button type="button" className="header-search-trigger" onClick={scrollToCatalog}>
          <span>⌕</span>
          <strong>Buscar código, veículo, aplicação ou descrição</strong>
        </button>

        <div className="header-side">
          <div className="company-pill">
            <span>{specialOffer?.active ? `Condição especial para ${companyName}` : companyName ? `É muito bom ter você aqui, ${companyName}` : 'Acesso sem identificação'}</span>
            <button type="button" onClick={changeCompany} disabled={specialOffer?.active}>{specialOffer?.active ? 'Link especial' : companyName ? 'Trocar empresa' : 'Informar empresa'}</button>
          </div>

          <button type="button" className="consultant-pill" onClick={() => openWhatsapp(consultant.phone)}>
            <span className={online ? 'status-dot online' : 'status-dot offline'} />
            <span>
              <small>{online ? 'Online agora' : 'Offline agora'}</small>
              <strong>Falar com {consultant.name}</strong>
            </span>
          </button>

          <button type="button" className="cart-pill" onClick={() => {
            setCartOpen(true);
            scrollToCatalog();
          }}>
            <small>Pedido</small>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      <section className="hero-panel hero-panel-v5">
        <div className="hero-copy">
          <span className="eyebrow">Linha de colisão</span>
          <h1>Catálogo premium para distribuidores e autopeças.</h1>
          <p>Encontre acessórios, faróis, grades e para-choques em segundos. Monte o pedido e finalize com o consultor pelo WhatsApp.</p>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={scrollToCatalog}>Buscar peças agora</button>
            <button type="button" className="ghost-button" onClick={() => openWhatsapp(consultant.phone)}>
              Falar com {consultant.name}
            </button>
          </div>
        </div>

        <div className="hero-art hero-art-photo" aria-hidden="true">
          <img src="/hero-collision-premium.webp" alt="" loading="eager" decoding="async" />
          <span className="hero-art-shine" />
          <span className="hero-art-red-glow" />
        </div>
      </section>

      <SpecialOfferBanner offer={specialOffer} consultant={consultant} />

      {showCompanyIdentificationBanner ? (
        <CompanyIdentificationBanner
          onIdentify={openCompanyIdentificationFromBanner}
          onClose={hideCompanyIdentificationBanner}
        />
      ) : null}

      <section className="search-panel" id="catalogo">
        <div className="search-head">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2>Encontre a peça certa</h2>
          </div>
        </div>

        <div className="search-box" ref={searchBoxRef}>
          <input
            ref={searchInputRef}
            autoFocus={!catalogLocked}
            value={query}
            onFocus={() => setSuggestionsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestionsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setSuggestionsOpen(false);
                searchInputRef.current?.blur();
              }

              if (event.key === 'Escape') {
                setSuggestionsOpen(false);
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Ex: Gol G5, Farol Onix, Parachoque Corolla, 459306"
          />
          {!!query.trim() && (
            <button type="button" className="ghost-button clear-search" onClick={() => {
              setQuery('');
              setSuggestionsOpen(false);
            }}>Limpar</button>
          )}

          {!!suggestions.length && (
            <div className="suggestions">
              {suggestions.map((product) => (
                <button key={product.id} type="button" className="suggestion-item" onClick={() => {
                  setSuggestionsOpen(false);
                  openDetails(product);
                }}>
                  <div>
                    <strong>{product.code}{product.fabCode ? ` / ${product.fabCode}` : ''}</strong>
                    <span>{product.name}</span>
                  </div>
                  <small>{product.priceLabel || money(product.price)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="filters">
          {BRANDS.map((brand) => (
            <button key={brand} type="button" className={filter === brand ? 'filter-button active' : 'filter-button'} onClick={() => setFilter(brand)}>
              <strong>{brand}</strong>
              <span>{brandCounts[brand] || 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="utility-row">
        <CompactRail title="Favoritos" items={favoriteProducts.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
        <CompactRail title="Vistos recentemente" items={recentProducts.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
        <CompactRail title="Mais adicionados" items={mostAdded.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
      </section>

      {loadError ? <div className="message-box">{loadError}</div> : null}

      <section className="catalog-layout">
        <main>
          {loading ? <div className="empty-box">Carregando catálogo...</div> : null}
          {!loading && !paginatedProducts.length && !fallbackSuggestions.length ? (
            <div className="empty-box no-result-lead-box">
              <strong>Nenhum produto encontrado.</strong>
              {hasQuery ? (
                <>
                  <span>Não encontrou o item que procurava?</span>
                  <button type="button" className="primary-button small-button" onClick={requestNoResultLead}>
                    Solicitar ao consultor
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {!loading && hasQuery && !allFilteredProducts.length && fallbackSuggestions.length ? (
            <section className="commercial-suggestions-block">
              <div className="commercial-search-banner">
                <div>
                  <strong>NÃO TEMOS ESTE ITEM NO MOMENTO, MAS VOCÊ PODE PRECISAR DE</strong>
                  <span>Sugestões do mesmo veículo e de famílias comerciais relacionadas.</span>
                </div>
                <button type="button" className="ghost-button small-button" onClick={requestNoResultLead}>
                  Solicitar ao consultor
                </button>
              </div>

              <div className="catalog-grid suggestion-grid">
                {fallbackSuggestions.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favoriteIds={favoriteIds}
                    qty={cardQty[product.id] || 1}
                    onQtyChange={(qty) => setCardQty((current) => ({ ...current, [product.id]: qty }))}
                    onOpen={openDetails}
                    onAdd={addToCart}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="catalog-grid">
            {!loading && paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                favoriteIds={favoriteIds}
                qty={cardQty[product.id] || 1}
                onQtyChange={(qty) => setCardQty((current) => ({ ...current, [product.id]: qty }))}
                onOpen={openDetails}
                onAdd={addToCart}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {allFilteredProducts.length ? (
            <div className="pagination-shell">
            <span>Mostrando {paginatedProducts.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + paginatedProducts.length} de {allFilteredProducts.length} produtos</span>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          ) : null}
        </main>

        <aside className={cartOpen ? 'cart cart-open' : 'cart'}>
          <div className="cart-head">
            <div>
              <small>Pedido atual</small>
              <strong>{cartCount} itens</strong>
            </div>
            <div className="cart-head-actions">
              <button type="button" className="ghost-button small-button cart-close" onClick={() => setCartOpen(false)}>Fechar</button>
              <button type="button" className="ghost-button small-button" onClick={clearCart}>Limpar</button>
            </div>
          </div>

          <div className="cart-list">
            {!cartItems.length ? (
              <div className="empty-box compact">Adicione produtos para montar o pedido.</div>
            ) : (
              cartItems.map((item) => (
                <article key={item.id} className="cart-item">
                  <div className="cart-copy">
                    <strong>{item.code}{item.fabCode ? ` / ${item.fabCode}` : ''}</strong>
                    <span>{item.name}</span>
                    <small>{item.priceLabel || money(item.price)}</small>
                  </div>

                  <div className="cart-actions-line">
                    <QuantityStepper compact value={item.qty} onChange={(qty) => changeQty(item.id, qty)} />
                    <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remover</button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="subtotal">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <small>Preço exibido com IPI incluso e vindo da atualização do catálogo.</small>
            {cartItems.length ? <div className="cart-ready-status">✔ Pronto para orçamento</div> : null}
            <button type="button" className="primary-button" disabled={!cartItems.length || !consultant.phone} onClick={finishWhatsApp}>
              Finalizar no WhatsApp
            </button>
          </div>
        </aside>
      </section>

      <button type="button" className="mobile-cart-toggle" onClick={() => setCartOpen(true)}>
        <span>Pedido</span>
        <strong>{cartCount}</strong>
        <small>{money(subtotal)}</small>
      </button>

      {selectedProduct ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)}>×</button>

            <div className="modal-media">
              <span className="chip modal-chip">{selectedProduct.displayBrand}</span>
              <button
                type="button"
                className="modal-media-box modal-media-zoom"
                disabled={!selectedProduct.image}
                aria-label={selectedProduct.image ? `Ampliar imagem de ${selectedProduct.name}` : 'Produto sem imagem'}
                onClick={() => selectedProduct.image && setImageViewer({ src: selectedProduct.image, alt: selectedProduct.name, brand: selectedProduct.displayBrand })}
              >
                {selectedProduct.image ? (
                  <>
                    <img src={selectedProduct.image} alt={selectedProduct.name} loading="eager" decoding="async" />
                    <span className="modal-zoom-badge">🔍 Ampliar</span>
                  </>
                ) : <div className="no-image large">Sem imagem</div>}
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-head">
                <h3>{selectedProduct.name}</h3>
              </div>

              <PriceDisplay product={selectedProduct} variant="modal" />

              <div className="modal-stock-line">{getStockLabel(selectedProduct)}</div>

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => toggleFavorite(selectedProduct)}>
                  {favoriteIds.has(selectedProduct.id) ? 'Remover favorito' : 'Favoritar'}
                </button>
                <div className="modal-add-line">
                  <QuantityStepper compact value={cardQty[selectedProduct.id] || 1} onChange={(qty) => setCardQty((current) => ({ ...current, [selectedProduct.id]: qty }))} />
                  <button type="button" className="primary-button" onClick={() => addToCart(selectedProduct, cardQty[selectedProduct.id] || 1)}>
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="detail-grid compact">
                <div className="detail-box">
                  <span>Código</span>
                  <strong>{selectedProduct.code}</strong>
                </div>
                <div className="detail-box">
                  <span>Fab.</span>
                  <strong>{selectedProduct.fabCode || '—'}</strong>
                </div>
                <div className="detail-box">
                  <span>Marca</span>
                  <strong>{selectedProduct.manufacturer || '—'}</strong>
                </div>
                <div className="detail-box">
                  <span>Aplicação</span>
                  <strong>{selectedProduct.application || selectedProduct.vehicle || '—'}</strong>
                </div>
                <div className="detail-box">
                  <span>Estoque</span>
                  <strong>{getStockQuantity(selectedProduct) ?? 'Consultar'}</strong>
                </div>
              </div>

              <div className="related-group">
                <section className="related-block">
                  <h4>Produtos complementares</h4>
                  <div className="related-list scrollable">
                    {related.complementary.length ? related.complementary.map((product) => (
                      <button key={product.id} type="button" className="related-item" onClick={() => openDetails(product)}>
                        <strong>{product.code}</strong>
                        <span>{product.name}</span>
                      </button>
                    )) : <div className="related-empty">Sem sugestão complementar no momento.</div>}
                  </div>
                </section>

                <section className="related-block">
                  <h4>Mesmo veículo / aplicação</h4>
                  <div className="related-list scrollable related-list-tall">
                    {related.similar.length ? related.similar.map((product) => (
                      <button key={product.id} type="button" className="related-item" onClick={() => openDetails(product)}>
                        <strong>{product.code}</strong>
                        <span>{product.name}</span>
                      </button>
                    )) : <div className="related-empty">Sem outra aplicação próxima encontrada.</div>}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {imageViewer ? (
        <div className="image-viewer-backdrop" onClick={() => setImageViewer(null)}>
          <div className="image-viewer-shell" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-viewer-close" onClick={() => setImageViewer(null)}>×</button>
            <div className="image-viewer-meta">
              <span>{imageViewer.brand}</span>
              <strong>{imageViewer.alt}</strong>
            </div>
            <div className="image-viewer-stage">
              <img src={imageViewer.src} alt={imageViewer.alt} />
            </div>
          </div>
        </div>
      ) : null}

      <footer className="footer-mini footer-premium" id="rodape">
        <div className="footer-brand">
          <img src="/logo-z-automotiva.png" alt="Z Automotiva" className="footer-logo" />
          <span>
            <strong>Z Automotiva</strong>
            <small>Catálogo B2B para distribuidores e autopeças</small>
          </span>
        </div>

        <div className="footer-info">
          <span>
            <strong>Site</strong>
            <small>www.zautomotiva.com.br</small>
          </span>
          <span>
            <strong>Telefone</strong>
            <small>(47) 3305-4401</small>
          </span>
          <span>
            <strong>Pedido</strong>
            <small>Finalização via WhatsApp</small>
          </span>
        </div>
      </footer>
    </div>

    {catalogLocked ? (
      <CompanyGate
        value={companyDraft}
        error={companyError}
        minimized={companyGateMinimized}
        onChange={(value) => {
          setCompanyDraft(value);
          if (companyError) setCompanyError('');
        }}
        onClose={grantAnonymousAccess}
        onRestore={() => setCompanyGateMinimized(false)}
        onSubmit={handleCompanySubmit}
      />
    ) : null}

    {toast ? <div className="toast-notice" role="status">{toast}</div> : null}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
