import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("painel não contém chave privada nem solicita chave aos consultores", () => {
  const html = fs.readFileSync(
    new URL("../public/painel/index.html", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(html, /-----BEGIN [A-Z ]*PRIVATE KEY-----/i);
  assert.doesNotMatch(html, /OFFER_SIGNING_SECRET/i);
  assert.doesNotMatch(html, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/i);
});
