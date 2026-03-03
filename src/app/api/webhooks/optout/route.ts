import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        // Inicializa o cliente do Supabase *dentro* da função para evitar crash no tempo de Build
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload = await req.json();
        let { contato } = payload;

        if (!contato) {
            return NextResponse.json({ error: 'Parâmetro "contato" obrigatório no body da requisição' }, { status: 400 });
        }

        // Limpar o contato para casar com o banco de dados (remover '@s.whatsapp.net' e formatar apenas os números)
        contato = contato.replace('@s.whatsapp.net', '').trim();

        // Buscar lead pelo contato e inativá-lo com a flag de opt-out
        const { data, error } = await supabase
            .from('clientes')
            .update({ status: 'inativo', opt_out: true })
            .eq('contato', contato)
            .select();

        if (error) {
            console.error('Erro ao inativar lead (opt-out) via Webhook:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Lead não encontrado para o contato fornecido' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Lead inativado por opt-out com sucesso', count: data.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
