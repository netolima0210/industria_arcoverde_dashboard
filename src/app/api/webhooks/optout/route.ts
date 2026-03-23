import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    // Validar Bearer token de autenticação
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.WEBHOOK_OPTOUT_SECRET;

    if (!expectedToken || !authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        // Inicializa o cliente do Supabase *dentro* da função para evitar crash no tempo de Build
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload = await req.json();
        let { contato } = payload;

        if (!contato) {
            return NextResponse.json({ error: 'Parâmetro obrigatório ausente' }, { status: 400 });
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
            console.error('[webhook/optout] Erro ao processar opt-out:', error.code);
            return NextResponse.json({ error: 'Erro interno ao processar solicitação' }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Opt-out processado com sucesso', count: data.length });
    } catch {
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
