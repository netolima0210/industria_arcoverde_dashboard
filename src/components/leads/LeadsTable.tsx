
'use client';

import { Edit, MessageCircle, Trash2 } from 'lucide-react';
import { deleteLead } from '@/app/dashboard/leads/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Lead {
    id: string;
    nome: string;
    contato: string | null;
    status: string | null;
    created_at: string;
}

interface LeadsTableProps {
    leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
    const router = useRouter();
    const [dateFilter, setDateFilter] = useState('');

    const filteredLeads = leads.filter(lead => {
        if (!dateFilter) return true;
        // Pega apenas a parte da data (YYYY-MM-DD) do created_at
        const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
        return leadDate === dateFilter;
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const statusColors: Record<string, string> = {
        'novo': 'bg-blue-100 text-blue-800',
        'contatado': 'bg-yellow-100 text-yellow-800',
        'cotacao_enviada': 'bg-purple-100 text-purple-800',
        'venda_fechada': 'bg-green-100 text-green-800',
        'perdido': 'bg-red-100 text-red-800',
        'ativo': 'bg-green-100 text-green-800',
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este lead?')) {
            await deleteLead(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <div className="w-full sm:w-64">
                    <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por data de cadastro</label>
                    <input
                        type="date"
                        id="date-filter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    WhatsApp
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data Criação
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Nenhum lead encontrado.
                                    </td>
                                </tr>
                            ) : filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                                                {lead.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{lead.nome}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{lead.contato}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{formatDate(lead.created_at)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[lead.status?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className="text-gray-400 hover:text-primary transition-colors"
                                                title="Ver Conversa"
                                                onClick={() => router.push('/dashboard/conversas')}
                                            >
                                                <MessageCircle className="h-5 w-5" />
                                            </button>
                                            <button
                                                className="text-gray-400 hover:text-primary transition-colors"
                                                title="Editar"
                                                onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                                            >
                                                <Edit className="h-5 w-5" />
                                            </button>
                                            <button
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Excluir"
                                                onClick={() => handleDelete(lead.id)}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white px-4 py-3 border-t border-gray-100 sm:px-6">
                    {/* Pagination placeholder */}
                </div>
            </div>
        </div>
    );
}
