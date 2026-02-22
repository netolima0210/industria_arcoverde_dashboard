'use client';

import { createVendedor } from '../actions';
import Link from 'next/link';
import { useState } from 'react';
import { UserPlus, ArrowLeft, Save, MapPin, Phone, Mail, Globe } from 'lucide-react';

export default function NewVendedorPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);

        const result = await createVendedor(formData);

        if (result && result.error) {
            alert(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/vendedores"
                    className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-400 hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Novo Vendedor</h1>
                    <p className="text-sm text-gray-500">Cadastre um novo representante ou vendedor.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nome */}
                        <div className="md:col-span-2">
                            <label htmlFor="nome" className="block text-sm font-bold text-gray-700 mb-2">
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                name="nome"
                                id="nome"
                                required
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                placeholder="Ex: Rodrigo Vendas"
                            />
                        </div>

                        {/* Telefone */}
                        <div>
                            <label htmlFor="telefone" className="block text-sm font-bold text-gray-700 mb-2">
                                WhatsApp / Telefone
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="telefone"
                                    id="telefone"
                                    className="block w-full pl-10 rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="(87) 99999-9999"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    className="block w-full pl-10 rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="vendedor@arcoverde.com"
                                />
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="md:col-span-2">
                            <label htmlFor="endereco" className="block text-sm font-bold text-gray-700 mb-2">
                                Endereço
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="endereco"
                                    id="endereco"
                                    className="block w-full pl-10 rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                />
                            </div>
                        </div>

                        {/* Região que atende */}
                        <div>
                            <label htmlFor="regiao_atende" className="block text-sm font-bold text-gray-700 mb-2">
                                Região de Atuação
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="regiao_atende"
                                    id="regiao_atende"
                                    className="block w-full pl-10 rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="Ex: Sertão de Pernambuco"
                                />
                            </div>
                        </div>

                        {/* Cidades que atende */}
                        <div>
                            <label htmlFor="cidades_atende" className="block text-sm font-bold text-gray-700 mb-2">
                                Cidades Atendidas
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="cidades_atende"
                                    id="cidades_atende"
                                    className="block w-full pl-10 rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="Arcoverde, Pesqueira, Sertânia..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                        <Link
                            href="/dashboard/vendedores"
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
                            {loading ? 'Salvando...' : 'Cadastrar Vendedor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
