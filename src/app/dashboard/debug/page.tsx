
import { createClient } from '@/utils/supabase/server';

export default async function Page() {
    const supabase = await createClient();

    // Tenta pegar um registro qualquer para ver as chaves
    const { data, error } = await supabase
        .from('n8n_chat_conversas')
        .select('*')
        .limit(1);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Debug Database Schema</h1>
            <pre className="bg-gray-100 p-4 rounded border overflow-auto">
                {JSON.stringify({ data, error }, null, 2)}
            </pre>
        </div>
    );
}
