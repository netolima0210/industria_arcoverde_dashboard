'use client';

import { useState } from 'react';
import { Package, Search, Filter, AlertCircle, CheckCircle2, MoreVertical, LayoutGrid, List, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    codigo: string | null;
    nome: string;
    linha: string | null;
    categoria: string | null;
    apresentacao: string | null;
    embalagem: string | null;
    ativo: boolean;
}

interface ProductListProps {
    products: Product[];
}

import { deleteProduct } from '@/app/dashboard/produtos/actions';
import { useRouter } from 'next/navigation';

export function ProductList({ products }: ProductListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    const categories = ['all', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean) as string[]))];

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) {
            setIsDeleting(id);
            try {
                await deleteProduct(id);
                router.refresh();
            } catch (error) {
                alert('Erro ao excluir produto.');
            } finally {
                setIsDeleting(null);
            }
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.linha?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoria === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <select
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer flex-1 md:flex-none"
                        value={selectedCategory as string}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'all' ? 'Todas Categorias' : cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Display */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-12 text-center">
                    <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
                    <p className="text-sm text-gray-400">Tente ajustar seus filtros de busca.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-all group">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                                            Catálogo Ativo
                                        </span>
                                        <button
                                            onClick={() => handleDelete(product.id, product.nome)}
                                            disabled={isDeleting === product.id}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            title="Excluir Produto"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{product.nome}</h3>
                                <p className="text-xs text-gray-400 mb-4">{product.categoria}</p>

                                <div className="space-y-2">
                                    {product.apresentacao && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Apresentação</span>
                                            <span className="text-gray-700 font-medium">{product.apresentacao}</span>
                                        </div>
                                    )}
                                    {product.embalagem && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Embalagem</span>
                                            <span className="text-gray-700 font-medium">{product.embalagem}</span>
                                        </div>
                                    )}
                                    {product.linha && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Linha</span>
                                            <span className="text-gray-700 font-medium">{product.linha}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria / Linha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Apresentação</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="relative px-6 py-4"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-blue-50/20 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">{product.nome}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.categoria} {product.linha ? `(${product.linha})` : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.apresentacao || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span className="text-xs font-medium">Disponível</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDelete(product.id, product.nome)}
                                                disabled={isDeleting === product.id}
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
            )}
        </div>
    );
}
