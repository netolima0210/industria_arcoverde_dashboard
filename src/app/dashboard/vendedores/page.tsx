import { createClient } from '@/utils/supabase/server';
import { UserPlus, Users } from 'lucide-react';
import { VendedorList } from '@/components/dashboard/VendedorList';
import Link from 'next/link';

export default async function VendedoresPage() {
    const supabase = await createClient();

    const { data: vendedores } = await supabase
        .from('vendedores')
        .select('*')
        .order('nome', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendedores</h1>
                    <p className="text-sm text-gray-500">Gerenciamento da equipe de vendas e representação regional.</p>
                </div>
                <Link
                    href="/dashboard/vendedores/new"
                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 group"
                >
                    <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Novo Vendedor
                </Link>
            </div>

            <VendedorList vendedores={vendedores || []} />
        </div>
    );
}
