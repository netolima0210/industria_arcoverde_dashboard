import { createClient } from '@/utils/supabase/server';
import { MessageSquare, User } from 'lucide-react';
import { ConversationList } from '@/components/dashboard/ConversationList';

// Helper to parse session_id and extract phone number
function parseSessionId(sessionId: string) {
    const phone = sessionId
        .replace('_buffer', '')
        .replace('@s.whatsapp.net', '');
    return phone;
}

interface SessionData {
    session_id: string;
    phone: string;
    first_message_at: string;
    last_message_at: string;
    message_count: number;
    last_human_message: string;
    last_ai_message: string;
    status: 'transferred' | 'resolved' | 'active';
    last_messages: { type: string; content: string; created_at: string }[];
}

export default async function ConversasPage() {
    const supabase = await createClient();

    const { data: messages } = await supabase
        .from('n8n_chat_conversas')
        .select('*')
        .order('id', { ascending: true });

    const transferKeywords = ['transferindo', 'atendente', 'humano', 'setor', 'financeiro', 'comercial', 'compras'];

    // Group messages by session_id
    const sessionMap = new Map<string, SessionData>();
    const sessionMessages = new Map<string, { type: string; content: string; created_at: string }[]>();

    if (messages) {
        for (const msg of messages as any[]) {
            const sessionId = msg.session_id || msg.sessionId;
            const createdAt = msg.created_at || msg.createdAt || msg.creation_date;
            if (!sessionId) continue;

            const content = msg.message?.content || '';
            const type = msg.message?.type || '';

            // Collect all messages per session
            if (!sessionMessages.has(sessionId)) {
                sessionMessages.set(sessionId, []);
            }
            sessionMessages.get(sessionId)!.push({ type, content, created_at: createdAt });

            const existing = sessionMap.get(sessionId);

            if (!existing) {
                sessionMap.set(sessionId, {
                    session_id: sessionId,
                    phone: parseSessionId(sessionId),
                    first_message_at: createdAt,
                    last_message_at: createdAt,
                    message_count: 1,
                    last_human_message: type === 'human' ? content : '',
                    last_ai_message: type === 'ai' ? content : '',
                    status: 'active',
                    last_messages: [],
                });
            } else {
                existing.last_message_at = createdAt;
                existing.message_count++;
                if (type === 'human') existing.last_human_message = content;
                if (type === 'ai') existing.last_ai_message = content;
            }
        }
    }

    // Determine status and attach last N messages
    sessionMap.forEach((session, sessionId) => {
        const allMsgs = sessionMessages.get(sessionId) || [];

        // Check if transferred
        const hasTransfer = allMsgs.some(m =>
            m.type === 'ai' && transferKeywords.some(k => m.content.toLowerCase().includes(k))
        );

        if (hasTransfer) {
            session.status = 'transferred';
        } else {
            session.status = 'resolved';
        }

        // Attach last 6 messages for preview
        session.last_messages = allMsgs.slice(-6);
    });

    // Sort sessions by most recent first
    const sessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    // Match phone numbers with clientes table (fuzzy matching)
    const { data: clientes } = await supabase
        .from('clientes')
        .select('nome, contato');

    const clienteMap: Record<string, string> = {};
    if (clientes) {
        for (const session of sessions) {
            // Strip all non-digit characters from session phone
            const sessionDigits = session.phone.replace(/\D/g, '');

            for (const c of clientes) {
                if (!c.contato || !c.nome) continue;
                // Strip all non-digit characters from cliente contato
                const clienteDigits = c.contato.replace(/\D/g, '');

                // Match if one ends with the other (handles country code differences)
                // e.g. "5587920529200" ends with "87920529200" or vice versa
                if (sessionDigits.endsWith(clienteDigits) || clienteDigits.endsWith(sessionDigits) ||
                    sessionDigits === clienteDigits) {
                    clienteMap[session.phone] = c.nome;
                    break;
                }
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Histórico de Conversas</h1>
                    <p className="text-sm text-gray-500">Atendimentos realizados pelo agente via WhatsApp.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50 font-medium">
                        {sessions.length} sessão(ões)
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Resolvido
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span> Transferido
                        </span>
                    </div>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare className="h-12 w-12 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
                        <p className="text-sm">As conversas do agente aparecerão aqui automaticamente.</p>
                    </div>
                </div>
            ) : (
                <ConversationList sessions={sessions} clienteMap={clienteMap} />
            )}
        </div>
    );
}
