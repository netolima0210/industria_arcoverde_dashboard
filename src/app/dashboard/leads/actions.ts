
'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createLead(formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const contato = formData.get('contato') as string;
    const status = formData.get('status') as string || 'novo';

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
