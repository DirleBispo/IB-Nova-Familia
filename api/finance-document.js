import {adminFetch, authenticatedUser} from './_supabase.js';

const ENDPOINT = 'https://n8n.ibnovafamilia.com.br/webhook/ibnf-documentos-camera';
const MAX_BYTES = 2500000;
const CATEGORIES = ['01 - Notas fiscais','02 - Recibos e comprovantes','03 - Extratos bancarios','04 - Entradas, saidas, dizimos e ofertas','05 - Outros documentos'];

export function validateDocument(body) {
  const {date, category, description, file, user, password} = body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date < '2026-09-01') throw new Error('Informe uma data válida, a partir de setembro de 2026.');
  if (!CATEGORIES.includes(category)) throw new Error('Selecione a categoria.');
  if (typeof description !== 'string' || !description.trim() || description.length > 300) throw new Error('Informe uma descrição de até 300 caracteres.');
  if (typeof user !== 'string' || !user || user.includes(':') || user.length > 150 || typeof password !== 'string' || !password || password.length > 300) throw new Error('Informe o usuário e a senha do formulário de documentos.');
  if (!file || typeof file.data !== 'string' || !file.data || file.data.length > Math.ceil(MAX_BYTES / 3) * 4 || file.data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) throw new Error('Selecione uma foto ou PDF de até 2,5 MB.');
  const bytes = Buffer.from(file.data, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('O arquivo deve ter até 2,5 MB.');
  let mime, ext;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {mime = 'image/jpeg'; ext = 'jpg';}
  else if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {mime = 'image/png'; ext = 'png';}
  else if (bytes.subarray(0,5).toString() === '%PDF-') {mime = 'application/pdf'; ext = 'pdf';}
  else throw new Error('Use uma foto JPG/PNG ou um PDF válido.');
  return {date, category, description: description.trim(), file: {data: file.data, name: `documento.${ext}`, mime}};
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({error: 'Método não permitido.'});
  try {
    const user = await authenticatedUser(request);
    if (!user) return response.status(401).json({error: 'Entre novamente no app da igreja.'});
    const result = await adminFetch(`perfis?id=eq.${encodeURIComponent(user.id)}&select=perfil,ativo,permissoes&limit=1`);
    if (!result.ok) return response.status(503).json({error: 'Não foi possível conferir seu acesso. Tente novamente.'});
    const profile = (await result.json())[0];
    if (!profile?.ativo || !(['pastor','tesouraria','admin'].includes(profile.perfil) || profile.permissoes?.financeiro === true)) return response.status(403).json({error: 'Acesso restrito ao Financeiro.'});
    let payload;
    try {payload = validateDocument(request.body);} catch (error) {return response.status(400).json({error: error.message});}
    const upstream = await fetch(ENDPOINT, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: {'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${request.body.user}:${request.body.password}`).toString('base64')},
      body: JSON.stringify(payload)
    });
    if (upstream.status === 401 || upstream.status === 403) return response.status(401).json({error: 'Usuário ou senha do formulário incorretos.'});
    if (upstream.status === 404) return response.status(503).json({error: 'O fluxo de câmera ainda precisa ser publicado no n8n. Use o formulário de anexos enquanto isso.'});
    const saved = await upstream.json().catch(() => null);
    if (!upstream.ok || saved?.status !== 'salvo' || !saved?.id) return response.status(502).json({error: 'O envio não foi confirmado. Confira o Drive antes de enviar novamente.'});
    return response.status(200).json({status: 'salvo', arquivo: saved.arquivo, id: saved.id, link: `https://drive.google.com/file/d/${encodeURIComponent(saved.id)}/view`});
  } catch {
    return response.status(502).json({error: 'Não foi possível confirmar o envio. Confira o Drive antes de tentar novamente.'});
  }
}
