'use server'

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

// Cliente Supabase para uso em background (after()), sem depender de cookies.
// O after() roda DEPOIS que a resposta HTTP já foi enviada, então os cookies
// do request não existem mais. Usamos a SERVICE_ROLE_KEY que bypassa o RLS,
// pois o anon key seria bloqueado pelas políticas de acesso autenticado.
function createBackgroundClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

const META_API_URL = 'https://graph.facebook.com/v21.0';
const STORAGE_BUCKET = 'campaign-media';

// ─── Upload de mídia para o Supabase Storage ──────
// Cria o bucket (se não existir) e faz upload do arquivo, retornando a URL pública.
// Usa service role key para ter permissão de criar buckets e fazer upload.
export async function uploadCampaignMedia(formData: FormData) {
    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return { error: 'Nenhum arquivo fornecido.' };

    const supabase = createBackgroundClient();

    // Criar o bucket como público se ainda não existir
    const { error: bucketErr } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        fileSizeLimit: 5 * 1024 * 1024 // 5 MB
    });
    // Ignora erro de "already exists"
    if (bucketErr && !bucketErr.message.includes('already exists')) {
        console.error('[uploadCampaignMedia] Bucket error:', bucketErr.message);
        return { error: 'Erro ao criar bucket de armazenamento.' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `template_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, arrayBuffer, {
            contentType: file.type || 'image/jpeg',
            upsert: false
        });

    if (uploadErr) {
        console.error('[uploadCampaignMedia] Upload error:', uploadErr.message);
        return { error: 'Erro ao fazer upload da imagem.' };
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return { url: data.publicUrl };
}

// ─── Create Campaign ──────────────────────────────
export async function createCampaign(formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const mensagem = formData.get('mensagem') as string;
    const publico_alvo = formData.get('publico_alvo') as string;
    const imagem_url = formData.get('imagem_url') as string | null;

    if (!nome || !mensagem || !publico_alvo) {
        return { error: 'Nome, mensagem e público-alvo são obrigatórios.' };
    }

    // Count targets
    const table = publico_alvo === 'leads' ? 'clientes' : 'vendedores';
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('status', 'ativo');

    if (!count || count === 0) {
        return { error: `Não há ${publico_alvo} com status 'ativo' para disparar esta campanha.` };
    }

    const { data: campaign, error } = await supabase.from('campanhas').insert({
        nome,
        mensagem,
        imagem_url: imagem_url || null,
        publico_alvo,
        total_alvos: count || 0,
        enviados: 0,
        erros: 0,
        status: 'rascunho'
    }).select().single();

    if (error) {
        console.error('Error creating campaign:', error);
        return { error: 'Erro ao criar campanha.' };
    }

    // Não chamamos revalidatePath aqui pois a page é 'use client' e faz fetchCampanhas()
    // manualmente após o disparo. Chamar revalidatePath durante uma server action que
    // atualiza o state do cliente causa React error #418 (hydration mismatch).
    return { success: true, campaign, error: null };
}

// ─── Internal Dispatch ──────────────────────────
export async function dispatchCampaign(formData: FormData) {
    const templateName = formData.get('template_name') as string;
    const audience = formData.get('audience') as string;
    const imageUrl = formData.get('image_url') as string | null;

    if (!templateName || !audience) {
        return { error: 'Dados incompletos para o disparo.', success: false };
    }

    // Gerar nome automático: template + data/hora
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const campanhaName = `${templateName} — ${dateStr} ${timeStr}`;

    // Create the campaign record
    const campaignFormData = new FormData();
    campaignFormData.set('nome', campanhaName);
    campaignFormData.set('mensagem', templateName); // Store template name in mensagem field
    campaignFormData.set('publico_alvo', audience);
    if (imageUrl) campaignFormData.set('imagem_url', imageUrl);

    const createResult = await createCampaign(campaignFormData);
    if (createResult.error) return { error: createResult.error, success: false };

    // Disparar envio em background usando after() para não bloquear a resposta
    // Isso evita timeout na Vercel quando há muitos leads com delay de 15s cada
    if (createResult.campaign) {
        const campaignId = createResult.campaign.id;
        after(async () => {
            try {
                await sendCampaign(campaignId);
            } catch (err) {
                console.error('Erro durante envio da campanha:', err);
            }
        });
    }

    return { success: true, campaignId: createResult.campaign?.id, error: null };
}

// ─── Delete Campaign ──────────────────────────────
export async function deleteCampaign(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('campanhas').delete().eq('id', id);

    if (error) {
        console.error('Error deleting campaign:', error);
        throw new Error('Erro ao deletar campanha.');
    }

    revalidatePath('/dashboard/campanhas');
}

// ─── Upload Media to Meta (Resumable Upload API) ──
async function uploadMediaToMeta(file: File): Promise<{ handle?: string; error?: string }> {
    const token = process.env.META_WHATSAPP_TOKEN;
    const appId = process.env.META_APP_ID;

    if (!token || !appId) {
        return { error: 'META_APP_ID ou META_WHATSAPP_TOKEN não configurados.' };
    }

    try {
        // Detectar o MIME type correto a partir da extensão do arquivo como fallback,
        // pois em alguns ambientes de produção o file.type pode vir como 'application/octet-stream' ou vazio.
        let mimeType = file.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
        }

        // Nome seguro sem caracteres especiais para evitar "Invalid parameter" na Meta.
        let safeFileName = 'midia_campanha';
        if (mimeType === 'application/pdf') {
            safeFileName += '.pdf';
        } else if (mimeType === 'image/jpeg') {
            safeFileName += '.jpg';
        } else if (mimeType === 'image/png') {
            safeFileName += '.png';
        }

        // Step 1: Create upload session
        // IMPORTANTE: a Meta espera o file_type SEM encoding do '/' (ex: application/pdf, não application%2Fpdf).
        const sessionResponse = await fetch(
            `${META_API_URL}/${appId}/uploads?file_name=${safeFileName}&file_length=${file.size}&file_type=${mimeType}`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.id) {
            console.error('[PASSO 1] Meta Upload Session error:', JSON.stringify(sessionData));
            const msg = sessionData.error?.message || 'Erro ao criar sessão de upload na Meta.';
            const code = sessionData.error?.code ? ` (código ${sessionData.error.code})` : '';
            return { error: `[Passo 1 - Sessão] ${msg}${code}` };
        }

        const uploadSessionId = sessionData.id; // format: "upload:<ID>"
        console.log('[PASSO 1] Upload session criada:', uploadSessionId);

        // Step 2: Upload the file binary data
        // O endpoint do upload NÃO usa o prefixo de versão (v21.0) no upload session ID.
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const uploadUrl = `https://graph.facebook.com/${uploadSessionId}`;

        const uploadResponse = await fetch(
            uploadUrl,
            {
                method: 'POST',
                headers: {
                    'Authorization': `OAuth ${token}`,
                    'file_offset': '0',
                    'Content-Type': mimeType,
                },
                body: fileBuffer
            }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.h) {
            console.error('[PASSO 2] Meta File Upload error:', JSON.stringify(uploadData));
            const msg = uploadData.error?.message || 'Erro ao fazer upload do arquivo na Meta.';
            const code = uploadData.error?.code ? ` (código ${uploadData.error.code})` : '';
            return { error: `[Passo 2 - Upload] ${msg}${code}` };
        }

        console.log('[PASSO 2] Upload concluído, handle recebido.');

        return { handle: uploadData.h };
    } catch (err) {
        console.error('Meta Upload error:', err);
        return { error: 'Falha na comunicação com a API de upload da Meta.' };
    }
}

