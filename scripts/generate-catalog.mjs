
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'scripts', 'catalog-source.json');
const outputDir = path.join(rootDir, 'public', 'data');
const outputCatalogPath = path.join(outputDir, 'catalog.v5.json');
const outputConsultantsPath = path.join(outputDir, 'consultants.json');
const outputMetaPath = path.join(outputDir, 'meta.json');

const DEFAULT_CONFIG = {
  legacyCatalogPath: 'legacy/CatalogoPremium/catalogo-gerado/catalogo-completo.json',
  legacyConsultantsPath: 'legacy/CatalogoPremium/catalogo-gerado/assets/consultores.js',
  brands: {
    '1436': 'RETOV',
    '1438': 'RIDA',
    '1494': 'TYC',
    '1493': 'TYC',
    '1437': 'Z AUTO'
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
  'COM LEV',
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

function ensureConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
  return APPLICATION_TERMS.filter((term) => upperName.includes(term)).join(' · ');
}

function buildVehicleSignature(name, description, manufacturer) {
  return createSearchText([inferVehicle(name, manufacturer), description])
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .slice(0, 12)
    .join(' ');
}

function normalizeBrand(catalogId, config) {
  return config.brands[String(catalogId)] || 'RETOV';
}

function loadConsultants(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      huesller: { slug: 'huesller', name: 'Huesller', phone: '', policyType: 'nenhum', baseDiscount: null, targetDiscount: null }
    };
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fileContent, sandbox);

  const source = sandbox.window.Z_CONSULTORES || {};
  const result = {};

  const CONSULTANT_ALIASES = {
    ivoney: 'ney'
  };

  function resolveConsultantSlug(slug) {
    const normalizedSlug = normalizeText(slug);
    return CONSULTANT_ALIASES[normalizedSlug] || normalizedSlug;
  }

  function addConsultantAlias(slug, value, sourceKey = slug) {
    const normalizedSlug = resolveConsultantSlug(slug);
    if (!normalizedSlug) return;

    result[normalizedSlug] = {
      slug: normalizedSlug,
      name: normalizedSlug === 'ney' ? 'Ney' : cleanText(value.nome || value.id || sourceKey),
      phone: String(value.whatsapp || '').replace(/\D+/g, ''),
      policyType: value.ajusteTipo || 'nenhum',
      baseDiscount: value.descontoBaseAtual ?? null,
      targetDiscount: value.descontoDestino ?? null
    };
  }

  for (const [key, value] of Object.entries(source)) {
    addConsultantAlias(key, value, key);

    // Mantém compatibilidade sem duplicar métricas:
    // ?consultor=ivoney continua funcionando, mas entra internamente como Ney.
    if (value?.id) {
      addConsultantAlias(value.id, value, key);
    }
  }

  delete result.ivoney;

  if (result.representante && !result.francisco) {
    result.francisco = { ...result.representante, slug: 'francisco' };
  }

  if (result.francisco && !result.representante) {
    result.representante = { ...result.francisco, slug: 'representante' };
  }

  if (!result.huesller) {
    result.huesller = { slug: 'huesller', name: 'Huesller', phone: '', policyType: 'nenhum', baseDiscount: null, targetDiscount: null };
  }

  return result;
}

function sanitizeProduct(item, index, config) {
  const catalogId = String(item.catalogoId ?? '');
  const brand = normalizeBrand(catalogId, config);
  const code = cleanText(item.cod || '');
  const fabCode = cleanText(item.codFab || '');
  const name = cleanText(item.nome || item.desc || 'Produto sem nome');
  const description = cleanText(item.desc || item.nome || '');
  const manufacturer = cleanText(item.marca || '');
  const image = cleanText(item.imgSrc || '');
  const price = Number(item.precoNum || 0);
  const priceLabel = cleanText(item.preco || '');
  const vehicle = inferVehicle(name, manufacturer);
  const application = inferApplication(name);

  return {
    id: `${brand}-${code}-${fabCode || 'sem-fab'}-${index}`,
    code,
    fabCode,
    name,
    description,
    manufacturer,
    brand,
    displayBrand: brand,
    price,
    priceLabel,
    image,
    vehicle,
    application,
    search: createSearchText([code, fabCode, name, description, manufacturer, brand, vehicle, application, item.searchText || '']),
    vehicleSignature: buildVehicleSignature(name, description, manufacturer),
    catalogId,
    commercialPolicy: item.politicaComercialCatalogo ?? null,
    sourceCatalog: cleanText(item.catalogo || '')
  };
}

function dedupeProducts(items) {
  const map = new Map();

  for (const item of items) {
    if (!item.code || item.price <= 0 || !item.name) continue;

    const key = `${item.brand}|${item.code}|${item.fabCode}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    const candidateScore =
      (item.image ? 3 : 0) +
      (item.vehicle ? 2 : 0) +
      (item.application ? 1 : 0) +
      item.price;
    const existingScore =
      (existing.image ? 3 : 0) +
      (existing.vehicle ? 2 : 0) +
      (existing.application ? 1 : 0) +
      existing.price;

    if (candidateScore > existingScore) {
      map.set(key, item);
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function ensureParent(pathname) {
  fs.mkdirSync(path.dirname(pathname), { recursive: true });
}

function main() {
  const config = ensureConfig();
  const sourceCatalogPath = path.join(rootDir, config.legacyCatalogPath);
  const sourceConsultantsPath = path.join(rootDir, config.legacyConsultantsPath);

  ensureParent(outputCatalogPath);

  let normalizedProducts = [];
  let usingFallbackCatalog = false;

  if (fs.existsSync(sourceCatalogPath)) {
    const rawCatalog = JSON.parse(fs.readFileSync(sourceCatalogPath, 'utf8'));
    normalizedProducts = dedupeProducts(rawCatalog.map((item, index) => sanitizeProduct(item, index, config)));
  } else if (fs.existsSync(outputCatalogPath)) {
    usingFallbackCatalog = true;
    const existingCatalog = JSON.parse(fs.readFileSync(outputCatalogPath, 'utf8'));
    normalizedProducts = Array.isArray(existingCatalog) ? existingCatalog : existingCatalog.products || [];
  } else {
    throw new Error(`Nenhuma fonte de catálogo encontrada. Configure scripts/catalog-source.json ou mantenha public/data/catalog.v5.json.`);
  }

  const consultants = loadConsultants(sourceConsultantsPath);
  const meta = {
    generatedAt: new Date().toISOString(),
    productCount: normalizedProducts.length,
    brands: Object.entries(normalizedProducts.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')),
    source: {
      catalog: usingFallbackCatalog ? 'public/data/catalog.v5.json' : path.relative(rootDir, sourceCatalogPath),
      consultants: path.relative(rootDir, sourceConsultantsPath)
    }
  };

  fs.writeFileSync(outputCatalogPath, JSON.stringify(normalizedProducts));
  fs.writeFileSync(outputConsultantsPath, JSON.stringify(consultants, null, 2));
  fs.writeFileSync(outputMetaPath, JSON.stringify(meta, null, 2));

  console.log(`Catálogo limpo gerado com ${normalizedProducts.length} produtos.`);
}

main();
