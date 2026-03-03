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

    // 4. Agrupar TUDO por número de telefone (sessions das conversas + leads cadastrados)
    const groupedClientsMap = new Map<string, any>();

    // Primeiro, pegar todas as sessões que tiveram conversa
    for (const [posixPhone, date] of lastMessageMap) {
        groupedClientsMap.set(posixPhone, {
            id: Math.random(), // ID temporário para lista de quem não é cliente
            nome: posixPhone, // Padrão: mostra o número
            contato: posixPhone,
            normalized_phone: posixPhone,
            last_message_at: date,
            is_desconhecido: true
        });
    }

    // Depois, sobrepor com os dados dos clientes cadastrados
    for (const c of (clientes || [])) {
        const contatoDigits = (c.contato || '').replace(/\D/g, '');
        const normalized = normalizePhone(contatoDigits);
        if (!normalized) continue;

        const existing = groupedClientsMap.get(normalized);
        const lastMsg = lastMessageMap.get(normalized) || (existing?.last_message_at) || '';

        if (existing) {
            // Se já existia pela conversa, apenas atualizamos o nome
            if (existing.is_desconhecido) {
                existing.nome = c.nome;
                existing.id = c.id;
                existing.is_desconhecido = false;
            } else if (!existing.nome.includes(c.nome)) {
                existing.nome = `${existing.nome} / ${c.nome}`;
            }
        } else {
            // Se o cliente existe mas não achamos conversa direta (tentar match parcial)
            let foundDate = lastMsg;
            if (!foundDate) {
                for (const [phone, date] of lastMessageMap) {
                    if (phone.endsWith(normalized) || normalized.endsWith(phone)) {
                        foundDate = date;
                        break;
                    }
                }
            }

            if (foundDate) {
                groupedClientsMap.set(normalized, {
                    id: c.id,
                    nome: c.nome || 'Sem Nome',
                    contato: c.contato,
                    normalized_phone: normalized,
                    last_message_at: foundDate,
                    is_desconhecido: false
                });
            }
        }
    }

    // 5. Filtrar e Ordenar: mais recente no topo
    const finalClientes = Array.from(groupedClientsMap.values())
        .filter(c => c.last_message_at)
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Inbox de Contatos</h1>
                <p className="text-sm text-gray-500">Histórico de conversas completo por lead cadastrado.</p>
            </div>

            <InboxLayout clientes={finalClientes} />
        </div>
    );
}