// ─── Submit Template to Meta ──────────────────────
export async function submitTemplateMeta(formData: FormData) {
    const token = process.env.META_WHATSAPP_TOKEN;
    const wabaId = process.env.META_WABA_ID;

    if (!token || !wabaId) {
        return { error: 'Credenciais da Meta não configuradas.' };
    }

    const name = (formData.get('template_name') as string).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const bodyText = formData.get('template_body') as string;
    const headerType = formData.get('header_type') as string || 'NONE';
    const language = 'pt_BR';

    const components: any[] = [];

    // Handle Media Upload to Meta if file is present
    const headerFile = formData.get('header_file') as File | null;
    if (headerFile && headerFile.size > 0 && (headerType === 'IMAGE' || headerType === 'DOCUMENT')) {
        // Upload the file directly to Meta to get a handle
        const uploadResult = await uploadMediaToMeta(headerFile);

        if (uploadResult.error) {
            return { error: uploadResult.error };
        }

        // Add HEADER component with the handle
        components.push({
            type: 'HEADER',
            format: headerType,
            example: {
                header_handle: [uploadResult.handle!]
            }
        });
    }

    // Body text
    components.push({
        type: 'BODY',
        text: bodyText
    });

    // Footer with opt-out question
    components.push({
        type: 'FOOTER',
        text: 'Deseja continuar recebendo ofertas da Indústria Arcoverde?'
    });

    // Opt-out Quick Reply Button
    components.push({
        type: 'BUTTONS',
        buttons: [
            {
                type: 'QUICK_REPLY',
                text: 'Parar Ofertas'
            }
        ]
    });

    const payload = {
        name,
        language,
        category: 'MARKETING',
        components
    };

    try {
        const response = await fetch(`${META_API_URL}/${wabaId}/message_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[PASSO 3] Meta Template error:', JSON.stringify(data));
            const msg = data.error?.message || 'Erro ao enviar template para a Meta.';
            const code = data.error?.code ? ` (código ${data.error.code})` : '';
            const subcode = data.error?.error_subcode ? `, subcódigo ${data.error.error_subcode}` : '';
            return { error: `[Passo 3 - Template] ${msg}${code}${subcode}` };
        }

        return { success: true, templateId: data.id, templateName: name, status: data.status };
    } catch (err) {
        console.error('Meta API fetch error:', err);
        return { error: 'Falha na comunicação com a API da Meta.' };
    }
}

// ─── List Templates from Meta ────────────────────
export async function listTemplatesMeta() {
    const token = process.env.META_WHATSAPP_TOKEN;
    const wabaId = process.env.META_WABA_ID;

    if (!token || !wabaId) {
        return { error: 'Credenciais da Meta não configuradas.', templates: [] };
    }

    try {
        const response = await fetch(
            `${META_API_URL}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=50`,
            { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }
        );

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error?.message || 'Erro ao buscar templates.', templates: [] };
        }

        const templates = (data.data as any[]).map(t => {
            const headerComp = (t.components || []).find((c: any) => c.type === 'HEADER');
            const headerFormat: string = headerComp?.format || 'NONE';
            const has_media_header = ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerFormat);
            return {
                name: t.name as string,
                status: t.status as string,
                category: t.category as string,
                language: t.language as string,
                has_media_header,
                header_format: headerFormat,
            };
        });

        return { templates };
    } catch {
        return { error: 'Falha na comunicação com a API da Meta.', templates: [] };
    }
}

// ─── Fetch Template Components from Meta ─────────
// Busca os componentes de um template aprovado para construir o payload de envio correto.
async function fetchTemplateComponents(templateName: string) {
    const token = process.env.META_WHATSAPP_TOKEN;
    const wabaId = process.env.META_WABA_ID;
    if (!token || !wabaId) return null;
    try {
        const response = await fetch(
            `${META_API_URL}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=components`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        if (!response.ok || !data.data?.length) {
            console.error('[fetchTemplateComponents] Error:', JSON.stringify(data));
            return null;
        }
        return data.data[0].components as Array<{
            type: string;
            format?: string;
            text?: string;
            buttons?: any[];
            example?: { header_handle?: string[] };
        }>;
    } catch (err) {
        console.error('[fetchTemplateComponents] Exception:', err);
        return null;
    }
}

// ─── Send Campaign Messages ──────────────────────
// IMPORTANTE: Esta função roda dentro de after(), ou seja, em background
// depois que a resposta HTTP já foi enviada. Por isso usa createBackgroundClient().
export async function sendCampaign(campaignId: string) {
    const supabase = createBackgroundClient();
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
        return { error: 'Credenciais da Meta não configuradas.' };
    }

    // Get campaign
    const { data: campaign } = await supabase
        .from('campanhas')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (!campaign) return { error: 'Campanha não encontrada.' };

    // Update status
    await supabase.from('campanhas').update({ status: 'processando' }).eq('id', campaignId);

    // Get targets based on audience
    const isLeads = campaign.publico_alvo === 'leads';
    const idField = isLeads ? 'lead_id' : 'vendedor_id';

    let targets: { id: string; phone: string | null; name: string | null }[] = [];

    if (isLeads) {
        const { data } = await supabase.from('clientes').select('id, contato, nome').eq('status', 'ativo');
        targets = (data || []).map((t) => ({ id: t.id, phone: t.contato, name: t.nome }));
    } else {
        const { data } = await supabase.from('vendedores').select('id, telefone, nome').eq('status', 'ativo');
        targets = (data || []).map((t) => ({ id: t.id, phone: t.telefone, name: t.nome }));
    }

    // Buscar componentes do template uma única vez para construir o payload correto.
    // Erro #132012 ocorre quando os componentes enviados não batem com os do template aprovado.
    const templateComponents = await fetchTemplateComponents(campaign.mensagem);

    if (targets.length === 0) {
        await supabase.from('campanhas').update({ status: 'concluida' }).eq('id', campaignId);
        return { error: 'Nenhum destinatário encontrado.' };
    }

    // Create send records
    const envios = targets.map(t => ({
        campanha_id: campaignId,
        [idField]: t.id,
        status: 'pendente' as const
    }));

    await supabase.from('campanhas_envios').insert(envios);

    let enviados = 0;
    let erros = 0;

    // Função para construir os componentes de envio com base no template aprovado.
    // Só inclui componentes que têm parâmetros variáveis.
    function buildSendComponents(target: { name: string | null }) {
        const sendComponents: any[] = [];
        if (!templateComponents) return sendComponents;
        for (const comp of templateComponents) {
            if (comp.type === 'HEADER') {
                if (comp.format === 'IMAGE' && campaign.imagem_url) {
                    // Requer URL pública acessível externamente (ex: Supabase Storage).
                    // URLs de scontent.whatsapp.net (header_handle) retornam 403 para servidores externos.
                    sendComponents.push({
                        type: 'header',
                        parameters: [{ type: 'image', image: { link: campaign.imagem_url } }]
                    });
                } else if (comp.format === 'DOCUMENT' && campaign.imagem_url) {
                    sendComponents.push({
                        type: 'header',
                        parameters: [{ type: 'document', document: { link: campaign.imagem_url, filename: 'documento.pdf' } }]
                    });
                }
                // HEADER TEXT estático não precisa de parâmetros
            } else if (comp.type === 'BODY') {
                const vars = (comp.text || '').match(/\{\{\d+\}\}/g);
                if (vars && vars.length > 0) {
                    sendComponents.push({
                        type: 'body',
                        parameters: vars.map((_, i) => ({
                            type: 'text',
                            text: i === 0 ? (target.name || 'Cliente') : ''
                        }))
                    });
                }
            }
            // FOOTER e BUTTONS estáticos não precisam de parâmetros
        }
        return sendComponents;
    }

    // Função para enviar para um único destinatário e atualizar o status no Supabase.
    async function sendToTarget(target: { id: string; phone: string | null; name: string | null }): Promise<boolean> {
        if (!target.phone) {
            await supabase.from('campanhas_envios')
                .update({ status: 'erro', mensagem_erro: 'Sem número de telefone' })
                .eq('campanha_id', campaignId)
                .eq(idField, target.id);
            return false;
        }

        const cleanPhone = target.phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        try {
            const messagePayload = {
                messaging_product: 'whatsapp',
                to: fullPhone,
                type: 'template',
                template: {
                    name: campaign.mensagem,
                    language: { code: 'pt_BR' },
                    components: buildSendComponents(target)
                }
            };

            const response = await fetch(`${META_API_URL}/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
            });

            const data = await response.json();

            if (response.ok) {
                await supabase.from('campanhas_envios')
                    .update({ status: 'enviado', enviado_at: new Date().toISOString() })
                    .eq('campanha_id', campaignId)
                    .eq(idField, target.id);
                return true;
            } else {
                console.error('[sendCampaign] Meta API error:', JSON.stringify({
                    phoneId, to: fullPhone, template: campaign.mensagem, error: data.error
                }));
                const errCode = data.error?.code ? ` [código ${data.error.code}]` : '';
                const errMsg = data.error?.message || 'Erro desconhecido';
                await supabase.from('campanhas_envios')
                    .update({ status: 'erro', mensagem_erro: `${errMsg}${errCode}` })
                    .eq('campanha_id', campaignId)
                    .eq(idField, target.id);
                return false;
            }
        } catch {
            await supabase.from('campanhas_envios')
                .update({ status: 'erro', mensagem_erro: 'Falha na conexão' })
                .eq('campanha_id', campaignId)
                .eq(idField, target.id);
            return false;
        }
    }

    // Envio em lotes de 5 paralelos + 300ms entre lotes para não sobrecarregar a API da Meta.
    // 757 leads / 5 = ~152 lotes × ~500ms = ~76s total (muito abaixo do limit de 300s da Vercel).
    const BATCH_SIZE = 5;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(t => sendToTarget(t)));
        enviados += results.filter(Boolean).length;
        erros += results.filter(r => !r).length;

        if (i + BATCH_SIZE < targets.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // Final update
    await supabase.from('campanhas').update({
        status: 'concluida',
        enviados,
        erros
    }).eq('id', campaignId);

    revalidatePath('/dashboard/campanhas');
    return { success: true, enviados, erros };
}

