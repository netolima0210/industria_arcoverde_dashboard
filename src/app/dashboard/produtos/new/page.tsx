'use client';

import { createProduct } from '../actions';
import Link from 'next/link';
import { useState } from 'react';
import { Package, ArrowLeft, Save } from 'lucide-react';

export default function NewProductPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);

        const result = await createProduct(formData);

        if (result && result.error) {
            alert(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/produtos"
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-400 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Novo Produto</h1>
                        <p className="text-sm text-gray-500">Cadastre um novo item no catálogo industrial.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nome do Produto */}
                        <div className="md:col-span-2">
                            <label htmlFor="nome" className="block text-sm font-bold text-gray-700 mb-2">
                                Nome do Produto *
                            </label>
                            <input
                                type="text"
                                name="nome"
                                id="nome"
                                required
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: Amaciante Arcoverde Aconchego"
                            />
                        </div>

                        {/* Código ERP/Interno */}
                        <div>
                            <label htmlFor="codigo" className="block text-sm font-bold text-gray-700 mb-2">
                                Código ERP / Interno
                            </label>
                            <input
                                type="text"
                                name="codigo"
                                id="codigo"
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: COD-12345"
                            />
                        </div>

                        {/* Categoria */}
                        <div>
                            <label htmlFor="categoria" className="block text-sm font-bold text-gray-700 mb-2">
                                Categoria
                            </label>
                            <input
                                type="text"
                                name="categoria"
                                id="categoria"
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: Amaciantes"
                            />
                        </div>

                        {/* Linha */}
                        <div>
                            <label htmlFor="linha" className="block text-sm font-bold text-gray-700 mb-2">
                                Linha de Produto
                            </label>
                            <input
                                type="text"
                                name="linha"
                                id="linha"
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: Linha Aconchego"
                            />
                        </div>

                        {/* Apresentação */}
                        <div>
                            <label htmlFor="apresentacao" className="block text-sm font-bold text-gray-700 mb-2">
                                Apresentação (Ex: 5 Litros)
                            </label>
                            <input
                                type="text"
                                name="apresentacao"
                                id="apresentacao"
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: 500ml"
                            />
                        </div>

                        {/* Embalagem */}
                        <div>
                            <label htmlFor="embalagem" className="block text-sm font-bold text-gray-700 mb-2">
                                Embalagem (Fardo/Caixa)
                            </label>
                            <input
                                type="text"
                                name="embalagem"
                                id="embalagem"
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: Caixa c/ 12 unidades"
                            />
                        </div>

                        {/* Status Ativo */}
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input
                                type="checkbox"
                                name="ativo"
                                id="ativo"
                                defaultChecked
                                value="true"
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="ativo" className="text-sm font-bold text-gray-700">
                                Produto Ativo no Catálogo
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                        <Link
                            href="/dashboard/produtos"
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Salvando...' : 'Cadastrar Produto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
