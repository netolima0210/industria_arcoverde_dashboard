'use client';

import { useState } from 'react';
import {
    User,
    Search,
    MoreVertical,
    LayoutGrid,
    List,
    Trash2,
    Phone,
    Mail,
    MapPin,
    Globe
} from 'lucide-react';
import { deleteVendedor } from '@/app/dashboard/vendedores/actions';
import { useRouter } from 'next/navigation';

interface Vendedor {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    regiao_atende: string | null;
    cidades_atende: string | null;
    status?: string | null;
    created_at?: string;
}

interface VendedorListProps {
    vendedores: Vendedor[];
}

export function VendedorList({ vendedores }: VendedorListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [viewMode, setViewMode] = useState<string>('grid');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    const filteredVendedores = vendedores.filter(v => {
        let matchSearch = true;
        let matchDate = true;

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            matchSearch = v.nome.toLowerCase().includes(search) ||
                v.email?.toLowerCase().includes(search) ||
                v.regiao_atende?.toLowerCase().includes(search) ||
                v.cidades_atende?.toLowerCase().includes(search);
        }

        if (dateFilter && v.created_at) {
            const rowDate = new Date(v.created_at).toISOString().split('T')[0];
            matchDate = rowDate === dateFilter;
        }

        return matchSearch && matchDate;
    });

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja remover o vendedor "${name}"?`)) {
            setIsDeleting(id);
            try {
                await deleteVendedor(id);
                router.refresh();
            } catch (error) {
                alert('Erro ao excluir vendedor.');
            } finally {
                setIsDeleting(null);
            }
        }
    };

    const statusColors: Record<string, string> = {
        'ativo': 'bg-green-100 text-green-800',
        'inativo': 'bg-gray-100 text-gray-800',
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            // Import dinâmico para evitar warning de unused antes da edição e manter limpo
            const { updateVendedorStatus } = await import('@/app/dashboard/vendedores/actions');
            const result = await updateVendedorStatus(id, newStatus);
            if (result && result.error) {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Erro ao atualizar status');
        }
    };

    if (viewMode === 'grid') {
        return (
            <div className="space-y-6">
                {/* Filters Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
                        <div className="relative w-full sm:w-64">
                            <label htmlFor="search-grid" className="block text-sm font-medium text-gray-700 mb-1">Buscar vendedor</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="search-grid"
                                    type="text"
                                    placeholder="Nome, e-mail, região..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-64">
                            <label htmlFor="date-grid" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por data</label>
                            <input
                                id="date-grid"
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode !== 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendedores.map((v) => (
                        <div key={v.id} className="group bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <User className="h-6 w-6" />
                                </div>
                                <button
                                    onClick={() => handleDelete(v.id, v.nome)}
                                    disabled={isDeleting === v.id}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{v.nome}</h3>
                                <select
                                    value={v.status?.toLowerCase() || 'ativo'}
                                    onChange={(e) => handleStatusChange(v.id, e.target.value)}
                                    className={`px-2 py-0.5 text-[10px] leading-5 font-bold rounded-full outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border border-transparent hover:border-gray-200 cursor-pointer transition-all ${statusColors[v.status?.toLowerCase() || ''] || 'bg-green-100 text-green-800'}`}
                                >
                                    <option value="ativo" className="bg-white text-gray-900">Ativo</option>
                                    <option value="inativo" className="bg-white text-gray-900">Inativo</option>
                                </select>
                            </div>
                            <p className="text-xs text-primary font-medium mb-4">{v.regiao_atende || 'Região não informada'}</p>

                            <div className="space-y-3 pt-4 border-t border-gray-50">
                                {v.telefone && (
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                                        <span>{v.telefone}</span>
                                    </div>
                                )}
                                {v.email && (
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="truncate">{v.email}</span>
                                    </div>
                                )}
                                {v.cidades_atende && (
                                    <div className="flex items-start gap-3 text-xs text-gray-500">
                                        <Globe className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                                        <span>{v.cidades_atende}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-64">
                        <label htmlFor="search-list" className="block text-sm font-medium text-gray-700 mb-1">Buscar vendedor</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="search-list"
                                type="text"
                                placeholder="Nome, e-mail, região..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-64">
                        <label htmlFor="date-list" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por data</label>
                        <input
                            id="date-list"
                            type="date"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode !== 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Região / Cidades</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="relative px-6 py-4"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVendedores.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div className="text-sm font-bold text-gray-900">{v.nome}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-gray-400" />
                                                <span>{v.telefone || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-gray-400" />
                                                <span>{v.email || '—'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs text-gray-500">
                                            <div className="font-medium text-gray-700">{v.regiao_atende || '—'}</div>
                                            <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{v.cidades_atende || '—'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={v.status?.toLowerCase() || 'ativo'}
                                            onChange={(e) => handleStatusChange(v.id, e.target.value)}
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border border-transparent hover:border-gray-200 cursor-pointer transition-all ${statusColors[v.status?.toLowerCase() || ''] || 'bg-green-100 text-green-800'}`}
                                        >
                                            <option value="ativo" className="bg-white text-gray-900">Ativo</option>
                                            <option value="inativo" className="bg-white text-gray-900">Inativo</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDelete(v.id, v.nome)}
                                                disabled={isDeleting === v.id}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <button className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