// ─── List Campanhas ──────────────────────────────
export async function listCampanhas() {
    const supabase = await createClient();

    const { data: campanhas, error } = await supabase
        .from('campanhas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error listing campanhas:', error);
        return { campanhas: [], error: 'Erro ao buscar campanhas.' };
    }

    return { campanhas: campanhas || [] };
}

// ─── Get Campanha Envios (detalhes por destinatário) ──
export async function getCampanhaEnvios(campanhaId: string) {
    const supabase = await createClient();

    // Buscar a campanha para saber o público alvo
    const { data: campanha } = await supabase
        .from('campanhas')
        .select('publico_alvo')
        .eq('id', campanhaId)
        .single();

    if (!campanha) return { envios: [], error: 'Campanha não encontrada.' };

    // Buscar envios
    const { data: envios, error } = await supabase
        .from('campanhas_envios')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching envios:', error);
        return { envios: [], error: 'Erro ao buscar envios.' };
    }

    // Enriquecer com nome dos destinatários
    // Busca em batches de 50 para evitar URL muito longa na API REST do Supabase
    const isLeads = campanha.publico_alvo === 'leads';
    const ids = (envios || []).map(e => isLeads ? e.lead_id : e.vendedor_id).filter(Boolean);

    let namesMap: Record<string, string> = {};
    if (ids.length > 0) {
        const CHUNK = 50;
        const table = isLeads ? 'clientes' : 'vendedores';
        for (let i = 0; i < ids.length; i += CHUNK) {
            const chunk = ids.slice(i, i + CHUNK);
            const { data: rows } = await supabase
                .from(table)
                .select('id, nome')
                .in('id', chunk);
            (rows || []).forEach((r: { id: string; nome: string }) => { namesMap[r.id] = r.nome; });
        }
    }

    const enriched = (envios || []).map(e => ({
        ...e,
        destinatario_nome: namesMap[isLeads ? e.lead_id : e.vendedor_id] || 'Desconhecido'
    }));

    return { envios: enriched };
}
