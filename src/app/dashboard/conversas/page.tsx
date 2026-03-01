import { createClient } from '@/utils/supabase/server';
import { InboxLayout } from '@/components/dashboard/InboxLayout';

export default async function ConversasPage() {
    const supabase = await createClient();

    // Fetch ALL clients (Leads)
    const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome, contato')
        .order('nome', { ascending: true });

    if (clientesError) {
        console.error("Error fetching clientes:", clientesError);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Inbox de Contatos</h1>
                <p className="text-sm text-gray-500">Histórico de conversas completo por lead cadastrado.</p>
            </div>

            <InboxLayout clientes={clientes || []} />
        </div>
    );
}
