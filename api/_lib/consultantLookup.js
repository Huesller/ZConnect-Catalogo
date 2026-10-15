import { getSupabaseServerClient } from './supabaseAdmin.js';

const LOCAL_CONSULTANTS = {
  huesller: { slug: 'huesller', display_name: 'Huesller', whatsapp_phone: '554733054401', offer_base_discount: 45, catalog_discount_policy: 45, target_discount: 45, active: true },
  ney: { slug: 'ney', display_name: 'Ney', whatsapp_phone: '554733054400', offer_base_discount: 45, catalog_discount_policy: 45, target_discount: 45, active: true },
  gabriel: { slug: 'gabriel', display_name: 'Gabriel Zatt', whatsapp_phone: '554788647114', offer_base_discount: 45, catalog_discount_policy: 45, target_discount: 45, active: true },
  francisco: { slug: 'francisco', display_name: 'Francisco', whatsapp_phone: '5527992747307', offer_base_discount: 45, catalog_discount_policy: 45, target_discount: 45, active: true },
  ramires: { slug: 'ramires', display_name: 'Ramires', whatsapp_phone: '5547997199931', offer_base_discount: 45, catalog_discount_policy: 45, target_discount: 45, active: true }
};

const LOCAL_ALIASES = {
  representante: 'francisco',
  ivoney: 'ney'
};

export async function resolveConsultant(value) {
  const requested = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(requested)) return null;

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      throw new Error('Cadastro central de consultores não configurado.');
    }
    const localSlug = LOCAL_ALIASES[requested] || requested;
    return LOCAL_CONSULTANTS[localSlug] || null;
  }

  const supabase = getSupabaseServerClient();
  let slug = requested;

  const { data: alias, error: aliasError } = await supabase
    .from('catalog_consultant_aliases')
    .select('consultant_id')
    .eq('alias', requested)
    .maybeSingle();

  if (aliasError) throw new Error('Não foi possível consultar os aliases dos consultores.');
  if (alias) {
    const { data: byAlias, error: byAliasError } = await supabase
      .from('catalog_consultants')
      .select('slug, display_name, whatsapp_phone, offer_base_discount, catalog_discount_policy, target_discount, active')
      .eq('id', alias.consultant_id)
      .maybeSingle();

    if (byAliasError) throw new Error('Não foi possível consultar o consultor.');
    if (!byAlias || byAlias.active !== true) return null;
    return byAlias;
  }

  const { data, error } = await supabase
    .from('catalog_consultants')
    .select('slug, display_name, whatsapp_phone, offer_base_discount, catalog_discount_policy, target_discount, active')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error('Não foi possível consultar o consultor.');
  if (!data || data.active !== true) return null;
  return data;
}
