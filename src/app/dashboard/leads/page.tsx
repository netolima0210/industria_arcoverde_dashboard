
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
                    <p className="text-gray-500">Gerencie e monitore os contatos capturados pelo agente.</p>
                </div>
                <Link href="/dashboard/leads/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Novo Lead</span>
                </Link>
            </div>

            {/* Filters could go here */}

            <LeadsTable leads={leads || []} />
        </div>
    );
}
