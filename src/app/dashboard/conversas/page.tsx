import { createClient } from '@/utils/supabase/server';
import { InboxLayout } from '@/components/dashboard/InboxLayout';

function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('55')) {
        return digits.slice(0, 4) + '9' + digits.slice(4);
    }
    return digits;
}

function parseSessionId(sessionId: string): string {
    const raw = sessionId.replace('_buffer', '').replace('@s.whatsapp.net', '');
    return normalizePhone(raw);
}

export default async function ConversasPage() {
    const supabase = await createClient();

    // 1. Buscar todos os leads
    const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, contato');

    // 2. Buscar as conversas para descobrir a última mensagem por telefone
    const allMessages: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
        const { data: batch, error } = await supabase
            .from('n8n_chat_conversas')
            .select('session_id, created_at')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);
        if (error || !batch || batch.length === 0) break;
        allMessages.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
    }

    // 3. Montar mapa: telefone normalizado → data da última mensagem
    const lastMessageMap = new Map<string, string>();
    for (const msg of allMessages) {
        const sessionId = msg.session_id || '';
        if (!sessionId) continue;
        const phone = parseSessionId(sessionId);
        const createdAt = msg.created_at || '';
        const existing = lastMessageMap.get(phone);
        if (!existing || createdAt > existing) {
            lastMessageMap.set(phone, createdAt);
        }
    }

    // 4. Enriquecer cada lead com a data da última conversa
    const clientesWithLastMsg = (clientes || []).map(c => {
        const contatoDigits = (c.contato || '').replace(/\D/g, '');
        const normalized = normalizePhone(contatoDigits);

        // Tentar match direto ou parcial (endsWith)
        let lastMsg = lastMessageMap.get(normalized) || '';
        if (!lastMsg) {
            for (const [phone, date] of lastMessageMap) {
                if (phone.endsWith(contatoDigits) || contatoDigits.endsWith(phone) || phone === contatoDigits) {
                    lastMsg = date;
                    break;
                }
            }
        }
        return { ...c, last_message_at: lastMsg };
    });

    // 5. Ordenar: quem conversou mais recente fica no topo, sem conversa fica no final
    // Filtrar: só quem já conversou aparece (igual WhatsApp)
    const clientesComConversa = clientesWithLastMsg.filter(c => c.last_message_at);

    // Ordenar: mais recente no topo
    clientesComConversa.sort((a, b) => {
        return b.last_message_at!.localeCompare(a.last_message_at!);
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Inbox de Contatos</h1>
                <p className="text-sm text-gray-500">Histórico de conversas completo por lead cadastrado.</p>
            </div>

            <InboxLayout clientes={clientesComConversa} />
        </div>
    );
}
