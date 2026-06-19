
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const STORAGE_KEYS = {
  cart: 'zconnect:cart:v11',
  favorites: 'zconnect:favorites:v11',
  recent: 'zconnect:recent:v11',
  added: 'zconnect:added:v11'
};

const BRANDS = ['Todos', 'RETOV', 'RIDA', 'TYC', 'Z AUTO'];
const FALLBACK_CONSULTANTS = {
  huesller: { slug: 'huesller', name: 'Huesller', phone: '554733054401', policyType: 'nenhum', baseDiscount: null, targetDiscount: null },
  ney: { slug: 'ney', name: 'Ney', phone: '554733054400', policyType: 'nenhum', baseDiscount: null, targetDiscount: null },
  francisco: { slug: 'francisco', name: 'Francisco', phone: '5527992747307', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 50 },
  representante: { slug: 'representante', name: 'Francisco', phone: '5527992747307', policyType: 'politicaDesconto', baseDiscount: 45, targetDiscount: 50 }
};
const PAGE_SIZE = 25;

const ANALYTICS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec';

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

function getProductAnalytics(product = {}) {
  return {
    productCode: product.code || '',
    productName: product.name || '',
    brand: product.displayBrand || product.brand || '',
    price: product.price || 0
  };
}

function trackEvent(event, payload = {}) {
  if (!ANALYTICS_ENDPOINT || typeof window === 'undefined') return;

  const body = JSON.stringify({
    event,
    page: window.location.pathname + window.location.search,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent || '',
    sessionId: getSessionId(),
    createdAt: new Date().toISOString(),
    ...payload
  });

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      if (sent) return;
    }
  } catch {
    // Fallback below.
  }

  try {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    }).catch(() => null);
  } catch {
    return;
  }
}


const COMPLEMENT_RULES = [
  ['RETROVISOR', ['CAPA', 'PISCA', 'LANTERNA']],
  ['FAROL', ['LANTERNA', 'PISCA', 'MOLDURA']],
  ['LANTERNA', ['SOQUETE', 'FAROL', 'PISCA']],
  ['PARACHOQUE', ['ALMA', 'GRADE', 'GUIA']],
  ['GRADE', ['MOLDURA', 'SUPORTE', 'ARO']]
];


