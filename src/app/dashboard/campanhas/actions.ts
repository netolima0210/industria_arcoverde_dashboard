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
    redirect('/dashboard/campanhas');
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
    const hasImage = formData.get('has_image') === 'true';
    const language = 'pt_BR';

    const components: any[] = [];

    // Header with image (optional)
    if (hasImage) {
        components.push({
            type: 'HEADER',
            format: 'IMAGE',
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
            // Build message payload
            const messagePayload: Record<string, any> = {
                messaging_product: 'whatsapp',
                to: fullPhone,
                type: campaign.imagem_url ? 'image' : 'text'
            };

            if (campaign.imagem_url) {
                messagePayload.image = {
                    link: campaign.imagem_url,
                    caption: campaign.mensagem
                };
            } else {
                messagePayload.text = { body: campaign.mensagem };
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

        // Rate limit: 1 message per second
        await new Promise(resolve => setTimeout(resolve, 1000));
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
