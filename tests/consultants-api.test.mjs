import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const envKeys = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV", "NODE_ENV"];
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL_ENV;
process.env.NODE_ENV = "test";

after(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const handlerModule = await import("../api/consultants.js");
const handler = handlerModule.default;

async function callApi(method, slug) {
  const req = { method, query: slug === undefined ? {} : { slug } };
  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end(body) {
      this.body = body || "";
      return this;
    }
  };

  await handler(req, res);
  let payload = null;
  if (res.body) {
    try {
      payload = JSON.parse(res.body);
    } catch {
      payload = res.body;
    }
  }
  return { status: res.statusCode, headers: res.headers, payload };
}

test("API retorna consultor ativo com desconto-base centralizado", async () => {
  const result = await callApi("GET", "huesller");
  assert.equal(result.status, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.consultant.slug, "huesller");
  assert.equal(result.payload.consultant.baseDiscount, 45);
  assert.equal(result.payload.consultant.active, true);
});

test("API resolve alias legado para o consultor canônico", async () => {
  const result = await callApi("GET", "representante");
  assert.equal(result.status, 200);
  assert.equal(result.payload.consultant.slug, "francisco");
  assert.equal(result.payload.consultant.name, "Francisco");
});

test("API rejeita consultor inexistente em vez de usar um fallback", async () => {
  const result = await callApi("GET", "consultor-inexistente");
  assert.equal(result.status, 404);
  assert.equal(result.payload.ok, false);
});

test("API de consultores rejeita métodos diferentes de GET", async () => {
  const result = await callApi("POST", "huesller");
  assert.equal(result.status, 405);
  assert.equal(result.payload.ok, false);
});

test("consulta central rejeita consultores inativos tanto por slug quanto por alias", () => {
  const source = fs.readFileSync(new URL("../api/_lib/consultantLookup.js", import.meta.url), "utf8");
  assert.match(source, /byAlias\.active !== true/);
  assert.match(source, /data\.active !== true/);
});

test("criação de oferta consulta cadastro central e assina o desconto-base", () => {
  const source = fs.readFileSync(new URL("../api/offer.js", import.meta.url), "utf8");
  assert.match(source, /resolveConsultant\(requestedSeller\)/);
  assert.match(source, /Number\(consultant\.offer_base_discount\)/);
  assert.match(source, /b: baseDiscount/);
  assert.match(source, /registerOffer\(\{ secret, seller, clientName, discount, validityDays, permanent, baseDiscount \}\)/);
});

test("validador mantém compatibilidade com tokens antigos sem campo de desconto-base", () => {
  const source = fs.readFileSync(new URL("../api/offer.js", import.meta.url), "utf8");
  assert.match(source, /payload\.b === undefined \? SELLER_POLICIES\.get\(seller\) : Number\(payload\.b\)/);
});

test("painel consulta a API central e não escolhe Gabriel como fallback", () => {
  const source = fs.readFileSync(new URL("../public/painel/index.html", import.meta.url), "utf8");
  assert.match(source, /\/api\/consultants\?slug=/);
  assert.match(source, /!consultantResponse\.ok \|\| !consultantResult\.ok \|\| !consultantResult\.consultant/);
  assert.doesNotMatch(source, /SELLERS\.gabriel|sellerId\s*=\s*'gabriel'/);
});
