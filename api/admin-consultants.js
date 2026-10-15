import { requireCatalogAdmin } from './_lib/supabaseAdmin.js';

const FIELDS = [
  'slug', 'display_name', 'whatsapp_phone', 'catalog_discount_policy',
  'offer_base_discount', 'target_discount', 'active', 'sort_order'
];

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return null; }
}

function normalizeInput(body) {
  const slug = String(body.slug || '').trim().toLowerCase();
  const displayName = String(body.display_name || '').trim();
  const phone = String(body.whatsapp_phone || '').replace(/\D/g, '');
  const catalogPolicy = Number(body.catalog_discount_policy);
  const baseDiscount = Number(body.offer_base_discount);
  const targetDiscount = Number(body.target_discount);
  const sortOrder = Number(body.sort_order);

  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) throw new Error('Slug inválido: use 2 a 40 caracteres, começando com letra ou número e usando apenas letras minúsculas, números ou hífen.');
  if (displayName.length < 2 || displayName.length > 80) throw new Error('Informe um nome de 2 a 80 caracteres.');
  if (phone && (phone.length < 10 || phone.length > 15)) throw new Error('WhatsApp inválido. Informe DDI e número.');
  for (const [label, value] of [
    ['Política do catálogo', catalogPolicy],
    ['Desconto-base', baseDiscount],
    ['Desconto-alvo', targetDiscount]
  ]) {
    if (!Number.isFinite(value) || value < 0 || value > 95) throw new Error(`${label}: informe um valor entre 0 e 95.`);
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 99999) throw new Error('Ordem inválida.');
  return {
    slug,
    display_name: displayName,
    whatsapp_phone: phone || null,
    catalog_discount_policy: catalogPolicy,
    offer_base_discount: baseDiscount,
    target_discount: targetDiscount,
    active: body.active !== false,
    sort_order: sortOrder
  };
}

async function audit(supabase, user, action, entityId, beforeData, afterData, req) {
  const requestId = String(req.headers['x-vercel-id'] || req.headers['x-request-id'] || '').slice(0, 200) || null;
  const { error } = await supabase.from('catalog_admin_audit_log').insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action,
    entity_type: 'consultant',
    entity_id: String(entityId),
    before_data: beforeData || null,
    after_data: afterData || null,
    request_id: requestId
  });
  if (error) throw new Error('Alteração feita, mas a auditoria falhou. Verifique o log administrativo antes de repetir.');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');
    return res.status(204).end();
  }
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');
    return send(res, 405, { ok: false, error: 'Método não permitido.' });
  }

  const auth = await requireCatalogAdmin(req);
  if (!auth.ok) return send(res, auth.status, { ok: false, error: auth.error });

  const { supabase, user } = auth;
  const body = req.method === 'GET' ? {} : parseBody(req);
  if (!body) return send(res, 400, { ok: false, error: 'Corpo JSON inválido.' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('catalog_consultants')
        .select('id, slug, display_name, whatsapp_phone, catalog_discount_policy, offer_base_discount, target_discount, active, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });
      if (error) throw new Error('Não foi possível carregar os consultores.');
      return send(res, 200, { ok: true, consultants: data || [] });
    }

    if (req.method === 'POST') {
      const record = normalizeInput(body);
      const { data: duplicate, error: duplicateError } = await supabase
        .from('catalog_consultants').select('id').eq('slug', record.slug).maybeSingle();
      if (duplicateError) throw new Error('Não foi possível validar o identificador.');
      if (duplicate) return send(res, 409, { ok: false, error: 'Já existe um consultor com esse slug.' });

      const { data, error } = await supabase
        .from('catalog_consultants').insert(record)
        .select('*').single();
      if (error) throw new Error(error.code === '23505' ? 'Esse slug já está cadastrado.' : 'Não foi possível cadastrar o consultor.');
      await audit(supabase, user, 'create', data.id, null, data, req);
      return send(res, 201, { ok: true, consultant: data });
    }

    const id = String(body.id || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { ok: false, error: 'Identificador de consultor inválido.' });

    const { data: before, error: readError } = await supabase
      .from('catalog_consultants').select('*').eq('id', id).maybeSingle();
    if (readError) throw new Error('Não foi possível consultar o consultor.');
    if (!before) return send(res, 404, { ok: false, error: 'Consultor não encontrado.' });

    if (body.action === 'delete') {
      const { data: aliases, error: aliasesReadError } = await supabase
        .from('catalog_consultant_aliases')
        .select('*')
        .eq('consultant_id', id);
      if (aliasesReadError) throw new Error('Não foi possível consultar os aliases do consultor.');

      await audit(supabase, user, 'delete', id, {
        consultant: before,
        aliases: aliases || []
      }, null, req);

      const { error: aliasesDeleteError } = await supabase
        .from('catalog_consultant_aliases')
        .delete()
        .eq('consultant_id', id);
      if (aliasesDeleteError) throw new Error('Auditoria registrada, mas não foi possível remover os aliases.');

      const { error: deleteError } = await supabase
        .from('catalog_consultants')
        .delete()
        .eq('id', id);
      if (deleteError) throw new Error('Auditoria registrada, mas não foi possível excluir o consultor.');

      return send(res, 200, { ok: true, deleted: true, id });
    }
    if (body.action === 'archive') {
      if (!before.active) return send(res, 200, { ok: true, consultant: before });
      const { data, error } = await supabase
        .from('catalog_consultants').update({ active: false }).eq('id', id).select('*').single();
      if (error) throw new Error('Não foi possível arquivar o consultor.');
      await audit(supabase, user, 'archive', id, before, data, req);
      return send(res, 200, { ok: true, consultant: data });
    }

    const record = normalizeInput(body);
    const { data: duplicate, error: duplicateError } = await supabase
      .from('catalog_consultants').select('id').eq('slug', record.slug).neq('id', id).maybeSingle();
    if (duplicateError) throw new Error('Não foi possível validar o identificador.');
    if (duplicate) return send(res, 409, { ok: false, error: 'Outro consultor já usa esse slug.' });

    const { data, error } = await supabase
      .from('catalog_consultants').update(record).eq('id', id).select('*').single();
    if (error) throw new Error('Não foi possível atualizar o consultor.');
    await audit(supabase, user, 'update', id, before, data, req);
    return send(res, 200, { ok: true, consultant: data });
  } catch (error) {
    return send(res, 500, { ok: false, error: error.message || 'Erro interno.' });
  }
}
