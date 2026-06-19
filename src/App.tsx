
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { buildSearchIndex, searchProducts, searchProductsDetailed } from "./utils/search.js";
import { getConsultantSlug, track } from "./analytics/track.js";

const BRANDS = ["Todos", "RETOV", "RIDA", "TYC", "Z AUTO"];
const PAGE_SIZE = 36;

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function productTitle(product) {
  return product.name || product.description || "Produto sem descrição";
}

function loadJSON(url) {
  return fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Falha ao carregar ${url}`);
    return r.json();
  });
}

function getProductKey(product) {
  return product.id || `${product.brand || ""}-${product.code || ""}-${product.fabCode || ""}`;
}

function Header({ consultant, cartCount, onCart }) {
  return (
    <header className="topbar">
      <div className="logo-block">
        <img className="brand-logo" src="/logo-z-automotiva.png" alt="Z Automotiva" />
        <span className="logo-copy">
          <strong>Z Connect Catálogo Premium</strong>
          <small>Alta performance B2B</small>
        </span>
      </div>
      <nav className="topnav">
        <a className="nav-link active" href="#catalogo">Catálogo</a>
        <a className="nav-link" href="#mais-adicionados">Mais adicionados</a>
        <a className="nav-link" href="#favoritos">Favoritos</a>
      </nav>
      <div className="header-side">
        <span className="consultant-compact">
          <strong>{consultant}</strong>
          <small className="status online">online</small>
        </span>
        <button className="primary-button compact-button" onClick={onCart}>
          Carrinho ({cartCount})
        </button>
      </div>
    </header>
  );
}

function SearchBox({ query, setQuery, onSubmit, suggestions, showSuggestions, setShowSuggestions }) {
  const boxRef = useRef(null);

  useEffect(() => {
    function close(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [setShowSuggestions]);

  return (
    <section className="search-panel" id="catalogo" ref={boxRef}>
      <div className="search-head">
        <span className="eyebrow">Busca inteligente V7</span>
        <h2>Encontre por código, descrição, veículo, aplicação ou fabricante.</h2>
        <p>Suporta acentuação, plural, palavras parciais e ordem diferente. Ex.: “gol grade”.</p>
      </div>

      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          setShowSuggestions(false);
          onSubmit();
        }}
      >
        <input
          value={query}
          placeholder="Buscar peça, veículo, aplicação, fabricante ou código..."
          autoComplete="off"
          onFocus={() => query.trim() && setShowSuggestions(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowSuggestions(Boolean(event.target.value.trim()));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setShowSuggestions(false);
              event.currentTarget.blur();
            }
            if (event.key === "Escape") setShowSuggestions(false);
          }}
        />
        <button className="primary-button" type="submit">Buscar</button>
        {query && (
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setQuery("");
              setShowSuggestions(false);
            }}
          >
            Limpar
          </button>
        )}
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-list" role="listbox">
          {suggestions.map((product) => (
            <button
              type="button"
              key={getProductKey(product)}
              className="suggestion-item"
              onClick={() => {
                setQuery(productTitle(product));
                setShowSuggestions(false);
              }}
            >
              <strong>{product.code}</strong>
              <span>{productTitle(product)}</span>
              <small>{product.displayBrand || product.brand}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Filters({ brand, setBrand, total, resultTotal }) {
  return (
    <section className="filter-row">
      <div className="filter-buttons">
        {BRANDS.map((item) => (
          <button
            key={item}
            className={`filter-button ${brand === item ? "active" : ""}`}
            onClick={() => setBrand(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <span className="result-counter">
        {resultTotal} encontrados / {total} produtos
      </span>
    </section>
  );
}

function ProductCard({ product, onView, onAdd, onFavorite, isFavorite }) {
  return (
    <article className="product-card">
      <button className="favorite-button" onClick={() => onFavorite(product)} title="Favoritar">
        {isFavorite ? "★" : "☆"}
      </button>
      <div className="product-image">
        {product.image ? <img src={product.image} alt={productTitle(product)} loading="lazy" /> : <span>Sem imagem</span>}
      </div>
      <div className="product-copy">
        <small>{product.displayBrand || product.brand} • Código {product.code}</small>
        <h3>{productTitle(product)}</h3>
        <p>{product.vehicle || product.application || product.manufacturer || "Aplicação sob consulta"}</p>
      </div>
      <div className="price-row">
        <strong>{product.priceLabel || money(product.price)}</strong>
        <span>IPI incluso</span>
      </div>
      <div className="product-controls">
        <button className="primary-button" onClick={() => onAdd(product)}>+ Adicionar</button>
        <button className="ghost-button" onClick={() => onView(product)}>Detalhes</button>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose, onAdd }) {
  if (!product) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose}>×</button>
        <div className="modal-grid">
          <div className="modal-image">
            {product.image ? <img src={product.image} alt={productTitle(product)} /> : <span>Sem imagem</span>}
          </div>
          <div>
            <div className="modal-head">
              <small>{product.displayBrand || product.brand} • Código {product.code}</small>
              <h3>{productTitle(product)}</h3>
              <p>{product.vehicle || product.application || product.manufacturer || "Aplicação sob consulta"}</p>
            </div>
            <div className="modal-price">
              <strong>{product.priceLabel || money(product.price)}</strong>
              <span>Valor com IPI incluso</span>
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => onAdd(product)}>Adicionar ao pedido</button>
              <button className="ghost-button" onClick={onClose}>Voltar</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Cart({ open, items, consultants, consultant, onClose, onQty, onRemove, onCheckout }) {
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  if (!open) return null;
  return (
    <aside className="cart">
      <div className="cart-head">
        <h2>Carrinho</h2>
        <button className="icon-button" onClick={onClose}>×</button>
      </div>
      <p className="message-box">Consultor: {consultants?.[consultant]?.name || consultant}</p>
      <div className="cart-items">
        {items.length === 0 && <div className="empty-box">Nenhum item adicionado.</div>}
        {items.map((item) => (
          <div className="cart-item" key={getProductKey(item)}>
            <strong>{productTitle(item)}</strong>
            <small>{item.code} • {item.displayBrand || item.brand}</small>
            <div className="cart-controls">
              <button onClick={() => onQty(item, -1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => onQty(item, 1)}>+</button>
              <button onClick={() => onRemove(item)}>Remover</button>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>
      <button className="primary-button checkout-button" disabled={!items.length} onClick={() => onCheckout(total)}>
        Finalizar WhatsApp
      </button>
    </aside>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [consultants, setConsultants] = useState({});
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [brand, setBrand] = useState("Todos");
  const [page, setPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zconnect_cart_v6") || "[]"); } catch { return []; }
  });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zconnect_favorites_v6") || "[]"); } catch { return []; }
  });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zconnect_recent_v6") || "[]"); } catch { return []; }
  });
  const [error, setError] = useState("");

  const consultant = getConsultantSlug();

  useEffect(() => {
    Promise.all([loadJSON("/data/catalog.v5.json"), loadJSON("/data/consultants.json")])
      .then(([catalog, consultantData]) => {
        setProducts(Array.isArray(catalog) ? catalog : catalog.products || []);
        setConsultants(consultantData || {});
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => localStorage.setItem("zconnect_cart_v6", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("zconnect_favorites_v6", JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem("zconnect_recent_v6", JSON.stringify(recent)), [recent]);

  const index = useMemo(() => buildSearchIndex(products), [products]);

  const searchDetails = useMemo(() => {
    if (!submittedQuery) {
      return { results: products, noMain: false, mode: "all", originalQuery: "" };
    }

    return searchProductsDetailed(index, submittedQuery, { limit: 1000 });
  }, [index, products, submittedQuery]);

  const searched = useMemo(() => {
    const base = searchDetails.results || [];
    return brand === "Todos" ? base : base.filter((p) => String(p.displayBrand || p.brand || "").toUpperCase().includes(brand));
  }, [searchDetails, brand]);

  const suggestions = useMemo(() => query.trim() ? searchProducts(index, query, { limit: 8 }) : [], [index, query]);

  const paged = searched.slice(0, page * PAGE_SIZE);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function submitSearch() {
    const q = query.trim();
    setSubmittedQuery(q);
    setPage(1);
    setShowSuggestions(false);
    if (q) {
      const details = searchProductsDetailed(index, q, { limit: 20 });
      track("search", {
        query: q,
        total: details.results.length,
        resultsCount: details.results.length,
        searchMode: details.mode,
        noMain: details.noMain
      });
      if (!details.results.length) track("sem_resultado", { query: q });
      if (details.noMain) track("search_related_only", { query: q, resultsCount: details.results.length });
    }
  }

  function viewProduct(product) {
    setSelected(product);
    setRecent((items) => [getProductKey(product), ...items.filter((id) => id !== getProductKey(product))].slice(0, 20));
    track("view_product", product);
  }

  function addToCart(product) {
    setCart((items) => {
      const key = getProductKey(product);
      const exists = items.find((item) => getProductKey(item) === key);
      if (exists) return items.map((item) => getProductKey(item) === key ? { ...item, quantity: item.quantity + 1 } : item);
      return [...items, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
    track("add_to_cart", { ...product, quantity: 1, total: Number(product.price || 0) });
  }

  function toggleFavorite(product) {
    const key = getProductKey(product);
    setFavorites((items) => items.includes(key) ? items.filter((id) => id !== key) : [...items, key]);
    track("favorite", product);
  }

  function qty(item, delta) {
    setCart((items) => items.map((p) => getProductKey(p) === getProductKey(item) ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
  }

  function remove(item) {
    setCart((items) => items.filter((p) => getProductKey(p) !== getProductKey(item)));
  }

  function checkout(total) {
    const consultantData = consultants?.[consultant] || consultants?.representante || {};
    const phone = consultantData.phone || "554733054400";
    const lines = cart.map((item) => `• ${item.quantity}x ${productTitle(item)} | Cód. ${item.code} | ${money(item.price)}`).join("%0A");
    const text = `Olá, segue pedido pelo Z Connect:%0A%0A${lines}%0A%0ATotal: ${money(total)}%0AConsultor: ${consultant}`;
    track("whatsapp_checkout", { productName: cart.map(productTitle).join(" | "), items: cart, quantity: cartCount, total });
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app-shell">
      <Header consultant={consultant} cartCount={cartCount} onCart={() => setCartOpen(true)} />

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Z Automotiva</span>
          <h1>Catálogo Premium com busca rápida e pedido via WhatsApp.</h1>
          <p>Consulte milhares de produtos por código, descrição, aplicação, veículo e fabricante.</p>
        </div>
        <div className="hero-thumbs">
          <div className="hero-thumb-mini"><img src="/hero-grade.svg" alt="" /></div>
          <div className="hero-thumb-mini"><img src="/hero-farol.svg" alt="" /></div>
          <div className="hero-thumb-mini"><img src="/hero-parachoque.svg" alt="" /></div>
        </div>
      </section>

      <SearchBox
        query={query}
        setQuery={setQuery}
        onSubmit={submitSearch}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
      />

      <Filters brand={brand} setBrand={(value) => { setBrand(value); setPage(1); }} total={products.length} resultTotal={searched.length} />

      {error && <div className="message-box">{error}</div>}
      {submittedQuery && searchDetails.noMain && searched.length > 0 && (
        <div className="commercial-search-banner">
          <strong>Não encontramos “{submittedQuery}” no momento.</strong>
          <span>Mas você pode precisar de:</span>
        </div>
      )}
      {submittedQuery && searched.length === 0 && <div className="empty-box">Nenhum resultado para “{submittedQuery}”.</div>}

      <section className="compact-rail">
        <strong>Vistos recentemente</strong>
        <span>{recent.length ? `${recent.length} produtos` : "Nenhum produto visto ainda"}</span>
        <strong id="favoritos">Favoritos</strong>
        <span>{favorites.length ? `${favorites.length} produtos` : "Nenhum favorito ainda"}</span>
      </section>

      <main className="product-grid">
        {paged.map((product) => (
          <ProductCard
            key={getProductKey(product)}
            product={product}
            onView={viewProduct}
            onAdd={addToCart}
            onFavorite={toggleFavorite}
            isFavorite={favorites.includes(getProductKey(product))}
          />
        ))}
      </main>

      {paged.length < searched.length && (
        <div className="load-more">
          <button className="ghost-button" onClick={() => setPage((p) => p + 1)}>Carregar mais</button>
        </div>
      )}

      <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={addToCart} />
      <Cart
        open={cartOpen}
        items={cart}
        consultants={consultants}
        consultant={consultant}
        onClose={() => setCartOpen(false)}
        onQty={qty}
        onRemove={remove}
        onCheckout={checkout}
      />

      <footer className="footer-mini">
        <small>Z Connect V7 • analytics comercial, performance e busca inteligente.</small>
      </footer>
    </div>
  );
}
