'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });

    const { data: campaign, error } = await supabase.from('campanhas').insert({
        nome,
        mensagem,
        imagem_url: imagem_url || null,
        publico_alvo,
        total_alvos: count || 0,
        status: 'rascunho'
    }).select().single();

    if (error) {
        console.error('Error creating campaign:', error);
        return { error: 'Erro ao criar campanha.' };
    }

    revalidatePath('/dashboard/campanhas');
    return { success: true, campaign, error: null };
}

// ─── Internal Dispatch ──────────────────────────
export async function dispatchCampaign(formData: FormData) {
    const supabase = await createClient();

    const templateName = formData.get('template_name') as string;
    const campanhaName = formData.get('campanha_name') as string;
    const audience = formData.get('audience') as string;
    const mediaFile = formData.get('media_file') as File | null;

    if (!templateName || !campanhaName || !audience) {
        return { error: 'Dados incompletos para o disparo.', success: false };
    }

    let imagem_url = null;

    // Handle Media Upload to Supabase Storage
    if (mediaFile && mediaFile.size > 0) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `campanhas/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('campanhas-midia')
            .upload(filePath, mediaFile);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { error: 'Erro ao fazer upload da mídia.', success: false };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('campanhas-midia')
            .getPublicUrl(filePath);

        imagem_url = publicUrl;
    }

    // Create the campaign record
    const campaignFormData = new FormData();
    campaignFormData.set('nome', campanhaName);
    campaignFormData.set('mensagem', templateName); // Store template name in mensagem field
    campaignFormData.set('publico_alvo', audience);
    if (imagem_url) campaignFormData.set('imagem_url', imagem_url);

    const createResult = await createCampaign(campaignFormData);
    if (createResult.error) return { error: createResult.error, success: false };

    // Trigger the send process (this will run in background since we don't await the full loop if possible, 
    // but here we are in a server action. For simplicity, we trigger it).
    // Note: sendCampaign has a 15s delay per message, so it will take a while for large lists.
    // In a real app, this should be offloaded to a background worker / edge function.

    // We trigger sendCampaign but we don't await it to avoid blocking the user 
    // Wait, in Next.js Server Actions, if we don't await, it might be killed.
    // However, we'll return success so the user sees the campaign as "processing".

    // Trigger sending process
    if (createResult.campaign) {
        sendCampaign(createResult.campaign.id);
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

    // Header (optional image or document)
    if (headerType === 'IMAGE' || headerType === 'DOCUMENT') {
        components.push({
            type: 'HEADER',
            format: headerType,
            example: {
                header_handle: [] // Meta will use the uploaded media
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
            console.error('Meta API error:', data);
            return { error: data.error?.message || 'Erro ao enviar template para a Meta.' };
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
export async function sendCampaign(campaignId: string) {
    const supabase = await createClient();
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
        const { data } = await supabase.from('clientes').select('id, contato');
        targets = (data || []).map((t) => ({ id: t.id, phone: t.contato }));
    } else {
        const { data } = await supabase.from('vendedores').select('id, telefone');
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
