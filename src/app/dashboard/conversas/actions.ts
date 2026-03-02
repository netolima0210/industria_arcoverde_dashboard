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

    // Gerar variantes do telefone: com e sem o 9º dígito.
    // Ex: 5587992052920 (com 9) e 558792052920 (sem 9)
    // Isso é necessário porque o n8n salva o session_id no formato antigo (sem 9).
    const variants: string[] = [cleanPhone];

    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
        // Remover o 9º dígito: 55 + DD + 9XXXXXXXX → 55 + DD + XXXXXXXX
        const withoutNine = cleanPhone.slice(0, 4) + cleanPhone.slice(5);
        variants.push(withoutNine);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
        // Adicionar o 9º dígito: 55 + DD + XXXXXXXX → 55 + DD + 9XXXXXXXX
        const withNine = cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4);
        variants.push(withNine);
    }

    // Busca com OR para cobrir ambas as variantes
    const orFilter = variants.map(v => `session_id.ilike.%${v}%`).join(',');

    const { data, error } = await supabase
        .from('n8n_chat_conversas')
        .select('*')
        .or(orFilter)
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
