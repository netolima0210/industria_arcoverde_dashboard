
'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createLead(formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const contato = formData.get('contato') as string;
    const status = formData.get('status') as string || 'ativo';

    if (!nome || !contato) {
        return { error: 'Nome e contato são obrigatórios.' };
    }

    const { error } = await supabase.from('clientes').insert({
        nome,
        contato,
        status
    });

    if (error) {
        console.error('Error creating lead:', error);
        return { error: 'Erro ao criar lead.' };
    }

    revalidatePath('/dashboard/leads');
    redirect('/dashboard/leads');
}

export async function updateLead(id: string, formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const contato = formData.get('contato') as string;
    const status = formData.get('status') as string;

    if (!nome || !contato) {
        return { error: 'Nome e contato são obrigatórios.' };
    }

    const { error } = await supabase.from('clientes').update({ nome, contato, status }).eq('id', id);

    if (error) {
        console.error('Error updating lead:', error);
        return { error: 'Erro ao atualizar lead.' };
    }

    revalidatePath('/dashboard/leads');
    redirect('/dashboard/leads');
}

export async function deleteLead(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('clientes').delete().eq('id', id);

    if (error) {
        console.error('Error deleting lead:', error);
        throw new Error('Erro ao deletar lead.');
    }

    revalidatePath('/dashboard/leads');
}

export async function updateLeadStatus(id: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('clientes').update({ status: newStatus }).eq('id', id);

    if (error) {
        console.error('Error updating lead status:', error);
        return { error: 'Erro ao atualizar status do lead.' };
    }

    revalidatePath('/dashboard/leads');
    return { success: true };
}

export async function updateMultipleLeadsStatus(ids: string[], newStatus: string) {
    if (!ids || ids.length === 0) {
        return { error: 'Nenhum lead selecionado.' };
    }

    if (!newStatus) {
        return { error: 'Status não informado.' };
    }

    const supabase = await createClient();

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
