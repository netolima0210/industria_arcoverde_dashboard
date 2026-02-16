
'use client';

import { createLead } from '../actions';
import Link from 'next/link';
import { useState } from 'react';

export default function NewLeadPage() {
    const [loading, setLoading] = useState(false);

    // Simple client-side submit handler wrapping the server action
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);

        // Call server action
        // Note: createLead handles redirect on success, so we might not reach the next line if successful.
        // If it returns error, we show it.
        const result = await createLead(formData);

        if (result && result.error) {
            alert(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Novo Lead</h1>
                <Link href="/dashboard/leads" className="text-sm text-gray-500 hover:text-gray-700">
                    Cancelar
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            name="nome"
                            id="nome"
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div>
                        <label htmlFor="contato" className="block text-sm font-medium text-gray-700 mb-1">
                            WhatsApp / Contato
                        </label>
                        <input
                            type="text"
                            name="contato"
                            id="contato"
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                            placeholder="Ex: (87) 99999-9999"
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status Inicial
                        </label>
                        <select
                            name="status"
                            id="status"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        >
                            <option value="novo">Novo</option>
                            <option value="contatado">Contatado</option>
                            <option value="cotacao_enviada">Cotação Enviada</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
