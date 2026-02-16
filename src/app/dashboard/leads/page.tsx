
import { createClient } from '@/utils/supabase/server';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function LeadsPage() {
    const supabase = await createClient();

    // Fetch leads
    const { data: leads, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestão de Leads</h1>
                    <p className="text-sm text-gray-500">Gerencie e monitore os contatos capturados pelo agente.</p>
                </div>
                <Link href="/dashboard/leads/new" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-sm font-medium text-sm">
                    <Plus className="h-4 w-4" />
                    <span>Novo Lead</span>
                </Link>
            </div>

            {/* Filters could go here */}

            <LeadsTable leads={leads || []} />
        </div>
    );
}
