// Endpoint preparado para disparo pelo agendador da Vercel.
// Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
// WHATSAPP_RECIPIENT e WHATSAPP_TEMPLATE_NAME na Vercel.
// A Meta exige template aprovado para mensagens iniciadas pela empresa.
import { adminFetch } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).json({ error: 'Não autorizado' });
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: sender,
    WHATSAPP_RECIPIENT: recipient, WHATSAPP_TEMPLATE_NAME: template } = process.env;
  if (![token, sender, recipient, template, process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY].every(Boolean))
    return res.status(503).json({ error: 'Integração WhatsApp ainda não configurada' });

  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo',
      month: '2-digit', day: '2-digit' }).format(new Date());
    const response = await adminFetch('pessoas?ativo=eq.true&tipo=eq.membro&nascimento=not.is.null&select=nome,nascimento');
    if (!response.ok) throw new Error('Falha na consulta de aniversariantes');
    const people = await response.json();
    const names = people.filter(p => String(p.nascimento).slice(5) === today).map(p => p.nome);
    if (!names.length) return res.status(200).json({ birthdays: 0, sent: false });
    // Previne duplicidade entre execuções simultâneas usando registro persistente no Supabase.
    // A tabela e a política de acesso são criadas pelo SQL de instalação.
    const key = `whatsapp-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}`;
    const lock = await adminFetch('birthday_whatsapp_dispatches', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ dispatch_key: key, status: 'processing' })
    });
    if (lock.status === 409) return res.status(200).json({ birthdays: names.length, sent: false, duplicate: true });
    if (!lock.ok) throw new Error('Falha no controle de duplicidade');
    const peopleText = names.length === 1 ? names[0] : names.join(', ');
    const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(sender)}/messages`;
    const result = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'template',
        template: { name: template, language: { code: 'pt_BR' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: peopleText }] }] } })
    });
    await adminFetch(`birthday_whatsapp_dispatches?dispatch_key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: result.ok ? 'submitted' : 'failed' })
    });
    if (!result.ok) return res.status(502).json({ error: 'Meta recusou a mensagem', birthdays: names.length });
    return res.status(200).json({ birthdays: names.length, submitted: true });
  } catch (error) {
    return res.status(500).json({ error: String(error.message || error) });
  }
}
