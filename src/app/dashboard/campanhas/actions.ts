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
            `${META_API_URL}/${wabaId}/message_templates?fields=name,status,category,language&limit=50`,
            { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }
        );

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error?.message || 'Erro ao buscar templates.', templates: [] };
        }

        return { templates: data.data as { name: string; status: string; category: string; language: string }[] };
    } catch {
        return { error: 'Falha na comunicação com a API da Meta.', templates: [] };
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

    let targets: { id: string; phone: string | null }[] = [];

    if (isLeads) {
        const { data } = await supabase.from('clientes').select('id, contato').eq('status', 'ativo');
        targets = (data || []).map((t) => ({ id: t.id, phone: t.contato }));
    } else {
        const { data } = await supabase.from('vendedores').select('id, telefone').eq('status', 'ativo');
        targets = (data || []).map((t) => ({ id: t.id, phone: t.telefone }));
    }

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

    for (const target of targets) {
        if (!target.phone) {
            erros++;
            await supabase.from('campanhas_envios')
                .update({ status: 'erro', mensagem_erro: 'Sem número de telefone' })
                .eq('campanha_id', campaignId)
                .eq(idField, target.id);
            continue;
        }

        // Clean phone number
        const cleanPhone = target.phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        try {
            const messagePayload: Record<string, any> = {
                messaging_product: 'whatsapp',
                to: fullPhone,
                type: 'template',
                template: {
                    name: campaign.mensagem, // We are storing the template name in the 'mensagem' field
                    language: {
                        code: 'pt_BR'
                    },
                    components: []
                }
            };

            // If a media URL is provided, attach it as a header component
            if (campaign.imagem_url) {
                const isPdf = campaign.imagem_url.toLowerCase().endsWith('.pdf');
                const mediaType = isPdf ? 'document' : 'image';
                const mediaObject: any = { link: campaign.imagem_url };

                if (isPdf) {
                    mediaObject.filename = 'documento.pdf';
                }

                messagePayload.template.components.push({
                    type: 'header',
                    parameters: [
                        {
                            type: mediaType,
                            [mediaType]: mediaObject
                        }
                    ]
                });
            }

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
                enviados++;
                await supabase.from('campanhas_envios')
                    .update({ status: 'enviado', enviado_at: new Date().toISOString() })
                    .eq('campanha_id', campaignId)
                    .eq(idField, target.id);
            } else {
                erros++;
                await supabase.from('campanhas_envios')
                    .update({ status: 'erro', mensagem_erro: data.error?.message || 'Erro desconhecido' })
                    .eq('campanha_id', campaignId)
                    .eq(idField, target.id);
            }
        } catch (err) {
            erros++;
            await supabase.from('campanhas_envios')
                .update({ status: 'erro', mensagem_erro: 'Falha na conexão' })
                .eq('campanha_id', campaignId)
                .eq(idField, target.id);
        }

        // Delay de 15 segundos para evitar banimento (High Quality Messages)
        await new Promise(resolve => setTimeout(resolve, 15000));
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
    const isLeads = campanha.publico_alvo === 'leads';
    const ids = (envios || []).map(e => isLeads ? e.lead_id : e.vendedor_id).filter(Boolean);

    let namesMap: Record<string, string> = {};
    if (ids.length > 0) {
        if (isLeads) {
            const { data: clientes } = await supabase
                .from('clientes')
                .select('id, nome, contato')
                .in('id', ids);
            (clientes || []).forEach(c => { namesMap[c.id] = c.nome; });
        } else {
            const { data: vendedores } = await supabase
                .from('vendedores')
                .select('id, nome, telefone')
                .in('id', ids);
            (vendedores || []).forEach(v => { namesMap[v.id] = v.nome; });
        }
    }

    const enriched = (envios || []).map(e => ({
        ...e,
        destinatario_nome: namesMap[isLeads ? e.lead_id : e.vendedor_id] || 'Desconhecido'
    }));

    return { envios: enriched };
}
