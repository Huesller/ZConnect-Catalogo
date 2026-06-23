const CACHE = new Map();

const SEARCH_ALIASES = {
  "para-ch":"parachoque",
  "para choque":"parachoque",
  "para-choque":"parachoque",
  "parachoq":"parachoque",
  "retr":"retrovisor",
  "retro":"retrovisor",
  "golg":"gol",
  "gold":"gol",
  "voyag":"voyage",
  "amaroc":"amarok"
};

function applyAliases(text){
  let result=text;
  Object.entries(SEARCH_ALIASES).forEach(([a,b])=>{
    result=result.replaceAll(a,b);
  });
  return result;
}


const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "sem",
  "a", "o", "as", "os", "um", "uma", "ao", "ate", "até"
]);

const YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/g;
const YEAR_RANGE_RE = /\b(19[5-9]\d|20[0-4]\d)\s*(?:a|ate|até|\/|-|~)\s*(19[5-9]\d|20[0-4]\d)\b/g;

const PRODUCT_TERMS = new Set([
  "parachoque", "farol", "lanterna", "grade", "retrovisor", "capo", "paralama",
  "radiador", "condensador", "ventoinha", "eletroventilador", "alma", "reforco",
  "guia", "suporte", "moldura", "friso", "spoiler", "milha", "pisca", "lente",
  "maquina", "fechadura", "macaneta", "reservatorio", "defletor", "painel",
  "travessa", "absorvedor", "emblema", "borracha", "motor", "bomba", "sensor",
  "coifa", "farolete", "vigia", "vidro", "porta", "carcaca"
]);

const RELATED_PREFIXES = new Set([
  "alma", "guia", "suporte", "moldura", "friso", "reforco", "travessa",
  "absorvedor", "acabamento", "aplique", "capa", "gradezinha", "spoiler"
]);

const SIDE_TERMS = new Set([
  "direito", "direita", "dir", "esquerdo", "esquerda", "esq",
  "dianteiro", "dianteira", "tras", "traseiro", "traseira", "superior", "inferior"
]);

