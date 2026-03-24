
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
    cidade?: string | null;
    regiao?: string | null;
    estado?: string | null;
    is_whatsapp?: boolean | null;
}

interface LeadsTableProps {
    leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
    const router = useRouter();
    const [dateFilter, setDateFilter] = useState('');
    const [nameFilter, setNameFilter] = useState('');
    const [cidadeFilter, setCidadeFilter] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

    const filteredLeads = leads.filter(lead => {
        let matchDate = true;
        let matchName = true;
        let matchCidade = true;
        let matchEstado = true;

        if (dateFilter) {
            const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
            matchDate = leadDate === dateFilter;
        }

        if (nameFilter) {
            matchName = lead.nome.toLowerCase().includes(nameFilter.toLowerCase());
        }

        if (cidadeFilter) {
            matchCidade = lead.cidade?.toLowerCase().includes(cidadeFilter.toLowerCase()) ?? false;
        }

        if (estadoFilter && estadoFilter !== "") {
            matchEstado = lead.estado?.toUpperCase() === estadoFilter.toUpperCase();
        }

        return matchDate && matchName && matchCidade && matchEstado;
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
            try {
                await deleteLead(id);
                router.refresh();
            } catch {
                alert('Erro ao excluir lead.');
            }
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
                <div className="flex flex-col sm:flex-row justify-end gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <div className="w-full sm:w-48">
                        <label htmlFor="name-filter" className="block text-xs font-medium text-gray-700 mb-1">Buscar por nome</label>
                        <input
                            type="text"
                            id="name-filter"
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder="Nome..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <label htmlFor="cidade-filter" className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                        <input
                            type="text"
                            id="cidade-filter"
                            value={cidadeFilter}
                            onChange={(e) => setCidadeFilter(e.target.value)}
                            placeholder="Cidade..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        />
                    </div>
                    <div className="w-full sm:w-32">
                        <label htmlFor="estado-filter" className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                        <select
                            id="estado-filter"
                            value={estadoFilter}
                            onChange={(e) => setEstadoFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        >
                            <option value="">Todos</option>
                            <option value="PE">PE</option>
                            <option value="PB">PB</option>
                            <option value="CE">CE</option>
                            <option value="AL">AL</option>
                            <option value="BA">BA</option>
                        </select>
                    </div>
                    <div className="w-full sm:w-40">
                        <label htmlFor="date-filter" className="block text-xs font-medium text-gray-700 mb-1">Data cadastro</label>
                        <input
                            type="date"
                            id="date-filter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <div className="overflow-hidden">
                    <table className="w-full divide-y divide-gray-100 table-fixed">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[28%]">
                                    Nome
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                                    WhatsApp
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">
                                    Localização
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">
                                    Data Criação
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                                    Status
                                </th>
                                <th scope="col" className="relative px-4 py-3 w-[10%]">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Nenhum lead encontrado.
                                    </td>
                                </tr>
                            ) : filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center min-w-0">
                                            <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                                                {lead.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-3 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{lead.nome}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="text-sm text-gray-900 truncate">{lead.contato}</div>
                                            {lead.is_whatsapp && (
                                                <div className="flex-shrink-0" title="Número verificado no WhatsApp">
                                                    <MessageCircle className="h-4 w-4 text-green-500 fill-green-500/10" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm text-gray-900 truncate">{lead.cidade || '-'}</div>
                                        {lead.estado && <div className="text-xs text-gray-500">{lead.estado}</div>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm text-gray-500 truncate">{formatDate(lead.created_at)}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <select
                                            value={lead.status?.toLowerCase() || 'novo'}
                                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border border-transparent hover:border-gray-200 cursor-pointer transition-all ${statusColors[lead.status?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800'}`}
                                        >
                                            <option value="ativo" className="bg-white text-gray-900">Ativo</option>
                                            <option value="inativo" className="bg-white text-gray-900">Inativo</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-4 text-right text-sm font-medium">
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
