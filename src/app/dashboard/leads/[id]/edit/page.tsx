'use client';

import { updateLead } from '../../actions';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [lead, setLead] = useState<{ nome: string; contato: string; status: string } | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.from('clientes').select('nome, contato, status').eq('id', id).single().then(({ data }) => {
            if (data) setLead({ nome: data.nome, contato: data.contato || '', status: data.status || 'novo' });
            setFetching(false);
        });
    }, [id]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const result = await updateLead(id, formData);
        if (result && result.error) {
            alert(result.error);
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Carregando...</div>;
    }

    if (!lead) {
        return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Lead não encontrado.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/leads" className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Editar Lead</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            name="nome"
                            id="nome"
                            required
                            defaultValue={lead.nome}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        />
                    </div>

                    <div>
                        <label htmlFor="contato" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Contato</label>
                        <input
                            type="text"
                            name="contato"
                            id="contato"
                            required
                            defaultValue={lead.contato}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            name="status"
                            id="status"
                            defaultValue={lead.status}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        >
                            <option value="novo">Novo</option>
                            <option value="contatado">Contatado</option>
                            <option value="cotacao_enviada">Cotação Enviada</option>
                            <option value="venda_fechada">Venda Fechada</option>
                            <option value="perdido">Perdido</option>
                            <option value="ativo">Ativo</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Link href="/dashboard/leads" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
