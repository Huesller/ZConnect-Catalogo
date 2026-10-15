import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './admin.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && publishableKey
  ? createClient(supabaseUrl, publishableKey)
  : null;

const emptyForm = {
  id: '',
  slug: '',
  display_name: '',
  whatsapp_phone: '',
  catalog_discount_policy: 45,
  offer_base_discount: 45,
  target_discount: 45,
  sort_order: 100,
  active: true
};

function AdminApp() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consultants, setConsultants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadConsultants();
    else setConsultants([]);
  }, [session]);

  async function apiRequest(method = 'GET', body = null) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');

    const response = await fetch('/api/admin-consultants', {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Falha na API (${response.status}).`);
    }
    return result;
  }

  async function loadConsultants() {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest();
      setConsultants(result.consultants || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (loginError) throw loginError;
      setPassword('');
    } catch (e) {
      setError(e.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setForm(emptyForm);
    setMessage('');
    setError('');
  }

  function editConsultant(item) {
    setForm({ ...item });
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  async function saveConsultant(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const editing = Boolean(form.id);
      const result = await apiRequest(editing ? 'PATCH' : 'POST', form);
      setMessage(editing ? 'Consultor atualizado.' : 'Consultor cadastrado.');
      setForm(emptyForm);
      await loadConsultants();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function archiveConsultant(item) {
    if (!window.confirm(`Arquivar ${item.display_name}? Ele não será apagado do histórico.`)) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('PATCH', { id: item.id, action: 'archive' });
      setMessage(`${item.display_name} arquivado.`);
      if (form.id === item.id) setForm(emptyForm);
      await loadConsultants();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteConsultant(item) {
    const confirmation = window.prompt(
      `Exclusão definitiva de ${item.display_name} (${item.slug}). Digite EXCLUIR para confirmar:`
    );
    if (confirmation !== 'EXCLUIR') return;

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('PATCH', { id: item.id, action: 'delete' });
      setMessage(`${item.display_name} excluído definitivamente. A operação foi registrada na auditoria.`);
      if (form.id === item.id) setForm(emptyForm);
      await loadConsultants();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  if (!supabase) {
    return <main className="admin-shell"><section className="admin-card">
      <h1>Z Connect Admin</h1>
      <p>Configuração do Supabase ausente no build.</p>
      <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente local e na Vercel antes de publicar.</p>
    </section></main>;
  }

  if (!session) {
    return <main className="admin-shell">
      <section className="admin-card login-card">
        <div className="eyebrow">Z AUTOMOTIVA · ÁREA RESTRITA</div>
        <h1>Administração</h1>
        <p className="muted">Entre com seu usuário autorizado do Supabase.</p>
        <form onSubmit={login} className="admin-form">
          <label>E-mail
            <input type="email" autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>Senha
            <input type="password" autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </label>
          {error && <p className="notice error">{error}</p>}
          <button disabled={loading} type="submit">{loading ? 'Validando…' : 'Entrar'}</button>
        </form>
        <p className="muted small">A autorização administrativa é validada novamente no servidor.</p>
      </section>
    </main>;
  }

  return <main className="admin-shell">
    <header className="admin-header">
      <div><div className="eyebrow">Z AUTOMOTIVA</div><h1>Gestão de consultores</h1></div>
      <button className="secondary" onClick={logout}>Sair</button>
    </header>

    <section className="admin-card">
      <h2>{form.id ? 'Editar consultor' : 'Novo consultor'}</h2>
      <form onSubmit={saveConsultant} className="admin-form">
        <div className="field-grid">
          <label>Nome de exibição
            <input value={form.display_name} onChange={e => updateField('display_name', e.target.value)} maxLength="80" required />
          </label>
          <label>Identificador (slug)
            <input value={form.slug} onChange={e => updateField('slug', e.target.value)} maxLength="40" pattern="[a-zA-Z0-9_-]+" required />
          </label>
          <label>WhatsApp (com DDI)
            <input value={form.whatsapp_phone || ''} onChange={e => updateField('whatsapp_phone', e.target.value)} placeholder="5547999999999" />
          </label>
          <label>Política de desconto do catálogo (%)
            <input type="number" min="0" max="95" step="0.01" value={form.catalog_discount_policy}
              onChange={e => updateField('catalog_discount_policy', e.target.value)} required />
          </label>
          <label>Desconto-base de ofertas (%)
            <input type="number" min="0" max="95" step="0.01" value={form.offer_base_discount}
              onChange={e => updateField('offer_base_discount', e.target.value)} required />
          </label>
          <label>Desconto-alvo (%)
            <input type="number" min="0" max="95" step="0.01" value={form.target_discount}
              onChange={e => updateField('target_discount', e.target.value)} required />
          </label>
          <label>Ordem de exibição
            <input type="number" min="0" max="99999" step="1" value={form.sort_order}
              onChange={e => updateField('sort_order', e.target.value)} required />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={Boolean(form.active)}
              onChange={e => updateField('active', e.target.checked)} />
            Consultor ativo
          </label>
        </div>
        <div className="button-row">
          <button type="submit" disabled={loading}>{loading ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Cadastrar consultor'}</button>
          {form.id && <button type="button" className="secondary" onClick={() => setForm(emptyForm)}>Cancelar edição</button>}
        </div>
      </form>
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
    </section>

    <section className="admin-card">
      <div className="list-heading">
        <div><h2>Consultores cadastrados</h2><p className="muted">{consultants.length} registro(s)</p></div>
        <button className="secondary" disabled={loading} onClick={loadConsultants}>Atualizar</button>
      </div>
      {loading && <p className="muted">Carregando…</p>}
      {!loading && consultants.length === 0 && <p className="muted">Nenhum consultor no banco ainda. A importação dos cadastros existentes será uma etapa separada.</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Consultor</th><th>Slug</th><th>WhatsApp</th><th>Catálogo</th><th>Base oferta</th><th>Alvo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {consultants.map(item => <tr key={item.id}>
              <td>{item.display_name}</td><td>{item.slug}</td><td>{item.whatsapp_phone || '—'}</td>
              <td>{item.catalog_discount_policy}%</td><td>{item.offer_base_discount}%</td><td>{item.target_discount}%</td>
              <td><span className={item.active ? 'status active' : 'status inactive'}>{item.active ? 'Ativo' : 'Arquivado'}</span></td>
              <td><div className="row-actions">
                <button className="small-button secondary" onClick={() => editConsultant(item)}>Editar</button>
                {item.active && <button className="small-button danger" onClick={() => archiveConsultant(item)}>Arquivar</button>}
                <button className="small-button danger" disabled={loading} onClick={() => deleteConsultant(item)}>Excluir</button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
    <footer className="muted small">Sessão: {session.user.email} · As alterações são registradas na auditoria.</footer>
  </main>;
}

createRoot(document.getElementById('admin-root')).render(<AdminApp />);