function normalizeText(value = "") {
  return applyAliases(String(value || ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bpara\s+choque\b/g, "parachoque")
    .replace(/\bparachoques\b/g, "parachoque")
    .replace(/\bp\/choque\b/g, "parachoque")
    .replace(/\breforço\b/g, "reforco")
    .replace(/\besq\.?\b/g, "esquerdo")
    .replace(/\bdir\.?\b/g, "direito")
    .replace(/[^\w\s/-]/g, " ")
    .replace(/[_/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singular(token) {
  if (/^\d+$/.test(token)) return token;
  if (token.length > 4 && token.endsWith("oes")) return token.slice(0, -3) + "ao";
  if (token.length > 4 && token.endsWith("ais")) return token.slice(0, -3) + "al";
  if (token.length > 3 && token.endsWith("is")) return token.slice(0, -2) + "il";
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .map(singular)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function extractYears(value) {
  const text = normalizeText(value);
  const years = new Set();

  text.replace(YEAR_RANGE_RE, (_, startRaw, endRaw) => {
    const start = Number(startRaw);
    const end = Number(endRaw);
    const min = Math.min(start, end);
    const max = Math.max(start, end);

    if (max - min <= 35) {
      for (let year = min; year <= max; year += 1) years.add(String(year));
    }

    return "";
  });

  const matches = text.match(YEAR_RE) || [];
  for (const year of matches) years.add(year);

  return years;
}

function buildField(value) {
  const normalized = normalizeText(value);
  const tokens = tokenize(normalized);
  return {
    raw: String(value || ""),
    text: normalized,
    tokens,
    tokenSet: new Set(tokens),
    years: extractYears(normalized)
  };
}

function tokenMatchesField(field, token) {
  if (!field || !token) return false;

  if (/^\d{4}$/.test(token)) {
    return field.years.has(token) || field.tokenSet.has(token);
  }

  if (field.tokenSet.has(token)) return true;

  // Prefixo de palavra: "parach" encontra "parachoque"; "hb2" encontra "hb20".
  return field.tokens.some(fieldToken => fieldToken.startsWith(token));
}

function tokenPosition(field, token) {
  if (!field || !token) return 9999;

  const index = field.tokens.findIndex(fieldToken => {
    if (/^\d{4}$/.test(token)) return fieldToken === token || field.years.has(token);
    return fieldToken === token || fieldToken.startsWith(token);
  });

  return index === -1 ? 9999 : index;
}

function allTokensMatch(field, tokens) {
  return tokens.every(token => tokenMatchesField(field, token));
}

function countMatches(field, tokens) {
  let count = 0;
  for (const token of tokens) {
    if (tokenMatchesField(field, token)) count += 1;
  }
  return count;
}

function orderedDistance(field, tokens) {
  let last = -1;
  let distance = 0;

  for (const token of tokens) {
    const pos = tokenPosition(field, token);
    if (pos === 9999) return 9999;
    if (last >= 0) distance += Math.max(0, pos - last - 1);
    last = pos;
  }

  return distance;
}

function fieldScore(field, tokens, weights) {
  if (!field || !tokens.length) return 0;

  const normalizedQuery = tokens.join(" ");
  const exactPhrase = field.text.includes(normalizedQuery);
  const allMatch = allTokensMatch(field, tokens);
  const matched = countMatches(field, tokens);

  if (!matched) return 0;

  let score = 0;

  if (exactPhrase) score += weights.phrase;
  if (allMatch) score += weights.all;
  score += matched * weights.token;

  const firstPosition = Math.min(...tokens.map(token => tokenPosition(field, token)));
  if (firstPosition === 0) score += weights.starts;
  if (firstPosition <= 2) score += weights.early;

  const distance = orderedDistance(field, tokens);
  if (distance !== 9999) score += Math.max(0, weights.order - distance * 5);

  return score;
}

function isCodeQuery(tokens) {
  return tokens.length === 1 && /^[a-z0-9-]{3,}$/i.test(tokens[0]);
}

function analyzeQuery(tokens) {
  const years = tokens.filter(token => /^\d{4}$/.test(token));
  const products = tokens.filter(token => PRODUCT_TERMS.has(token));
  const sides = tokens.filter(token => SIDE_TERMS.has(token));
  const vehicles = tokens.filter(token => !/^\d{4}$/.test(token) && !PRODUCT_TERMS.has(token) && !SIDE_TERMS.has(token));

  return {
    tokens,
    years,
    products,
    sides,
    vehicles,
    product: products[0] || "",
    hasContext: products.length > 0 && vehicles.length > 0
  };
}

function searchableText(product) {
  return [
    product.code,
    product.fabCode,
    product.name,
    product.description,
    product.vehicle,
    product.application,
    product.manufacturer,
    product.brand,
    product.displayBrand,
    product.search
  ].filter(Boolean).join(" ");
}

export function buildSearchIndex(products) {
  CACHE.clear();

  return products.map((product, position) => {
    const code = buildField(`${product.code || ""} ${product.fabCode || ""}`);
    const name = buildField(`${product.name || ""} ${product.description || ""}`);
    const vehicle = buildField(product.vehicle || "");
    const application = buildField(product.application || "");
    const manufacturer = buildField(product.manufacturer || "");
    const brand = buildField(`${product.brand || ""} ${product.displayBrand || ""}`);
    const searchable = buildField(searchableText(product));

    return {
      product,
      position,
      code,
      name,
      vehicle,
      application,
      manufacturer,
      brand,
      searchable
    };
  });
}

function isMainCommercialResult(item, analysis) {
  if (!analysis.product) return true;

  const productPosition = tokenPosition(item.name, analysis.product);

  // Ex.: "Parachoque HB20", "Parachoque Dianteiro HB20"
  if (productPosition === 0) return true;

  // Ex.: "Farol Auxiliar Onix", "Grade Superior Gol"
  if (productPosition === 1 && SIDE_TERMS.has(item.name.tokens[0])) return true;

  // Ex.: "Parachoque Dianteiro HB20" com pequenas variações no começo.
  if (productPosition <= 2) {
    const before = item.name.tokens.slice(0, productPosition);
    if (before.every(token => SIDE_TERMS.has(token))) return true;
  }

  // Ex.: "Alma Parachoque HB20", "Guia Parachoque HB20" são relacionados, não principais.
  if (productPosition > 0 && RELATED_PREFIXES.has(item.name.tokens[0])) return false;

  return false;
}

function baseScore(item, tokens, normalizedQuery) {
  let score = 0;

  score += fieldScore(item.code, tokens, {
    phrase: 9000,
    all: 6000,
    token: 1200,
    starts: 1800,
    early: 900,
    order: 700
  });

  score += fieldScore(item.name, tokens, {
    phrase: 7000,
    all: 4500,
    token: 850,
    starts: 2400,
    early: 1200,
    order: 900
  });

  score += fieldScore(item.vehicle, tokens, {
    phrase: 1800,
    all: 1200,
    token: 420,
    starts: 350,
    early: 220,
    order: 260
  });

  score += fieldScore(item.application, tokens, {
    phrase: 1600,
    all: 1000,
    token: 340,
    starts: 300,
    early: 180,
    order: 220
  });

  score += fieldScore(item.manufacturer, tokens, {
    phrase: 700,
    all: 430,
    token: 150,
    starts: 120,
    early: 80,
    order: 90
  });

  score += fieldScore(item.brand, tokens, {
    phrase: 750,
    all: 460,
    token: 170,
    starts: 120,
    early: 80,
    order: 90
  });

  if (item.name.text.startsWith(normalizedQuery)) score += 6000;

  for (const token of tokens) {
    if (/^\d{4}$/.test(token) && item.searchable.years.has(token)) score += 2000;
  }

  return score;
}

function calculateScore(item, tokens, normalizedQuery, analysis) {
  // Código sempre ganha, mesmo com busca parcial.
  if (isCodeQuery(tokens)) {
    const codeToken = tokens[0];
    if (item.code.text === codeToken) return { score: 100000, group: "code" };
    if (item.code.tokens.some(token => token.startsWith(codeToken))) return { score: 90000, group: "code" };
  }

  const multiToken = tokens.length > 1;
  const searchMatchesAll = allTokensMatch(item.searchable, tokens);

  // Regra comercial V10:
  // com mais de uma palavra, todos os termos precisam existir no produto/aplicação/veículo.
  // Isso impede "parachoque hb20" de trazer "parachoque corolla".
  if (multiToken && !searchMatchesAll) return { score: 0, group: "none" };

  // Se digitou produto + veículo, exige os dois no texto pesquisável.
  if (analysis.hasContext) {
    const productOk = analysis.products.every(token => tokenMatchesField(item.searchable, token));
    const vehicleOk = analysis.vehicles.every(token => tokenMatchesField(item.searchable, token));
    const yearsOk = analysis.years.every(token => tokenMatchesField(item.searchable, token));
    if (!productOk || !vehicleOk || !yearsOk) return { score: 0, group: "none" };
  }

  // Evita resultado que só bate em campos secundários quando a busca tem contexto.
  if (multiToken && countMatches(item.name, tokens) === 0 && countMatches(item.application, tokens) === 0) {
    return { score: 0, group: "none" };
  }

  let score = baseScore(item, tokens, normalizedQuery);
  if (!score) return { score: 0, group: "none" };

  const main = isMainCommercialResult(item, analysis);

  if (analysis.hasContext) {
    if (main) {
      score += 30000;
      if (item.name.text.startsWith(analysis.product)) score += 12000;
      return { score, group: "main" };
    }

    // Relacionados do mesmo produto + veículo ficam disponíveis,
    // mas só aparecem junto dos principais ou no bloco "você pode precisar".
    score += 9000;
    return { score, group: "related" };
  }

  return { score, group: "general" };
}

function rankResults(items) {
  return items.sort((a, b) =>
    (b._score - a._score) ||
    (a._groupOrder - b._groupOrder) ||
    (a._position - b._position)
  );
}

export function searchProductsDetailed(index, query, options = {}) {
  const limit = options.limit || 80;
  const normalized = normalizeText(query);
  if (!normalized) {
    return { results: [], main: [], related: [], noMain: false, query: "", mode: "empty" };
  }

  const tokens = tokenize(normalized);
  if (!tokens.length) {
    return { results: [], main: [], related: [], noMain: false, query: normalized, mode: "empty" };
  }

  const cacheKey = `detailed:${normalized}:${limit}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  const analysis = analyzeQuery(tokens);
  const main = [];
  const related = [];
  const general = [];

  for (const item of index) {
    const result = calculateScore(item, tokens, normalized, analysis);
    if (result.score <= 0) continue;

    const row = {
      ...item.product,
      _score: result.score,
      _position: item.position,
      _searchGroup: result.group,
      _groupOrder: result.group === "main" || result.group === "code" ? 0 : result.group === "related" ? 1 : 2
    };

    if (result.group === "main" || result.group === "code") main.push(row);
    else if (result.group === "related") related.push(row);
    else general.push(row);
  }

  rankResults(main);
  rankResults(related);
  rankResults(general);

  let results;
  let mode;
  let noMain = false;

  if (analysis.hasContext) {
    if (main.length) {
      results = [...main, ...related];
      mode = related.length ? "main_with_related" : "main";
    } else {
      results = related;
      noMain = related.length > 0;
      mode = noMain ? "related_only" : "none";
    }
  } else {
    results = [...main, ...general, ...related];
    mode = results.length ? "general" : "none";
  }

  const response = {
    results: results.slice(0, limit),
    main: main.slice(0, limit),
    related: related.slice(0, limit),
    noMain,
    query: normalized,
    originalQuery: query,
    tokens,
    analysis,
    mode
  };

  CACHE.set(cacheKey, response);
  return response;
}

export function searchProducts(index, query, options = {}) {
  return searchProductsDetailed(index, query, options).results;
}
