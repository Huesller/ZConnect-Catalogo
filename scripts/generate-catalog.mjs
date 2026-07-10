import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'scripts', 'catalog-source.json');
const outputDir = path.join(rootDir, 'public', 'data');
const outputCatalogPath = path.join(outputDir, 'catalog.v5.json');
const outputConsultantsPath = path.join(outputDir, 'consultants.json');
const outputMetaPath = path.join(outputDir, 'meta.json');

const ZETTA_ORIGIN = 'https://sistema.zettabrasil.com.br';
const FETCH_TIMEOUT_MS = 30000;
const LEGACY_FALLBACK_ENV = 'ZCONNECT_ALLOW_LEGACY_FALLBACK';

const DEFAULT_OFFICIAL_SOURCES = [
  {
    brand: 'RIDA',
    catalogId: '1438',
    url: 'https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1438'
  },
  {
    brand: 'RETOV',
    catalogId: '1436',
    url: 'https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1436'
  },
  {
    brand: 'TYC',
    catalogId: '1494',
    url: 'https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1494'
  },
  {
    brand: 'TYC',
    catalogId: '1493',
    url: 'https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1493'
  },
  {
    brand: 'Z AUTO',
    catalogId: '1437',
    url: 'https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/1437'
  }
];

const DEFAULT_CONFIG = {
  officialSources: DEFAULT_OFFICIAL_SOURCES,
  commercialPolicy: 45,
  legacyFallback: {
    catalogPath: 'legacy/CatalogoPremium/catalogo-gerado/catalogo-completo.json',
    enableEnv: LEGACY_FALLBACK_ENV
  },
  legacyBrands: {
    '1436': 'RETOV',
    '1438': 'RIDA',
    '1494': 'TYC',
    '1493': 'TYC',
    '1437': 'Z AUTO'
  }
};

const DEFAULT_CONSULTANTS = {
  huesller: {
    slug: 'huesller',
    name: 'Huesller',
    phone: '554733054401',
    policyType: 'politicaDesconto',
    baseDiscount: 45,
    targetDiscount: 45
  },
  ney: {
    slug: 'ney',
    name: 'Ney',
    phone: '554733054400',
    policyType: 'politicaDesconto',
    baseDiscount: 45,
    targetDiscount: 45
  },
  francisco: {
    slug: 'francisco',
    name: 'Francisco',
    phone: '5527992747307',
    policyType: 'politicaDesconto',
    baseDiscount: 45,
    targetDiscount: 50
  },
  representante: {
    slug: 'representante',
    name: 'Francisco',
    phone: '5527992747307',
    policyType: 'politicaDesconto',
    baseDiscount: 45,
    targetDiscount: 50
  }
};

const STOPWORDS = new Set(['a', 'ao', 'aos', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'sem']);
const APPLICATION_TERMS = [
  'DIANTEIRO',
  'TRASEIRO',
  'DIREITO',
  'ESQUERDO',
  'CENTRAL',
  'SUPERIOR',
  'INFERIOR',
  'MANUAL',
  'ELETRICO',
  'PRIMER',
  'CROMADO',
  'COM LED',
  'SEM LED',
  'COM MOTOR',
  'SEM MOTOR'
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();
}

function createSearchText(parts) {
  return normalizeText(parts.filter(Boolean).join(' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function inferVehicle(name, manufacturer) {
  const cleanedName = cleanText(name);
  const manufacturerText = cleanText(manufacturer).toUpperCase();
  const index = manufacturerText ? cleanedName.indexOf(manufacturerText) : -1;

  if (index >= 0) {
    return cleanedName.slice(index).trim();
  }

  const tokens = cleanedName.split(' ');
  return tokens.slice(Math.max(0, tokens.length - 6)).join(' ');
}

function inferApplication(name) {
  const upperName = cleanText(name).toUpperCase();
  return APPLICATION_TERMS.filter((term) => upperName.includes(term)).join(' / ');
}

function buildVehicleSignature(name, description, manufacturer) {
  return createSearchText([inferVehicle(name, manufacturer), description])
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .slice(0, 12)
    .join(' ');
}

function ensureParent(pathname) {
  fs.mkdirSync(path.dirname(pathname), { recursive: true });
}

function normalizeConfig(config = {}) {
  const officialSources = Array.isArray(config.officialSources) && config.officialSources.length
    ? config.officialSources
    : DEFAULT_OFFICIAL_SOURCES;
  const legacyFallback = {
    ...DEFAULT_CONFIG.legacyFallback,
    ...(config.legacyFallback || {})
  };
  const legacyBrands = config.legacyBrands || config.brands || DEFAULT_CONFIG.legacyBrands;
  const commercialPolicy = Number(config.commercialPolicy ?? DEFAULT_CONFIG.commercialPolicy);

  return {
    ...DEFAULT_CONFIG,
    ...config,
    officialSources,
    legacyFallback,
    legacyBrands,
    commercialPolicy: Number.isFinite(commercialPolicy) ? commercialPolicy : DEFAULT_CONFIG.commercialPolicy
  };
}

function ensureConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }

  return normalizeConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
}