const SEARCH_SYNONYMS = new Map([
  ['parachoques', 'parachoque'],
  ['para choque', 'parachoque'],
  ['para-choque', 'parachoque'],
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

  const tokens = normalized
    .split(' ')
    .map(simplifyToken)
    .filter((token) => token.length > 1);

  return [...new Set(tokens)];
}

function compactCode(value) {
  return normalizeText(value).replace(/\s+/g, '');
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

  return {
    ...product,
    _n: normalized,
    _tokens: tokens,
    _tokenSet: tokenSet,
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
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 1;

  const queryTokens = tokenizeSearch(normalizedQuery);
  if (!queryTokens.length) return 1;

  const n = product._n || {};
  const search = product.search || product._search || '';
  const tokenSet = product._tokenSet || new Set(product._tokens || []);
  const compactQuery = compactCode(normalizedQuery);

  let score = 0;
  let matchedTokens = 0;

  if (n.code === normalizedQuery || n.codeCompact === compactQuery) score += 900;
  if (n.fabCode === normalizedQuery || n.fabCodeCompact === compactQuery) score += 760;
  if (n.codeCompact?.startsWith(compactQuery)) score += 420;
  if (n.fabCodeCompact?.startsWith(compactQuery)) score += 360;

  if (n.name?.includes(normalizedQuery)) score += 260;
  if (n.application?.includes(normalizedQuery)) score += 210;
  if (n.vehicle?.includes(normalizedQuery)) score += 190;
  if (n.manufacturer?.includes(normalizedQuery)) score += 130;
  if (search.includes(normalizedQuery)) score += 90;

  for (const token of queryTokens) {
    let tokenMatched = false;
    const singular = simplifyToken(token);

    if (tokenSet.has(token) || tokenSet.has(singular)) {
      score += 55;
      tokenMatched = true;
    }

    const fieldScore =
      tokenScore(n.code, token, 180, 90) +
      tokenScore(n.fabCode, token, 150, 80) +
      tokenScore(n.name, token, 120, 64) +
      tokenScore(n.vehicle, token, 92, 48) +
      tokenScore(n.application, token, 92, 48) +
      tokenScore(n.manufacturer, token, 65, 34);

    if (fieldScore > 0) {
      score += fieldScore;
      tokenMatched = true;
    }

    if (!tokenMatched && token.length >= 3 && search.includes(token)) {
      score += 18;
      tokenMatched = true;
    }

    if (tokenMatched) matchedTokens += 1;
  }

  if (matchedTokens === 0) return 0;

  const coverage = matchedTokens / queryTokens.length;
  if (coverage < 1) {
    score = Math.floor(score * (coverage >= 0.67 ? 0.55 : 0.25));
  } else {
    score += 220 + queryTokens.length * 20;
  }

  return score;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

function getConsultant(consultants) {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = normalizeText(params.get('consultor') || 'huesller');
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

function buildWhatsAppMessage(cart, consultant, subtotal) {
  return [
    'Pedido Z Automotiva',
    `Consultor: ${consultant.name}`,
    '',
    ...cart.flatMap((item) => [
      `${item.qty}x ${item.code}${item.fabCode ? ` / ${item.fabCode}` : ''}`,
      item.name,
      `Valor com IPI: ${item.priceLabel || money(item.price)}`,
      `Subtotal item: ${money(item.price * item.qty)}`,
      ''
    ]),
    `Itens: ${cart.reduce((total, item) => total + item.qty, 0)}`,
    `Subtotal: ${money(subtotal)}`,
    'Preço com IPI incluso'
  ].join('\n');
}

function findRelated(products, selected, addedMap) {
  if (!selected) return { complementary: [], similar: [] };

  const selectedName = normalizeText(selected.name);
  const selectedVehicle = normalizeText(selected.vehicle);
  const selectedApp = normalizeText(selected.application);
  const selectedManufacturer = normalizeText(selected.manufacturer);
  const rule = COMPLEMENT_RULES.find(([term]) => selectedName.includes(normalizeText(term)));

  const complementary = [];
  const similar = [];

  for (const product of products) {
    if (product.id === selected.id) continue;

    const vehicleMatch = selectedVehicle && normalizeText(product.vehicle).includes(selectedVehicle);
    const appMatch = selectedApp && normalizeText(product.application).includes(selectedApp);
    const manufacturerMatch = selectedManufacturer && normalizeText(product.manufacturer) === selectedManufacturer;

    if ((vehicleMatch || appMatch || manufacturerMatch) && similar.length < 10) {
      similar.push(product);
      continue;
    }

    if (rule && complementary.length < 10) {
      const [, candidates] = rule;
      if (candidates.some((term) => normalizeText(product.name).includes(normalizeText(term)))) {
        complementary.push(product);
        continue;
      }
    }

    if ((addedMap[product.id] || 0) > 0 && complementary.length < 10) {
      complementary.push(product);
    }
  }

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
                    <button type="button" className="icon-button" onClick={() => onToggleFavorite(product)}>
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

function ProductCard({ product, favoriteIds, qty, onQtyChange, onOpen, onAdd, onToggleFavorite }) {
  return (
    <article className="product-card">
      <button type="button" className="favorite-toggle" onClick={() => onToggleFavorite(product)}>
        {favoriteIds.has(product.id) ? '★' : '☆'}
      </button>

      <button type="button" className="product-main" onClick={() => onOpen(product)}>
        <div className="product-thumb">
          <span className="chip thumb-chip">{product.displayBrand}</span>
          {product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <span className="no-image">Sem imagem</span>}
        </div>

        <div className="product-copy">
          <h3>{product.name}</h3>
          <p>{product.code}{product.fabCode ? ` / ${product.fabCode}` : ''}</p>
        </div>
      </button>

      <div className="price-row">
        <span>Valor com IPI</span>
        <strong>{product.priceLabel || money(product.price)}</strong>
      </div>

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

function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [products, setProducts] = useState([]);
  const [consultants, setConsultants] = useState(FALLBACK_CONSULTANTS);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef(null);
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
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected || imageViewer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selected, imageViewer]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const consultant = useMemo(() => getConsultant(consultants), [consultants]);
  const online = useMemo(() => getBusinessStatus(), []);
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);

  const rankedProducts = useMemo(() => {
    return products
      .filter((product) => filter === 'Todos' || product.brand === filter)
      .map((product) => ({ product, score: scoreProduct(product, deferredQuery) }))
      .filter(({ score }) => !deferredQuery.trim() || score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.product.name.localeCompare(b.product.name, 'pt-BR');
      });
  }, [deferredQuery, filter, products]);

  const allFilteredProducts = useMemo(() => rankedProducts.map(({ product }) => product), [rankedProducts]);
  const suggestions = useMemo(() => (
    suggestionsOpen && deferredQuery.trim() ? allFilteredProducts.slice(0, 6) : []
  ), [allFilteredProducts, deferredQuery, suggestionsOpen]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(allFilteredProducts.length / PAGE_SIZE)), [allFilteredProducts.length]);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allFilteredProducts.slice(start, start + PAGE_SIZE);
  }, [allFilteredProducts, page]);

  const mostAdded = useMemo(() => {
    return [...products]
      .sort((a, b) => (addedMap[b.id] || 0) - (addedMap[a.id] || 0))
      .filter((product) => (addedMap[product.id] || 0) > 0)
      .slice(0, 6);
  }, [addedMap, products]);

  const brandCounts = useMemo(() => {
    const counts = { Todos: products.length, RETOV: 0, RIDA: 0, TYC: 0, 'Z AUTO': 0 };
    for (const product of products) {
      counts[product.brand] = (counts[product.brand] || 0) + 1;
    }
    return counts;
  }, [products]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.qty, 0), [cart]);
  const related = useMemo(() => (selected ? findRelated(products, selected, addedMap) : { complementary: [], similar: [] }), [products, selected, addedMap]);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();
    if (loading || normalizedQuery.length < 2) return;

    const timeout = window.setTimeout(() => {
      trackEvent(allFilteredProducts.length ? 'search' : 'sem_resultado', {
        consultor: getCanonicalConsultantSlug(consultant),
        query: normalizedQuery,
        total: allFilteredProducts.length,
        page: window.location.pathname + window.location.search
      });
    }, 850);

    return () => window.clearTimeout(timeout);
  }, [deferredQuery, allFilteredProducts.length, consultant, loading]);

  function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToContact() {
    document.getElementById('rodape')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function rememberProduct(product) {
    setRecent((current) => [product, ...current.filter((item) => item.id !== product.id)].slice(0, 8));
  }

  function openDetails(product) {
    rememberProduct(product);
    trackEvent('view_product', {
      consultor: getCanonicalConsultantSlug(consultant),
      ...getProductAnalytics(product)
    });
    setSelected(product);
  }

  function toggleFavorite(product) {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) {
        return current.filter((item) => item.id !== product.id);
      }

      trackEvent('favorite', {
        consultor: getCanonicalConsultantSlug(consultant),
        ...getProductAnalytics(product)
      });

      return [product, ...current].slice(0, 12);
    });
  }

  function addToCart(product, quantity = 1) {
    const qty = Math.max(1, Number(quantity || 1));
    trackEvent('add_to_cart', {
      consultor: getCanonicalConsultantSlug(consultant),
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
    setCardQty((current) => ({ ...current, [product.id]: 1 }));
  }

  function changeQty(id, nextQty) {
    const qty = Math.max(1, Number(nextQty || 1));
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty } : item)));
  }

  function removeItem(id) {
    const item = cart.find((cartItem) => cartItem.id === id);
    if (item) {
      trackEvent('remove_from_cart', {
        consultor: getCanonicalConsultantSlug(consultant),
        quantity: item.qty || 1,
        total: Number(item.price || 0) * Number(item.qty || 1),
        ...getProductAnalytics(item)
      });
    }
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  function finishWhatsApp() {
    if (!cart.length) return;
    trackEvent('whatsapp_checkout', {
      consultor: getCanonicalConsultantSlug(consultant),
      quantity: cart.reduce((total, item) => total + Number(item.qty || 0), 0),
      total: subtotal,
      productCode: cart.map((item) => item.code).filter(Boolean).join(', '),
      productName: cart.map((item) => `${item.qty || 1}x ${item.code || ''} ${item.name || ''}`.trim()).join(' | ')
    });
    openWhatsapp(consultant.phone, buildWhatsAppMessage(cart, consultant, subtotal));
  }

  return (
    <div className="app-shell">
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
          <button type="button" className="consultant-pill" onClick={() => openWhatsapp(consultant.phone)}>
            <span className={online ? 'status-dot online' : 'status-dot offline'} />
            <span>
              <small>{online ? 'Online agora' : 'Offline agora'}</small>
              <strong>Falar com {consultant.name}</strong>
            </span>
          </button>

          <button type="button" className="cart-pill" onClick={scrollToCatalog}>
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

      <section className="search-panel" id="catalogo">
        <div className="search-head">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2>Encontre a peça certa</h2>
          </div>
        </div>

        <div className="search-box">
          <input
            ref={searchInputRef}
            autoFocus
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
            placeholder="Buscar por código, descrição, veículo, aplicação ou fabricante"
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
        <CompactRail title="Favoritos" items={favorites.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
        <CompactRail title="Vistos recentemente" items={recent.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
        <CompactRail title="Mais adicionados" items={mostAdded.slice(0, 4)} favorites={favoriteIds} onOpen={openDetails} onAdd={addToCart} onToggleFavorite={toggleFavorite} />
      </section>

      {loadError ? <div className="message-box">{loadError}</div> : null}

      <section className="catalog-layout">
        <main>
          {loading ? <div className="empty-box">Carregando catálogo...</div> : null}
          {!loading && !paginatedProducts.length ? <div className="empty-box">Nenhum produto encontrado.</div> : null}

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

          <div className="pagination-shell">
            <span>Mostrando {paginatedProducts.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + paginatedProducts.length} de {allFilteredProducts.length} produtos</span>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </main>

        <aside className="cart">
          <div className="cart-head">
            <div>
              <small>Pedido atual</small>
              <strong>{cartCount} itens</strong>
            </div>
            <button type="button" className="ghost-button small-button" onClick={clearCart}>Limpar</button>
          </div>

          <div className="cart-list">
            {!cart.length ? (
              <div className="empty-box compact">Adicione produtos para montar o pedido.</div>
            ) : (
              cart.map((item) => (
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
            <button type="button" className="primary-button" disabled={!cart.length || !consultant.phone} onClick={finishWhatsApp}>
              Finalizar no WhatsApp
            </button>
          </div>
        </aside>
      </section>

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)}>×</button>

            <div className="modal-media">
              <span className="chip modal-chip">{selected.displayBrand}</span>
              <button
                type="button"
                className="modal-media-box modal-media-zoom"
                disabled={!selected.image}
                aria-label={selected.image ? `Ampliar imagem de ${selected.name}` : 'Produto sem imagem'}
                onClick={() => selected.image && setImageViewer({ src: selected.image, alt: selected.name, brand: selected.displayBrand })}
              >
                {selected.image ? (
                  <>
                    <img src={selected.image} alt={selected.name} loading="eager" decoding="async" />
                    <span className="modal-zoom-badge">🔍 Ampliar</span>
                  </>
                ) : <div className="no-image large">Sem imagem</div>}
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-head">
                <h3>{selected.name}</h3>
              </div>

              <div className="modal-price">
                <span>Valor com IPI</span>
                <strong>{selected.priceLabel || money(selected.price)}</strong>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => toggleFavorite(selected)}>
                  {favoriteIds.has(selected.id) ? 'Remover favorito' : 'Favoritar'}
                </button>
                <div className="modal-add-line">
                  <QuantityStepper compact value={cardQty[selected.id] || 1} onChange={(qty) => setCardQty((current) => ({ ...current, [selected.id]: qty }))} />
                  <button type="button" className="primary-button" onClick={() => addToCart(selected, cardQty[selected.id] || 1)}>
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="detail-grid compact">
                <div className="detail-box">
                  <span>Código</span>
                  <strong>{selected.code}</strong>
                </div>
                <div className="detail-box">
                  <span>Fab.</span>
                  <strong>{selected.fabCode || '—'}</strong>
                </div>
                <div className="detail-box">
                  <span>Marca</span>
                  <strong>{selected.manufacturer || '—'}</strong>
                </div>
                <div className="detail-box">
                  <span>Aplicação</span>
                  <strong>{selected.application || selected.vehicle || '—'}</strong>
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
            <small>zautomotiva.com.br</small>
          </span>
          <span>
            <strong>Telefone</strong>
            <small>(47) 3305-4400</small>
          </span>
          <span>
            <strong>Pedido</strong>
            <small>Finalização via WhatsApp</small>
          </span>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
