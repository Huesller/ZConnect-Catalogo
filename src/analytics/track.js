const SCRIPT_URL = import.meta.env.VITE_ZCONNECT_ANALYTICS_URL || "https://script.google.com/macros/s/AKfycbxcISxjVLPj5mBz0oem-5FrDjL0fOf2NtX6Ry5prry2AIWce5Tsn2NwRinB2tQKMs0T/exec";
const STORAGE_KEY = "zconnect_analytics_queue_v7";
const SESSION_KEY = "zconnect_session_v7";
const MAX_QUEUE = 300;

export function getConsultantSlug() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("consultor") || "sem_consultor").toLowerCase().trim();
  if (raw === "ivoney") return "ney";
  return raw || "sem_consultor";
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "session_indisponivel";
  }
}

function readQueue() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {}
}

function compactProductList(items = []) {
  return items
    .map((item) => `${item.quantity || 1}x ${item.code || ""} ${item.name || item.description || ""}`.trim())
    .filter(Boolean)
    .join(" | ")
    .slice(0, 900);
}

function toPayload(event, data = {}) {
  const consultant = getConsultantSlug();
  const productName = data.productName || data.name || data.description || "";
  const productCode = data.productCode || data.code || data.codigo || "";
  const brand = data.brand || data.displayBrand || data.marca || "";
  const quantity = Number(data.quantity || data.quantidade || 0);
  const price = Number(data.price || data.preco || 0);
  const total = Number(data.total || (price && quantity ? price * quantity : 0));

  return {
    action: "track",
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    sessionId: getSessionId(),
    event,
    consultant,
    consultor: consultant,
    createdAt: new Date().toISOString(),
    query: String(data.query || "").trim().slice(0, 200),
    productCode: String(productCode).slice(0, 80),
    productName: String(productName || compactProductList(data.items)).slice(0, 900),
    brand: String(brand).slice(0, 80),
    price,
    quantity,
    total,
    page: window.location.href,
    userAgent: navigator.userAgent
  };
}

async function send(payload) {
  const url = `${SCRIPT_URL}?action=track`;
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(url, blob)) return true;
    } catch {}
  }

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body
    });
    return true;
  } catch {
    return false;
  }
}

export async function flushAnalyticsQueue() {
  const queue = readQueue();
  if (!queue.length) return;
  const pending = [];
  for (const item of queue) {
    const ok = await send(item);
    if (!ok) pending.push(item);
  }
  writeQueue(pending);
}

export function track(event, data = {}) {
  if (!event) return;
  const payload = toPayload(event, data);
  const queue = readQueue();
  writeQueue([...queue, payload]);
  flushAnalyticsQueue();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushAnalyticsQueue);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalyticsQueue();
  });
}