function getPageUrl(url, page) {
  if (page === 1) return url;

  const pageUrl = new URL(url);
  pageUrl.searchParams.set('page', String(page));
  return pageUrl.href;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'ZConnectCatalogScraper/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    const reason = error?.name === 'AbortError'
      ? `timeout apos ${FETCH_TIMEOUT_MS}ms`
      : error.message;
    throw new Error(`Falha ao acessar ${url}: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

function parseZettaPage(html, url) {
  const pagesMatch = html.match(/pages:\s*(\d+)/);
  const catalogMatch = html.match(/catalogo:\s*JSON\.parse\(decodeURIComponent\('([^']*)'\)\s*\|\|\s*null\)/s);

  if (!catalogMatch) {
    throw new Error(`JSON de catalogo nao encontrado em ${url}`);
  }

  let catalogo;
  try {
    catalogo = JSON.parse(decodeURIComponent(catalogMatch[1]));
  } catch (error) {
    throw new Error(`JSON de catalogo invalido em ${url}: ${error.message}`);
  }

  if (!catalogo || !Array.isArray(catalogo.itens)) {
    throw new Error(`Lista de itens ausente em ${url}`);
  }

  const pages = Number(pagesMatch?.[1] || 1);
  if (!Number.isFinite(pages) || pages < 1) {
    throw new Error(`Quantidade de paginas invalida em ${url}`);
  }

  return { pages, catalogo };
}

function parseCurrency(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const normalized = text
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}


function firstValidCurrencyFrom(source, keys) {
  for (const key of keys) {
    if (!source || !Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = parseCurrency(source[key]);
    if (value && value > 0) return value;
  }

  return null;
}

function parseStockQuantity(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!compact) return null;

  // Estoque do Zetta pode vir como "27,0000".
  // Para estoque, a parte decimal não representa unidades vendáveis; usamos só a parte inteira.
  let integerPart = compact;

  if (compact.includes(',')) {
    integerPart = compact.split(',')[0];
  } else if (/^-?\d+\.\d{1,4}$/.test(compact)) {
    integerPart = compact.split('.')[0];
  }

  const normalized = integerPart.replace(/\./g, '').replace(/,/g, '');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function extractStockQuantity(item) {
  const stockKeyPattern = /(estoque|saldo|quantidade|qtd|qtde|disponivel|disponível|stock|inventory)/i;
  const ignoredKeyPattern = /(valor|preco|preço|price|ipi|cod|codigo|código|fabricacao|fabricação|marca|id|pagina|page|catalogo|catálogo)/i;
  const queue = [item];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const [key, value] of Object.entries(current)) {
      if (value && typeof value === 'object') {
        queue.push(value);
        continue;
      }

      if (!stockKeyPattern.test(key) || ignoredKeyPattern.test(key)) continue;

      const quantity = parseStockQuantity(value);
      if (quantity !== null) return quantity;
    }
  }

  return null;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function absoluteZettaUrl(value) {
  const text = cleanText(value);
  if (!text) return '';

  return new URL(text, ZETTA_ORIGIN).href;
}

function productId(brand, code, fabCode, catalogId) {
  return [brand, code, fabCode || catalogId]
    .map((part) => cleanText(part).replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('-');
}

function assertProductField(value, label, context) {
  const text = cleanText(value);
  if (!text) {
    throw new Error(`${label} ausente em ${context.url} pagina ${context.page}, item ${context.index + 1}`);
  }

  return text;
}

function sanitizeZettaProduct(item, context, config) {
  const details = item?.detalhes || {};
  const code = assertProductField(details.proCodOri, 'Codigo', context);
  const name = assertProductField(item.descricao, 'Descricao', context);
  const fabCode = cleanText(details.codFabricacao || '');
  const manufacturer = cleanText(details.marca || '');
  const priceWithIpi = parseCurrency(details.valorTotal);
  const priceWithoutIpi = firstValidCurrencyFrom(details, [
    'valorSemIpi',
    'valorSemIPI',
    'valorSemIPIIncluso',
    'valorUnitarioSemIpi',
    'valorUnitarioSemIPI',
    'precoSemIpi',
    'precoSemIPI',
    'precoUnitarioSemIpi',
    'precoUnitarioSemIPI',
    'valorUnitario',
    'valor',
    'preco',
    'precoUnitario',
    'valorLiquido'
  ]) || priceWithIpi;
  const price = priceWithIpi;

  if (!priceWithIpi || priceWithIpi <= 0) {
    throw new Error(`Valor com IPI invalido para ${code} em ${context.url} pagina ${context.page}`);
  }

  const description = name;
  const vehicle = inferVehicle(name, manufacturer);
  const application = inferApplication(name);
  const commercialPolicy = config.commercialPolicy;
  const stock = extractStockQuantity(item);

  return {
    id: productId(context.brand, code, fabCode, context.catalogId),
    code,
    fabCode,
    name,
    description,
    manufacturer,
    brand: context.brand,
    displayBrand: context.brand,
    price,
    priceWithIpi,
    priceWithoutIpi,
    precoComIpi: priceWithIpi,
    precoSemIpi: priceWithoutIpi,
    priceWithIpiLabel: formatMoney(priceWithIpi),
    priceWithoutIpiLabel: priceWithoutIpi ? formatMoney(priceWithoutIpi) : '',
    precoComIpiLabel: formatMoney(priceWithIpi),
    precoSemIpiLabel: priceWithoutIpi ? formatMoney(priceWithoutIpi) : '',
    basePrice: price,
    priceBase: price,
    precoBase: price,
    precoZetta: price,
    precoCheio: price,
    priceLabel: formatMoney(price),
    basePriceLabel: formatMoney(price),
    precoBaseLabel: formatMoney(price),
    precoZettaLabel: formatMoney(price),
    precoCheioLabel: formatMoney(price),
    image: absoluteZettaUrl(item.imgMin || item.img || ''),
    imageFull: absoluteZettaUrl(item.img || item.imgMin || ''),
    vehicle,
    application,
    search: createSearchText([code, fabCode, name, description, manufacturer, context.brand, vehicle, application]),
    vehicleSignature: buildVehicleSignature(name, description, manufacturer),
    catalogId: context.catalogId,
    commercialPolicy,
    sourcePricePolicy: commercialPolicy,
    sourceCatalog: cleanText(context.catalogDescription),
    sourceUrl: context.sourceUrl,
    sourcePageUrl: context.url,
    sourcePage: context.page,
    stock,
    stockQty: stock,
    estoque: stock,
    available: stock === null ? true : stock > 0,
    inStock: stock === null ? true : stock > 0
  };
}

async function scrapeSource(source, config) {
  const firstHtml = await fetchText(source.url);
  const firstParsed = parseZettaPage(firstHtml, source.url);
  const products = [];
  const pages = firstParsed.pages;

  for (let page = 1; page <= pages; page += 1) {
    const pageUrl = getPageUrl(source.url, page);
    const parsed = page === 1
      ? firstParsed
      : parseZettaPage(await fetchText(pageUrl), pageUrl);

    parsed.catalogo.itens.forEach((item, index) => {
      products.push(sanitizeZettaProduct(item, {
        brand: source.brand,
        catalogId: String(source.catalogId),
        catalogDescription: parsed.catalogo.descricao,
        sourceUrl: source.url,
        url: pageUrl,
        page,
        index
      }, config));
    });
  }

  if (!products.length) {
    throw new Error(`Nenhum produto encontrado em ${source.url}`);
  }

  const summary = {
    brand: source.brand,
    catalogId: String(source.catalogId),
    url: source.url,
    description: firstParsed.catalogo.descricao,
    pages,
    productCount: products.length
  };

  console.log(`[Zetta] ${source.brand} ${source.catalogId}: ${products.length} produtos em ${pages} paginas.`);
  return { products, summary };
}

function dedupeProducts(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${item.brand}|${item.code}|${item.fabCode}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()].sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand, 'pt-BR');
    return brandCompare || a.name.localeCompare(b.name, 'pt-BR');
  });
}

async function scrapeOfficialZetta(config) {
  const sourceResults = [];

  for (const source of config.officialSources) {
    sourceResults.push(await scrapeSource(source, config));
  }

  const products = dedupeProducts(sourceResults.flatMap((result) => result.products));
  const summaries = sourceResults.map((result) => result.summary);
  return { products, summaries };
}

function isLegacyFallbackEnabled(config) {
  return ['1', 'true', 'yes'].includes(String(process.env[config.legacyFallback.enableEnv] || '').toLowerCase());
}

function normalizeLegacyBrand(catalogId, config) {
  return config.legacyBrands[String(catalogId)] || 'RETOV';
}

function sanitizeLegacyProduct(item, index, config) {
  const catalogId = String(item.catalogoId ?? '');
  const brand = normalizeLegacyBrand(catalogId, config);
  const code = cleanText(item.cod || '');
  const fabCode = cleanText(item.codFab || '');
  const name = cleanText(item.nome || item.desc || 'Produto sem nome');
  const description = cleanText(item.desc || item.nome || '');
  const manufacturer = cleanText(item.marca || '');
  const image = cleanText(item.imgSrc || '');
  const priceWithIpi = Number(item.precoComIpiNum || item.precoComIpi || item.precoNum || 0);
  const rawPriceWithoutIpi = Number(item.precoSemIpiNum || item.precoSemIpi || item.precoNormalNum || item.valorSemIpi || item.valorNormal || 0);
  const priceWithoutIpi = rawPriceWithoutIpi > 0 && Math.abs(rawPriceWithoutIpi - priceWithIpi) >= 0.01 ? rawPriceWithoutIpi : 0;
  const price = priceWithIpi;
  const vehicle = inferVehicle(name, manufacturer);
  const application = inferApplication(name);
  const commercialPolicy = config.commercialPolicy;

  return {
    id: productId(brand, code, fabCode || index, catalogId),
    code,
    fabCode,
    name,
    description,
    manufacturer,
    brand,
    displayBrand: brand,
    price,
    priceWithIpi,
    priceWithoutIpi,
    precoComIpi: priceWithIpi,
    precoSemIpi: priceWithoutIpi,
    priceWithIpiLabel: formatMoney(priceWithIpi),
    priceWithoutIpiLabel: priceWithoutIpi ? formatMoney(priceWithoutIpi) : '',
    precoComIpiLabel: formatMoney(priceWithIpi),
    precoSemIpiLabel: priceWithoutIpi ? formatMoney(priceWithoutIpi) : '',
    basePrice: price,
    priceBase: price,
    precoBase: price,
    precoZetta: price,
    precoCheio: price,
    priceLabel: formatMoney(price),
    basePriceLabel: formatMoney(price),
    precoBaseLabel: formatMoney(price),
    precoZettaLabel: formatMoney(price),
    precoCheioLabel: formatMoney(price),
    image,
    vehicle,
    application,
    search: createSearchText([code, fabCode, name, description, manufacturer, brand, vehicle, application, item.searchText || '']),
    vehicleSignature: buildVehicleSignature(name, description, manufacturer),
    catalogId,
    commercialPolicy,
    sourcePricePolicy: commercialPolicy,
    sourceCatalog: cleanText(item.catalogo || ''),
    sourceUrl: config.legacyFallback.catalogPath,
    available: true,
    inStock: true
  };
}

function loadExplicitLegacyFallback(config, officialError) {
  const fallbackPath = path.join(rootDir, config.legacyFallback.catalogPath);
  if (!fs.existsSync(fallbackPath)) {
    throw new Error(
      `Fonte oficial Zetta falhou: ${officialError.message}. ` +
      `Fallback legado foi habilitado por ${config.legacyFallback.enableEnv}, mas ${config.legacyFallback.catalogPath} nao existe.`
    );
  }

  const rawCatalog = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
  const products = dedupeProducts(rawCatalog.map((item, index) => sanitizeLegacyProduct(item, index, config)));
  console.warn(`[Zetta] Fallback legado explicito usado: ${config.legacyFallback.catalogPath}`);

  return {
    products,
    summaries: [],
    fallbackSource: config.legacyFallback.catalogPath,
    officialError: officialError.message
  };
}

function countByBrand(products) {
  return Object.entries(products.reduce((acc, item) => {
    acc[item.brand] = (acc[item.brand] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
}

async function main() {
  const config = ensureConfig();
  ensureParent(outputCatalogPath);

  let result;
  let fallbackUsed = false;
  let fallbackSource = null;
  let officialError = null;

  try {
    result = await scrapeOfficialZetta(config);
  } catch (error) {
    if (!isLegacyFallbackEnabled(config)) {
      throw error;
    }

    const fallback = loadExplicitLegacyFallback(config, error);
    result = { products: fallback.products, summaries: fallback.summaries };
    fallbackUsed = true;
    fallbackSource = fallback.fallbackSource;
    officialError = fallback.officialError;
  }

  if (!result.products.length) {
    throw new Error('Catalogo gerado sem produtos.');
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    productCount: result.products.length,
    brands: countByBrand(result.products),
    source: {
      type: fallbackUsed ? 'legacy-explicit-fallback' : 'zetta-official',
      fallbackUsed,
      officialLinks: result.summaries,
      legacyFallback: {
        allowedOnlyWithEnv: `${config.legacyFallback.enableEnv}=1`,
        source: fallbackSource,
        officialError
      }
    }
  };

  fs.writeFileSync(outputCatalogPath, JSON.stringify(result.products));
  fs.writeFileSync(outputConsultantsPath, JSON.stringify(DEFAULT_CONSULTANTS, null, 2));
  fs.writeFileSync(outputMetaPath, JSON.stringify(meta, null, 2));

  console.log(`[Zetta] catalog.v5.json gerado com ${result.products.length} produtos.`);
  console.log(`[Zetta] Fallback usado: ${fallbackUsed ? 'sim' : 'nao'}.`);
}

main().catch((error) => {
  console.error(`[Zetta] ${error.message}`);
  process.exit(1);
});
