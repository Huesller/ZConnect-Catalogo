import { createClient } from '@supabase/supabase-js';

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error('Supabase server environment is not configured.');
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: { 'X-Client-Info': 'zconnect-catalogo-admin' }
    }
  });
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export async function requireCatalogAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Autenticacao necessaria.' };
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch {
    return { ok: false, status: 503, error: 'Servico administrativo nao configurado.' };
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);

  if (userError || !userData?.user?.id || !userData?.user?.email) {
    return { ok: false, status: 401, error: 'Sessao invalida ou expirada.' };
  }

  const { data: admin, error: adminError } = await supabase
    .from('catalog_admin_users')
    .select('user_id, email, role, active')
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 503, error: 'Nao foi possivel validar a permissao administrativa.' };
  }

  if (!admin || admin.email.toLowerCase() !== userData.user.email.toLowerCase()) {
    return { ok: false, status: 403, error: 'Usuario sem permissao administrativa.' };
  }

  return { ok: true, user: userData.user, admin, supabase };
}
