'use server';

import { createClient } from '@/utils/supabase/server';

function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('55')) {
        return digits.slice(0, 4) + '9' + digits.slice(4);
    }
    return digits;
}

export async function getLeadMessages(phone: string) {
    if (!phone) return { error: 'Telefone inválido', messages: [] };

    const supabase = await createClient();
    const cleanPhone = phone.replace(/\D/g, '');

    // We might match with or without the 9, or just endswith.
    // The session_id often has 55879..._buffer
    // We'll query all messages and filter in-memory if the table is reasonable, 
    // or use ilike if we know the format.
    // Supabase ilike is better for performance.

    const { data, error } = await supabase
        .from('n8n_chat_conversas')
        .select('*')
        .ilike('session_id', `%${cleanPhone}%`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return { error: 'Erro ao buscar mensagens', messages: [] };
    }

    const formattedMessages = (data || []).map((msg: any) => {
        const rawMsg = msg.message;
        let type = rawMsg?.type || rawMsg?.role || '';
        if (type === 'user') type = 'human';
        if (type === 'assistant') type = 'ai';

        const rawContent = rawMsg?.content ?? rawMsg?.text ?? rawMsg?.message ?? '';
        let content = '';
        if (typeof rawContent === 'string') {
            content = rawContent;
        } else if (Array.isArray(rawContent)) {
            content = rawContent.map((item: any) => item?.text || item?.content || '').join(' ');
        }

        return {
            id: msg.id,
            type,
            content,
            created_at: msg.created_at || msg.createdAt || msg.creation_date
        };
    });

    return { error: null, messages: formattedMessages };
}
