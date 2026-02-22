import { createClient } from '@/utils/supabase/server';
import { Megaphone, Plus } from 'lucide-react';
import { CampaignList } from '@/components/dashboard/CampaignList';
import { listTemplatesMeta } from './actions';
import Link from 'next/link';

export default async function CampanhasPage() {
    const supabase = await createClient();

    const [{ data: campanhas }, { templates }] = await Promise.all([
        supabase.from('campanhas').select('*').order('created_at', { ascending: false }),
        listTemplatesMeta()
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Campanhas</h1>
                    <p className="text-sm text-gray-500">Envie mensagens em massa para leads ou vendedores via WhatsApp.</p>
                </div>
                <Link
                    href="/dashboard/campanhas/new"
                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 group"
                >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    Nova Campanha
                </Link>
            </div>

            <CampaignList campanhas={campanhas || []} templates={templates || []} />
        </div>
    );
}
