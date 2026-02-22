'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createVendedor(formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const telefone = formData.get('telefone') as string;
    const email = formData.get('email') as string;
    const endereco = formData.get('endereco') as string;
    const regiao_atende = formData.get('regiao_atende') as string;
    const cidades_atende = formData.get('cidades_atende') as string;

    if (!nome) {
        return { error: 'O nome do vendedor é obrigatório.' };
    }

    const { error } = await supabase.from('vendedores').insert({
        nome,
        telefone,
        email,
        endereco,
        regiao_atende,
        cidades_atende
    });

    if (error) {
        console.error('Error creating vendedor:', error);
        return { error: 'Erro ao cadastrar vendedor.' };
    }

    revalidatePath('/dashboard/vendedores');
    redirect('/dashboard/vendedores');
}

export async function deleteVendedor(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('vendedores').delete().eq('id', id);

    if (error) {
        console.error('Error deleting vendedor:', error);
        throw new Error('Erro ao deletar vendedor.');
    }

    revalidatePath('/dashboard/vendedores');
}
