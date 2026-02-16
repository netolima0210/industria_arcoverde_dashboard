
'use client';

import { Edit, MessageCircle, Trash2 } from 'lucide-react';
import { deleteLead } from '@/app/dashboard/leads/actions';

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
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Nenhum lead encontrado.
                                </td>
                            </tr>
                        ) : leads.map((lead) => (
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
                                        <button className="text-gray-400 hover:text-primary transition-colors" title="Ver Conversa">
                                            <MessageCircle className="h-5 w-5" />
                                        </button>
                                        <button className="text-gray-400 hover:text-primary transition-colors" title="Editar">
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
    );
}
