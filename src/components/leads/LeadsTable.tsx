
'use client';

import { Edit, MessageCircle, Trash2 } from 'lucide-react';
import { deleteLead, updateLeadStatus, updateMultipleLeadsStatus } from '@/app/dashboard/leads/actions';
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
    const [nameFilter, setNameFilter] = useState('');
    const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

    const filteredLeads = leads.filter(lead => {
        let matchDate = true;
        let matchName = true;

        if (dateFilter) {
            const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
            matchDate = leadDate === dateFilter;
        }

        if (nameFilter) {
            matchName = lead.nome.toLowerCase().includes(nameFilter.toLowerCase());
        }

        return matchDate && matchName;
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
        'ativo': 'bg-green-100 text-green-800',
        'inativo': 'bg-gray-100 text-gray-800',
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este lead?')) {
            await deleteLead(id);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const result = await updateLeadStatus(id, newStatus);
            if (result && result.error) {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Erro ao atualizar status');
        }
    };

    const handleBulkStatusChange = async (newStatus: string) => {
        if (filteredLeads.length === 0) return;

        if (!confirm(`Tem certeza que deseja marcar ${filteredLeads.length} leads como ${newStatus}?`)) {
            return;
        }

        setIsUpdatingBulk(true);
        try {
            const ids = filteredLeads.map(lead => lead.id);
            const result = await updateMultipleLeadsStatus(ids, newStatus);
            if (result && result.error) {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to update multiple status', error);
            alert('Erro ao atualizar status em massa');
        } finally {
            setIsUpdatingBulk(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => handleBulkStatusChange('ativo')}
                        disabled={isUpdatingBulk || filteredLeads.length === 0}
                        className="px-4 py-2 bg-green-600 outline-none hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none whitespace-nowrap"
                    >
                        {isUpdatingBulk ? 'Salvando...' : 'Ativar Todos'}
                    </button>
                    <button
                        onClick={() => handleBulkStatusChange('inativo')}
                        disabled={isUpdatingBulk || filteredLeads.length === 0}
                        className="px-4 py-2 bg-gray-600 outline-none hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none whitespace-nowrap"
                    >
                        {isUpdatingBulk ? 'Salvando...' : 'Desativar Todos'}
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-4 w-full sm:w-auto">
                    <div className="w-full sm:w-64">
                        <label htmlFor="name-filter" className="block text-sm font-medium text-gray-700 mb-1">Buscar por nome</label>
                        <input
                            type="text"
                            id="name-filter"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder="Nome do lead..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        />
                    </div>
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
                                            <option value="ativo" className="bg-white text-gray-900">Ativo</option>
                                            <option value="inativo" className="bg-white text-gray-900">Inativo</option>
                                        </select>
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
        </div >
    );
}
