import { resolveConsultant } from './_lib/consultantLookup.js';

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return send(res, 405, { ok: false, error: 'Método não permitido.' });
  }

  const slug = String(req.query?.slug || '').trim().toLowerCase();
  if (!slug || slug === 'painel') {
    return send(res, 400, { ok: false, error: 'Informe o identificador do consultor no link.' });
  }

  try {
    const consultant = await resolveConsultant(slug);
    if (!consultant) {
      return send(res, 404, { ok: false, error: 'Consultor inexistente ou inativo. Confira o link com a administração.' });
    }

    return send(res, 200, {
      ok: true,
      consultant: {
        slug: consultant.slug,
        name: consultant.display_name,
        phone: consultant.whatsapp_phone || '',
        baseDiscount: Number(consultant.offer_base_discount),
        catalogDiscountPolicy: Number(consultant.catalog_discount_policy),
        targetDiscount: Number(consultant.target_discount),
        active: consultant.active === true
      }
    });
  } catch {
    return send(res, 503, { ok: false, error: 'Não foi possível validar o consultor agora. Tente novamente mais tarde.' });
  }
}
