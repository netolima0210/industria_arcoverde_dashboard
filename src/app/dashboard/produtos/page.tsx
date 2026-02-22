import { createClient } from '@/utils/supabase/server';
import { Package, Plus } from 'lucide-react';
import { ProductList } from '@/components/dashboard/ProductList';
import Link from 'next/link';

export default async function ProdutosPage() {
    const supabase = await createClient();

    const { data: products } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
                    <p className="text-sm text-gray-500">Gerenciamento de estoque e catálogo da Indústria Arcoverde.</p>
                </div>
                <Link
                    href="/dashboard/produtos/new"
                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 group"
                >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    Novo Produto
                </Link>
            </div>

            <ProductList products={products || []} />
        </div>
    );
}
