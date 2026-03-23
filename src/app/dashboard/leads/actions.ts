
'use server'

import { requireAuth } from '@/utils/auth/requireAuth';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createLead(formData: FormData) {
    const { supabase } = await requireAuth();

    const nome = formData.get('nome') as string;
    const contato = formData.get('contato') as string;
    const status = formData.get('status') as string || 'ativo';
    const cidade = formData.get('cidade') as string || null;
    const regiao = formData.get('regiao') as string || null;
    const estado = formData.get('estado') as string || null;

    if (!nome || !contato) {
        return { error: 'Nome e contato são obrigatórios.' };
    }

    const { error } = await supabase.from('clientes').insert({
        nome,
        contato,
        status,
        cidade,
        regiao,
        estado
    });

    if (error) {
        console.error('Error creating lead:', error);
        return { error: 'Erro ao criar lead.' };
    }

    revalidatePath('/dashboard/leads');
    redirect('/dashboard/leads');
}

export async function updateLead(id: string, formData: FormData) {
    const { supabase } = await requireAuth();

    const nome = formData.get('nome') as string;
    const contato = formData.get('contato') as string;
    const status = formData.get('status') as string;
    const cidade = formData.get('cidade') as string || null;
    const regiao = formData.get('regiao') as string || null;
    const estado = formData.get('estado') as string || null;

    if (!nome || !contato) {
        return { error: 'Nome e contato são obrigatórios.' };
    }

    const { error } = await supabase.from('clientes').update({ nome, contato, status, cidade, regiao, estado }).eq('id', id);

    if (error) {
        console.error('Error updating lead:', error);
        return { error: 'Erro ao atualizar lead.' };
    }

    revalidatePath('/dashboard/leads');
    redirect('/dashboard/leads');
}

export async function deleteLead(id: string) {
    const { supabase } = await requireAuth();
    const { error } = await supabase.from('clientes').delete().eq('id', id);

    if (error) {
        console.error('Error deleting lead:', error);
        throw new Error('Erro ao deletar lead.');
    }

    revalidatePath('/dashboard/leads');
}

export async function updateLeadStatus(id: string, newStatus: string) {
    const { supabase } = await requireAuth();

    const { error } = await supabase.from('clientes').update({ status: newStatus }).eq('id', id);

    if (error) {
        console.error('Error updating lead status:', error);
        return { error: 'Erro ao atualizar status do lead.' };
    }

    revalidatePath('/dashboard/leads');
    return { success: true };
}

export async function verifyAndDeleteNonWhatsapp(): Promise<{ verified: number; deleted: number; error?: string }> {
    await requireAuth();

    const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: clients, error: fetchError } = await supabase
        .from('clientes')
        .select('id, contato');

    if (fetchError || !clients) {
        return { verified: 0, deleted: 0, error: 'Erro ao buscar clientes.' };
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL!;
    const evolutionKey = process.env.EVOLUTION_API_KEY!;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE!;

    const whatsappIds = new Set<string>();
    const nonWhatsappIds: string[] = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
        const batch = clients.slice(i, i + BATCH_SIZE);
        const numbers = batch.map(c => (c.contato ?? '').replace(/\D/g, ''));

        let results: { number: string; exists: boolean }[] = [];
        try {
            const res = await fetch(`${evolutionUrl}/chat/whatsappNumbers/${evolutionInstance}`, {
                method: 'POST',
                headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ numbers }),
            });
            if (res.ok) results = await res.json();
        } catch {
            // skip batch on network error
        }

        const existsMap = new Map(results.map(r => [r.number.replace(/\D/g, ''), r.exists]));

        for (const client of batch) {
            const num = (client.contato ?? '').replace(/\D/g, '');
            if (existsMap.get(num) === true) {
                whatsappIds.add(client.id);
            } else {
                nonWhatsappIds.push(client.id);
            }
        }
    }

    // Update is_whatsapp = true for valid numbers
    if (whatsappIds.size > 0) {
        const ids = Array.from(whatsappIds);
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            await supabase.from('clientes').update({ is_whatsapp: true }).in('id', ids.slice(i, i + BATCH_SIZE));
        }
    }

    // Delete non-WhatsApp clients
    let deleted = 0;
    if (nonWhatsappIds.length > 0) {
        for (let i = 0; i < nonWhatsappIds.length; i += BATCH_SIZE) {
            const { error } = await supabase.from('clientes').delete().in('id', nonWhatsappIds.slice(i, i + BATCH_SIZE));
            if (!error) deleted += Math.min(BATCH_SIZE, nonWhatsappIds.length - i);
        }
    }

    revalidatePath('/dashboard/leads');
    return { verified: clients.length, deleted };
}

export async function updateMultipleLeadsStatus(ids: string[], newStatus: string) {
    if (!ids || ids.length === 0) {
        return { error: 'Nenhum lead selecionado.' };
    }

    if (!newStatus) {
        return { error: 'Status não informado.' };
    }

    const { supabase } = await requireAuth();

    // Processar em lotes de 50 para não estourar o limite de URL do Supabase REST API.
    // Com 850 leads, cada UUID tem 36 chars — enviar todos de uma vez causa "Bad Request".
    const BATCH_SIZE = 50;
    let totalUpdated = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        const { error } = await supabase
            .from('clientes')
            .update({ status: newStatus })
            .in('id', batch);

        if (error) {
            console.error(`Error updating batch ${i / BATCH_SIZE + 1}:`, error.message);
            return { error: `Erro ao atualizar status dos leads: ${error.message}` };
        }

        totalUpdated += batch.length;
    }

    console.log(`Updated ${totalUpdated} leads to status '${newStatus}'`);

    revalidatePath('/dashboard/leads');
    return { success: true };
}
