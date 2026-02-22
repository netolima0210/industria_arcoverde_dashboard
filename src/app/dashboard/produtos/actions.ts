'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProduct(formData: FormData) {
    const supabase = await createClient();

    const nome = formData.get('nome') as string;
    const codigo = formData.get('codigo') as string;
    const linha = formData.get('linha') as string;
    const categoria = formData.get('categoria') as string;
    const apresentacao = formData.get('apresentacao') as string;
    const embalagem = formData.get('embalagem') as string;
    const ativo = formData.get('ativo') === 'true';

    if (!nome) {
        return { error: 'O nome do produto é obrigatório.' };
    }

    const { error } = await supabase.from('produtos').insert({
        nome,
        codigo,
        linha,
        categoria,
        apresentacao,
        embalagem,
        ativo
    });

    if (error) {
        console.error('Error creating product:', error);
        return { error: 'Erro ao cadastrar produto.' };
    }

    revalidatePath('/dashboard/produtos');
    redirect('/dashboard/produtos');
}

export async function deleteProduct(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('produtos').delete().eq('id', id);

    if (error) {
        console.error('Error deleting product:', error);
        throw new Error('Erro ao deletar produto.');
    }

    revalidatePath('/dashboard/produtos');
}
